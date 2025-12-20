# Changelog

All notable changes to ACTO will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - 2025-12-20

### 🎉 Major Release: Dashboard 2.0 & Multi-Wallet Support

This release brings a completely revamped dashboard experience with multi-wallet support, an interactive API playground, and comprehensive wallet statistics.

### Added

#### Dashboard Features
- **Multi-Wallet Support**: Connect with Phantom, Solflare, Backpack, Glow, or Coinbase Wallet
- **API Playground**: Test API endpoints directly in your browser with live responses
- **Wallet Statistics Dashboard**: 
  - Proofs submitted counter
  - Total verifications with success rate
  - Activity timeline (last 30 days)
  - Breakdown by robot and task type
- **API Key Management**: Create, view, and delete API keys with usage statistics
- **Session Persistence**: Auto-reconnect wallet on page reload

#### API Endpoints
- `POST /v1/proofs/search` - Search and filter proofs with pagination
  - Filter by task_id, robot_id, run_id, signer_public_key
  - Date range filtering (created_after, created_before)
  - Full-text search across metadata
  - Configurable sorting and pagination
- `POST /v1/verify/batch` - Batch verify multiple proofs in a single request
  - Reduces network latency for bulk operations
  - Returns individual results with summary statistics
- `GET /v1/stats/wallet/{address}` - Get comprehensive wallet statistics
  - Proof submission counts
  - Verification statistics with success rates
  - Activity timeline
  - Breakdown by robot and task

### Changed
- Improved error handling with user-friendly messages
- Better session management with JWT token persistence
- Updated documentation with new endpoint examples

### Fixed
- Fixed infinite loop in documentation JS module
- Fixed race condition causing spurious authentication errors
- Fixed API key not being removed from localStorage when deleted
- Fixed verification statistics not counting correctly (endpoint key mismatch)
- Fixed auto-logout issue when switching dashboard tabs

---

## [0.5.23] - 2025-12-19

### Added
- Proof Search & Filter API endpoint
- Batch Verification API endpoint
- Wallet Statistics API endpoint

---

## [0.5.22] - 2025-12-18

### Added
- Initial dashboard with wallet connection
- API key creation and management
- Basic proof submission and verification

---

## [0.4.0] - 2025-12-01

### Added
- OAuth2/JWT authentication support
- Role-Based Access Control (RBAC)
- Audit logging with multiple backends
- Encryption at rest (AES-128)
- TLS/SSL support
- Secrets management (Vault, AWS)
- PII detection and masking
- Signing key rotation

---

## [0.3.0] - 2025-11-15

### Added
- Interactive CLI mode
- Shell completion (bash, zsh, fish, PowerShell)
- Configuration file support
- Async/await operations
- Context managers for registry
- Jupyter notebook examples

---

## [0.2.0] - 2025-11-01

### Added
- Token gating module (Solana SPL)
- Proof anchoring (Solana Memo)
- Pipeline system
- API key authentication
- Rate limiting middleware
- Reputation scoring
- Prometheus metrics

---

## [0.1.0] - 2025-10-15

### Added
- Initial release
- Proof creation and verification
- SQLite registry
- FastAPI server
- CLI tools

