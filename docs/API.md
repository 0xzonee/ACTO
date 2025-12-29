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
| GET | `/v1/stats/wallet/{addr}` | Wallet stats | 🔐 JWT |
| POST | `/v1/access/check` | Check token balance | ✅ |
| POST | `/v1/keys` | Create API key | 🔐 JWT |
| GET | `/v1/keys` | List API keys | 🔐 JWT |
| DELETE | `/v1/keys/{id}` | Delete API key | 🔐 JWT |
| GET | `/v1/fleet` | Fleet overview | 🔐 JWT |
| GET | `/v1/fleet/devices/{id}` | Device details | 🔐 JWT |
| PATCH | `/v1/fleet/devices/{id}/name` | Rename device | 🔐 JWT |
| DELETE | `/v1/fleet/devices/{id}` | Delete device | 🔐 JWT |
| PATCH | `/v1/fleet/devices/order` | Reorder devices | 🔐 JWT |
| POST | `/v1/fleet/devices/{id}/health` | Report health | 🔐 JWT |
| GET | `/v1/fleet/groups` | List groups | 🔐 JWT |
| POST | `/v1/fleet/groups` | Create group | 🔐 JWT |
| POST | `/v1/fleet/groups/{id}/assign` | Assign devices | 🔐 JWT |
| GET | `/v1/profile` | Get user profile | 🔐 JWT |
| PATCH | `/v1/profile` | Update user profile | 🔐 JWT |

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
  "version": "1.0.0"
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
    "signature_b64": "..."
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

Verify a proof's cryptographic signature and integrity. This is the **only way** to verify proofs.

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

### How Token Gating Works

All protected API endpoints automatically verify your wallet's token balance **server-side**. The token mint, minimum balance, and RPC are configured on the server and **cannot be manipulated by clients**.

You only need to include your wallet address in the `X-Wallet-Address` header.

### Check Token Balance (Optional)

```http
POST /v1/access/check
```

This is a **convenience endpoint** to check your balance before making requests. It does not grant access - that's always verified server-side.

