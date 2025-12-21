# ACTO Server - Fleet Router
# Fleet management endpoints (JWT authenticated)

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request

from acto.registry import ProofRegistry
from acto.security import JWTManager, get_current_user_optional, require_jwt

router = APIRouter(prefix="/v1/fleet", tags=["fleet"])


def create_fleet_router(
    registry: ProofRegistry,
    jwt_manager: JWTManager,
) -> APIRouter:
    """Create fleet router with dependencies."""
    
    jwt_dep = Depends(require_jwt(jwt_manager))

    @router.get("", dependencies=[jwt_dep])
    def get_fleet(request: Request) -> dict:
        """
        Get fleet data for the authenticated user's wallet.
        Uses JWT authentication (not API key) so fleet is tied to wallet.
        """
        try:
            current_user = get_current_user_optional(request)
            if not current_user:
                raise HTTPException(status_code=401, detail="Not authenticated")
            
            # Get wallet address from JWT claims
            token_payload = getattr(request.state, "token_payload", {})
            wallet_address = token_payload.get("wallet_address")
            
            if not wallet_address:
                raise HTTPException(status_code=400, detail="Wallet address not found in token")
            
            # Get all proofs from registry
            all_proofs = registry.list(limit=10000)
            
            # Build fleet data from proofs
            devices: dict[str, dict] = {}
            
            for proof in all_proofs:
                robot_id = proof.get("robot_id", "unknown")
                if robot_id == "unknown":
                    continue
                
                if robot_id not in devices:
                    devices[robot_id] = {
                        "id": robot_id,
                        "name": robot_id.replace("-", " ").replace("_", " ").title(),
                        "proof_count": 0,
                        "task_ids": set(),
                        "last_activity": None,
                    }
                
                device = devices[robot_id]
                device["proof_count"] += 1
                
                task_id = proof.get("task_id")
                if task_id:
                    device["task_ids"].add(task_id)
                
                created_at = proof.get("created_at")
                if created_at:
                    if not device["last_activity"] or created_at > device["last_activity"]:
                        device["last_activity"] = created_at
            
            # Convert sets to counts and lists
            device_list = []
            total_proofs = 0
            total_tasks = set()
            
            for device in devices.values():
                total_proofs += device["proof_count"]
                total_tasks.update(device["task_ids"])
                device_list.append({
                    "id": device["id"],
                    "name": device["name"],
                    "proof_count": device["proof_count"],
                    "task_count": len(device["task_ids"]),
                    "last_activity": device["last_activity"],
                })
            
            # Sort by last activity (most recent first)
            device_list.sort(key=lambda d: d["last_activity"] or "", reverse=True)
            
            # Count active devices (activity in last 24 hours)
            now = datetime.now(timezone.utc)
            one_day_ago = now - timedelta(hours=24)
            
            active_count = 0
            for device in device_list:
                if device["last_activity"]:
                    try:
                        last_dt = datetime.fromisoformat(device["last_activity"].replace("Z", "+00:00"))
                        if last_dt > one_day_ago:
                            active_count += 1
                    except (ValueError, TypeError):
                        pass
            
            return {
                "devices": device_list,
                "summary": {
                    "total_devices": len(device_list),
                    "active_devices": active_count,
                    "total_proofs": total_proofs,
                    "total_tasks": len(total_tasks),
                }
            }
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e)) from e

    return router

