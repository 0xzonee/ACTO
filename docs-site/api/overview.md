# API Overview

The ACTO REST API provides programmatic access to proof submission, verification, and fleet management.

## Base URL

```
https://api.actobotics.net
```

## API Version

Current version: **v1**

All endpoints are prefixed with `/v1/` (e.g., `/v1/proofs`).

## Endpoints Summary

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/metrics` | Prometheus metrics |

### Proof Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/v1/proofs` | Submit a proof | API Key |
| GET | `/v1/proofs` | List proofs | API Key |
| GET | `/v1/proofs/{id}` | Get a proof | API Key |
| POST | `/v1/proofs/search` | Search proofs | API Key |

### Verification Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/v1/verify` | Verify a proof | API Key |
| POST | `/v1/verify/batch` | Batch verify | API Key |

### Fleet Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/v1/fleet` | Fleet overview | JWT |
| GET | `/v1/fleet/devices/{id}` | Device details | JWT |
| PATCH | `/v1/fleet/devices/{id}/name` | Rename device | JWT |
| POST | `/v1/fleet/devices/{id}/health` | Report health | JWT |
| GET | `/v1/fleet/groups` | List groups | JWT |
| POST | `/v1/fleet/groups` | Create group | JWT |
| POST | `/v1/fleet/groups/{id}/assign` | Assign devices | JWT |
| DELETE | `/v1/fleet/groups/{id}` | Delete group | JWT |

### Other Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/v1/score` | Score a proof | API Key |
| GET | `/v1/stats/wallet/{addr}` | Wallet stats | JWT |
| POST | `/v1/access/check` | Check token balance | API Key |

## Request Format

### Headers

```http
Authorization: Bearer YOUR_API_KEY
X-Wallet-Address: YOUR_WALLET_ADDRESS
Content-Type: application/json
```

### Example Request

```bash
curl -X POST https://api.actobotics.net/v1/proofs \
  -H "Authorization: Bearer acto_abc123..." \
  -H "X-Wallet-Address: 5K8vK..." \
  -H "Content-Type: application/json" \
  -d '{"envelope": {...}}'
```

## Response Format

### Success Response

```json
{
  "proof_id": "abc123..."
}
```

### Error Response

```json
{
  "detail": "Error message describing what went wrong"
}
```

## HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid data |
| 401 | Unauthorized - Invalid or missing API key |
| 403 | Forbidden - Insufficient token balance |
| 404 | Not Found |
| 422 | Unprocessable Entity - Validation error |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |

## SDK Integration

We recommend using the Python SDK for easier integration:

```python
from acto.client import ACTOClient

client = ACTOClient(
    api_key="acto_abc123...",
    wallet_address="5K8vK..."
)

# All API calls are handled by the SDK
result = client.verify(envelope)
```

See [SDK Documentation](/sdk/client) for details.

## Dashboard

Access the web dashboard for API key management and statistics:

[api.actobotics.net/dashboard](https://api.actobotics.net/dashboard)

