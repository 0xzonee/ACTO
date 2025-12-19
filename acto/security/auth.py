from __future__ import annotations

from fastapi import Depends, Header, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from acto.errors import AccessError
from acto.security.api_keys import ApiKeyStore
from acto.security.jwt import JWTManager
from acto.security.rbac import RBACManager, extract_roles_from_token, extract_scopes_from_token

security = HTTPBearer(auto_error=False)


def require_api_key(store: ApiKeyStore):
    """Dependency for API key authentication."""

    async def _dep(request: Request, x_api_key: str | None = Header(default=None, alias="X-API-Key")) -> None:
        try:
            store.require(x_api_key)
        except Exception as e:
            raise HTTPException(status_code=401, detail=str(e)) from e

    return _dep


def require_jwt(jwt_manager: JWTManager):
    """Dependency for JWT/OAuth2 authentication."""

    async def _dep(
        request: Request,
        credentials: HTTPAuthorizationCredentials | None = Depends(security),
    ) -> dict:
        if not credentials:
            raise HTTPException(status_code=401, detail="Missing authorization header.")

        token = credentials.credentials
        try:
            payload = jwt_manager.verify_token(token, required_type="access")
            request.state.user_id = payload.get("sub")
            request.state.user_roles = extract_roles_from_token(payload)
            request.state.user_scopes = extract_scopes_from_token(payload)
            request.state.token_payload = payload
            return payload
        except AccessError as e:
            raise HTTPException(status_code=401, detail=str(e)) from e

    return _dep


def create_jwt_dependency(jwt_manager: JWTManager | None):
    """Create JWT dependency if JWT is enabled."""
    if jwt_manager:
        return Depends(require_jwt(jwt_manager))
    return None


def require_permission(permission, rbac_manager: RBACManager, jwt_manager: JWTManager):
    """Dependency factory for requiring specific RBAC permissions."""

    def _dep(token_payload: dict = Depends(require_jwt(jwt_manager))) -> dict:
        user_roles = extract_roles_from_token(token_payload)
        rbac_manager.require_permission(user_roles, permission)
        return token_payload

    return _dep


def require_scope(scope: str, jwt_manager: JWTManager):
    """Dependency factory for requiring specific OAuth2 scopes."""

    def _dep(token_payload: dict = Depends(require_jwt(jwt_manager))) -> dict:
        user_scopes = extract_scopes_from_token(token_payload)
        rbac_manager = RBACManager()
        rbac_manager.require_scope(user_scopes, scope)
        return token_payload

    return _dep


def get_current_user(request: Request) -> dict:
    """Get current authenticated user from request state."""
    if not hasattr(request.state, "user_id"):
        raise HTTPException(status_code=401, detail="Not authenticated.")
    return {
        "user_id": request.state.user_id,
        "roles": getattr(request.state, "user_roles", []),
        "scopes": getattr(request.state, "user_scopes", []),
    }
