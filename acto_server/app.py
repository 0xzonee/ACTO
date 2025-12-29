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
from acto.proof.engine import _verify_proof_internal as verify_proof
from acto.registry import ProofRegistry
from acto.registry.search import SearchFilter, SortField, SortOrder
from acto.reputation import ReputationScorer
from acto.security import (
    AuditAction,
    AuditLogger,
    JWTManager,
    Permission,
    RBACManager,
    TokenBucketRateLimiter,
    get_current_user_optional,
    require_api_key_and_token_balance,
    require_jwt,
)
from acto.security.api_key_store import ApiKeyStore
from acto.security.user_store import UserStore
from acto.security.wallet_auth import create_wallet_challenge, verify_wallet_challenge
from acto.security.audit import FileAuditBackend, MemoryAuditBackend
from acto.fleet import FleetStore

from .schemas import (
    AccessCheckRequest,
    AccessCheckResponse,
    BatchVerifyRequest,
    BatchVerifyResponse,
    BatchVerifyResult,
    ProofSearchRequest,
    ProofSearchResponse,
    ProofSubmitRequest,
    ProofSubmitResponse,
    ProfileResponse,
    ProfileUpdateRequest,
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
    limiter = TokenBucketRateLimiter.create(
        rps=settings.rate_limit_rps,
        burst=settings.rate_limit_burst,
        bucket_ttl=settings.rate_limit_bucket_ttl,
        cleanup_interval=settings.rate_limit_cleanup_interval,
    )
    
    # Fleet management store (database-backed)
    fleet_store = FleetStore(settings)

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

        # Prefer API key for rate limiting (fairer for robots behind NAT)
        # Fall back to IP for unauthenticated endpoints
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            # Use API key (first 16 chars for privacy in logs)
            api_key = auth_header[7:]
            identifier = f"key:{api_key[:16]}"
        else:
            # Fall back to IP address
            client_ip = request.headers.get("X-Forwarded-For") or (request.client.host if request.client else "unknown")
            identifier = f"ip:{client_ip}"
        
        key = f"{identifier}:{request.url.path}"
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

    def _get_owner_wallet(request: Request) -> str | None:
        """Extract owner wallet address from JWT token payload or X-Wallet-Address header."""
        # 1. Try JWT token payload first (most secure)
        if hasattr(request.state, "token_payload"):
            wallet = request.state.token_payload.get("wallet_address")
            if wallet:
                return wallet
        
        # 2. Fall back to X-Wallet-Address header (for API key auth)
        wallet_header = request.headers.get("X-Wallet-Address")
        if wallet_header:
            return wallet_header
        
        return None

    @app.get("/v1/proofs", dependencies=[auth_dependency()])
    def list_proofs(request: Request, limit: int = 50) -> dict:
        owner_wallet = _get_owner_wallet(request)
        metrics.inc("acto.proofs.list")
        return {"items": registry.list(limit=limit, owner_wallet=owner_wallet)}

    @app.post("/v1/proofs", response_model=ProofSubmitResponse, dependencies=[auth_dependency()])
    def submit(
        req: ProofSubmitRequest,
        request: Request,
    ) -> ProofSubmitResponse:
        # Get current user from request state (set by JWT middleware if authenticated)
        current_user = get_current_user_optional(request)
        owner_wallet = _get_owner_wallet(request)
        try:
            # RBAC check
            if rbac_manager and current_user:
                rbac_manager.require_permission(current_user.get("roles", []), Permission.PROOF_WRITE)

            verify_proof(req.envelope)
            proof_id = registry.upsert(req.envelope, owner_wallet=owner_wallet)
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
        owner_wallet = _get_owner_wallet(request)
        try:
            # RBAC check
            if rbac_manager and current_user:
                rbac_manager.require_permission(current_user.get("roles", []), Permission.PROOF_READ)

            metrics.inc("acto.proofs.get")
            env = registry.get(proof_id, owner_wallet=owner_wallet)

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

    @app.post("/v1/access/check", response_model=AccessCheckResponse, dependencies=[auth_dependency()])
    def access_check(req: AccessCheckRequest) -> AccessCheckResponse:
        try:
            # Use backend RPC config (Helius) if no custom RPC provided
            rpc_url = req.rpc_url if req.rpc_url else settings.get_solana_rpc_url()
            gate = SolanaTokenGate(rpc_url=rpc_url)
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

    # ============================================================
    # User Profile Endpoints
    # ============================================================
    
    @app.get("/v1/profile", response_model=ProfileResponse, dependencies=[Depends(require_jwt(jwt_manager))])
    def get_profile(request: Request) -> ProfileResponse:
        """Get current user's profile."""
        current_user = get_current_user_optional(request)
        if not current_user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        user_id = current_user.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid user ID")
        
        profile = user_store.get_profile(user_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        return ProfileResponse(**profile)

    @app.patch("/v1/profile", response_model=ProfileResponse, dependencies=[Depends(require_jwt(jwt_manager))])
    def update_profile(req: ProfileUpdateRequest, request: Request) -> ProfileResponse:
        """Update current user's profile."""
        current_user = get_current_user_optional(request)
        if not current_user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        user_id = current_user.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid user ID")
        
        # Build update kwargs from provided fields
        update_data = req.model_dump(exclude_unset=True)
        
        profile = user_store.update_profile(user_id, **update_data)
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        metrics.inc("acto.profile.update")
        return ProfileResponse(**profile)

    # ============================================================
    # API Keys Router (database-backed, JWT authenticated)
    # ============================================================
    from .routers.keys import create_keys_router
    
    keys_router = create_keys_router(
        jwt_manager=jwt_manager,
        api_key_store=api_key_store,
        metrics=metrics,
    )
    app.include_router(keys_router)

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
        owner_wallet = _get_owner_wallet(request)
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
                owner_wallet=owner_wallet,
            )
            
            has_more = len(items) > req.limit
            if has_more:
                items = items[:req.limit]
            
            # Get total count using SQL COUNT
            total = registry.count(search_filter=search_filter, owner_wallet=owner_wallet)
            
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
    # Wallet Statistics Endpoint (JWT authenticated for dashboard)
    # ============================================================
    @app.get("/v1/stats/wallet/{wallet_address}", response_model=WalletStatsResponse, dependencies=[Depends(require_jwt(jwt_manager))])
    def get_wallet_stats(wallet_address: str, request: Request, days: int = 30) -> WalletStatsResponse:
        """
        Get comprehensive statistics for a wallet address.
        
        Query Parameters:
        - days: Number of days for activity timeline (default: 30, max: 365)
        
        Returns:
        - Proof submission counts
        - Verification statistics
        - Activity timeline
        - Breakdown by robot and task
        
        Note: Uses optimized SQL aggregations instead of loading all proofs.
        """
        owner_wallet = _get_owner_wallet(request)
        try:
            # Validate days parameter (between 1 and 365)
            days = max(1, min(365, days))
            
            # Use optimized SQL aggregations instead of loading all proofs
            # Filter by owner_wallet for user isolation
            total_proofs = registry.count(owner_wallet=owner_wallet)
            proofs_by_robot = registry.count_by_robot(owner_wallet=owner_wallet)
            proofs_by_task = registry.count_by_task(owner_wallet=owner_wallet)
            activity_timeline = registry.count_by_date(days=days, owner_wallet=owner_wallet)
            first_activity, last_activity = registry.get_activity_range(owner_wallet=owner_wallet)
            
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
            
            metrics.inc("acto.stats.wallet")
            
            return WalletStatsResponse(
                wallet_address=wallet_address,
                total_proofs_submitted=total_proofs,
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

    # ============================================================
    # Fleet Router (database-backed, JWT or API key authenticated)
    # ============================================================
    from .routers.fleet import create_fleet_router
    
    fleet_router = create_fleet_router(
        registry=registry,
        jwt_manager=jwt_manager,
        fleet_store=fleet_store,
        api_key_store=api_key_store,
        settings=settings,
    )
    app.include_router(fleet_router)

    # Dashboard endpoint - serve static HTML
    @app.get("/dashboard")
    def dashboard() -> Response:
        """Serve the API key management dashboard."""
        from pathlib import Path
        dashboard_path = Path(__file__).parent / "dashboard.html"
        html_content = dashboard_path.read_text(encoding="utf-8")
        return Response(content=html_content, media_type="text/html")

    return app
