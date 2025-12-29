# ACTO Security Documentation

This document describes the security features and best practices for ACTO.

## Overview

ACTO v1.0.0 includes comprehensive security enhancements designed for production deployments. All security features are optional and can be enabled via configuration.

## User Data Isolation (v1.0.0)

ACTO implements **complete user data isolation** via wallet-based ownership. Each user can only access their own data.

### How It Works

- Every proof, device, and group is tagged with `owner_wallet`
- All database queries filter by `owner_wallet`
- Users cannot see or access data belonging to other wallets
- Works with both JWT (Dashboard) and API Key (SDK) authentication

### Ownership Assignment

**SDK/API Key Authentication:**
```http
Authorization: Bearer YOUR_API_KEY
X-Wallet-Address: YOUR_WALLET  # <- This becomes owner_wallet
```

**JWT Authentication (Dashboard):**
- Wallet address extracted from JWT token payload
- Automatically set when you connect your wallet

### Data Affected

| Table | Isolation Field |
|-------|-----------------|
| `proofs` | `owner_wallet` |
| `fleet_devices` | `owner_wallet` |
| `fleet_groups` | `owner_wallet` |

### Security Guarantees

- ✅ No cross-user data leakage
- ✅ Query-level enforcement (cannot be bypassed)
- ✅ Wallet-based ownership (cryptographically verifiable)
- ✅ Works with API keys and JWT tokens

## Authentication & Authorization

### Wallet-Based Authentication

ACTO uses Solana wallet-based authentication with JWT tokens. Users authenticate by signing a challenge message with their wallet.

**Authentication Flow:**
1. Connect wallet: `POST /v1/auth/wallet/connect` with wallet address
2. Sign the returned challenge message with your wallet
3. Verify signature: `POST /v1/auth/wallet/verify` with wallet address, signature, and challenge
4. Receive JWT access token on success
5. Use token: Include `Authorization: Bearer <token>` header in requests

**Token Gating:**
Access can be restricted to wallets holding a minimum amount of ACTO tokens.

**Configuration:**
```toml
jwt_secret_key = "your-secret-key-here"
jwt_algorithm = "HS256"
jwt_access_token_expire_minutes = 30

# Token gating (mandatory when enabled - enforced server-side)
token_gating_enabled = true
token_gating_mint = "9wpLm21ab8ZMVJWH3pHeqgqNJqWos73G8qDRfaEwtray"
token_gating_minimum = 50000.0
```

**Endpoints:**
- `POST /v1/auth/wallet/connect` - Get challenge message
- `POST /v1/auth/wallet/verify` - Verify signature and get JWT token
- `GET /v1/auth/me` - Get current user info (requires JWT)

**Implementation:**
- Located in `acto/security/jwt.py` and `acto/security/wallet_auth.py`
- Uses PyJWT library for tokens
- Uses Ed25519 signature verification for Solana wallets
- Supports custom claims (roles, wallet_address)

### Role-Based Access Control (RBAC)

ACTO implements a fine-grained permission system with predefined roles.

**Predefined Roles:**
- `VIEWER`: Read-only access to proofs and registry
- `USER`: Can create and read proofs, write to registry
- `ADMIN`: Full access including deletion and user management
- `AUDITOR`: Read access plus audit log access

**Permissions:**
- `proof:read`, `proof:write`, `proof:delete`
- `registry:read`, `registry:write`, `registry:delete`
- `admin`, `audit:read`, `user:manage`, `key:rotate`

**Configuration:**
```toml
rbac_enabled = true
```

**Implementation:**
- Located in `acto/security/rbac.py`
- Roles and permissions can be extended via custom roles

### API Key Authentication

Simple API key-based authentication (existing feature).

**Configuration:**
```toml
api_auth_enabled = true
```

### Rate Limiting

Token bucket rate limiting with automatic cleanup of stale entries. Rate limits are applied **per API key** (not per IP), making it fair for robots behind NAT/proxy.

**Configuration:**
```toml
rate_limit_enabled = true
rate_limit_rps = 5.0           # Requests per second
rate_limit_burst = 20          # Maximum burst capacity
rate_limit_bucket_ttl = 3600.0      # Bucket expiry (seconds, default: 1 hour)
rate_limit_cleanup_interval = 1000  # Cleanup every N requests
```

**Features:**
- Token bucket algorithm with configurable rate and burst
- **API key-based limiting**: Each API key gets its own rate limit bucket
- Supports thousands of robots without conflicts (even behind same IP/NAT)
- Unauthenticated endpoints fall back to IP-based limiting
- Automatic cleanup prevents memory leaks from inactive clients
- Per-client rate limiting based on IP and endpoint

**Implementation:**
- Located in `acto/security/rate_limit.py`

## Audit Logging

All operations are logged for security and compliance purposes.

**Backends:**
- `memory`: In-memory storage (for testing)
- `file`: JSONL file storage
- `database`: Database-backed storage (future)

**Configuration:**
```toml
audit_log_enabled = true
audit_log_backend = "file"
audit_log_file = "./data/audit.log"
```

**Logged Events:**
- Proof creation, reading, updating, deletion
- Registry operations
- User authentication
- Key rotation
- Administrative actions

**Implementation:**
- Located in `acto/security/audit.py`
- Automatic logging via middleware in `acto_server/app.py`

