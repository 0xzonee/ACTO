# ACTO API Documentation

The ACTO API provides a hosted service for submitting and verifying robot execution proofs.

**Base URL:** `https://api.actobotics.net`

**Dashboard:** [api.actobotics.net/dashboard](https://api.actobotics.net/dashboard)

---

## Authentication

All API endpoints (except `/health` and `/metrics`) require:

1. **Bearer Token**: Your API key in the `Authorization` header
2. **Wallet Address**: Your Solana wallet in the `X-Wallet-Address` header
3. **Token Balance**: At least 50,000 ACTO tokens on your wallet

```bash
curl -X POST https://api.actobotics.net/v1/proofs \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-Wallet-Address: YOUR_WALLET_ADDRESS" \
  -H "Content-Type: application/json" \
  -d '{"envelope": {...}}'
```

### Getting Your API Key

1. Visit [api.actobotics.net/dashboard](https://api.actobotics.net/dashboard)
2. Connect your Solana wallet (Phantom, Solflare, Backpack, Glow, or Coinbase)
3. Create a new API key
4. **Copy the key immediately** - it's only shown once!

---

## Endpoints Overview

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/health` | Health check | ❌ |
| GET | `/metrics` | Prometheus metrics | ❌ |
| POST | `/v1/proofs` | Submit a proof | ✅ |
| GET | `/v1/proofs` | List proofs | ✅ |
| GET | `/v1/proofs/{id}` | Get a proof | ✅ |
| POST | `/v1/proofs/search` | Search proofs | ✅ |
| POST | `/v1/verify` | Verify a proof | ✅ |
| POST | `/v1/verify/batch` | Batch verify | ✅ |
| POST | `/v1/score` | Score a proof | ✅ |
| GET | `/v1/stats/wallet/{addr}` | Wallet stats | ✅ |
| POST | `/v1/access/check` | Check token balance | ✅ |
| POST | `/v1/keys` | Create API key | 🔐 JWT |
| GET | `/v1/keys` | List API keys | 🔐 JWT |
| DELETE | `/v1/keys/{id}` | Delete API key | 🔐 JWT |

---

## Public Endpoints

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "ok": true,
  "service": "acto",
  "version": "0.6.0"
}
```

### Prometheus Metrics

```http
GET /metrics
```

Returns Prometheus-compatible metrics in plain text format.

---

## Proof Endpoints

### Submit Proof

```http
POST /v1/proofs
```

Submit a new execution proof to the registry.

**Request:**
```json
{
  "envelope": {
    "payload": {
      "version": "1",
      "subject": {
        "task_id": "pick-and-place-001",
        "robot_id": "robot-alpha-01",
        "run_id": "run-2025-01-15"
      },
      "created_at": "2025-01-15T10:30:00Z",
      "telemetry_normalized": {...},
      "telemetry_hash": "abc123...",
      "payload_hash": "def456...",
      "hash_alg": "blake3",
      "signature_alg": "ed25519",
      "meta": {}
    },
    "signer_public_key_b64": "...",
    "signature_b64": "...",
    "anchor_ref": null
  }
}
```

**Response:**
```json
{
  "proof_id": "abc123..."
}
```

### List Proofs

```http
GET /v1/proofs?limit=50
```

**Query Parameters:**
- `limit` (optional): Max results, default 50

**Response:**
```json
{
  "items": [
    {
      "proof_id": "...",
      "task_id": "...",
      "robot_id": "...",
      "created_at": "..."
    }
  ]
}
```

### Get Proof

```http
GET /v1/proofs/{proof_id}
```

### Search Proofs

```http
POST /v1/proofs/search
```

Search and filter proofs with pagination.

**Request:**
```json
{
  "task_id": "pick-and-place",
  "robot_id": "robot-alpha",
  "run_id": "run-001",
  "signer_public_key": "...",
  "created_after": "2025-01-01T00:00:00Z",
  "created_before": "2025-12-31T23:59:59Z",
  "search_text": "warehouse",
  "limit": 50,
  "offset": 0,
  "sort_field": "created_at",
  "sort_order": "desc"
}
```

**Response:**
```json
{
  "items": [...],
  "total": 150,
  "limit": 50,
  "offset": 0,
  "has_more": true
}
```

**Filter Options:**
| Field | Type | Description |
|-------|------|-------------|
| `task_id` | string | Filter by task ID |
| `robot_id` | string | Filter by robot ID |
| `run_id` | string | Filter by run ID |
| `signer_public_key` | string | Filter by signer |
| `created_after` | ISO 8601 | Start date |
| `created_before` | ISO 8601 | End date |
| `search_text` | string | Full-text search |
| `limit` | int | Results per page (default: 50) |
| `offset` | int | Pagination offset |
| `sort_field` | string | Field to sort by |
| `sort_order` | string | "asc" or "desc" |

---

## Verification Endpoints

### Verify Proof

```http
POST /v1/verify
```

Verify a proof's cryptographic signature and integrity.

**Request:**
```json
{
  "envelope": {
    "payload": {...},
    "signer_public_key_b64": "...",
    "signature_b64": "..."
  }
}
```

**Response:**
```json
{
  "valid": true,
  "reason": "ok"
}
```

### Batch Verify

```http
POST /v1/verify/batch
```

Verify multiple proofs in a single request.

**Request:**
```json
{
  "envelopes": [
    {"payload": {...}, "signature_b64": "...", "signer_public_key_b64": "..."},
    {"payload": {...}, "signature_b64": "...", "signer_public_key_b64": "..."},
    {"payload": {...}, "signature_b64": "...", "signer_public_key_b64": "..."}
  ]
}
```

**Response:**
```json
{
  "results": [
    {"index": 0, "valid": true, "reason": "ok", "payload_hash": "abc..."},
    {"index": 1, "valid": true, "reason": "ok", "payload_hash": "def..."},
    {"index": 2, "valid": false, "reason": "Invalid signature", "payload_hash": null}
  ],
  "total": 3,
  "valid_count": 2,
  "invalid_count": 1
}
```

---

## Statistics Endpoints

### Wallet Statistics

```http
GET /v1/stats/wallet/{wallet_address}
```

Get comprehensive statistics for a wallet.

**Response:**
```json
{
  "wallet_address": "...",
  "total_proofs_submitted": 25,
  "total_verifications": 150,
  "successful_verifications": 145,
  "failed_verifications": 5,
  "verification_success_rate": 96.7,
  "average_reputation_score": 85.5,
  "first_activity": "2025-01-01T00:00:00Z",
  "last_activity": "2025-12-20T10:30:00Z",
  "proofs_by_robot": {
    "robot-alpha-01": 10,
    "robot-beta-02": 15
  },
  "proofs_by_task": {
    "pick-and-place": 12,
    "quality-inspection": 13
  },
  "activity_timeline": [
    {"date": "2025-12-01", "proof_count": 3},
    {"date": "2025-12-02", "proof_count": 5}
  ]
}
```

---

## Access Control

### Check Token Balance

```http
POST /v1/access/check
```

Check if a wallet has sufficient token balance for API access.

**Request:**
```json
{
  "rpc_url": "https://api.mainnet-beta.solana.com",
  "owner": "WALLET_ADDRESS",
  "mint": "TOKEN_MINT_ADDRESS",
  "minimum": 50000
}
```

**Response:**
```json
{
  "allowed": true,
  "reason": "Sufficient balance",
  "balance": 125000.0
}
```

---

## Error Responses

All errors return a consistent format:

```json
{
  "detail": "Error message"
}
```

### HTTP Status Codes

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

---

## Rate Limiting

- **Default**: 5 requests/second
- **Burst**: Up to 20 requests

When rate limited, you'll receive a `429` response. Implement exponential backoff in your client.

---

## Code Examples

### Python

```python
import httpx

API_KEY = "your-api-key"
WALLET = "your-wallet-address"
BASE_URL = "https://api.actobotics.net"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "X-Wallet-Address": WALLET,
    "Content-Type": "application/json"
}

# Submit proof
response = httpx.post(f"{BASE_URL}/v1/proofs", headers=headers, json={"envelope": envelope})
proof_id = response.json()["proof_id"]

# Verify proof
response = httpx.post(f"{BASE_URL}/v1/verify", headers=headers, json={"envelope": envelope})
is_valid = response.json()["valid"]

# Search proofs
response = httpx.post(f"{BASE_URL}/v1/proofs/search", headers=headers, json={
    "robot_id": "robot-alpha-01",
    "limit": 10
})
proofs = response.json()["items"]

# Get wallet stats
response = httpx.get(f"{BASE_URL}/v1/stats/wallet/{WALLET}", headers=headers)
stats = response.json()
```

### JavaScript

```javascript
const API_KEY = 'your-api-key';
const WALLET = 'your-wallet-address';
const BASE_URL = 'https://api.actobotics.net';

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'X-Wallet-Address': WALLET,
  'Content-Type': 'application/json'
};

// Submit proof
const response = await fetch(`${BASE_URL}/v1/proofs`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ envelope })
});
const { proof_id } = await response.json();

// Batch verify
const batchResponse = await fetch(`${BASE_URL}/v1/verify/batch`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ envelopes: [envelope1, envelope2, envelope3] })
});
const { valid_count, invalid_count } = await batchResponse.json();
```

---

## Best Practices

1. **Store keys securely** - Never commit API keys to version control
2. **Use environment variables** - `export ACTO_API_KEY=...`
3. **Rotate keys regularly** - Delete old keys, create new ones
4. **Handle rate limits** - Implement exponential backoff
5. **Batch when possible** - Use `/v1/verify/batch` for bulk operations
6. **Monitor usage** - Check statistics in the dashboard

---

## Support

- **Dashboard**: [api.actobotics.net/dashboard](https://api.actobotics.net/dashboard)
- **Website**: [actobotics.net](https://actobotics.net)
- **X (Twitter)**: [@actoboticsnet](https://x.com/actoboticsnet)
