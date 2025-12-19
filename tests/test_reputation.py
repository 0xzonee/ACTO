from __future__ import annotations

from acto.crypto.keys import KeyPair
from acto.proof.engine import create_proof, verify_proof
from acto.reputation import ReputationScorer
from acto.telemetry.models import TelemetryBundle, TelemetryEvent


def test_reputation_score() -> None:
    kp = KeyPair.generate()
    bundle = TelemetryBundle(
        task_id="t-score",
        events=[
            TelemetryEvent(ts="2025-01-01T00:00:00+00:00", topic="safety", data={"ok": True}),
            TelemetryEvent(ts="2025-01-01T00:00:01+00:00", topic="safety", data={"ok": True}),
            TelemetryEvent(ts="2025-01-01T00:00:02+00:00", topic="safety", data={"ok": False}),
        ],
        meta={},
    )
    env = create_proof(bundle, kp.private_key_b64, kp.public_key_b64)
    assert verify_proof(env) is True
    scorer = ReputationScorer()
    result = scorer.score(env)
    assert 0.0 <= result.score <= 1.0
    assert "safety_ok_ratio" in result.reasons
