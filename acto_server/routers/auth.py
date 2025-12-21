# ACTO Server - Authentication Router
# Wallet connection and JWT authentication endpoints

from fastapi import APIRouter, Depends, HTTPException, Request

from acto.access import SolanaTokenGate
from acto.security import (
    JWTManager,
    OAuth2TokenResponse,
    get_current_user_optional,
    require_jwt,
)
from acto.security.user_store import UserStore
from acto.security.wallet_auth import create_wallet_challenge, verify_wallet_challenge

from ..schemas import (
    WalletConnectRequest,
    WalletConnectResponse,
    WalletVerifyRequest,
    WalletVerifyResponse,
)

router = APIRouter(prefix="/v1/auth", tags=["authentication"])


def create_auth_router(
    jwt_manager: JWTManager,
    user_store: UserStore,
    settings,
) -> APIRouter:
    """Create authentication router with dependencies."""
    
    @router.post("/wallet/connect", response_model=WalletConnectResponse)
    def wallet_connect(req: WalletConnectRequest) -> WalletConnectResponse:
        """Initiate wallet connection by generating a challenge."""
        challenge = create_wallet_challenge(req.wallet_address)
        return WalletConnectResponse(
            challenge=challenge,
            message=challenge
        )

    @router.post("/wallet/verify", response_model=WalletVerifyResponse)
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

    @router.get("/me", dependencies=[Depends(require_jwt(jwt_manager))])
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

    @router.post("/token")
    def create_token(username: str, password: str, roles: list[str] | None = None) -> dict:
        """Create access token (simplified - in production, verify credentials properly)."""
        access_token = jwt_manager.create_access_token(subject=username, roles=roles or ["user"])
        refresh_token = jwt_manager.create_refresh_token(subject=username)
        token_response = OAuth2TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.jwt_access_token_expire_minutes * 60,
        )
        return token_response.to_dict()

    @router.post("/refresh")
    def refresh_token(refresh_token: str) -> dict:
        """Refresh access token."""
        new_access_token = jwt_manager.refresh_access_token(refresh_token)
        token_response = OAuth2TokenResponse(
            access_token=new_access_token,
            expires_in=settings.jwt_access_token_expire_minutes * 60,
        )
        return token_response.to_dict()

    return router

