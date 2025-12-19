from __future__ import annotations

import hashlib

import orjson
from sqlalchemy import select

from acto.config.settings import Settings
from acto.errors import RegistryError
from acto.proof.models import ProofEnvelope
from acto.registry.db import make_engine, make_session_factory
from acto.registry.models import Base, ProofRecord


def _proof_id_from_hash(payload_hash: str) -> str:
    return hashlib.sha256(payload_hash.encode("utf-8")).hexdigest()[:32]


class ProofRegistry:
    """SQLite-backed registry for proofs."""

    def __init__(self, settings: Settings | None = None):
        self.settings = settings or Settings()
        self.engine = make_engine(self.settings)
        self.SessionLocal = make_session_factory(self.engine)
        Base.metadata.create_all(self.engine)

    def upsert(self, envelope: ProofEnvelope) -> str:
        proof_id = _proof_id_from_hash(envelope.payload.payload_hash)
        try:
            with self.SessionLocal() as session:
                existing = session.get(ProofRecord, proof_id)
                if existing:
                    existing.envelope_json = orjson.dumps(envelope.model_dump()).decode("utf-8")
                    existing.anchor_ref = envelope.anchor_ref
                else:
                    rec = ProofRecord(
                        proof_id=proof_id,
                        task_id=envelope.payload.subject.task_id,
                        robot_id=envelope.payload.subject.robot_id,
                        run_id=envelope.payload.subject.run_id,
                        created_at=envelope.payload.created_at,
                        payload_hash=envelope.payload.payload_hash,
                        signer_public_key_b64=envelope.signer_public_key_b64,
                        signature_b64=envelope.signature_b64,
                        envelope_json=orjson.dumps(envelope.model_dump()).decode("utf-8"),
                        anchor_ref=envelope.anchor_ref,
                    )
                    session.add(rec)
                session.commit()
            return proof_id
        except Exception as e:
            raise RegistryError(str(e)) from e

    def get(self, proof_id: str) -> ProofEnvelope:
        with self.SessionLocal() as session:
            rec = session.get(ProofRecord, proof_id)
            if not rec:
                raise RegistryError("Proof not found.")
            return ProofEnvelope.model_validate(orjson.loads(rec.envelope_json))

    def list(self, limit: int = 50) -> list[dict]:
        with self.SessionLocal() as session:
            stmt = select(ProofRecord).order_by(ProofRecord.created_at.desc()).limit(limit)
            rows = session.execute(stmt).scalars().all()
            return [
                {
                    "proof_id": r.proof_id,
                    "task_id": r.task_id,
                    "robot_id": r.robot_id,
                    "run_id": r.run_id,
                    "created_at": r.created_at,
                    "payload_hash": r.payload_hash,
                    "anchor_ref": r.anchor_ref,
                }
                for r in rows
            ]
