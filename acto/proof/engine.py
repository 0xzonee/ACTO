from __future__ import annotations

from typing import Any

import orjson

from acto.config.settings import Settings
from acto.crypto.hashing import blake3_hash, sha256_hash
from acto.crypto.signing import sign_bytes, verify_bytes
from acto.errors import ProofError
from acto.proof.models import ProofEnvelope, ProofPayload, ProofSubject
from acto.telemetry.models import TelemetryBundle
from acto.telemetry.normalizer import normalize_bundle
from acto.utils.time import now_utc_iso


def _hash_bytes(alg: str, data: bytes) -> str:
    if alg == "blake3":
        return blake3_hash(data)
    if alg == "sha256":
        return sha256_hash(data)
    raise ProofError(f"Unsupported hash algorithm: {alg}")


def compute_payload_hash(payload_dict: dict[str, Any], alg: str) -> str:
    canonical = orjson.dumps(payload_dict, option=orjson.OPT_SORT_KEYS)
    return _hash_bytes(alg, canonical)


def create_proof(
    bundle: TelemetryBundle,
    signer_private_key_b64: str,
    signer_public_key_b64: str,
    settings: Settings | None = None,
    meta: dict[str, Any] | None = None,
) -> ProofEnvelope:
    settings = settings or Settings()
    meta = meta or {}

    subject = ProofSubject(task_id=bundle.task_id, robot_id=bundle.robot_id, run_id=bundle.run_id)
    telemetry_norm = normalize_bundle(bundle)
    telemetry_bytes = orjson.dumps(telemetry_norm, option=orjson.OPT_SORT_KEYS)
    telemetry_hash = _hash_bytes(settings.proof_hash_alg, telemetry_bytes)

    payload_base: dict[str, Any] = {
        "version": settings.proof_version,
        "subject": subject.model_dump(),
        "created_at": now_utc_iso(),
        "telemetry_normalized": telemetry_norm,
        "telemetry_hash": telemetry_hash,
        "hash_alg": settings.proof_hash_alg,
        "signature_alg": settings.proof_signature_alg,
        "meta": meta,
    }
    payload_hash = compute_payload_hash(payload_base, settings.proof_hash_alg)

    payload = ProofPayload(
        version=settings.proof_version,
        subject=subject,
        created_at=payload_base["created_at"],
        telemetry_normalized=telemetry_norm,
        telemetry_hash=telemetry_hash,
        payload_hash=payload_hash,
        hash_alg=settings.proof_hash_alg,
        signature_alg=settings.proof_signature_alg,
        meta=meta,
    )

    signature = sign_bytes(signer_private_key_b64, payload_hash.encode("utf-8"))
    return ProofEnvelope(
        payload=payload,
        signer_public_key_b64=signer_public_key_b64,
        signature_b64=signature,
        anchor_ref=None,
    )


def verify_proof(envelope: ProofEnvelope) -> bool:
    payload = envelope.payload
    payload_base = {
        "version": payload.version,
        "subject": payload.subject.model_dump(),
        "created_at": payload.created_at,
        "telemetry_normalized": payload.telemetry_normalized,
        "telemetry_hash": payload.telemetry_hash,
        "hash_alg": payload.hash_alg,
        "signature_alg": payload.signature_alg,
        "meta": payload.meta,
    }
    recomputed = compute_payload_hash(payload_base, payload.hash_alg)
    if recomputed != payload.payload_hash:
        raise ProofError("Payload hash mismatch. Proof is tampered or inconsistent.")

    ok = verify_bytes(
        envelope.signer_public_key_b64, payload.payload_hash.encode("utf-8"), envelope.signature_b64
    )
    if not ok:
        raise ProofError("Invalid signature.")
    return True