**Request:**
```json
{
  "owner": "YOUR_WALLET_ADDRESS"
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

> **Security Note:** The actual access control on protected endpoints uses server-configured values (token mint, minimum balance, RPC) that cannot be overridden.

---

## Fleet Management

Fleet Management endpoints allow you to monitor and organize your robot fleet. All endpoints require JWT authentication (wallet login).

### Get Fleet Overview

```http
GET /v1/fleet
```

Returns all devices with groups and summary statistics.

**Response:**
```json
{
  "devices": [
    {
      "id": "robot-alpha-01",
      "name": "Robot Alpha",
      "custom_name": "Warehouse Bot 1",
      "group_id": "grp_abc123",
      "group_name": "Warehouse A",
      "proof_count": 42,
      "task_count": 15,
      "last_activity": "2025-01-15T10:30:00Z",
      "status": "online",
      "health": {
        "cpu_percent": 45.2,
        "memory_percent": 68.0,
        "battery_percent": 85.0
      }
    }
  ],
  "groups": [
    {
      "id": "grp_abc123",
      "name": "Warehouse A",
      "description": "Main warehouse robots",
      "device_count": 5
    }
  ],
  "summary": {
    "total_devices": 10,
    "active_devices": 7,
    "warning_devices": 2,
    "offline_devices": 1,
    "total_proofs": 1250,
    "total_tasks": 89,
    "total_groups": 3
  }
}
```

### Get Device Details

```http
GET /v1/fleet/devices/{device_id}
```

Returns detailed device information including activity logs and task history.

**Response:**
```json
{
  "id": "robot-alpha-01",
  "name": "Robot Alpha 01",
  "custom_name": "Warehouse Bot 1",
  "display_name": "Warehouse Bot 1",
  "group_id": "grp_abc123",
  "group_name": "Warehouse A",
  "proof_count": 42,
  "task_count": 15,
  "last_activity": "2025-01-15T10:30:00Z",
  "first_activity": "2024-06-01T08:00:00Z",
  "status": "online",
  "health": {...},
  "recent_logs": [
    {
      "timestamp": "2025-01-15T10:30:00Z",
      "level": "success",
      "message": "Proof submitted for task 'pick-and-place'",
      "proof_id": "abc123...",
      "task_id": "pick-and-place"
    }
  ],
  "task_history": ["pick-and-place", "quality-inspection", "transport"]
}
```

### Rename Device

```http
PATCH /v1/fleet/devices/{device_id}/name
```

Set a custom name for a device.

**Request:**
```json
{
  "name": "Warehouse Bot Alpha"
}
```

**Response:**
```json
{
  "success": true,
  "device_id": "robot-alpha-01",
  "name": "Warehouse Bot Alpha"
}
```

### Delete Device

```http
DELETE /v1/fleet/devices/{device_id}
```

Soft-delete a device from the fleet. The device's proofs are preserved, but it won't appear in the fleet list.

**Response:**
```json
{
  "success": true,
  "device_id": "robot-alpha-01"
}
```

> **Note:** This is a soft delete. The device's historical proofs remain in the database. If you want to restore a deleted device, contact support.

### Reorder Devices

```http
PATCH /v1/fleet/devices/order
```

Update the sort order of multiple devices. This allows manual ordering of devices in the fleet list.

**Request:**
```json
{
  "device_orders": [
    { "device_id": "robot-alpha-01", "sort_order": 0 },
    { "device_id": "robot-beta-02", "sort_order": 1 },
    { "device_id": "robot-gamma-03", "sort_order": 2 }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "updated": 3
}
```

> **Tip:** In the dashboard, you can drag devices up/down to reorder them. The order is automatically saved.

### Report Device Health

```http
POST /v1/fleet/devices/{device_id}/health
```

Report health metrics from a device. **All fields are optional** - devices only send metrics they support.

**Request:**
```json
{
  "cpu_percent": 45.2,
  "cpu_temperature": 52.0,
  "memory_percent": 68.0,
  "memory_used_mb": 2048,
  "memory_total_mb": 4096,
  "battery_percent": 85.0,
  "battery_charging": true,
  "disk_percent": 42.0,
  "network_connected": true,
  "network_type": "wifi",
  "uptime_seconds": 86400,
  "temperature": 42.5,
  "custom_metrics": {
    "motor_temp": 38.0,
    "sensor_status": "ok"
  }
}
```

**Response:**
```json
{
  "success": true,
  "device_id": "robot-alpha-01",
  "health": {...}
}
```

### Get Device Health

```http
GET /v1/fleet/devices/{device_id}/health
```

Get the latest health metrics for a device.

**Response:**
```json
{
  "device_id": "robot-alpha-01",
  "health": {
    "cpu_percent": 45.2,
    "memory_percent": 68.0,
    "battery_percent": 85.0,
    "last_updated": "2025-01-15T10:30:00Z"
  },
  "available": true
}
```

### List Device Groups

```http
GET /v1/fleet/groups
```

**Response:**
```json
{
  "groups": [
    {
      "id": "grp_abc123",
      "name": "Warehouse A",
      "description": "Main warehouse robots",
      "device_count": 5,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 3
}
```

### Create Device Group

```http
POST /v1/fleet/groups
```

**Request:**
```json
{
  "name": "Production Line 1",
  "description": "Assembly line robots"
}
```

**Response:**
```json
{
  "success": true,
  "group": {
    "id": "grp_xyz789",
    "name": "Production Line 1",
    "description": "Assembly line robots",
    "device_ids": [],
    "created_at": "2025-01-15T10:30:00Z"
  }
}
```

### Assign Devices to Group

```http
POST /v1/fleet/groups/{group_id}/assign
```

**Request:**
```json
{
  "device_ids": ["robot-alpha-01", "robot-alpha-02"]
}
```

**Response:**
```json
{
  "success": true,
  "group_id": "grp_abc123",
  "assigned": ["robot-alpha-01", "robot-alpha-02"]
}
```

### Remove Devices from Group

```http
POST /v1/fleet/groups/{group_id}/unassign
```

**Request:**
```json
{
  "device_ids": ["robot-alpha-01"]
}
```

### Delete Group

```http
DELETE /v1/fleet/groups/{group_id}
```

**Response:**
```json
{
  "success": true,
  "group_id": "grp_abc123",
  "devices_unassigned": 5
}
```

---

## User Profile

User profile endpoints allow you to manage your account settings and contact information. All fields are optional.

### Get Profile

```http
GET /v1/profile
```

Returns the current user's profile information.

**Response:**
```json
{
  "user_id": "abc123...",
  "wallet_address": "ABC123...",
  "created_at": "2025-01-01T00:00:00Z",
  "last_login_at": "2025-12-26T10:30:00Z",
  "is_active": true,
  "contact_name": "John Doe",
  "company_name": "Acme Robotics",
  "email": "john@acme.com",
  "phone": "+1 555 123 4567",
  "website": "https://acme-robotics.com",
  "location": "San Francisco, USA",
  "industry": "robotics",
  "updated_at": "2025-12-26T10:30:00Z"
}
```

### Update Profile

```http
PATCH /v1/profile
```

Update the current user's profile. Only provided fields are updated; omitted fields remain unchanged.

**Request:**
```json
{
  "contact_name": "Jane Doe",
  "company_name": "Acme Robotics Inc.",
  "email": "jane@acme.com",
  "phone": "+1 555 987 6543",
  "website": "https://acme-robotics.com",
  "location": "New York, USA",
  "industry": "manufacturing"
}
```

**Available Industries:**

*Robotics & Tech:*
- `robotics` - Robotics & Automation
- `ai_agents` - AI Agents & Autonomous Systems
- `manufacturing` - Manufacturing
- `research` - Research & Development

*Web3 & Crypto:*
- `crypto` - Cryptocurrency & Trading
- `defi` - DeFi (Decentralized Finance)
- `nft` - NFTs & Digital Assets
- `dao` - DAOs & Governance
- `blockchain` - Blockchain Infrastructure
- `web3_gaming` - Web3 Gaming & Metaverse

*Finance & Business:*
- `finance` - Finance & Banking
- `fintech` - FinTech
- `insurance` - Insurance
- `retail` - Retail & E-Commerce

*Industry & Infrastructure:*
- `logistics` - Logistics & Warehousing
- `energy` - Energy & Utilities
- `construction` - Construction
- `agriculture` - Agriculture

*Services & Other:*
- `healthcare` - Healthcare
- `defense` - Defense & Security
- `education` - Education
- `consulting` - Consulting
- `other` - Other

**Response:**
```json
{
  "user_id": "abc123...",
  "wallet_address": "ABC123...",
  "contact_name": "Jane Doe",
  "company_name": "Acme Robotics Inc.",
  "email": "jane@acme.com",
  "phone": "+1 555 987 6543",
  "website": "https://acme-robotics.com",
  "location": "New York, USA",
  "industry": "manufacturing",
  "updated_at": "2025-12-26T10:35:00Z",
  ...
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

### Python (SDK - Recommended)

Install the SDK:

```bash
pip install actobotics
```

Use the client:

```python
from acto.client import ACTOClient
from acto.proof import create_proof
from acto.crypto import KeyPair
from acto.telemetry import TelemetryBundle, TelemetryEvent

# Create a proof locally
keypair = KeyPair.generate()
bundle = TelemetryBundle(
    task_id="pick-and-place-001",
    robot_id="robot-alpha-01",
    events=[TelemetryEvent(ts="2025-01-15T10:30:00Z", topic="sensor", data={"value": 42})]
)
envelope = create_proof(bundle, keypair.private_key_b64, keypair.public_key_b64)

# Connect to hosted API
client = ACTOClient(
    api_key="your-api-key",
    wallet_address="your-wallet-address"
)

# Submit proof
proof_id = client.submit_proof(envelope)

# Verify proof
result = client.verify(envelope)
print(f"Valid: {result.valid}")

# Search proofs
results = client.search_proofs(robot_id="robot-alpha-01", limit=10)
for proof in results.items:
    print(f"  {proof.task_id}")

# Get wallet stats
stats = client.get_wallet_stats()

# Fleet management
fleet = client.fleet.get_overview()
client.fleet.report_health("robot-alpha-01", cpu_percent=45.2, battery_percent=85.0)
```

### Python (Direct HTTP)

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
response = httpx.post(f"{BASE_URL}/v1/proofs", headers=headers, json={"envelope": envelope.model_dump()})
proof_id = response.json()["proof_id"]

# Verify proof
response = httpx.post(f"{BASE_URL}/v1/verify", headers=headers, json={"envelope": envelope.model_dump()})
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
