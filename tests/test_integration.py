"""
Integration tests for complete ACTO workflows.

These tests verify end-to-end functionality across multiple components.
"""
from __future__ import annotations

import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from acto.crypto.keys import KeyPair
from acto.proof.engine import create_proof, verify_proof
from acto.registry.service import ProofRegistry
from acto.telemetry.models import TelemetryBundle, TelemetryEvent
from acto.telemetry.parsers import JsonlTelemetryParser


@pytest.mark.integration
class TestCompleteWorkflow:
    """Test complete proof creation and verification workflow."""

    def test_end_to_end_proof_workflow(self, tmp_path: Path) -> None:
        """Test complete workflow: parse -> create -> store -> retrieve -> verify."""
        # Setup
        keypair = KeyPair.generate()
        db_path = tmp_path / "test.db"
        
        # Step 1: Create telemetry data
        events = [
            TelemetryEvent(
                ts="2025-01-01T00:00:00+00:00",
                topic="sensor",
                data={"temperature": 25.5, "humidity": 60.0}
            ),
            TelemetryEvent(
                ts="2025-01-01T00:00:01+00:00",
                topic="actuator",
                data={"motor": "on", "speed": 100}
            ),
        ]
        bundle = TelemetryBundle(
            task_id="integration-test-001",
            robot_id="robot-001",
            run_id="run-001",
            events=events,
            meta={"test": True}
        )
        
        # Step 2: Create proof
        envelope = create_proof(
            bundle,
            keypair.private_key_b64,
            keypair.public_key_b64
        )
        assert verify_proof(envelope) is True
        
        # Step 3: Store in registry
        from acto.config.settings import Settings
        settings = Settings(db_url=f'sqlite:///{db_path}')
        registry = ProofRegistry(settings)
        proof_id = registry.upsert(envelope)
        
        # Step 4: Retrieve from registry
        retrieved = registry.get(proof_id)
        assert retrieved.payload.payload_hash == envelope.payload.payload_hash
        assert verify_proof(retrieved) is True
        
        # Step 5: Verify metadata
        assert retrieved.payload.subject.task_id == "integration-test-001"
        assert retrieved.payload.subject.robot_id == "robot-001"
        assert len(retrieved.payload.telemetry_normalized["events"]) == 2


@pytest.mark.integration
class TestParserToProofWorkflow:
    """Test workflow from file parsing to proof creation."""

    def test_jsonl_parser_to_proof(self, tmp_path: Path) -> None:
        """Test parsing JSONL file and creating proof."""
        # Create test JSONL file
        jsonl_file = tmp_path / "telemetry.jsonl"
        jsonl_file.write_text(
            '{"ts": "2025-01-01T00:00:00+00:00", "topic": "sensor", "data": {"value": 42}}\n'
            '{"ts": "2025-01-01T00:00:01+00:00", "topic": "actuator", "data": {"action": "move"}}\n'
        )
        
        # Parse
        parser = JsonlTelemetryParser()
        bundle = parser.parse(
            jsonl_file,
            task_id="parser-test-001",
            robot_id="robot-001"
        )
        
        assert len(bundle.events) == 2
        assert bundle.events[0].topic == "sensor"
        assert bundle.events[1].topic == "actuator"
        
        # Create proof
        keypair = KeyPair.generate()
        envelope = create_proof(
            bundle,
            keypair.private_key_b64,
            keypair.public_key_b64
        )
        
        assert verify_proof(envelope) is True
        assert envelope.payload.subject.task_id == "parser-test-001"


