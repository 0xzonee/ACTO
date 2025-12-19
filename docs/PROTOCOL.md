# ACTO Proof Protocol

ACTO proofs are deterministic, signed, portable, and verifiable.

- Deterministic: canonicalized telemetry + canonical payload hashing
- Signed: Ed25519 signatures over the payload hash
- Portable: JSON envelope format
- Verifiable: local verification without a trusted server

See `acto/proof/models.py` for the canonical envelope schema.
