from __future__ import annotations

import os
from fastapi.testclient import TestClient

from acto.crypto.keys import KeyPair
from acto.proof.engine import create_proof
from acto.telemetry.models import TelemetryBundle, TelemetryEvent


def test_api_submit_and_get(tmp_path, monkeypatch) -> None:
    # Set a temporary database path for the test before importing create_app
    monkeypatch.setenv("ACTO_DB_URL", f"sqlite:///{tmp_path}/test.sqlite")
    
    # Import after setting environment variable
    from acto_server.app import create_app
    app = create_app()
    client = TestClient(app)

    kp = KeyPair.generate()
    bundle = TelemetryBundle(
        task_id="t-api",
        events=[TelemetryEvent(ts="2025-01-01T00:00:00+00:00", topic="x", data={"n": 1})],
        meta={},
    )
    env = create_proof(bundle, kp.private_key_b64, kp.public_key_b64)

    r = client.post("/v1/proofs", json={"envelope": env.model_dump()})
    assert r.status_code == 200
    pid = r.json()["proof_id"]

    r2 = client.get(f"/v1/proofs/{pid}")
    assert r2.status_code == 200
    assert r2.json()["envelope"]["payload"]["payload_hash"] == env.payload.payload_hash
