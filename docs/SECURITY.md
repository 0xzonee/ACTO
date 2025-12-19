# ACTO Security Documentation

This document describes the security features and best practices for ACTO.

## Overview

ACTO v0.3.1 includes comprehensive security enhancements designed for production deployments. All security features are optional and can be enabled via configuration.

## Authentication & Authorization

### OAuth2/JWT Support

ACTO supports JWT-based authentication with access and refresh tokens.

**Configuration:**
```toml
jwt_enabled = true
jwt_secret_key = "your-secret-key-here"
jwt_algorithm = "HS256"
jwt_access_token_expire_minutes = 30
jwt_refresh_token_expire_days = 7
```

**Usage:**
- Request access token: `POST /v1/auth/token` with username/password
- Refresh token: `POST /v1/auth/refresh` with refresh token
- Use token: Include `Authorization: Bearer <token>` header in requests

**Implementation:**
- Located in `acto/security/jwt.py`
- Uses PyJWT library
- Supports custom claims (roles, scopes)

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

