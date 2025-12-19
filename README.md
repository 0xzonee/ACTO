# ACTO

ACTO is a robotics-first proof-of-execution toolkit.

It helps you generate deterministic, signed execution proofs from robot telemetry and logs, then verify those proofs locally or via an API. ACTO is designed to be smart-contract-free by default and can be integrated into existing robotics stacks.

## What you get

- Python SDK to create and verify execution proofs
- Local-first SQLite proof registry
- FastAPI verification service (optional)
- CLI for generating, verifying, and inspecting proofs
- Pluggable telemetry parsers and normalizers
- Token gating module (optional) for SPL token balance checks (off-chain)

## Quick start

### Create a virtual environment

```bash
python -m venv .venv
# Windows:
# .venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate
```

### Install

```bash
pip install -U pip
pip install -e ".[all]"
```

### Generate a keypair

```bash
acto keys generate --out data/keys/acto_keypair.json
```

### Generate a proof from telemetry

```bash
acto proof create   --task-id "cleaning-run-001"   --source examples/telemetry/sample_telemetry.jsonl   --out examples/proofs/sample_proof.json
```

### Verify locally

```bash
acto proof verify --proof examples/proofs/sample_proof.json
```

### Run the API server (optional)

```bash
acto server run
```

## Token gating (no smart contract required)

ACTO can gate access based on SPL token holdings by checking a wallet's token balance via Solana RPC. This is off-chain enforcement (your API decides whether to allow a request).

```bash
acto access check   --rpc https://api.mainnet-beta.solana.com   --owner <WALLET_ADDRESS>   --mint <TOKEN_MINT>   --minimum 50000
```

## License

MIT. See `LICENSE`.

## New in this expanded build

- Pluggable pipeline system for telemetry ingestion and proof generation
- Proof anchoring module (Solana Memo anchoring is optional and contract-free)
- API key authentication (optional) + request ID middleware
- In-memory rate limiting middleware for the API
- Proof reputation scoring module (configurable scoring policy)
- Metrics endpoint (Prometheus-compatible) for hosted deployments
- Docker + docker-compose for running the API + registry quickly
- More CLI commands (registry, score, plugins, pipeline)