@pytest.mark.integration
class TestAPIToRegistryWorkflow:
    """Test complete API workflow with registry."""

    def test_api_submit_retrieve_verify(self, tmp_path: Path, monkeypatch) -> None:
        """Test submitting proof via API and retrieving it."""
        monkeypatch.setenv("ACTO_DB_URL", f"sqlite:///{tmp_path}/test.sqlite")
        
        from acto_server.app import create_app
        app = create_app()
        client = TestClient(app)
        
        # Create proof
        keypair = KeyPair.generate()
        bundle = TelemetryBundle(
            task_id="api-test-001",
            events=[
                TelemetryEvent(
                    ts="2025-01-01T00:00:00+00:00",
                    topic="test",
                    data={"test": True}
                )
            ],
            meta={}
        )
        envelope = create_proof(
            bundle,
            keypair.private_key_b64,
            keypair.public_key_b64
        )
        
        # Submit via API
        response = client.post("/v1/proofs", json={"envelope": envelope.model_dump()})
        assert response.status_code == 200
        proof_id = response.json()["proof_id"]
        
        # Retrieve via API
        response = client.get(f"/v1/proofs/{proof_id}")
        assert response.status_code == 200
        retrieved_data = response.json()
        assert retrieved_data["proof_id"] == proof_id
        
        # Verify via API
        response = client.post("/v1/verify", json={"envelope": envelope.model_dump()})
        assert response.status_code == 200
        assert response.json()["valid"] is True


@pytest.mark.integration
class TestRegistryOperations:
    """Test registry operations workflow."""

    def test_registry_list_and_search(self, tmp_path: Path) -> None:
        """Test listing and searching proofs in registry."""
        from acto.config.settings import Settings
        db_path = tmp_path / "test.db"
        settings = Settings(db_url=f'sqlite:///{db_path}')
        registry = ProofRegistry(settings)
        
        keypair = KeyPair.generate()
        
        # Create multiple proofs
        proof_ids = []
        for i in range(5):
            bundle = TelemetryBundle(
                task_id=f"task-{i:03d}",
                robot_id=f"robot-{i % 2}",
                events=[
                    TelemetryEvent(
                        ts=f"2025-01-01T00:00:{i:02d}+00:00",
                        topic="test",
                        data={"index": i}
                    )
                ],
                meta={}
            )
            envelope = create_proof(
                bundle,
                keypair.private_key_b64,
                keypair.public_key_b64
            )
            proof_id = registry.upsert(envelope)
            proof_ids.append(proof_id)
        
        # List proofs
        proofs = registry.list(limit=10)
        assert len(proofs) == 5
        
        # Search by task_id
        from acto.registry.search import SearchFilter
        filter_obj = SearchFilter()
        filter_obj.task_id = "task-001"
        results = registry.list(limit=10, search_filter=filter_obj)
        assert len(results) == 1
        assert results[0]["task_id"] == "task-001"


@pytest.mark.integration
@pytest.mark.slow
class TestConcurrentOperations:
    """Test concurrent operations on registry."""

    def test_concurrent_proof_creation(self, tmp_path: Path) -> None:
        """Test creating multiple proofs concurrently."""
        import concurrent.futures
        from acto.config.settings import Settings
        
        db_path = tmp_path / "test.db"
        settings = Settings(db_url=f'sqlite:///{db_path}')
        
        keypair = KeyPair.generate()
        
        def create_and_store(i: int) -> str:
            registry = ProofRegistry(settings)
            bundle = TelemetryBundle(
                task_id=f"concurrent-{i}",
                events=[
                    TelemetryEvent(
                        ts="2025-01-01T00:00:00+00:00",
                        topic="test",
                        data={"index": i}
                    )
                ],
                meta={}
            )
            envelope = create_proof(
                bundle,
                keypair.private_key_b64,
                keypair.public_key_b64
            )
            return registry.upsert(envelope)
        
        # Create 10 proofs concurrently
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            proof_ids = list(executor.map(create_and_store, range(10)))
        
        # Verify all proofs were stored
        registry = ProofRegistry(settings)
        all_proofs = registry.list(limit=20)
        assert len(all_proofs) == 10
        
        # Verify all proofs are retrievable
        for proof_id in proof_ids:
            proof = registry.get(proof_id)
            assert verify_proof(proof) is True

