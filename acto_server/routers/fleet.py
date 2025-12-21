# ACTO Server - Fleet Router
# Fleet management endpoints (JWT authenticated)
# Features: Device Details, Groups, Rename, Health Monitoring
# All data is persisted to database with optional fields

from datetime import datetime, timedelta, timezone
from typing import Optional
import json

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from acto.registry import ProofRegistry
from acto.security import JWTManager, get_current_user_optional, require_jwt
from acto.fleet import FleetStore

router = APIRouter(prefix="/v1/fleet", tags=["fleet"])


# ============================================================
# Pydantic Models for Fleet Management
# ============================================================

class DeviceRenameRequest(BaseModel):
    """Request to rename a device."""
    name: str = Field(..., min_length=1, max_length=256)


class DeviceUpdateRequest(BaseModel):
    """Request to update device metadata."""
    custom_name: Optional[str] = Field(None, max_length=256)
    description: Optional[str] = Field(None, max_length=1000)
    device_type: Optional[str] = Field(None, max_length=64)


class GroupCreateRequest(BaseModel):
    """Request to create a device group."""
    name: str = Field(..., min_length=1, max_length=256)
    description: Optional[str] = Field(None, max_length=500)
    color: Optional[str] = Field(None, max_length=7)  # Hex color
    icon: Optional[str] = Field(None, max_length=64)


class GroupUpdateRequest(BaseModel):
    """Request to update a device group."""
    name: Optional[str] = Field(None, min_length=1, max_length=256)
    description: Optional[str] = Field(None, max_length=500)
    color: Optional[str] = Field(None, max_length=7)
    icon: Optional[str] = Field(None, max_length=64)


class GroupAssignRequest(BaseModel):
    """Request to assign/unassign devices to a group."""
    device_ids: list[str]


class DeviceHealthUpdateRequest(BaseModel):
    """
    Request to update device health metrics.
    All fields are optional - devices only send what they support.
    """
    # CPU metrics (optional)
    cpu_percent: Optional[float] = Field(None, ge=0, le=100)
    cpu_temperature: Optional[float] = None
    
    # Memory metrics (optional)
    memory_percent: Optional[float] = Field(None, ge=0, le=100)
    memory_used_mb: Optional[int] = Field(None, ge=0)
    memory_total_mb: Optional[int] = Field(None, ge=0)
    
    # Battery metrics (optional)
    battery_percent: Optional[float] = Field(None, ge=0, le=100)
    battery_charging: Optional[bool] = None
    battery_voltage: Optional[float] = None
    
    # Disk metrics (optional)
    disk_percent: Optional[float] = Field(None, ge=0, le=100)
    disk_used_gb: Optional[float] = Field(None, ge=0)
    disk_total_gb: Optional[float] = Field(None, ge=0)
    
    # Network metrics (optional)
    network_connected: Optional[bool] = None
    network_signal_strength: Optional[int] = None
    network_type: Optional[str] = Field(None, max_length=32)
    
    # System metrics (optional)
    uptime_seconds: Optional[int] = Field(None, ge=0)
    load_average: Optional[float] = None
    temperature: Optional[float] = None
    
    # Custom metrics (optional)
    custom_metrics: Optional[dict] = None


