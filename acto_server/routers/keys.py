# ACTO Server - API Keys Router
# API key management endpoints

from fastapi import APIRouter, Depends, HTTPException, Request

from acto.metrics import MetricsRegistry
from acto.security import JWTManager, get_current_user_optional, require_jwt
from acto.security.api_key_store import ApiKeyStore

from ..schemas import (
    ApiKeyCreateRequest,
    ApiKeyCreateResponse,
    ApiKeyDeleteResponse,
    ApiKeyListResponse,
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

    return router

