# ACTO Server - Proofs Router
# Proof submission, verification, and search endpoints

from fastapi import APIRouter, Depends, HTTPException, Request

from acto.errors import ProofError, RegistryError
from acto.metrics import MetricsRegistry
from acto.proof import verify_proof
from acto.registry import ProofRegistry
from acto.registry.search import SearchFilter, SortField, SortOrder
from acto.reputation import ReputationScorer
from acto.security import (
    AuditAction,
    AuditLogger,
    Permission,
    RBACManager,
    get_current_user_optional,
    require_api_key_and_token_balance,
)
from acto.security.api_key_store import ApiKeyStore

from ..schemas import (
    BatchVerifyRequest,
    BatchVerifyResponse,
    BatchVerifyResult,
    ProofSearchRequest,
    ProofSearchResponse,
    ProofSubmitRequest,
    ProofSubmitResponse,
    VerifyRequest,
    VerifyResponse,
)

router = APIRouter(prefix="/v1", tags=["proofs"])


def create_proofs_router(
    registry: ProofRegistry,
    metrics: MetricsRegistry,
    scorer: ReputationScorer,
    api_key_store: ApiKeyStore,
    settings,
    rbac_manager: RBACManager | None = None,
    audit_logger: AuditLogger | None = None,
) -> APIRouter:
    """Create proofs router with dependencies."""
    
    auth_dep = Depends(require_api_key_and_token_balance(api_key_store, settings))

    @router.get("/proofs", dependencies=[auth_dep])
    def list_proofs(limit: int = 50) -> dict:
        metrics.inc("acto.proofs.list")
        return {"items": registry.list(limit=limit)}

    @router.post("/proofs", response_model=ProofSubmitResponse, dependencies=[auth_dep])
    def submit(req: ProofSubmitRequest, request: Request) -> ProofSubmitResponse:
        current_user = get_current_user_optional(request)
        try:
            # RBAC check
            if rbac_manager and current_user:
                rbac_manager.require_permission(current_user.get("roles", []), Permission.PROOF_WRITE)

            verify_proof(req.envelope)
            proof_id = registry.upsert(req.envelope)
            metrics.inc("acto.proofs.submit")

            # Audit log
            if audit_logger:
                audit_logger.log_success(
                    AuditAction.PROOF_CREATE,
                    user_id=current_user.get("user_id") if current_user else None,
                    resource_type="proof",
                    resource_id=proof_id,
                    request_id=getattr(request.state, "request_id", None),
                )

            return ProofSubmitResponse(proof_id=proof_id)
        except ProofError as e:
            metrics.inc("acto.proofs.submit.invalid")
            if audit_logger:
                audit_logger.log_failure(
                    AuditAction.PROOF_CREATE,
                    error_message=str(e),
                    user_id=current_user.get("user_id") if current_user else None,
                    request_id=getattr(request.state, "request_id", None),
                )
            raise HTTPException(status_code=400, detail=str(e)) from e
        except RegistryError as e:
            if audit_logger:
                audit_logger.log_failure(
                    AuditAction.PROOF_CREATE,
                    error_message=str(e),
                    user_id=current_user.get("user_id") if current_user else None,
                    request_id=getattr(request.state, "request_id", None),
                )
            raise HTTPException(status_code=500, detail=str(e)) from e

    @router.get("/proofs/{proof_id}", dependencies=[auth_dep])
    def get_proof(proof_id: str, request: Request) -> dict:
        current_user = get_current_user_optional(request)
        try:
            # RBAC check
            if rbac_manager and current_user:
                rbac_manager.require_permission(current_user.get("roles", []), Permission.PROOF_READ)

            metrics.inc("acto.proofs.get")
            env = registry.get(proof_id)

            # Audit log
            if audit_logger:
                audit_logger.log_success(
                    AuditAction.PROOF_READ,
                    user_id=current_user.get("user_id") if current_user else None,
                    resource_type="proof",
                    resource_id=proof_id,
                    request_id=getattr(request.state, "request_id", None),
                )

            return {"proof_id": proof_id, "envelope": env.model_dump()}
        except RegistryError as e:
            if audit_logger:
                audit_logger.log_failure(
                    AuditAction.PROOF_READ,
                    error_message=str(e),
                    user_id=current_user.get("user_id") if current_user else None,
                    resource_id=proof_id,
                    request_id=getattr(request.state, "request_id", None),
                )
            raise HTTPException(status_code=404, detail=str(e)) from e

    @router.post("/verify", response_model=VerifyResponse, dependencies=[auth_dep])
    def verify(req: VerifyRequest, request: Request) -> VerifyResponse:
        current_user = get_current_user_optional(request)
        try:
            verify_proof(req.envelope)
            metrics.inc("acto.verify.ok")

            # Audit log
            if audit_logger:
                audit_logger.log_success(
                    AuditAction.PROOF_VERIFY,
                    user_id=current_user.get("user_id") if current_user else None,
                    request_id=getattr(request.state, "request_id", None),
                )

            return VerifyResponse(valid=True, reason="ok")
        except ProofError as e:
            metrics.inc("acto.verify.fail")
            if audit_logger:
                audit_logger.log_failure(
                    AuditAction.PROOF_VERIFY,
                    error_message=str(e),
                    user_id=current_user.get("user_id") if current_user else None,
                    request_id=getattr(request.state, "request_id", None),
                )
            return VerifyResponse(valid=False, reason=str(e))

    @router.post("/score", dependencies=[auth_dep])
    def score(req: VerifyRequest, request: Request) -> dict:
        try:
            verify_proof(req.envelope)
            result = scorer.score(req.envelope)
            metrics.inc("acto.score.ok")
            return {"score": result.score, "reasons": result.reasons}
        except ProofError as e:
            metrics.inc("acto.score.fail")
            raise HTTPException(status_code=400, detail=str(e)) from e

    @router.post("/proofs/search", response_model=ProofSearchResponse, dependencies=[auth_dep])
    def search_proofs(req: ProofSearchRequest, request: Request) -> ProofSearchResponse:
        """Search proofs with filters and pagination."""
        try:
            # Build search filter
            search_filter = SearchFilter()
            search_filter.task_id = req.task_id
            search_filter.robot_id = req.robot_id
            search_filter.run_id = req.run_id
            search_filter.signer_public_key_b64 = req.signer_public_key
            search_filter.created_after = req.created_after
            search_filter.created_before = req.created_before
            search_filter.search_text = req.search_text
            
            # Map sort field
            sort_field_map = {
                "created_at": SortField.CREATED_AT,
                "task_id": SortField.TASK_ID,
                "robot_id": SortField.ROBOT_ID,
                "payload_hash": SortField.PAYLOAD_HASH,
            }
            sort_field = sort_field_map.get(req.sort_field, SortField.CREATED_AT)
            sort_order = SortOrder.ASC if req.sort_order == "asc" else SortOrder.DESC
            
            # Get results with one extra to check if there are more
            items = registry.list(
                limit=req.limit + 1,
                offset=req.offset,
                search_filter=search_filter,
                sort_field=sort_field,
                sort_order=sort_order,
            )
            
            has_more = len(items) > req.limit
            if has_more:
                items = items[:req.limit]
            
            # Get total count
            all_items = registry.list(limit=10000, search_filter=search_filter)
            total = len(all_items)
            
            metrics.inc("acto.proofs.search")
            
            return ProofSearchResponse(
                items=items,
                total=total,
                limit=req.limit,
                offset=req.offset,
                has_more=has_more,
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e)) from e

    @router.post("/verify/batch", response_model=BatchVerifyResponse, dependencies=[auth_dep])
    def verify_batch(req: BatchVerifyRequest, request: Request) -> BatchVerifyResponse:
        """Verify multiple proof envelopes in a single request."""
        results = []
        valid_count = 0
        invalid_count = 0
        
        for index, envelope in enumerate(req.envelopes):
            try:
                verify_proof(envelope)
                results.append(BatchVerifyResult(
                    index=index,
                    valid=True,
                    reason="ok",
                    payload_hash=envelope.payload.payload_hash,
                ))
                valid_count += 1
            except ProofError as e:
                results.append(BatchVerifyResult(
                    index=index,
                    valid=False,
                    reason=str(e),
                    payload_hash=None,
                ))
                invalid_count += 1
        
        metrics.inc("acto.verify.batch", len(req.envelopes))
        
        return BatchVerifyResponse(
            results=results,
            total=len(req.envelopes),
            valid_count=valid_count,
            invalid_count=invalid_count,
        )

    return router