## Data Protection

### Encryption at Rest

Proof data can be encrypted at rest using AES-128 encryption (Fernet).

**Configuration:**
```toml
encryption_enabled = true
# Option 1: Direct key
encryption_key = "base64-encoded-32-byte-key"

# Option 2: Password-based (requires salt)
encryption_password = "your-password"
encryption_salt = "base64-encoded-salt"
```

**Key Generation:**
```python
from acto.security.encryption import EncryptionManager

# Generate a new key
key = EncryptionManager.generate_key()
salt = EncryptionManager.generate_salt()
```

**Implementation:**
- Located in `acto/security/encryption.py`
- Uses cryptography library (Fernet)
- Specialized `ProofEncryption` class for proof data

### Encryption in Transit (TLS/SSL)

TLS certificate management for secure communication.

**Configuration:**
```toml
tls_enabled = true
tls_cert_file = "./certs/cert.pem"
tls_key_file = "./certs/key.pem"
tls_ca_cert_file = "./certs/ca.pem"  # Optional
```

**Self-Signed Certificate Generation:**
```python
from acto.security.tls import TLSManager

TLSManager.generate_self_signed_cert(
    cert_file="./certs/cert.pem",
    key_file="./certs/key.pem",
    common_name="localhost",
    days_valid=365
)
```

**Implementation:**
- Located in `acto/security/tls.py`
- Supports server and client SSL contexts

### Secrets Management

Integration with external secrets management systems.

**Supported Backends:**
- Environment variables (`env`)
- HashiCorp Vault (`vault`)
- AWS Secrets Manager (`aws`)

**Configuration:**
```toml
secrets_backend = "vault"
vault_url = "http://localhost:8200"
vault_token = "your-vault-token"
vault_path = "secret"

# Or for AWS:
secrets_backend = "aws"
aws_secrets_region = "us-east-1"
aws_secrets_profile = "default"
```

**Usage:**
```python
from acto.security.secrets import get_secrets_manager

secrets = get_secrets_manager(backend="vault", vault_url="...")
api_key = secrets.get_secret("api_key")
```

**Implementation:**
- Located in `acto/security/secrets.py`
- Abstract base class for extensibility

### PII Detection & Masking

Automatic detection and masking of personally identifiable information in telemetry data.

**Detected PII Types:**
- Email addresses
- Phone numbers
- Social Security Numbers (SSN)
- Credit card numbers
- IP addresses
- MAC addresses

**Configuration:**
```toml
pii_detection_enabled = true
pii_masking_enabled = true
pii_mask_char = "*"
pii_preserve_length = true
```

**Usage:**
```python
from acto.telemetry.pii import PIIDetector, PIIMasker

# Detect PII
detector = PIIDetector()
pii_found = detector.detect_in_dict(telemetry_data)

# Mask PII
masker = PIIMasker(mask_char="*", preserve_length=True)
masked_data = masker.mask_bundle(telemetry_bundle)
```

**Implementation:**
- Located in `acto/telemetry/pii.py`
- Regex-based detection
- Configurable masking strategies

## Key Management

### Signing Key Rotation

Support for rotating signing keys without service interruption.

**Features:**
- Multiple active keys supported
- Automatic key lifecycle management
- Verification against all known keys (active and retired)

**Usage:**
```python
from acto.security.key_rotation import KeyRotationManager

manager = KeyRotationManager()
new_key_id, new_private_key = manager.rotate_key(old_key_id="key_20240101")
```

**Implementation:**
- Located in `acto/security/key_rotation.py`
- Integrated with audit logging

## Best Practices

### Production Deployment

1. **Enable JWT Authentication**: Use strong secret keys and appropriate token expiration times
2. **Enable RBAC**: Assign minimal required permissions to users
3. **Enable Audit Logging**: Use file or database backend for persistence
4. **Enable Encryption at Rest**: Store encryption keys securely (use secrets management)
5. **Enable TLS/SSL**: Use valid certificates from trusted CAs
6. **Use Secrets Management**: Store sensitive configuration in Vault or AWS Secrets Manager
7. **Enable PII Masking**: Protect sensitive data in telemetry
8. **Rotate Keys Regularly**: Implement key rotation schedule

### Security Configuration Example

```toml
# Authentication
jwt_enabled = true
jwt_secret_key = "${VAULT_SECRET_JWT_KEY}"  # From secrets manager
rbac_enabled = true

# Audit Logging
audit_log_enabled = true
audit_log_backend = "file"
audit_log_file = "/var/log/acto/audit.log"

# Encryption
encryption_enabled = true
encryption_key = "${VAULT_SECRET_ENCRYPTION_KEY}"

# TLS
tls_enabled = true
tls_cert_file = "/etc/acto/certs/cert.pem"
tls_key_file = "/etc/acto/certs/key.pem"

# Secrets Management
secrets_backend = "vault"
vault_url = "https://vault.example.com"
vault_token = "${VAULT_TOKEN}"

# PII Protection
pii_detection_enabled = true
pii_masking_enabled = true
```

## Threat Model

See `docs/THREAT_MODEL.md` for detailed threat analysis and mitigation strategies.

## Reporting Security Issues

If you discover a security vulnerability, please report it to the maintainers privately. Do not open a public issue.