def create_fleet_router(
    registry: ProofRegistry,
    jwt_manager: JWTManager,
    fleet_store: FleetStore,
) -> APIRouter:
    """Create fleet router with dependencies."""
    
    jwt_dep = Depends(require_jwt(jwt_manager))

    # ============================================================
    # Helper Functions
    # ============================================================

    def get_user_id_from_request(request: Request) -> str | None:
        """Extract user_id from JWT token in request."""
        current_user = get_current_user_optional(request)
        if current_user:
            return current_user.get("user_id")
        return None

    def build_device_logs(proofs: list, device_id: str, limit: int = 50) -> list[dict]:
        """Build activity logs from proofs for a device."""
        logs = []
        device_proofs = [p for p in proofs if p.get("robot_id") == device_id]
        device_proofs.sort(key=lambda p: p.get("created_at", ""), reverse=True)
        
        for proof in device_proofs[:limit]:
            task_id = proof.get("task_id", "unknown")
            proof_id = proof.get("payload_hash", "unknown")[:12]
            created_at = proof.get("created_at", "")
            
            logs.append({
                "timestamp": created_at,
                "level": "success",
                "message": f"Proof submitted for task '{task_id}'",
                "proof_id": proof_id,
                "task_id": task_id,
            })
        
        return logs

    # ============================================================
    # Fleet Overview Endpoint
    # ============================================================

    @router.get("", dependencies=[jwt_dep])
    def get_fleet(request: Request) -> dict:
        """
        Get fleet data for the authenticated user's wallet.
        Combines proof data with stored device/group information.
        """
        try:
            current_user = get_current_user_optional(request)
            if not current_user:
                raise HTTPException(status_code=401, detail="Not authenticated")
            
            user_id = current_user.get("user_id")
            
            # Get all proofs from registry
            all_proofs = registry.list(limit=10000)
            
            # Get fleet data (merges proof data with stored device/group data)
            fleet_data = fleet_store.get_fleet_data(user_id, all_proofs)
            
            return fleet_data
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e)) from e

    # ============================================================
    # Device Details Endpoint
    # ============================================================

    @router.get("/devices/{device_id}", dependencies=[jwt_dep])
    def get_device_details(device_id: str, request: Request) -> dict:
        """
        Get detailed information for a specific device.
        Includes activity logs, health metrics, and task history.
        """
        try:
            user_id = get_user_id_from_request(request)
            if not user_id:
                raise HTTPException(status_code=401, detail="Not authenticated")
            
            # Get all proofs for this device
            all_proofs = registry.list(limit=10000)
            device_proofs = [p for p in all_proofs if p.get("robot_id") == device_id]
            
            if not device_proofs:
                raise HTTPException(status_code=404, detail="Device not found")
            
            # Build device info from proofs
            task_ids = set()
            last_activity = None
            first_activity = None
            
            for proof in device_proofs:
                task_id = proof.get("task_id")
                if task_id:
                    task_ids.add(task_id)
                
                created_at = proof.get("created_at")
                if created_at:
                    if not last_activity or created_at > last_activity:
                        last_activity = created_at
                    if not first_activity or created_at < first_activity:
                        first_activity = created_at
            
            # Get stored device data
            stored = fleet_store.get_device(device_id, user_id) or {}
            custom_name = stored.get("custom_name")
            default_name = device_id.replace("-", " ").replace("_", " ").title()
            
            # Get group info
            group_id = stored.get("group_id")
            group_name = None
            if group_id:
                group = fleet_store.get_group(group_id, user_id)
                if group:
                    group_name = group.get("name")
            
            # Get health data
            health = fleet_store.get_latest_health(device_id)
            
            # Build logs
            logs = build_device_logs(all_proofs, device_id, limit=100)
            
            # Calculate status
            status = "offline"
            if last_activity:
                now = datetime.now(timezone.utc)
                try:
                    last_dt = datetime.fromisoformat(last_activity.replace("Z", "+00:00"))
                    if (now - last_dt) < timedelta(hours=1):
                        status = "online"
                    elif (now - last_dt) < timedelta(hours=24):
                        status = "warning"
                except (ValueError, TypeError):
                    pass
            
            return {
                "id": device_id,
                "name": default_name,
                "custom_name": custom_name,
                "display_name": custom_name or default_name,
                "description": stored.get("description"),
                "device_type": stored.get("device_type"),
                "group_id": group_id,
                "group_name": group_name,
                "proof_count": len(device_proofs),
                "task_count": len(task_ids),
                "last_activity": last_activity,
                "first_activity": first_activity,
                "status": status,
                "health": health,
                "recent_logs": logs,
                "task_history": list(task_ids),
            }
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e)) from e

    # ============================================================
    # Device Rename Endpoint
    # ============================================================

    @router.patch("/devices/{device_id}/name", dependencies=[jwt_dep])
    def rename_device(device_id: str, req: DeviceRenameRequest, request: Request) -> dict:
        """Rename a device with a custom name."""
        try:
            user_id = get_user_id_from_request(request)
            if not user_id:
                raise HTTPException(status_code=401, detail="Not authenticated")
            
            # Verify device exists in proofs
            all_proofs = registry.list(limit=10000)
            device_exists = any(p.get("robot_id") == device_id for p in all_proofs)
            
            if not device_exists:
                raise HTTPException(status_code=404, detail="Device not found")
            
            # Update device in store
            result = fleet_store.rename_device(device_id, req.name.strip(), user_id)
            
            return {
                "success": True,
                "device_id": device_id,
                "name": req.name.strip(),
            }
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e)) from e

    # ============================================================
    # Device Update Endpoint
    # ============================================================

    @router.patch("/devices/{device_id}", dependencies=[jwt_dep])
    def update_device(device_id: str, req: DeviceUpdateRequest, request: Request) -> dict:
        """Update device metadata (name, description, type)."""
        try:
            user_id = get_user_id_from_request(request)
            if not user_id:
                raise HTTPException(status_code=401, detail="Not authenticated")
            
            result = fleet_store.update_device(
                device_id=device_id,
                user_id=user_id,
                custom_name=req.custom_name,
                description=req.description,
                device_type=req.device_type,
            )
            
            return {
                "success": True,
                "device": result,
            }
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e)) from e

    # ============================================================
    # Device Health Endpoints
    # ============================================================

    @router.post("/devices/{device_id}/health", dependencies=[jwt_dep])
    def update_device_health(device_id: str, req: DeviceHealthUpdateRequest, request: Request) -> dict:
        """
        Update health metrics for a device.
        All fields are optional - devices only send metrics they support.
        """
        try:
            user_id = get_user_id_from_request(request)
            
            health = fleet_store.record_health(
                device_id=device_id,
                user_id=user_id,
                cpu_percent=req.cpu_percent,
                cpu_temperature=req.cpu_temperature,
                memory_percent=req.memory_percent,
                memory_used_mb=req.memory_used_mb,
                memory_total_mb=req.memory_total_mb,
                battery_percent=req.battery_percent,
                battery_charging=req.battery_charging,
                battery_voltage=req.battery_voltage,
                disk_percent=req.disk_percent,
                disk_used_gb=req.disk_used_gb,
                disk_total_gb=req.disk_total_gb,
                network_connected=req.network_connected,
                network_signal_strength=req.network_signal_strength,
                network_type=req.network_type,
                uptime_seconds=req.uptime_seconds,
                load_average=req.load_average,
                temperature=req.temperature,
                custom_metrics=req.custom_metrics,
            )
            
            return {
                "success": True,
                "device_id": device_id,
                "health": health,
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e)) from e

    @router.get("/devices/{device_id}/health", dependencies=[jwt_dep])
    def get_device_health(device_id: str, request: Request) -> dict:
        """Get current health metrics for a device."""
        try:
            user_id = get_user_id_from_request(request)
            if not user_id:
                raise HTTPException(status_code=401, detail="Not authenticated")
            
            health = fleet_store.get_latest_health(device_id)
            
            return {
                "device_id": device_id,
                "health": health,
                "available": health is not None,
            }
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e)) from e

    @router.get("/devices/{device_id}/health/history", dependencies=[jwt_dep])
    def get_device_health_history(
        device_id: str,
        request: Request,
        hours: int = 24,
        limit: int = 100,
    ) -> dict:
        """Get health history for a device."""
        try:
            user_id = get_user_id_from_request(request)
            if not user_id:
                raise HTTPException(status_code=401, detail="Not authenticated")
            
            history = fleet_store.get_health_history(device_id, hours=hours, limit=limit)
            
            return {
                "device_id": device_id,
                "history": history,
                "count": len(history),
            }
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e)) from e

    # ============================================================
    # Device Groups Endpoints
    # ============================================================

    @router.get("/groups", dependencies=[jwt_dep])
    def list_groups(request: Request) -> dict:
        """List all device groups."""
        try:
            user_id = get_user_id_from_request(request)
            if not user_id:
                raise HTTPException(status_code=401, detail="Not authenticated")
            
            groups = fleet_store.list_groups(user_id)
            
            return {
                "groups": groups,
                "total": len(groups),
            }
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e)) from e

    @router.post("/groups", dependencies=[jwt_dep])
    def create_group(req: GroupCreateRequest, request: Request) -> dict:
        """Create a new device group."""
        try:
            user_id = get_user_id_from_request(request)
            if not user_id:
                raise HTTPException(status_code=401, detail="Not authenticated")
            
            group = fleet_store.create_group(
                name=req.name.strip(),
                user_id=user_id,
                description=req.description.strip() if req.description else None,
                color=req.color,
                icon=req.icon,
            )
            
            return {
                "success": True,
                "group": group,
            }
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e)) from e

    @router.get("/groups/{group_id}", dependencies=[jwt_dep])
    def get_group(group_id: str, request: Request) -> dict:
        """Get a specific device group with its devices."""
        try:
            user_id = get_user_id_from_request(request)
            if not user_id:
                raise HTTPException(status_code=401, detail="Not authenticated")
            
            group = fleet_store.get_group(group_id, user_id)
            if not group:
                raise HTTPException(status_code=404, detail="Group not found")
            
            return {
                "group": group,
                "device_count": len(group.get("device_ids", [])),
            }
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e)) from e

    @router.patch("/groups/{group_id}", dependencies=[jwt_dep])
    def update_group(group_id: str, req: GroupUpdateRequest, request: Request) -> dict:
        """Update a device group."""
        try:
            user_id = get_user_id_from_request(request)
            if not user_id:
                raise HTTPException(status_code=401, detail="Not authenticated")
            
            group = fleet_store.update_group(
                group_id=group_id,
                user_id=user_id,
                name=req.name.strip() if req.name else None,
                description=req.description.strip() if req.description else None,
                color=req.color,
                icon=req.icon,
            )
            
            if not group:
                raise HTTPException(status_code=404, detail="Group not found")
            
            return {
                "success": True,
                "group": group,
            }
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e)) from e

    @router.delete("/groups/{group_id}", dependencies=[jwt_dep])
    def delete_group(group_id: str, request: Request) -> dict:
        """Delete a device group."""
        try:
            user_id = get_user_id_from_request(request)
            if not user_id:
                raise HTTPException(status_code=401, detail="Not authenticated")
            
            result = fleet_store.delete_group(group_id, user_id)
            
            if not result.get("success"):
                raise HTTPException(status_code=404, detail="Group not found")
            
            return result
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e)) from e

    @router.post("/groups/{group_id}/assign", dependencies=[jwt_dep])
    def assign_devices_to_group(group_id: str, req: GroupAssignRequest, request: Request) -> dict:
        """Assign devices to a group."""
        try:
            user_id = get_user_id_from_request(request)
            if not user_id:
                raise HTTPException(status_code=401, detail="Not authenticated")
            
            result = fleet_store.assign_devices_to_group(
                group_id=group_id,
                device_ids=req.device_ids,
                user_id=user_id,
            )
            
            if not result.get("success"):
                raise HTTPException(status_code=404, detail=result.get("error", "Group not found"))
            
            return result
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e)) from e

    @router.post("/groups/{group_id}/unassign", dependencies=[jwt_dep])
    def unassign_devices_from_group(group_id: str, req: GroupAssignRequest, request: Request) -> dict:
        """Remove devices from a group."""
        try:
            user_id = get_user_id_from_request(request)
            if not user_id:
                raise HTTPException(status_code=401, detail="Not authenticated")
            
            result = fleet_store.unassign_devices_from_group(
                group_id=group_id,
                device_ids=req.device_ids,
                user_id=user_id,
            )
            
            if not result.get("success"):
                raise HTTPException(status_code=404, detail=result.get("error", "Group not found"))
            
            return result
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e)) from e

    return router
