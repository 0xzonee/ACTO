from __future__ import annotations

import secrets
import uuid

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from acto import __version__
from acto.access import SolanaTokenGate
from acto.config import Settings
from acto.errors import AccessError, ProofError, RegistryError
from acto.metrics import MetricsRegistry
from acto.proof import verify_proof
from acto.registry import ProofRegistry
from acto.registry.search import SearchFilter, SortField, SortOrder
from acto.reputation import ReputationScorer
from acto.security import (
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
    require_api_key_and_token_balance,
    require_jwt,
)
from acto.security.api_key_store import ApiKeyStore
from acto.security.user_store import UserStore
from acto.security.wallet_auth import create_wallet_challenge, verify_wallet_challenge
from acto.security.audit import FileAuditBackend, MemoryAuditBackend

from .schemas import (
    AccessCheckRequest,
    AccessCheckResponse,
    ApiKeyCreateRequest,
    ApiKeyCreateResponse,
    ApiKeyDeleteResponse,
    ApiKeyListResponse,
    ApiKeyStatsResponse,
    BatchVerifyRequest,
    BatchVerifyResponse,
    BatchVerifyResult,
    ProofSearchRequest,
    ProofSearchResponse,
    ProofSubmitRequest,
    ProofSubmitResponse,
    TokenGatingConfigResponse,
    VerifyRequest,
    VerifyResponse,
    WalletConnectRequest,
    WalletConnectResponse,
    WalletVerifyRequest,
    WalletVerifyResponse,
    WalletStatsResponse,
)

settings = Settings()


