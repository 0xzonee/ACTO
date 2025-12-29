# Authentication

All API endpoints (except `/health` and `/metrics`) require authentication.

## Required Headers

Every authenticated request must include:

| Header | Value | Description |
|--------|-------|-------------|
| `Authorization` | `Bearer YOUR_API_KEY` | Your ACTO API key |
| `X-Wallet-Address` | `YOUR_WALLET_ADDRESS` | Your Solana wallet (used for data ownership) |

::: tip User Data Isolation (v1.0.0)
The `X-Wallet-Address` header is used to tag all your data (proofs, devices, groups). You can only access data that belongs to your wallet address.
:::

```http
Authorization: Bearer acto_abc123...
X-Wallet-Address: 5K8vK...
Content-Type: application/json
```

## Getting Your API Key

1. Visit [api.actobotics.net/dashboard](https://api.actobotics.net/dashboard)
2. Connect your Solana wallet (Phantom, Solflare, Backpack, Glow, or Coinbase)
3. Click **"Create API Key"**
4. Copy the key immediately - it's only shown once!

::: warning API Key Security
- Store keys securely (environment variables, secrets manager)
- Never commit keys to version control
- Rotate keys periodically
- Delete unused keys
:::

## Token Gating

API access requires holding **50,000 ACTO tokens** in your connected wallet.

### How It Works

1. You connect your wallet and create an API key
2. Each API request verifies your wallet's token balance
3. If balance drops below 50,000 ACTO, requests return 403 Forbidden

### Checking Your Balance

```bash
curl -X POST https://api.actobotics.net/v1/access/check \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-Wallet-Address: YOUR_WALLET" \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "YOUR_WALLET",
    "mint": "ACTO_TOKEN_MINT",
    "minimum": 50000
  }'
```

Response:
```json
{
  "allowed": true,
  "reason": "Sufficient balance",
  "balance": 125000.0
}
```

## Authentication Types

### API Key Authentication

Used for most endpoints (proof submission, verification, search).

```python
from acto.client import ACTOClient

client = ACTOClient(
    api_key="acto_abc123...",
    wallet_address="5K8vK..."
)
```

### JWT Authentication

Used for dashboard and fleet management endpoints. Obtained by wallet signature verification.

The dashboard handles JWT authentication automatically when you connect your wallet.

For direct API access:

```http
POST /v1/auth/wallet/connect
{
  "wallet_address": "5K8vK..."
}

# Returns a challenge to sign

POST /v1/auth/wallet/verify
{
  "wallet_address": "5K8vK...",
  "signature": "base64_signature...",
  "challenge": "challenge_message"
}

# Returns JWT token
```

## Error Responses

### 401 Unauthorized

Invalid or missing API key:

```json
{
  "detail": "Invalid API key"
}
```

**Solutions:**
- Check your API key is correct
- Ensure the Authorization header format is `Bearer YOUR_KEY`
- Generate a new key if needed

### 403 Forbidden

Insufficient token balance:

```json
{
  "detail": "Insufficient token balance. Required: 50000 ACTO"
}
```

**Solutions:**
- Check your wallet balance
- Ensure you're using the correct wallet address
- Acquire more ACTO tokens

## Best Practices

### Use Environment Variables

```bash
export ACTO_API_KEY="acto_abc123..."
export ACTO_WALLET_ADDRESS="5K8vK..."
```

```python
import os
from acto.client import ACTOClient

client = ACTOClient(
    api_key=os.environ["ACTO_API_KEY"],
    wallet_address=os.environ["ACTO_WALLET_ADDRESS"]
)
```

### Rotate Keys Regularly

1. Create a new API key
2. Update your applications
3. Delete the old key

### Monitor Key Usage

Check key statistics in the dashboard:
- Request counts
- Last used timestamp
- Error rates

### Separate Keys by Environment

Use different keys for:
- Development
- Staging
- Production

This helps with auditing and prevents accidental production access.

