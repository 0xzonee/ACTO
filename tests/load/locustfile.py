"""
Locust load testing configuration for ACTO API.

Usage:
    locust -f tests/load/locustfile.py --host=http://localhost:8080

Or with web UI:
    locust -f tests/load/locustfile.py --host=http://localhost:8080 --web-host=0.0.0.0 --web-port=8089
"""
from __future__ import annotations

import json
import os
import random
from typing import Any

from locust import HttpUser, TaskSet, between, task  # type: ignore[import-untyped]

from acto.crypto.keys import KeyPair
from acto.proof.engine import create_proof
from acto.telemetry.models import TelemetryBundle, TelemetryEvent


class ProofTasks(TaskSet):
    """Task set for proof-related API endpoints."""

    def on_start(self) -> None:
        """Initialize test data when a user starts."""
        self.keypair = KeyPair.generate()
        self.proof_ids: list[str] = []

    @task(3)
    def submit_proof(self) -> None:
        """Submit a new proof (weight: 3)."""
        bundle = TelemetryBundle(
            task_id=f"load-test-{random.randint(1000, 9999)}",
            robot_id=f"robot-{random.randint(1, 10)}",
            events=[
                TelemetryEvent(
                    ts="2025-01-01T00:00:00+00:00",
                    topic="sensor",
                    data={
                        "temperature": random.uniform(20.0, 30.0),
                        "humidity": random.uniform(40.0, 80.0),
                        "pressure": random.uniform(980.0, 1020.0),
                    }
                )
            ],
            meta={"load_test": True}
        )
        
        envelope = create_proof(
            bundle,
            self.keypair.private_key_b64,
            self.keypair.public_key_b64
        )
        
        response = self.client.post(
            "/v1/proofs",
            json={"envelope": envelope.model_dump()},
            name="Submit Proof"
        )
        
        if response.status_code == 200:
            proof_id = response.json().get("proof_id")
            if proof_id:
                self.proof_ids.append(proof_id)

    @task(5)
    def get_proof(self) -> None:
        """Get a proof by ID (weight: 5)."""
        if not self.proof_ids:
            # If no proofs available, try a random ID
            proof_id = "a" * 32
        else:
            proof_id = random.choice(self.proof_ids)
        
        self.client.get(
            f"/v1/proofs/{proof_id}",
            name="Get Proof"
        )

    @task(2)
    def list_proofs(self) -> None:
        """List proofs (weight: 2)."""
        limit = random.choice([10, 20, 50, 100])
        self.client.get(
            f"/v1/proofs?limit={limit}",
            name="List Proofs"
        )

    @task(2)
    def verify_proof(self) -> None:
        """Verify a proof (weight: 2)."""
        if not self.proof_ids:
            return
        
        proof_id = random.choice(self.proof_ids)
        
        # First get the proof
        response = self.client.get(f"/v1/proofs/{proof_id}")
        if response.status_code == 200:
            envelope = response.json().get("envelope")
            if envelope:
                self.client.post(
                    "/v1/verify",
                    json={"envelope": envelope},
                    name="Verify Proof"
                )

    @task(1)
    def health_check(self) -> None:
        """Health check endpoint (weight: 1)."""
        self.client.get("/health", name="Health Check")

    @task(1)
    def metrics(self) -> None:
        """Metrics endpoint (weight: 1)."""
        self.client.get("/metrics", name="Metrics")


class ACTOUser(HttpUser):
    """Locust user class for ACTO API load testing."""
    
    tasks = [ProofTasks]
    wait_time = between(1, 3)  # Wait between 1 and 3 seconds between tasks
    
    def on_start(self) -> None:
        """Called when a simulated user starts."""
        pass


# Standalone task sets for specific scenarios
class HighLoadProofSubmission(TaskSet):
    """High load scenario: mostly proof submissions."""
    
    def on_start(self) -> None:
        self.keypair = KeyPair.generate()
    
    @task(10)
    def submit_proof(self) -> None:
        bundle = TelemetryBundle(
            task_id=f"high-load-{random.randint(10000, 99999)}",
            events=[
                TelemetryEvent(
                    ts="2025-01-01T00:00:00+00:00",
                    topic="sensor",
                    data={"value": random.randint(1, 100)}
                )
            ],
            meta={}
        )
        
        envelope = create_proof(
            bundle,
            self.keypair.private_key_b64,
            self.keypair.public_key_b64
        )
        
        self.client.post(
            "/v1/proofs",
            json={"envelope": envelope.model_dump()},
            name="High Load Submit"
        )


class ReadHeavyWorkload(TaskSet):
    """Read-heavy scenario: mostly GET requests."""
    
    def on_start(self) -> None:
        # Pre-populate some proof IDs (in real scenario, these would exist)
        self.proof_ids = [f"proof-{i:032d}" for i in range(100)]
    
    @task(10)
    def get_proof(self) -> None:
        proof_id = random.choice(self.proof_ids)
        self.client.get(f"/v1/proofs/{proof_id}", name="Read Heavy Get")
    
    @task(5)
    def list_proofs(self) -> None:
        self.client.get("/v1/proofs?limit=50", name="Read Heavy List")
    
    @task(1)
    def submit_proof(self) -> None:
        # Occasional writes
        keypair = KeyPair.generate()
        bundle = TelemetryBundle(
            task_id=f"read-heavy-{random.randint(1000, 9999)}",
            events=[
                TelemetryEvent(
                    ts="2025-01-01T00:00:00+00:00",
                    topic="test",
                    data={"value": 1}
                )
            ],
            meta={}
        )
        
        envelope = create_proof(
            bundle,
            keypair.private_key_b64,
            keypair.public_key_b64
        )
        
        self.client.post(
            "/v1/proofs",
            json={"envelope": envelope.model_dump()},
            name="Read Heavy Submit"
        )


# Export scenarios for use with --tags
class HighLoadUser(HttpUser):
    tasks = [HighLoadProofSubmission]
    wait_time = between(0.5, 1.5)


class ReadHeavyUser(HttpUser):
    tasks = [ReadHeavyWorkload]
    wait_time = between(0.1, 0.5)

