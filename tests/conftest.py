"""
Pytest configuration and shared fixtures.
"""
from __future__ import annotations

import tempfile
from pathlib import Path

import pytest

from acto.config.settings import Settings


@pytest.fixture
def temp_db_path(tmp_path: Path) -> str:
    """Create a temporary database path for testing."""
    db_file = tmp_path / "test.db"
    return f"sqlite:///{db_file}"


@pytest.fixture
def test_settings(temp_db_path: str) -> Settings:
    """Create test settings with temporary database."""
    return Settings(db_url=temp_db_path)


@pytest.fixture
def sample_telemetry_bundle():
    """Create a sample telemetry bundle for testing."""
    from acto.telemetry.models import TelemetryBundle, TelemetryEvent
    
    return TelemetryBundle(
        task_id="test-task-001",
        robot_id="test-robot-001",
        run_id="test-run-001",
        events=[
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
        ],
        meta={"test": True}
    )

