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
    rpc_url: str = ""  # Optional - empty = use backend's configured RPC (Helius)
    owner: str
    mint: str
    minimum: float = 50000


class AccessCheckResponse(BaseModel):
    allowed: bool
    reason: str
    balance: float | None = None


class ApiKeyCreateRequest(BaseModel):
    name: str


class ApiKeyCreateResponse(BaseModel):
    key_id: str
    key: str
    name: str
    created_at: str
    created_by: str | None = None


class ApiKeyListResponse(BaseModel):
    keys: list[dict]


class ApiKeyDeleteResponse(BaseModel):
    success: bool
    key_id: str


class ApiKeyUpdateRequest(BaseModel):
    name: str | None = None


class ApiKeyUpdateResponse(BaseModel):
    success: bool
    key_id: str
    name: str
    is_active: bool


class ApiKeyToggleResponse(BaseModel):
    success: bool
    key_id: str
    is_active: bool


class WalletConnectRequest(BaseModel):
    wallet_address: str


class WalletConnectResponse(BaseModel):
    challenge: str
    message: str


class WalletVerifyRequest(BaseModel):
    wallet_address: str
    signature: str
    challenge: str


class WalletVerifyResponse(BaseModel):
    success: bool
    user_id: str
    wallet_address: str
    access_token: str
    token_type: str = "Bearer"
    expires_in: int


class ApiKeyStatsResponse(BaseModel):
    key_id: str
    request_count: int
    endpoint_usage: dict[str, int]
    last_used_at: str | None


class TokenGatingConfigResponse(BaseModel):
    enabled: bool
    mint: str
    minimum: float
    rpc_url: str


# ============================================================
# Proof Search Schemas
# ============================================================

class ProofSearchRequest(BaseModel):
    """Request for searching proofs with filters."""
    task_id: str | None = None
    robot_id: str | None = None
    run_id: str | None = None
    signer_public_key: str | None = None
    created_after: str | None = None
    created_before: str | None = None
    search_text: str | None = None
    limit: int = 50
    offset: int = 0
    sort_field: str = "created_at"
    sort_order: str = "desc"


class ProofSearchResponse(BaseModel):
    """Response for proof search."""
    items: list[dict]
    total: int
    limit: int
    offset: int
    has_more: bool


# ============================================================
# Batch Verification Schemas
# ============================================================

class BatchVerifyRequest(BaseModel):
    """Request for batch verification of multiple proofs."""
    envelopes: list[ProofEnvelope]


class BatchVerifyResult(BaseModel):
    """Result for a single proof in batch verification."""
    index: int
    valid: bool
    reason: str
    payload_hash: str | None = None


class BatchVerifyResponse(BaseModel):
    """Response for batch verification."""
    results: list[BatchVerifyResult]
    total: int
    valid_count: int
    invalid_count: int


# ============================================================
# Wallet Statistics Schemas
# ============================================================

class WalletStatsResponse(BaseModel):
    """Statistics for a specific wallet address."""
    wallet_address: str
    total_proofs_submitted: int
    total_verifications: int
    successful_verifications: int
    failed_verifications: int
    verification_success_rate: float
    average_reputation_score: float | None
    first_activity: str | None
    last_activity: str | None
    proofs_by_robot: dict[str, int]
    proofs_by_task: dict[str, int]
    activity_timeline: list[dict]


# ============================================================
# User Profile Schemas
# ============================================================

class ProfileUpdateRequest(BaseModel):
    """Request for updating user profile."""
    contact_name: str | None = None
    company_name: str | None = None
    email: str | None = None
    phone: str | None = None
    website: str | None = None
    location: str | None = None
    industry: str | None = None


class ProfileResponse(BaseModel):
    """User profile response."""
    user_id: str
    wallet_address: str
    created_at: str
    last_login_at: str | None
    is_active: bool
    # Profile fields
    contact_name: str | None = None
    company_name: str | None = None
    email: str | None = None
    phone: str | None = None
    website: str | None = None
    location: str | None = None
    industry: str | None = None
    updated_at: str | None = None