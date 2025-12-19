# ACTO Architecture

Layers:

1. SDK (`acto/`)
2. CLI (`acto_cli/`)
3. Verification API (`acto_server/`)

Principles:

- Smart-contract-free by default
- Deterministic hashing + Ed25519 signatures
- Optional Solana integrations are isolated behind lazy imports
