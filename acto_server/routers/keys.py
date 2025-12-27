# ACTO Server - API Keys Router
# API key management endpoints

from fastapi import APIRouter, Depends, HTTPException, Request

from acto.metrics import MetricsRegistry
from acto.security import JWTManager, get_current_user_optional, require_jwt
from acto.security.api_key_store import ApiKeyStore

from ..schemas import (
    ApiKeyAssignRequest,
    ApiKeyAssignResponse,
    ApiKeyCreateRequest,
    ApiKeyCreateResponse,
    ApiKeyDeleteResponse,
    ApiKeyGroupCreateRequest,
    ApiKeyGroupDeleteResponse,
    ApiKeyGroupListResponse,
    ApiKeyGroupOrderRequest,
    ApiKeyGroupResponse,
    ApiKeyGroupUpdateRequest,
    ApiKeyGroupUpdateResponse,
    ApiKeyListResponse,
    ApiKeyOrderRequest,
    ApiKeyOrderResponse,
    ApiKeyStatsResponse,
    ApiKeyToggleResponse,
    ApiKeyUpdateRequest,
    ApiKeyUpdateResponse,
)

router = APIRouter(prefix="/v1/keys", tags=["api-keys"])


def create_keys_router(
    jwt_manager: JWTManager,
    api_key_store: ApiKeyStore,
    metrics: MetricsRegistry,
) -> APIRouter:
    """Create API keys router with dependencies."""
    
    jwt_dep = Depends(require_jwt(jwt_manager))

    @router.post("", response_model=ApiKeyCreateResponse, dependencies=[jwt_dep])
    def create_api_key(req: ApiKeyCreateRequest, request: Request) -> ApiKeyCreateResponse:
        """Create a new API key."""
        try:
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

    @router.get("", response_model=ApiKeyListResponse, dependencies=[jwt_dep])
    def list_api_keys(request: Request, include_inactive: bool = True) -> ApiKeyListResponse:
        """List all your API keys (without the actual key values)."""
        try:
            current_user = get_current_user_optional(request)
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")
            
            user_id = current_user.get("user_id")
            keys = api_key_store.list_keys(user_id=user_id, include_inactive=include_inactive)
            metrics.inc("acto.keys.list")
            return ApiKeyListResponse(keys=keys)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to list API keys: {str(e)}") from e

    @router.delete("/{key_id}", response_model=ApiKeyDeleteResponse, dependencies=[jwt_dep])
    def delete_api_key(key_id: str, request: Request) -> ApiKeyDeleteResponse:
        """Deactivate an API key."""
        try:
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

    @router.get("/{key_id}/stats", response_model=ApiKeyStatsResponse, dependencies=[jwt_dep])
    def get_api_key_stats(key_id: str, request: Request) -> ApiKeyStatsResponse:
        """Get usage statistics for a specific API key."""
        try:
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

    @router.patch("/{key_id}", response_model=ApiKeyUpdateResponse, dependencies=[jwt_dep])
    def update_api_key(key_id: str, req: ApiKeyUpdateRequest, request: Request) -> ApiKeyUpdateResponse:
        """Update an API key's name."""
        try:
            current_user = get_current_user_optional(request)
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")
            
            user_id = current_user.get("user_id")
            result = api_key_store.update_key(key_id, name=req.name, user_id=user_id)
            if not result:
                raise HTTPException(status_code=404, detail="API key not found")
            
            metrics.inc("acto.keys.update")
            return ApiKeyUpdateResponse(
                success=True,
                key_id=result["key_id"],
                name=result["name"],
                is_active=result["is_active"],
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to update API key: {str(e)}") from e

    @router.post("/{key_id}/toggle", response_model=ApiKeyToggleResponse, dependencies=[jwt_dep])
    def toggle_api_key(key_id: str, request: Request) -> ApiKeyToggleResponse:
        """Toggle an API key's active state (enable/disable)."""
        try:
            current_user = get_current_user_optional(request)
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")
            
            user_id = current_user.get("user_id")
            result = api_key_store.toggle_key(key_id, user_id=user_id)
            if not result:
                raise HTTPException(status_code=404, detail="API key not found")
            
            metrics.inc("acto.keys.toggle")
            return ApiKeyToggleResponse(
                success=True,
                key_id=result["key_id"],
                is_active=result["is_active"],
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to toggle API key: {str(e)}") from e

    # ============================================================
    # API Key Group Endpoints
    # ============================================================

    @router.get("/groups", response_model=ApiKeyGroupListResponse, dependencies=[jwt_dep])
    def list_key_groups(request: Request) -> ApiKeyGroupListResponse:
        """List all API key groups for the current user."""
        try:
            current_user = get_current_user_optional(request)
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")
            
            user_id = current_user.get("user_id")
            if not user_id:
                raise HTTPException(status_code=401, detail="User ID not found")
            groups = api_key_store.list_groups(user_id=str(user_id))
            
            return ApiKeyGroupListResponse(
                groups=[ApiKeyGroupResponse(**g) for g in groups],
                total_groups=len(groups),
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to list groups: {str(e)}") from e

    @router.post("/groups", response_model=ApiKeyGroupUpdateResponse, dependencies=[jwt_dep])
    def create_key_group(req: ApiKeyGroupCreateRequest, request: Request) -> ApiKeyGroupUpdateResponse:
        """Create a new API key group."""
        try:
            current_user = get_current_user_optional(request)
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")
            
            user_id = current_user.get("user_id")
            if not user_id:
                raise HTTPException(status_code=401, detail="User ID not found")
            result = api_key_store.create_group(
                name=req.name,
                user_id=str(user_id),
                description=req.description,
            )
            
            metrics.inc("acto.keys.groups.create")
            return ApiKeyGroupUpdateResponse(
                success=True,
                group=ApiKeyGroupResponse(**result),
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to create group: {str(e)}") from e

    @router.patch("/groups/{group_id}", response_model=ApiKeyGroupUpdateResponse, dependencies=[jwt_dep])
    def update_key_group(group_id: str, req: ApiKeyGroupUpdateRequest, request: Request) -> ApiKeyGroupUpdateResponse:
        """Update an API key group."""
        try:
            current_user = get_current_user_optional(request)
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")
            
            user_id = current_user.get("user_id")
            if not user_id:
                raise HTTPException(status_code=401, detail="User ID not found")
            result = api_key_store.update_group(
                group_id=group_id,
                user_id=str(user_id),
                name=req.name,
                description=req.description,
            )
            
            if not result:
                raise HTTPException(status_code=404, detail="Group not found")
            
            metrics.inc("acto.keys.groups.update")
            return ApiKeyGroupUpdateResponse(
                success=True,
                group=ApiKeyGroupResponse(**result),
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to update group: {str(e)}") from e

    @router.delete("/groups/{group_id}", response_model=ApiKeyGroupDeleteResponse, dependencies=[jwt_dep])
    def delete_key_group(group_id: str, request: Request) -> ApiKeyGroupDeleteResponse:
        """Delete an API key group. Keys will be unassigned but not deleted."""
        try:
            current_user = get_current_user_optional(request)
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")
            
            user_id = current_user.get("user_id")
            if not user_id:
                raise HTTPException(status_code=401, detail="User ID not found")
            success = api_key_store.delete_group(group_id=group_id, user_id=str(user_id))
            
            if not success:
                raise HTTPException(status_code=404, detail="Group not found")
            
            metrics.inc("acto.keys.groups.delete")
            return ApiKeyGroupDeleteResponse(success=True, group_id=group_id)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete group: {str(e)}") from e

    @router.post("/groups/{group_id}/assign", response_model=ApiKeyAssignResponse, dependencies=[jwt_dep])
    def assign_keys_to_group(group_id: str, req: ApiKeyAssignRequest, request: Request) -> ApiKeyAssignResponse:
        """Assign API keys to a group."""
        try:
            current_user = get_current_user_optional(request)
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")
            
            user_id = current_user.get("user_id")
            if not user_id:
                raise HTTPException(status_code=401, detail="User ID not found")
            success = api_key_store.assign_keys_to_group(
                group_id=group_id,
                key_ids=req.key_ids,
                user_id=str(user_id),
            )
            
            if not success:
                raise HTTPException(status_code=404, detail="Group not found")
            
            metrics.inc("acto.keys.groups.assign")
            return ApiKeyAssignResponse(success=True, assigned_count=len(req.key_ids))
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to assign keys: {str(e)}") from e

    @router.post("/groups/{group_id}/unassign", response_model=ApiKeyAssignResponse, dependencies=[jwt_dep])
    def unassign_keys_from_group(group_id: str, req: ApiKeyAssignRequest, request: Request) -> ApiKeyAssignResponse:
        """Unassign API keys from a group."""
        try:
            current_user = get_current_user_optional(request)
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")
            
            user_id = current_user.get("user_id")
            if not user_id:
                raise HTTPException(status_code=401, detail="User ID not found")
            success = api_key_store.unassign_keys_from_group(
                group_id=group_id,
                key_ids=req.key_ids,
                user_id=str(user_id),
            )
            
            metrics.inc("acto.keys.groups.unassign")
            return ApiKeyAssignResponse(success=True, assigned_count=len(req.key_ids))
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to unassign keys: {str(e)}") from e

    @router.patch("/order", response_model=ApiKeyOrderResponse, dependencies=[jwt_dep])
    def update_key_order(req: ApiKeyOrderRequest, request: Request) -> ApiKeyOrderResponse:
        """Update the sort order for API keys."""
        try:
            current_user = get_current_user_optional(request)
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")
            
            user_id = current_user.get("user_id")
            if not user_id:
                raise HTTPException(status_code=401, detail="User ID not found")
            api_key_store.update_key_order(key_orders=req.key_orders, user_id=str(user_id))
            
            return ApiKeyOrderResponse(success=True)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to update key order: {str(e)}") from e

    @router.patch("/groups/order", response_model=ApiKeyOrderResponse, dependencies=[jwt_dep])
    def update_group_order(req: ApiKeyGroupOrderRequest, request: Request) -> ApiKeyOrderResponse:
        """Update the sort order for API key groups."""
        try:
            current_user = get_current_user_optional(request)
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")
            
            user_id = current_user.get("user_id")
            if not user_id:
                raise HTTPException(status_code=401, detail="User ID not found")
            api_key_store.update_group_order(group_orders=req.group_orders, user_id=str(user_id))
            
            return ApiKeyOrderResponse(success=True)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to update group order: {str(e)}") from e

    return router

