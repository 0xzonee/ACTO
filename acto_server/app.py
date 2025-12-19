from __future__ import annotations

import base64
import uuid

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from acto import __version__
from acto.access import SolanaTokenGate
from acto.config import Settings
from acto.errors import AccessError, ProofError, RegistryError
from acto.metrics import MetricsRegistry
from acto.proof import verify_proof
from acto.registry import ProofRegistry
from acto.reputation import ReputationScorer
from acto.security import (
    ApiKeyStore,
    AuditAction,
    AuditLogger,
    JWTManager,
    OAuth2TokenResponse,
    Permission,
    RBACManager,
    TokenBucketRateLimiter,
    create_jwt_dependency_optional,
    get_current_user_optional,
    require_api_key,
)
from acto.security.audit import FileAuditBackend, MemoryAuditBackend

from .schemas import (
    AccessCheckRequest,
    AccessCheckResponse,
    ProofSubmitRequest,
    ProofSubmitResponse,
    VerifyRequest,
    VerifyResponse,
)

settings = Settings()


def create_app() -> FastAPI:
    app = FastAPI(title="ACTO Verification API", version=__version__)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    registry = ProofRegistry(settings)
    metrics = MetricsRegistry()
    scorer = ReputationScorer(settings=settings)

    # Security components initialization
    api_key_store = ApiKeyStore.from_plaintext(keys=[])
    limiter = TokenBucketRateLimiter.create(rps=settings.rate_limit_rps, burst=settings.rate_limit_burst)

    # JWT/OAuth2
    jwt_manager: JWTManager | None = None
    if settings.jwt_enabled and settings.jwt_secret_key:
        jwt_manager = JWTManager(
            secret_key=settings.jwt_secret_key,
            algorithm=settings.jwt_algorithm,
            access_token_expire_minutes=settings.jwt_access_token_expire_minutes,
            refresh_token_expire_days=settings.jwt_refresh_token_expire_days,
        )

    # RBAC
    rbac_manager = RBACManager() if settings.rbac_enabled else None

    # Audit logging
    audit_logger: AuditLogger | None = None
    if settings.audit_log_enabled:
        if settings.audit_log_backend == "file":
            backend = FileAuditBackend(settings.audit_log_file)
        else:
            backend = MemoryAuditBackend()
        audit_logger = AuditLogger(backend=backend)

    # Encryption at rest, TLS, Secrets management, and PII masking are available via settings
    # but not actively used in current implementation
    # They can be enabled when needed in the future

    @app.middleware("http")
    async def request_id_middleware(request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id
        response: Response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

    @app.middleware("http")
    async def rate_limit_middleware(request: Request, call_next):
        if not settings.rate_limit_enabled:
            return await call_next(request)

        client = request.headers.get("X-Forwarded-For") or (request.client.host if request.client else "unknown")
        key = f"{client}:{request.url.path}"
        try:
            limiter.check(key)
        except AccessError as e:
            raise HTTPException(status_code=429, detail=str(e)) from e
        return await call_next(request)

    @app.middleware("http")
    async def audit_middleware(request: Request, call_next):
        """Middleware for audit logging."""
        if not audit_logger:
            return await call_next(request)

        user_id = getattr(request.state, "user_id", None)
        ip_address = request.headers.get("X-Forwarded-For") or (request.client.host if request.client else None)
        user_agent = request.headers.get("User-Agent")

        try:
            response = await call_next(request)
            if response.status_code < 400:
                audit_logger.log_success(
                    AuditAction.ADMIN_ACTION,
                    user_id=user_id,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    request_id=request.state.request_id,
                    details={"method": request.method, "path": request.url.path},
                )
            else:
                audit_logger.log_failure(
                    AuditAction.ADMIN_ACTION,
                    error_message=f"HTTP {response.status_code}",
                    user_id=user_id,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    request_id=request.state.request_id,
                    details={"method": request.method, "path": request.url.path},
                )
            return response
        except Exception as e:
            audit_logger.log_failure(
                AuditAction.ADMIN_ACTION,
                error_message=str(e),
                user_id=user_id,
                ip_address=ip_address,
                user_agent=user_agent,
                request_id=request.state.request_id,
                details={"method": request.method, "path": request.url.path},
            )
            raise

    def auth_dependency():
        """Create authentication dependency based on settings."""
        deps = []
        if settings.api_auth_enabled:
            deps.append(Depends(require_api_key(api_key_store)))
        if jwt_manager:
            # Use optional JWT dependency so it doesn't raise errors if token is missing
            jwt_dep = create_jwt_dependency_optional(jwt_manager)
            if jwt_dep:
                deps.append(jwt_dep)
        return deps if deps else None

    @app.get("/health")
    def health() -> dict:
        metrics.inc("acto.health.calls")
        return {"ok": True, "service": "acto", "version": __version__}

    @app.get("/metrics")
    def prometheus_metrics() -> Response:
        return Response(content=metrics.render_prometheus(), media_type="text/plain; version=0.0.4")

    @app.get("/v1/proofs")
    def list_proofs(limit: int = 50) -> dict:
        metrics.inc("acto.proofs.list")
        return {"items": registry.list(limit=limit)}

    @app.post("/v1/proofs", response_model=ProofSubmitResponse, dependencies=auth_dependency() or [])
    def submit(
        req: ProofSubmitRequest,
        request: Request,
    ) -> ProofSubmitResponse:
        # Get current user from request state (set by JWT middleware if authenticated)
        current_user = get_current_user_optional(request)
        try:
            # RBAC check
            if rbac_manager and current_user:
                rbac_manager.require_permission(current_user.get("roles", []), Permission.PROOF_WRITE)

            verify_proof(req.envelope)
            proof_id = registry.upsert(req.envelope)
            metrics.inc("acto.proofs.submit")

            # Audit log
            if audit_logger:
                audit_logger.log_success(
                    AuditAction.PROOF_CREATE,
                    user_id=current_user.get("user_id") if current_user else None,
                    resource_type="proof",
                    resource_id=proof_id,
                    request_id=getattr(request.state, "request_id", None),
                )

            return ProofSubmitResponse(proof_id=proof_id)
        except ProofError as e:
            metrics.inc("acto.proofs.submit.invalid")
            if audit_logger:
                audit_logger.log_failure(
                    AuditAction.PROOF_CREATE,
                    error_message=str(e),
                    user_id=current_user.get("user_id") if current_user else None,
                    request_id=getattr(request.state, "request_id", None),
                )
            raise HTTPException(status_code=400, detail=str(e)) from e
        except RegistryError as e:
            if audit_logger:
                audit_logger.log_failure(
                    AuditAction.PROOF_CREATE,
                    error_message=str(e),
                    user_id=current_user.get("user_id") if current_user else None,
                    request_id=getattr(request.state, "request_id", None),
                )
            raise HTTPException(status_code=500, detail=str(e)) from e

    @app.get("/v1/proofs/{proof_id}", dependencies=auth_dependency() or [])
    def get_proof(
        proof_id: str,
        request: Request,
    ) -> dict:
        # Get current user from request state (set by JWT middleware if authenticated)
        current_user = get_current_user_optional(request)
        try:
            # RBAC check
            if rbac_manager and current_user:
                rbac_manager.require_permission(current_user.get("roles", []), Permission.PROOF_READ)

            metrics.inc("acto.proofs.get")
            env = registry.get(proof_id)

            # Audit log
            if audit_logger:
                audit_logger.log_success(
                    AuditAction.PROOF_READ,
                    user_id=current_user.get("user_id") if current_user else None,
                    resource_type="proof",
                    resource_id=proof_id,
                    request_id=getattr(request.state, "request_id", None),
                )

            return {"proof_id": proof_id, "envelope": env.model_dump()}
        except RegistryError as e:
            if audit_logger:
                audit_logger.log_failure(
                    AuditAction.PROOF_READ,
                    error_message=str(e),
                    user_id=current_user.get("user_id") if current_user else None,
                    resource_id=proof_id,
                    request_id=getattr(request.state, "request_id", None),
                )
            raise HTTPException(status_code=404, detail=str(e)) from e

    @app.post("/v1/verify", response_model=VerifyResponse, dependencies=auth_dependency() or [])
    def verify(
        req: VerifyRequest,
        request: Request,
    ) -> VerifyResponse:
        # Get current user from request state (set by JWT middleware if authenticated)
        current_user = get_current_user_optional(request)
        try:
            verify_proof(req.envelope)
            metrics.inc("acto.verify.ok")

            # Audit log
            if audit_logger:
                audit_logger.log_success(
                    AuditAction.PROOF_VERIFY,
                    user_id=current_user.get("user_id") if current_user else None,
                    request_id=getattr(request.state, "request_id", None),
                )

            return VerifyResponse(valid=True, reason="ok")
        except ProofError as e:
            metrics.inc("acto.verify.fail")
            if audit_logger:
                audit_logger.log_failure(
                    AuditAction.PROOF_VERIFY,
                    error_message=str(e),
                    user_id=current_user.get("user_id") if current_user else None,
                    request_id=getattr(request.state, "request_id", None),
                )
            return VerifyResponse(valid=False, reason=str(e))

    @app.post("/v1/score", dependencies=auth_dependency() or [])
    def score(
        req: VerifyRequest,
        request: Request,
    ) -> dict:
        try:
            verify_proof(req.envelope)
            result = scorer.score(req.envelope)
            metrics.inc("acto.score.ok")
            return {"score": result.score, "reasons": result.reasons}
        except ProofError as e:
            metrics.inc("acto.score.fail")
            raise HTTPException(status_code=400, detail=str(e)) from e

    # OAuth2/JWT endpoints
    if jwt_manager:

        @app.post("/v1/auth/token")
        def create_token(username: str, password: str, roles: list[str] | None = None) -> dict:
            """Create access token (simplified - in production, verify credentials properly)."""
            # In production, verify username/password against user database
            access_token = jwt_manager.create_access_token(subject=username, roles=roles or ["user"])
            refresh_token = jwt_manager.create_refresh_token(subject=username)
            token_response = OAuth2TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=settings.jwt_access_token_expire_minutes * 60,
            )
            return token_response.to_dict()

        @app.post("/v1/auth/refresh")
        def refresh_token(refresh_token: str) -> dict:
            """Refresh access token."""
            new_access_token = jwt_manager.refresh_access_token(refresh_token)
            token_response = OAuth2TokenResponse(
                access_token=new_access_token,
                expires_in=settings.jwt_access_token_expire_minutes * 60,
            )
            return token_response.to_dict()

    @app.post("/v1/access/check", response_model=AccessCheckResponse)
    def access_check(req: AccessCheckRequest) -> AccessCheckResponse:
        try:
            gate = SolanaTokenGate(rpc_url=req.rpc_url)
            decision = gate.decide(owner=req.owner, mint=req.mint, minimum=req.minimum)
            metrics.inc("acto.access.check")
            return AccessCheckResponse(**decision.model_dump())
        except AccessError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e

    return app
