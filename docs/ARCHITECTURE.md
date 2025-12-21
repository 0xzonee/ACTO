# ACTO Architecture

## Overview

Layers:

1. SDK (`acto/`)
2. CLI (`acto_cli/`)
3. Verification API (`acto_server/`)

Principles:

- Fast, gas-free off-chain verification
- Deterministic hashing + Ed25519 signatures
- Optional Solana integrations are isolated behind lazy imports
- Security-first design with comprehensive authentication and authorization
- Modular codebase for maintainability and reusability

## Dashboard Architecture (v0.7.2)

The dashboard follows a modular architecture for better maintainability:

### JavaScript Modules (`acto_server/static/js/`)

| Module | Responsibility |
|--------|---------------|
| `core.js` | Global state, API helpers, alerts, tab navigation, keyboard handlers |
| `wallet.js` | Multi-wallet support (Phantom, Solflare, Backpack, Glow, Coinbase) |
| `clipboard.js` | Copy-to-clipboard functionality with visual feedback |
| `modals.js` | Rename and delete confirmation dialogs |
| `keys.js` | API key CRUD, filtering, pagination, bulk actions |
| `wallet-stats.js` | Wallet statistics, activity charts, breakdowns |
| `playground.js` | API playground endpoint testing |
| `docs.js` | Documentation rendering |
| `stats.js` | Statistics display |
| `fleet.js` | Fleet device management |

### CSS Modules (`acto_server/static/css/`)

| Module | Responsibility |
|--------|---------------|
| `base.css` | CSS variables, reset, layout, cards |
| `buttons.css` | All button variants |
| `forms.css` | Input, select, textarea |
| `alerts.css` | Notifications, status badges |
| `modals.css` | Modal dialogs |
| `keys.css` | Key management UI |
| `stats.css` | Statistics components |
| `playground.css` | API playground |
| `fleet.css` | Fleet management |
| `balance.css` | Balance error screen |
| `responsive.css` | Mobile adaptations |
| `navigation.css` | Tab navigation |

### Backend Router Modules (`acto_server/routers/`)

| Router | Endpoints |
|--------|-----------|
| `auth.py` | `/v1/auth/wallet/connect`, `/v1/auth/wallet/verify`, `/v1/auth/me` |
| `keys.py` | `/v1/keys` (CRUD), `/v1/keys/{id}/toggle`, `/v1/keys/{id}/stats` |
| `proofs.py` | `/v1/proofs`, `/v1/verify`, `/v1/verify/batch`, `/v1/proofs/search` |
| `access.py` | `/v1/access/check`, `/v1/config/token-gating` |
| `stats.py` | `/v1/stats/wallet/{address}` |
| `fleet.py` | `/v1/fleet` |

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
