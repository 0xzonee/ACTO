from __future__ import annotations

from pydantic import BaseModel

from acto.proof.models import ProofEnvelope


class ProofSubmitRequest(BaseModel):
    envelope: ProofEnvelope


class ProofSubmitResponse(BaseModel):
    proof_id: str


class VerifyRequest(BaseModel):
    envelope: ProofEnvelope


class VerifyResponse(BaseModel):
    valid: bool
    reason: str


class AccessCheckRequest(BaseModel):
    rpc_url: str
    owner: str
    mint: str
    minimum: float


class AccessCheckResponse(BaseModel):
    allowed: bool
    reason: str
    balance: float | None = None
