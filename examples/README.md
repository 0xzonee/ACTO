# Examples

## Create a proof from sample telemetry

```bash
acto keys generate --out data/keys/acto_keypair.json
acto proof create --task-id cleaning-run-001 --source examples/telemetry/sample_telemetry.jsonl --out examples/proofs/sample_proof.json
acto proof verify --proof examples/proofs/sample_proof.json
```

## Submit to local API

Start the server:

```bash
acto server run
```

Then:

```bash
python examples/scripts/submit_proof.py examples/proofs/sample_proof.json
```

## Pipeline mode

```bash
acto pipeline run --task-id cleaning-run-002 --source examples/telemetry/sample_telemetry.jsonl --out examples/proofs/sample_proof_pipeline.json
acto score compute --proof examples/proofs/sample_proof_pipeline.json
acto registry list
```
