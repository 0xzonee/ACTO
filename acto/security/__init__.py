from .api_keys import ApiKeyStore as LegacyApiKeyStore, generate_api_key, hash_api_key
from .api_key_store import ApiKeyStore
from .audit import AuditAction, AuditLogger, AuditResult
from .auth import (
    create_jwt_dependency,
    create_jwt_dependency_optional,
    get_current_user,
    get_current_user_optional,
    require_api_key,
    require_api_key_and_token_balance,
    require_jwt,
    require_jwt_optional,
    require_permission,
    require_scope,
)
from .encryption import EncryptionManager, ProofEncryption
from .jwt import JWTManager, OAuth2TokenResponse
from .key_rotation import KeyRotationManager
from .rate_limit import TokenBucketRateLimiter
from .rbac import Permission, RBACManager, Role, extract_roles_from_token, extract_scopes_from_token
from .secrets import (
    AWSSecretsManager,
    EnvironmentSecretsManager,
    HashiCorpVaultSecretsManager,
    SecretsManager,
    get_secrets_manager,
)
from .tls import TLSManager

__all__ = [
    "ApiKeyStore",
    "LegacyApiKeyStore",
    "generate_api_key",
    "hash_api_key",
    "require_api_key",
    "require_api_key_and_token_balance",
    "TokenBucketRateLimiter",
    "JWTManager",
    "OAuth2TokenResponse",
    "require_jwt",
    "create_jwt_dependency",
    "create_jwt_dependency_optional",
    "get_current_user",
    "get_current_user_optional",
    "require_jwt_optional",
    "require_permission",
    "require_scope",
    "RBACManager",
    "Permission",
    "Role",
    "extract_roles_from_token",
    "extract_scopes_from_token",
    "AuditLogger",
    "AuditAction",
    "AuditResult",
    "KeyRotationManager",
    "EncryptionManager",
    "ProofEncryption",
    "TLSManager",
    "SecretsManager",
    "EnvironmentSecretsManager",
    "HashiCorpVaultSecretsManager",
    "AWSSecretsManager",
    "get_secrets_manager",
]
