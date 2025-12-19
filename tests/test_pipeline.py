from __future__ import annotations

from acto.crypto.keys import KeyPair, save_keypair
from acto.pipeline import ProofPipeline
from acto.pipeline.steps import (
    ProofCreateStep,
    ProofVerifyStep,
    TelemetryLoadStep,
    TelemetryNormalizeStep,
)
from acto.proof.models import ProofEnvelope


def test_pipeline_run(tmp_path) -> None:
    kp = KeyPair.generate()
    keypair_path = tmp_path / "kp.json"
    save_keypair(keypair_path, kp)

    telemetry_path = tmp_path / "t.jsonl"
    telemetry_path.write_text(
        '\n'.join([
            '{"ts":"2025-01-01T00:00:00+00:00","topic":"nav","data":{"x":1,"ok":true}}',
            '{"ts":"2025-01-01T00:00:01+00:00","topic":"power","data":{"v":12.3,"ok":true}}',
        ]) + "\n",
        encoding="utf-8",
    )

    pipe = ProofPipeline([TelemetryLoadStep(), TelemetryNormalizeStep(), ProofCreateStep(), ProofVerifyStep()])
    res = pipe.run({"task_id": "t-pipe", "source": str(telemetry_path), "keypair": str(keypair_path)})
    env = res.ctx["envelope"]
    assert isinstance(env, ProofEnvelope)