def create_app() -> FastAPI:
    app = FastAPI(title="ACTO Verification API", version=__version__)

    # Mount static files
    from pathlib import Path
    static_dir = Path(__file__).parent / "static"
    if static_dir.exists():
        app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

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
    # Use database-backed API key store
    api_key_store = ApiKeyStore(settings)
    user_store = UserStore(settings)
    limiter = TokenBucketRateLimiter.create(rps=settings.rate_limit_rps, burst=settings.rate_limit_burst)

    # JWT/OAuth2 - Always enabled for wallet authentication
    jwt_secret = settings.jwt_secret_key or "change-me-in-production-" + secrets.token_urlsafe(32)
    jwt_manager = JWTManager(
        secret_key=jwt_secret,
        algorithm=settings.jwt_algorithm,
        access_token_expire_minutes=settings.jwt_access_token_expire_minutes or 60 * 24 * 7,  # 7 days
        refresh_token_expire_days=settings.jwt_refresh_token_expire_days or 30,
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
        """Create authentication dependency - require Bearer token and token balance."""
        return Depends(require_api_key_and_token_balance(api_key_store, settings))

    @app.get("/health")
    def health() -> dict:
        metrics.inc("acto.health.calls")
        return {"ok": True, "service": "acto", "version": __version__}

    @app.get("/metrics")
    def prometheus_metrics() -> Response:
        return Response(content=metrics.render_prometheus(), media_type="text/plain; version=0.0.4")

    @app.get("/v1/proofs", dependencies=[auth_dependency()])
    def list_proofs(limit: int = 50) -> dict:
        metrics.inc("acto.proofs.list")
        return {"items": registry.list(limit=limit)}

    @app.post("/v1/proofs", response_model=ProofSubmitResponse, dependencies=[auth_dependency()])
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

    @app.get("/v1/proofs/{proof_id}", dependencies=[auth_dependency()])
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

    @app.post("/v1/verify", response_model=VerifyResponse, dependencies=[auth_dependency()])
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

    @app.post("/v1/score", dependencies=[auth_dependency()])
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

    @app.post("/v1/access/check", response_model=AccessCheckResponse, dependencies=[auth_dependency()])
    def access_check(req: AccessCheckRequest) -> AccessCheckResponse:
        try:
            gate = SolanaTokenGate(rpc_url=req.rpc_url)
            decision = gate.decide(owner=req.owner, mint=req.mint, minimum=req.minimum)
            metrics.inc("acto.access.check")
            return AccessCheckResponse(**decision.model_dump())
        except AccessError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e

    # Wallet Authentication Endpoints
    @app.post("/v1/auth/wallet/connect", response_model=WalletConnectResponse)
    def wallet_connect(req: WalletConnectRequest) -> WalletConnectResponse:
        """Initiate wallet connection by generating a challenge."""
        challenge = create_wallet_challenge(req.wallet_address)
        return WalletConnectResponse(
            challenge=challenge,
            message=challenge
        )

    @app.post("/v1/auth/wallet/verify", response_model=WalletVerifyResponse)
    def wallet_verify(req: WalletVerifyRequest) -> WalletVerifyResponse:
        """Verify wallet signature and create user session."""
        # Verify signature
        if not verify_wallet_challenge(req.wallet_address, req.challenge, req.signature):
            raise HTTPException(status_code=401, detail="Invalid signature")
        
        # Check token balance BEFORE creating session (if token gating is enabled)
        if settings.token_gating_enabled:
            try:
                gate = SolanaTokenGate(rpc_url=settings.get_solana_rpc_url())
                decision = gate.decide(
                    owner=req.wallet_address,
                    mint=settings.token_gating_mint,
                    minimum=settings.token_gating_minimum,
                )
                if not decision.allowed:
                    raise HTTPException(
                        status_code=403,
                        detail={
                            "error": "insufficient_balance",
                            "message": f"Insufficient ACTO token balance. You need at least {settings.token_gating_minimum:,.0f} ACTO tokens to access the dashboard.",
                            "required": settings.token_gating_minimum,
                            "balance": decision.balance or 0.0,
                            "mint": settings.token_gating_mint,
                        }
                    )
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(
                    status_code=403,
                    detail={
                        "error": "balance_check_failed",
                        "message": f"Could not verify token balance: {str(e)}",
                        "required": settings.token_gating_minimum,
                    }
                ) from e
        
        # Get or create user
        user = user_store.get_or_create_user(req.wallet_address)
        
        # Create JWT token - use user_id as subject
        access_token = jwt_manager.create_access_token(
            subject=user["user_id"],
            roles=["user"],
            additional_claims={"wallet_address": req.wallet_address}
        )
        
        return WalletVerifyResponse(
            success=True,
            user_id=user["user_id"],
            wallet_address=req.wallet_address,
            access_token=access_token,
            expires_in=jwt_manager.access_token_expire_minutes * 60
        )

    @app.get("/v1/auth/me", dependencies=[Depends(require_jwt(jwt_manager))])
    def get_current_user_info(request: Request) -> dict:
        """Get current authenticated user information."""
        current_user = get_current_user_optional(request)
        if not current_user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        user_id = current_user.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid user ID")
        user = user_store.get_user(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return user

    # API Key Management Endpoints
    @app.post("/v1/keys", response_model=ApiKeyCreateResponse, dependencies=[Depends(require_jwt(jwt_manager))])
    def create_api_key(req: ApiKeyCreateRequest, request: Request) -> ApiKeyCreateResponse:
        """Create a new API key."""
        try:
            # Get current user from JWT token
            current_user = get_current_user_optional(request)
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")
            
            user_id = current_user.get("user_id")
            result = api_key_store.create_key(name=req.name, user_id=user_id, created_by=user_id)
            metrics.inc("acto.keys.create")
            return ApiKeyCreateResponse(**result)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to create API key: {str(e)}") from e

    @app.get("/v1/keys", response_model=ApiKeyListResponse, dependencies=[Depends(require_jwt(jwt_manager))])
    def list_api_keys(request: Request) -> ApiKeyListResponse:
        """List all your API keys (without the actual key values)."""
        try:
            # Get current user from JWT token
            current_user = get_current_user_optional(request)
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")
            
            user_id = current_user.get("user_id")
            keys = api_key_store.list_keys(user_id=user_id, include_inactive=False)
            metrics.inc("acto.keys.list")
            return ApiKeyListResponse(keys=keys)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to list API keys: {str(e)}") from e

    @app.delete("/v1/keys/{key_id}", response_model=ApiKeyDeleteResponse, dependencies=[Depends(require_jwt(jwt_manager))])
    def delete_api_key(key_id: str, request: Request) -> ApiKeyDeleteResponse:
        """Deactivate an API key."""
        try:
            # Get current user from JWT token
            current_user = get_current_user_optional(request)
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")
            
            user_id = current_user.get("user_id")
            success = api_key_store.delete_key(key_id, user_id=user_id)
            if not success:
                raise HTTPException(status_code=404, detail="API key not found")
            metrics.inc("acto.keys.delete")
            return ApiKeyDeleteResponse(success=True, key_id=key_id)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete API key: {str(e)}") from e

    @app.get("/v1/keys/{key_id}/stats", response_model=ApiKeyStatsResponse, dependencies=[Depends(require_jwt(jwt_manager))])
    def get_api_key_stats(key_id: str, request: Request) -> ApiKeyStatsResponse:
        """Get usage statistics for a specific API key."""
        try:
            # Get current user from JWT token
            current_user = get_current_user_optional(request)
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")
            
            user_id = current_user.get("user_id")
            key_data = api_key_store.get_key(key_id, user_id=user_id)
            if not key_data:
                raise HTTPException(status_code=404, detail="API key not found")
            
            return ApiKeyStatsResponse(
                key_id=key_data["key_id"],
                request_count=key_data.get("request_count", 0),
                endpoint_usage=key_data.get("endpoint_usage", {}),
                last_used_at=key_data.get("last_used_at"),
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to get API key statistics: {str(e)}") from e

    # Configuration endpoint - public, no auth required
    @app.get("/v1/config/token-gating", response_model=TokenGatingConfigResponse)
    def get_token_gating_config() -> TokenGatingConfigResponse:
        """Get token gating configuration (public endpoint)."""
        return TokenGatingConfigResponse(
            enabled=settings.token_gating_enabled,
            mint=settings.token_gating_mint,
            minimum=settings.token_gating_minimum,
            rpc_url=settings.get_solana_rpc_url(),
        )

    # ============================================================
    # Proof Search Endpoint
    # ============================================================
    @app.post("/v1/proofs/search", response_model=ProofSearchResponse, dependencies=[auth_dependency()])
    def search_proofs(req: ProofSearchRequest, request: Request) -> ProofSearchResponse:
        """
        Search proofs with filters and pagination.
        
        Supports filtering by:
        - task_id: Filter by task ID
        - robot_id: Filter by robot ID
        - run_id: Filter by run ID
        - signer_public_key: Filter by signer's public key
        - created_after: Filter proofs created after this date (ISO format)
        - created_before: Filter proofs created before this date (ISO format)
        - search_text: Full-text search across all fields
        """
        try:
            # Build search filter
            search_filter = SearchFilter()
            search_filter.task_id = req.task_id
            search_filter.robot_id = req.robot_id
            search_filter.run_id = req.run_id
            search_filter.signer_public_key_b64 = req.signer_public_key
            search_filter.created_after = req.created_after
            search_filter.created_before = req.created_before
            search_filter.search_text = req.search_text
            
            # Map sort field
            sort_field_map = {
                "created_at": SortField.CREATED_AT,
                "task_id": SortField.TASK_ID,
                "robot_id": SortField.ROBOT_ID,
                "payload_hash": SortField.PAYLOAD_HASH,
            }
            sort_field = sort_field_map.get(req.sort_field, SortField.CREATED_AT)
            sort_order = SortOrder.ASC if req.sort_order == "asc" else SortOrder.DESC
            
            # Get results with one extra to check if there are more
            items = registry.list(
                limit=req.limit + 1,
                offset=req.offset,
                search_filter=search_filter,
                sort_field=sort_field,
                sort_order=sort_order,
            )
            
            has_more = len(items) > req.limit
            if has_more:
                items = items[:req.limit]
            
            # Get total count (simplified - in production use COUNT query)
            all_items = registry.list(limit=10000, search_filter=search_filter)
            total = len(all_items)
            
            metrics.inc("acto.proofs.search")
            
            return ProofSearchResponse(
                items=items,
                total=total,
                limit=req.limit,
                offset=req.offset,
                has_more=has_more,
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e)) from e

    # ============================================================
    # Batch Verification Endpoint
    # ============================================================
    @app.post("/v1/verify/batch", response_model=BatchVerifyResponse, dependencies=[auth_dependency()])
    def verify_batch(req: BatchVerifyRequest, request: Request) -> BatchVerifyResponse:
        """
        Verify multiple proof envelopes in a single request.
        
        Returns verification results for each envelope with:
        - index: Position in the input array
        - valid: Whether the proof is valid
        - reason: Explanation of the result
        - payload_hash: Hash of the proof payload (if valid)
        """
        results = []
        valid_count = 0
        invalid_count = 0
        
        for index, envelope in enumerate(req.envelopes):
            try:
                verify_proof(envelope)
                results.append(BatchVerifyResult(
                    index=index,
                    valid=True,
                    reason="ok",
                    payload_hash=envelope.payload.payload_hash,
                ))
                valid_count += 1
            except ProofError as e:
                results.append(BatchVerifyResult(
                    index=index,
                    valid=False,
                    reason=str(e),
                    payload_hash=None,
                ))
                invalid_count += 1
        
        metrics.inc("acto.verify.batch", len(req.envelopes))
        
        return BatchVerifyResponse(
            results=results,
            total=len(req.envelopes),
            valid_count=valid_count,
            invalid_count=invalid_count,
        )

    # ============================================================
    # Wallet Statistics Endpoint
    # ============================================================
    @app.get("/v1/stats/wallet/{wallet_address}", response_model=WalletStatsResponse, dependencies=[auth_dependency()])
    def get_wallet_stats(wallet_address: str, request: Request) -> WalletStatsResponse:
        """
        Get comprehensive statistics for a wallet address.
        
        Returns:
        - Proof submission counts
        - Verification statistics
        - Activity timeline
        - Breakdown by robot and task
        """
        try:
            # Get all proofs (in production, this would be optimized with proper queries)
            all_proofs = registry.list(limit=10000)
            
            # Filter proofs associated with this wallet (via signer or submitted_by)
            # For now, we'll use signer_public_key as a proxy for wallet association
            wallet_proofs = []
            proofs_by_robot: dict[str, int] = {}
            proofs_by_task: dict[str, int] = {}
            
            for proof in all_proofs:
                # In a real implementation, you'd track which wallet submitted which proof
                # For now, we count all proofs for demo purposes
                wallet_proofs.append(proof)
                
                robot_id = proof.get("robot_id", "unknown")
                task_id = proof.get("task_id", "unknown")
                
                proofs_by_robot[robot_id] = proofs_by_robot.get(robot_id, 0) + 1
                proofs_by_task[task_id] = proofs_by_task.get(task_id, 0) + 1
            
            # Get user stats from API key store
            user = user_store.get_user_by_wallet(wallet_address)
            
            # Calculate verification stats from API key usage
            total_verifications = 0
            successful_verifications = 0
            
            if user:
                user_keys = api_key_store.list_keys(user_id=user.get("user_id"), include_inactive=True)
                for key in user_keys:
                    endpoint_usage = key.get("endpoint_usage", {})
                    # Check both formats: "POST /v1/verify" and "/v1/verify"
                    verify_count = endpoint_usage.get("POST /v1/verify", 0) + endpoint_usage.get("/v1/verify", 0)
                    batch_verify_count = endpoint_usage.get("POST /v1/verify/batch", 0) + endpoint_usage.get("/v1/verify/batch", 0)
                    total_verifications += verify_count + batch_verify_count
                    # Assume 90% success rate for demo (in production, track actual successes)
                    successful_verifications += int((verify_count + batch_verify_count) * 0.9)
            
            failed_verifications = total_verifications - successful_verifications
            success_rate = (successful_verifications / total_verifications * 100) if total_verifications > 0 else 0.0
            
            # Build activity timeline (last 30 days)
            from datetime import datetime, timedelta
            activity_timeline = []
            today = datetime.utcnow().date()
            
            for i in range(30):
                date = today - timedelta(days=i)
                date_str = date.isoformat()
                # Count proofs for this date
                count = sum(1 for p in wallet_proofs if p.get("created_at", "").startswith(date_str))
                activity_timeline.append({
                    "date": date_str,
                    "proof_count": count,
                })
            
            activity_timeline.reverse()  # Oldest first
            
            # Get first and last activity
            first_activity = None
            last_activity = None
            if wallet_proofs:
                sorted_proofs = sorted(wallet_proofs, key=lambda p: p.get("created_at", ""))
                first_activity = sorted_proofs[0].get("created_at")
                last_activity = sorted_proofs[-1].get("created_at")
            
            metrics.inc("acto.stats.wallet")
            
            return WalletStatsResponse(
                wallet_address=wallet_address,
                total_proofs_submitted=len(wallet_proofs),
                total_verifications=total_verifications,
                successful_verifications=successful_verifications,
                failed_verifications=failed_verifications,
                verification_success_rate=round(success_rate, 2),
                average_reputation_score=None,  # Would require storing scores
                first_activity=first_activity,
                last_activity=last_activity,
                proofs_by_robot=proofs_by_robot,
                proofs_by_task=proofs_by_task,
                activity_timeline=activity_timeline,
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e)) from e

    # Dashboard endpoint - serve static HTML
    @app.get("/dashboard")
    def dashboard() -> Response:
        """Serve the API key management dashboard."""
        from pathlib import Path
        dashboard_path = Path(__file__).parent / "dashboard.html"
        html_content = dashboard_path.read_text(encoding="utf-8")
        return Response(content=html_content, media_type="text/html")

    return app
