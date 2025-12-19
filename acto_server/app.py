from __future__ import annotations

import uuid

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from acto import __version__
from acto.access import SolanaTokenGate
from acto.config import Settings
from acto.errors import AccessError, ProofError, RegistryError
from acto.metrics import MetricsRegistry
from acto.proof import verify_proof
from acto.registry import ProofRegistry
from acto.reputation import ReputationScorer
from acto.security import ApiKeyStore, TokenBucketRateLimiter, require_api_key

from .schemas import (
    AccessCheckRequest,
    AccessCheckResponse,
    ProofSubmitRequest,
    ProofSubmitResponse,
    VerifyRequest,
    VerifyResponse,
)

settings = Settings()


def create_app() -> FastAPI:
    app = FastAPI(title="ACTO Verification API", version=__version__)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    registry = ProofRegistry(settings)
    metrics = MetricsRegistry()
    scorer = ReputationScorer()

    api_key_store = ApiKeyStore.from_plaintext(keys=[])
    limiter = TokenBucketRateLimiter.create(rps=settings.rate_limit_rps, burst=settings.rate_limit_burst)

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

        client = request.headers.get("X-Forwarded-For") or (request.client.host if request.client else "unknown")
        key = f"{client}:{request.url.path}"
        try:
            limiter.check(key)
        except AccessError as e:
            raise HTTPException(status_code=429, detail=str(e)) from e
        return await call_next(request)

    def auth_dependency():
        if settings.api_auth_enabled:
            return Depends(require_api_key(api_key_store))
        return None

    @app.get("/health")
    def health() -> dict:
        metrics.inc("acto.health.calls")
        return {"ok": True, "service": "acto", "version": __version__}

    @app.get("/metrics")
    def prometheus_metrics() -> Response:
        return Response(content=metrics.render_prometheus(), media_type="text/plain; version=0.0.4")

    @app.get("/v1/proofs")
    def list_proofs(limit: int = 50) -> dict:
        metrics.inc("acto.proofs.list")
        return {"items": registry.list(limit=limit)}

    @app.post("/v1/proofs", response_model=ProofSubmitResponse, dependencies=[d for d in [auth_dependency()] if d])
    def submit(req: ProofSubmitRequest) -> ProofSubmitResponse:
        try:
            verify_proof(req.envelope)
            proof_id = registry.upsert(req.envelope)
            metrics.inc("acto.proofs.submit")
            return ProofSubmitResponse(proof_id=proof_id)
        except ProofError as e:
            metrics.inc("acto.proofs.submit.invalid")
            raise HTTPException(status_code=400, detail=str(e)) from e
        except RegistryError as e:
            raise HTTPException(status_code=500, detail=str(e)) from e

    @app.get("/v1/proofs/{proof_id}", dependencies=[d for d in [auth_dependency()] if d])
    def get_proof(proof_id: str) -> dict:
        try:
            metrics.inc("acto.proofs.get")
            env = registry.get(proof_id)
            return {"proof_id": proof_id, "envelope": env.model_dump()}
        except RegistryError as e:
            raise HTTPException(status_code=404, detail=str(e)) from e

    @app.post("/v1/verify", response_model=VerifyResponse, dependencies=[d for d in [auth_dependency()] if d])
    def verify(req: VerifyRequest) -> VerifyResponse:
        try:
            verify_proof(req.envelope)
            metrics.inc("acto.verify.ok")
            return VerifyResponse(valid=True, reason="ok")
        except ProofError as e:
            metrics.inc("acto.verify.fail")
            return VerifyResponse(valid=False, reason=str(e))

    @app.post("/v1/score", dependencies=[d for d in [auth_dependency()] if d])
    def score(req: VerifyRequest) -> dict:
        try:
            verify_proof(req.envelope)
            result = scorer.score(req.envelope)
            metrics.inc("acto.score.ok")
            return {"score": result.score, "reasons": result.reasons}
        except ProofError as e:
            metrics.inc("acto.score.fail")
            raise HTTPException(status_code=400, detail=str(e)) from e

    @app.post("/v1/access/check", response_model=AccessCheckResponse)
    def access_check(req: AccessCheckRequest) -> AccessCheckResponse:
        try:
            gate = SolanaTokenGate(rpc_url=req.rpc_url)
            decision = gate.decide(owner=req.owner, mint=req.mint, minimum=req.minimum)
            metrics.inc("acto.access.check")
            return AccessCheckResponse(**decision.model_dump())
        except AccessError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e

    return app
