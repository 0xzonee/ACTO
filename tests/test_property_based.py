"""
Property-based tests using Hypothesis.

These tests use property-based testing to verify invariants and edge cases.
"""
from __future__ import annotations

from datetime import datetime, timezone

import pytest
from hypothesis import given, settings, strategies as st  # type: ignore[import-untyped]

from acto.crypto.keys import KeyPair
from acto.proof.engine import create_proof, verify_proof
from acto.telemetry.models import TelemetryBundle, TelemetryEvent


@pytest.mark.property
class TestProofProperties:
    """Property-based tests for proof creation and verification."""

    @given(
        task_id=st.text(min_size=1, max_size=100),
        robot_id=st.text(min_size=1, max_size=100) | st.none(),
        data=st.dictionaries(
            keys=st.text(min_size=1, max_size=20),
            values=st.one_of(
                st.integers(),
                st.floats(allow_nan=False, allow_infinity=False),
                st.text(max_size=100),
                st.booleans(),
                st.lists(st.integers(), max_size=10)
            ),
            max_size=10
        )
    )
    @settings(max_examples=50, deadline=5000)
    def test_proof_creation_always_verifiable(self, task_id: str, robot_id: str | None, data: dict) -> None:
        """Property: Any valid proof created should always be verifiable."""
        keypair = KeyPair.generate()
        
        bundle = TelemetryBundle(
            task_id=task_id,
            robot_id=robot_id,
            events=[
                TelemetryEvent(
                    ts=datetime.now(timezone.utc).isoformat(),
                    topic="test",
                    data=data
                )
            ],
            meta={}
        )
        
        envelope = create_proof(
            bundle,
            keypair.private_key_b64,
            keypair.public_key_b64
        )
        
        # Property: Created proof must be verifiable
        assert verify_proof(envelope) is True

    @given(
        num_events=st.integers(min_value=1, max_value=100),
        task_id=st.text(min_size=1, max_size=50)
    )
    @settings(max_examples=20, deadline=10000)
    def test_proof_with_variable_events(self, num_events: int, task_id: str) -> None:
        """Property: Proofs with varying numbers of events should all be valid."""
        keypair = KeyPair.generate()
        
        events = [
            TelemetryEvent(
                ts=datetime.now(timezone.utc).isoformat(),
                topic=f"topic-{i}",
                data={"index": i, "value": i * 2}
            )
            for i in range(num_events)
        ]
        
        bundle = TelemetryBundle(
            task_id=task_id,
            events=events,
            meta={}
        )
        
        envelope = create_proof(
            bundle,
            keypair.private_key_b64,
            keypair.public_key_b64
        )
        
        assert verify_proof(envelope) is True
        assert len(envelope.payload.telemetry_normalized["events"]) == num_events

    @given(
        bundle1=st.builds(
            TelemetryBundle,
            task_id=st.text(min_size=1, max_size=50),
            events=st.lists(
                st.builds(
                    TelemetryEvent,
                    ts=st.datetimes(timezones=st.just(timezone.utc)).map(lambda d: d.isoformat()),
                    topic=st.text(min_size=1, max_size=20),
                    data=st.dictionaries(
                        keys=st.text(min_size=1, max_size=10),
                        values=st.one_of(st.integers(), st.text(max_size=50)),
                        max_size=5
                    )
                ),
                min_size=1,
                max_size=10
            ),
            meta=st.dictionaries(
                keys=st.text(min_size=1, max_size=10),
                values=st.text(max_size=50),
                max_size=5
            )
        ),
        bundle2=st.builds(
            TelemetryBundle,
            task_id=st.text(min_size=1, max_size=50),
            events=st.lists(
                st.builds(
                    TelemetryEvent,
                    ts=st.datetimes(timezones=st.just(timezone.utc)).map(lambda d: d.isoformat()),
                    topic=st.text(min_size=1, max_size=20),
                    data=st.dictionaries(
                        keys=st.text(min_size=1, max_size=10),
                        values=st.one_of(st.integers(), st.text(max_size=50)),
                        max_size=5
                    )
                ),
                min_size=1,
                max_size=10
            ),
            meta=st.dictionaries(
                keys=st.text(min_size=1, max_size=10),
                values=st.text(max_size=50),
                max_size=5
            )
        )
    )
    @settings(max_examples=30, deadline=10000)
    def test_different_bundles_different_hashes(self, bundle1: TelemetryBundle, bundle2: TelemetryBundle) -> None:
        """Property: Different bundles should produce different payload hashes."""
        keypair = KeyPair.generate()
        
        envelope1 = create_proof(
            bundle1,
            keypair.private_key_b64,
            keypair.public_key_b64
        )
        
        envelope2 = create_proof(
            bundle2,
            keypair.private_key_b64,
            keypair.public_key_b64
        )
        
        # If bundles are different, hashes should be different
        # (with very high probability)
        if bundle1.model_dump() != bundle2.model_dump():
            # Note: There's a tiny chance of hash collision, but it's negligible
            assert envelope1.payload.payload_hash != envelope2.payload.payload_hash

    @given(
        bundle=st.builds(
            TelemetryBundle,
            task_id=st.text(min_size=1, max_size=50),
            events=st.lists(
                st.builds(
                    TelemetryEvent,
                    ts=st.datetimes(timezones=st.just(timezone.utc)).map(lambda d: d.isoformat()),
                    topic=st.text(min_size=1, max_size=20),
                    data=st.dictionaries(
                        keys=st.text(min_size=1, max_size=10),
                        values=st.one_of(st.integers(), st.floats(allow_nan=False), st.text(max_size=50)),
                        max_size=5
                    )
                ),
                min_size=1,
                max_size=20
            ),
            meta=st.dictionaries(
                keys=st.text(min_size=1, max_size=10),
                values=st.text(max_size=50),
                max_size=5
            )
        )
    )
    @settings(max_examples=50, deadline=10000)
    def test_proof_idempotency(self, bundle: TelemetryBundle) -> None:
        """Property: Creating the same proof twice should produce identical hashes."""
        keypair = KeyPair.generate()
        
        envelope1 = create_proof(
            bundle,
            keypair.private_key_b64,
            keypair.public_key_b64
        )
        
        # Small delay to ensure different timestamps
        import time
        time.sleep(0.001)
        
        envelope2 = create_proof(
            bundle,
            keypair.private_key_b64,
            keypair.public_key_b64
        )
        
        # Note: created_at will be different, but telemetry_hash should be the same
        assert envelope1.payload.telemetry_hash == envelope2.payload.telemetry_hash

