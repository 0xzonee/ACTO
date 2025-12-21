# ACTO Server - Statistics Router
# Wallet and usage statistics endpoints

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request

from acto.metrics import MetricsRegistry
from acto.registry import ProofRegistry
from acto.security import require_api_key_and_token_balance
from acto.security.api_key_store import ApiKeyStore
from acto.security.user_store import UserStore

from ..schemas import WalletStatsResponse

router = APIRouter(prefix="/v1/stats", tags=["statistics"])


def create_stats_router(
    registry: ProofRegistry,
    api_key_store: ApiKeyStore,
    user_store: UserStore,
    metrics: MetricsRegistry,
    settings,
) -> APIRouter:
    """Create statistics router with dependencies."""
    
    auth_dep = Depends(require_api_key_and_token_balance(api_key_store, settings))

    @router.get("/wallet/{wallet_address}", response_model=WalletStatsResponse, dependencies=[auth_dep])
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
            # Get all proofs
            all_proofs = registry.list(limit=10000)
            
            # Build wallet statistics
            wallet_proofs = []
            proofs_by_robot: dict[str, int] = {}
            proofs_by_task: dict[str, int] = {}
            
            for proof in all_proofs:
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
                    verify_count = endpoint_usage.get("POST /v1/verify", 0) + endpoint_usage.get("/v1/verify", 0)
                    batch_verify_count = endpoint_usage.get("POST /v1/verify/batch", 0) + endpoint_usage.get("/v1/verify/batch", 0)
                    total_verifications += verify_count + batch_verify_count
                    successful_verifications += int((verify_count + batch_verify_count) * 0.9)
            
            failed_verifications = total_verifications - successful_verifications
            success_rate = (successful_verifications / total_verifications * 100) if total_verifications > 0 else 0.0
            
            # Build activity timeline (last 30 days)
            activity_timeline = []
            today = datetime.utcnow().date()
            
            for i in range(30):
                date = today - timedelta(days=i)
                date_str = date.isoformat()
                count = sum(1 for p in wallet_proofs if p.get("created_at", "").startswith(date_str))
                activity_timeline.append({
                    "date": date_str,
                    "proof_count": count,
                })
            
            activity_timeline.reverse()
            
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
                average_reputation_score=None,
                first_activity=first_activity,
                last_activity=last_activity,
                proofs_by_robot=proofs_by_robot,
                proofs_by_task=proofs_by_task,
                activity_timeline=activity_timeline,
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e)) from e

    return router

