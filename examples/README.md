# Examples

This directory contains example scripts, telemetry data, and Jupyter notebooks demonstrating ACTO usage.

## Prerequisites

### Install the SDK

```bash
# Install from PyPI
pip install actobotics

# Or with optional features
pip install actobotics[solana]  # With Solana integration
pip install actobotics[full]    # With all optional features
```

> **Note:** The package is called `actobotics` on PyPI, but you import it as `acto` in Python.

## Jupyter Notebooks

Interactive examples for SDK usage:

- **`notebooks/01_basic_proof_creation.ipynb`** - Basic proof creation and verification
- **`notebooks/02_async_proof_operations.ipynb`** - Async/await support examples
- **`notebooks/03_registry_operations.ipynb`** - Registry usage with context managers
- **`notebooks/04_fleet_management.ipynb`** - Fleet Management API usage

To run the notebooks:

```bash
# Install Jupyter if needed
pip install jupyter

# Start Jupyter
jupyter notebook notebooks/
```

## CLI Examples

### Create a proof from sample telemetry

```bash
acto keys generate --out data/keys/acto_keypair.json
acto proof create --task-id cleaning-run-001 --source examples/telemetry/sample_telemetry.jsonl --out examples/proofs/sample_proof.json
acto proof verify --proof examples/proofs/sample_proof.json
```

### Interactive Mode

Use the interactive mode for guided workflows:

```bash
acto interactive start
```

### Submit to hosted API

Use the hosted API at `https://api.actobotics.net`:

1. Get an API key at [api.actobotics.net/dashboard](https://api.actobotics.net/dashboard)
2. Submit proofs via the API

```bash
python examples/scripts/submit_proof.py examples/proofs/sample_proof.json
```

### Pipeline mode

```bash
acto pipeline run --task-id cleaning-run-002 --source examples/telemetry/sample_telemetry.jsonl --out examples/proofs/sample_proof_pipeline.json
acto score compute --proof examples/proofs/sample_proof_pipeline.json
acto registry list
```

## Fleet Management

Manage your robot fleet via the API:

```bash
# Run the fleet example script
python examples/scripts/fleet_example.py
```

The script demonstrates:
- Getting fleet overview
- Viewing device details
- Renaming devices with custom names
- Reporting health metrics (CPU, RAM, battery, etc.)
- Creating and managing device groups
- Assigning devices to groups

### Report Health from Robot

Robots can report their health metrics (all fields optional):

```python
import httpx

httpx.post(
    "https://api.actobotics.net/v1/fleet/devices/robot-001/health",
    headers={"Authorization": f"Bearer {JWT_TOKEN}"},
    json={
        "cpu_percent": 45.2,
        "memory_percent": 68.0,
        "battery_percent": 85.0,
        "battery_charging": True,
        "temperature": 42.5,
        "uptime_seconds": 86400,
        "network_connected": True,
    }
)
```

## SDK Examples

See the Jupyter notebooks in `notebooks/` for comprehensive SDK usage examples including:

- Basic proof creation and verification
- Async/await operations
- Registry management with context managers
- Batch operations
- Fleet management integration
