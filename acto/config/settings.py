from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration for ACTO."""

    model_config = SettingsConfigDict(env_prefix="ACTO_", env_file=".env", extra="ignore")

    # Storage
    db_url: str = "sqlite:///./data/acto.sqlite"

    # Logging
    log_level: str = "INFO"
    json_logs: bool = False

    # Proof defaults
    proof_version: str = "1"
    proof_hash_alg: str = "blake3"
    proof_signature_alg: str = "ed25519"

    # Server
    host: str = "127.0.0.1"
    port: int = 8080

    # API security
    api_auth_enabled: bool = False

    # Rate limiting
    rate_limit_enabled: bool = True
    rate_limit_rps: float = 5.0
    rate_limit_burst: int = 20

    # Upload limits
    max_telemetry_bytes: int = 8_000_000
