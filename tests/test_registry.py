from __future__ import annotations

from acto.config.settings import Settings
from acto.crypto.keys import KeyPair
from acto.proof.engine import create_proof, verify_proof
from acto.registry.service import ProofRegistry
from acto.telemetry.models import TelemetryBundle, TelemetryEvent


def test_registry_upsert_and_get(tmp_path) -> None:
    settings = Settings(db_url=f"sqlite:///{tmp_path}/test.sqlite")
    reg = ProofRegistry(settings)

    kp = KeyPair.generate()
    bundle = TelemetryBundle(
        task_id="t2",
        events=[TelemetryEvent(ts="2025-01-01T00:00:00+00:00", topic="t", data={"a": 1})],
        meta={},
    )
    env = create_proof(bundle, kp.private_key_b64, kp.public_key_b64)

    pid = reg.upsert(env)
    loaded = reg.get(pid)
    assert loaded.payload.payload_hash == env.payload.payload_hash
    assert verify_proof(loaded) is True
