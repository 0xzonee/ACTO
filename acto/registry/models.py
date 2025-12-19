from __future__ import annotations

from sqlalchemy import String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class ProofRecord(Base):
    __tablename__ = "proofs"

    proof_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    task_id: Mapped[str] = mapped_column(String(256), index=True)
    robot_id: Mapped[str | None] = mapped_column(String(256), index=True, nullable=True)
    run_id: Mapped[str | None] = mapped_column(String(256), index=True, nullable=True)

    created_at: Mapped[str] = mapped_column(String(64), index=True)
    payload_hash: Mapped[str] = mapped_column(String(128), index=True)
    signer_public_key_b64: Mapped[str] = mapped_column(Text)
    signature_b64: Mapped[str] = mapped_column(Text)
    envelope_json: Mapped[str] = mapped_column(Text)
    anchor_ref: Mapped[str | None] = mapped_column(String(256), nullable=True)
