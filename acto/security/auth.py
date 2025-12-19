from __future__ import annotations

from fastapi import Header, HTTPException, Request

from acto.security.api_keys import ApiKeyStore


def require_api_key(store: ApiKeyStore):
    async def _dep(request: Request, x_api_key: str | None = Header(default=None, alias="X-API-Key")) -> None:
        try:
            store.require(x_api_key)
        except Exception as e:
            raise HTTPException(status_code=401, detail=str(e)) from e

    return _dep
