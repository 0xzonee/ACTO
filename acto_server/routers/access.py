# ACTO Server - Access Control Router
# Token balance check and access control endpoints

from fastapi import APIRouter, Depends, HTTPException

from acto.access import SolanaTokenGate
from acto.errors import AccessError
from acto.metrics import MetricsRegistry
from acto.security import require_api_key_and_token_balance
from acto.security.api_key_store import ApiKeyStore

from ..schemas import (
    AccessCheckRequest,
    AccessCheckResponse,
    TokenGatingConfigResponse,
)

router = APIRouter(prefix="/v1", tags=["access"])


def create_access_router(
    api_key_store: ApiKeyStore,
    metrics: MetricsRegistry,
    settings,
) -> APIRouter:
    """Create access control router with dependencies."""
    
    auth_dep = Depends(require_api_key_and_token_balance(api_key_store, settings))

    @router.post("/access/check", response_model=AccessCheckResponse, dependencies=[auth_dep])
    def access_check(req: AccessCheckRequest) -> AccessCheckResponse:
        """Check if a wallet has sufficient token balance for access."""
        try:
            # Use backend RPC config (Helius) if no custom RPC provided
            rpc_url = req.rpc_url if req.rpc_url else settings.get_solana_rpc_url()
            gate = SolanaTokenGate(rpc_url=rpc_url)
            decision = gate.decide(owner=req.owner, mint=req.mint, minimum=req.minimum)
            metrics.inc("acto.access.check")
            return AccessCheckResponse(**decision.model_dump())
        except AccessError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e

    @router.get("/config/token-gating", response_model=TokenGatingConfigResponse)
    def get_token_gating_config() -> TokenGatingConfigResponse:
        """Get token gating configuration (public endpoint)."""
        return TokenGatingConfigResponse(
            enabled=settings.token_gating_enabled,
            mint=settings.token_gating_mint,
            minimum=settings.token_gating_minimum,
            rpc_url=settings.get_solana_rpc_url(),
        )

    return router

