from __future__ import annotations

from acto.crypto.keys import KeyPair
from acto.proof.engine import create_proof, verify_proof
from acto.telemetry.models import TelemetryBundle, TelemetryEvent


def test_proof_roundtrip() -> None:
    kp = KeyPair.generate()
    bundle = TelemetryBundle(
        task_id="t1",
        robot_id="r1",
        run_id="run-001",
        events=[
            TelemetryEvent(ts="2025-01-01T00:00:00+00:00", topic="nav", data={"x": 1, "y": 2}),
            TelemetryEvent(ts="2025-01-01T00:00:01+00:00", topic="power", data={"v": 12.3}),
        ],
        meta={"env": "test"},
    )
    env = create_proof(bundle, kp.private_key_b64, kp.public_key_b64)
    assert verify_proof(env) is True
