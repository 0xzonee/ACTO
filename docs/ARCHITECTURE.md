# ACTO Architecture

Layers:

1. SDK (`acto/`)
2. CLI (`acto_cli/`)
3. Verification API (`acto_server/`)

Principles:

- Smart-contract-free by default
- Deterministic hashing + Ed25519 signatures
- Optional Solana integrations are isolated behind lazy imports
- Security-first design with comprehensive authentication and authorization

## Security Layer (v0.3.1)

ACTO includes a comprehensive security layer:

### Authentication & Authorization
- **JWT/OAuth2** (`acto/security/jwt.py`): Token-based authentication
- **RBAC** (`acto/security/rbac.py`): Role-based access control
- **API Keys** (`acto/security/api_keys.py`): Simple API key authentication
- **Audit Logging** (`acto/security/audit.py`): Comprehensive operation logging

### Data Protection
- **Encryption at Rest** (`acto/security/encryption.py`): AES-128 encryption for proof data
- **TLS/SSL** (`acto/security/tls.py`): Certificate management for encryption in transit
- **Secrets Management** (`acto/security/secrets.py`): Integration with Vault, AWS Secrets Manager
- **PII Protection** (`acto/telemetry/pii.py`): Detection and masking of sensitive data

### Key Management
- **Key Rotation** (`acto/security/key_rotation.py`): Signing key rotation support

See `docs/SECURITY.md` for detailed security documentation.

## Developer Experience

The SDK and CLI include several developer-friendly features:

### SDK Features

- **Async/Await Support**: Asynchronous versions of proof and registry operations (`acto/proof/async_engine.py`, `acto/registry/async_service.py`)
- **Context Managers**: Resource management via `with` statements for `ProofRegistry` and `AsyncProofRegistry`
- **Type Hints**: Complete type annotations throughout the codebase
- **Comprehensive Docstrings**: Function documentation with code examples

### CLI Features

- **Interactive Mode**: Menu-driven interface (`acto interactive`)
- **Shell Completion**: Auto-completion for bash, zsh, fish, and PowerShell
- **Progress Bars**: Visual feedback for long-running operations
- **Color-Coded Output**: Consistent, readable terminal output
- **Config File Support**: User configuration via `~/.acto/config.toml`
