// Documentation module for API usage guide

// Use existing API_BASE if available, otherwise define it
// Using var to avoid redeclaration errors with const across multiple scripts
var API_BASE = window.API_BASE || window.location.origin;
window.API_BASE = API_BASE;

// Define initDocumentation function immediately and make it globally available
window.initDocumentation = function initDocumentation() {
    // Use a small delay to ensure DOM is ready
    setTimeout(() => {
        if (typeof window.showDocumentation !== 'function') {
            setTimeout(initDocumentation, 50);
            return;
        }
        
        const docContent = document.getElementById('docContent');
        if (!docContent) {
            setTimeout(initDocumentation, 100);
            return;
        }
        
        // Reset the flag to allow re-setting listeners when tab is opened
        if (typeof menuListenersSetup !== 'undefined') {
            menuListenersSetup = false;
        }
        
        // Set up event listeners for documentation menu items
        if (typeof setupDocumentationMenuListeners === 'function') {
            setupDocumentationMenuListeners();
        } else {
            setTimeout(initDocumentation, 50);
            return;
        }
        
        // Show overview section when initializing
        window.showDocumentation('overview');
        
        // Load token gating configuration
        if (typeof loadTokenGatingConfig === 'function') {
            loadTokenGatingConfig();
        }
    }, 50);
};

// Token gating configuration (loaded from API)
let tokenGatingConfig = {
    mint: "9wpLm21ab8ZMVJWH3pHeqgqNJqWos73G8qDRfaEwtray", // Default, will be loaded from API
    minimum: 50000.0,
    rpc_url: "https://api.mainnet-beta.solana.com"
};

// Load token gating configuration from API
async function loadTokenGatingConfig() {
    try {
        const response = await fetch(`${API_BASE}/v1/config/token-gating`);
        if (response.ok) {
            const config = await response.json();
            tokenGatingConfig = config;
            // Update documentation with loaded values
            updateDocumentationWithConfig();
        }
    } catch (error) {
        console.error('Failed to load token gating config:', error);
        // Use defaults if API call fails
    }
}

// Update documentation content with loaded config values
// Note: This function only updates existing DOM elements, does NOT re-render
function updateDocumentationWithConfig() {
    // Update DOM elements with IDs (if they exist in the current view)
    const mintElements = document.querySelectorAll('#doc-token-mint, #doc-token-mint-2, #doc-token-mint-3');
    mintElements.forEach(el => {
        if (el) el.textContent = tokenGatingConfig.mint;
    });
    
    const minimumElements = document.querySelectorAll('#doc-token-minimum, #doc-token-minimum-2');
    minimumElements.forEach(el => {
        if (el) el.textContent = tokenGatingConfig.minimum.toLocaleString();
    });
    
    // DO NOT re-render here - this was causing an infinite loop!
}

const documentation = {
    overview: {
        title: "Overview",
        content: `
            <h3>What is ACTO?</h3>
            <p>ACTO (Robotics Proof-of-Execution Toolkit) is a system for generating deterministic, signed execution proofs from robot telemetry and logs. These proofs are verifiable locally or via API.</p>
            
            <h3>What are API Keys?</h3>
            <p>API keys are secure tokens that authenticate your requests to the ACTO Verification API. Each key is unique to your account and allows you to:</p>
            <ul>
                <li>Submit robot execution proofs for verification</li>
                <li>Verify proof integrity and authenticity</li>
                <li>Check access permissions based on Solana token holdings</li>
                <li>Score proofs for reputation systems</li>
            </ul>
            
            <h3>Token Gating Requirement</h3>
            <p><strong>Important:</strong> All API requests require both:</p>
            <ul>
                <li>A valid API key (Bearer token)</li>
                <li>A Solana wallet address with at least <strong>50,000 tokens</strong></li>
            </ul>
            <p>The wallet address must hold the required token balance for the token at address <code id="doc-token-mint">Loading...</code>.</p>
            
            <h3>Key Features</h3>
            <ul>
                <li><strong>Deterministic Proofs:</strong> Canonicalized telemetry ensures consistent proof generation</li>
                <li><strong>Signed Verification:</strong> Ed25519 signatures guarantee proof authenticity</li>
                <li><strong>Portable Format:</strong> JSON envelope format for easy integration</li>
                <li><strong>Local Verification:</strong> Verify proofs without a trusted server</li>
            </ul>
        `
    },
    gettingStarted: {
        title: "Getting Started",
        content: `
            <h3>Step 1: Create an API Key</h3>
            <p>Use the dashboard to create a new API key. Give it a descriptive name (e.g., "Production Key" or "Development Key").</p>
            
            <h3>Step 2: Store Your Key Securely</h3>
            <p><strong>Important:</strong> Copy and store your API key immediately after creation. You won't be able to see it again!</p>
            <p>Store it in a secure location such as:</p>
            <ul>
                <li>Environment variables</li>
                <li>Secret management systems (Vault, AWS Secrets Manager)</li>
                <li>Encrypted configuration files</li>
            </ul>
            
            <h3>Step 3: Ensure Token Balance</h3>
            <p>Make sure your Solana wallet holds at least <strong id="doc-token-minimum">50,000</strong> tokens of the required token (mint address: <code id="doc-token-mint-2">Loading...</code>).</p>
            <p>The API will automatically verify your token balance on each request.</p>
            
            <h3>Step 4: Use Your Key in Requests</h3>
            <p>Include both your API key and wallet address in the request headers:</p>
            <ul>
                <li><code>Authorization: Bearer YOUR_API_KEY</code> - Your API key</li>
                <li><code>X-Wallet-Address: YOUR_SOLANA_WALLET_ADDRESS</code> - Your Solana wallet address</li>
            </ul>
        `
    },
    authentication: {
        title: "Authentication",
        content: `
            <h3>Bearer Token Authentication + Token Gating</h3>
            <p>All API endpoints require both:</p>
            <ol>
                <li><strong>Bearer Token:</strong> Your API key in the <code>Authorization</code> header</li>
                <li><strong>Wallet Address:</strong> Your Solana wallet address in the <code>X-Wallet-Address</code> header</li>
            </ol>
            <p>The API will verify that your wallet holds at least <strong>50,000 tokens</strong> of the required token on each request.</p>
            
            <h4>Example Request (cURL)</h4>
            <pre><code>curl -X POST https://api.actobotics.net/v1/proofs \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "X-Wallet-Address: YOUR_SOLANA_WALLET_ADDRESS" \\
  -H "Content-Type: application/json" \\
  -d '{"envelope": {...}}'</code></pre>
            
            <h4>JavaScript/Fetch Example</h4>
            <pre><code>fetch('https://api.actobotics.net/v1/proofs', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'X-Wallet-Address': 'YOUR_SOLANA_WALLET_ADDRESS',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ envelope: {...} })
})</code></pre>
            
            <h4>Python Example</h4>
            <pre><code>import requests

headers = {
    'Authorization': 'Bearer YOUR_API_KEY',
    'X-Wallet-Address': 'YOUR_SOLANA_WALLET_ADDRESS',
    'Content-Type': 'application/json'
}

response = requests.post(
    'https://api.actobotics.net/v1/proofs',
    headers=headers,
    json={'envelope': {...}}
)</code></pre>
            
            <h4>Error Responses</h4>
            <ul>
                <li><strong>401 Unauthorized:</strong> Invalid or missing API key</li>
                <li><strong>400 Bad Request:</strong> Missing <code>X-Wallet-Address</code> header</li>
                <li><strong>403 Forbidden:</strong> Insufficient token balance (requires 50,000 tokens minimum)</li>
            </ul>
        `
    },
    endpoints: {
        title: "API Endpoints",
        content: `
            <h3>Submit Proof</h3>
            <p><strong>POST</strong> <code>/v1/proofs</code></p>
            <p>Submit a robot execution proof for storage and verification.</p>
            <pre><code>{
  "envelope": {
    "payload": {...},
    "signature_b64": "...",
    "signer_public_key_b64": "..."
  }
}</code></pre>
            
            <h3>Get Proof</h3>
            <p><strong>GET</strong> <code>/v1/proofs/{proof_id}</code></p>
            <p>Retrieve a stored proof by its ID.</p>
            
            <h3>Search Proofs</h3>
            <p><strong>POST</strong> <code>/v1/proofs/search</code></p>
            <p>Search and filter proofs with pagination. Supports filtering by task, robot, date range, and full-text search.</p>
            <pre><code>{
  "task_id": "pick-and-place-001",
  "robot_id": "robot-alpha",
  "created_after": "2024-01-01T00:00:00Z",
  "created_before": "2024-12-31T23:59:59Z",
  "search_text": "warehouse",
  "limit": 50,
  "offset": 0,
  "sort_field": "created_at",
  "sort_order": "desc"
}</code></pre>
            <p><strong>Response:</strong></p>
            <pre><code>{
  "items": [...],
  "total": 150,
  "limit": 50,
  "offset": 0,
  "has_more": true
}</code></pre>
            
            <h3>Verify Proof</h3>
            <p><strong>POST</strong> <code>/v1/verify</code></p>
            <p>Verify the integrity and authenticity of a proof without storing it.</p>
            <pre><code>{
  "envelope": {...}
}</code></pre>
            <p><strong>Response:</strong></p>
            <pre><code>{
  "valid": true,
  "reason": "ok"
}</code></pre>
            
            <h3>Batch Verify</h3>
            <p><strong>POST</strong> <code>/v1/verify/batch</code></p>
            <p>Verify multiple proof envelopes in a single request. Efficient for bulk verification operations.</p>
            <pre><code>{
  "envelopes": [
    { "payload": {...}, "signature_b64": "...", ... },
    { "payload": {...}, "signature_b64": "...", ... }
  ]
}</code></pre>
            <p><strong>Response:</strong></p>
            <pre><code>{
  "results": [
    { "index": 0, "valid": true, "reason": "ok", "payload_hash": "abc..." },
    { "index": 1, "valid": false, "reason": "Invalid signature", "payload_hash": null }
  ],
  "total": 2,
  "valid_count": 1,
  "invalid_count": 1
}</code></pre>
            
            <h3>Score Proof</h3>
            <p><strong>POST</strong> <code>/v1/score</code></p>
            <p>Get a reputation score for a proof based on various factors.</p>
            
            <h3>Wallet Statistics</h3>
            <p><strong>GET</strong> <code>/v1/stats/wallet/{wallet_address}</code></p>
            <p>Get comprehensive statistics for a wallet address including proof submissions, verification history, and activity timeline.</p>
            <p><strong>Response:</strong></p>
            <pre><code>{
  "wallet_address": "...",
  "total_proofs_submitted": 42,
  "total_verifications": 156,
  "successful_verifications": 150,
  "failed_verifications": 6,
  "verification_success_rate": 96.15,
  "first_activity": "2024-01-15T...",
  "last_activity": "2024-06-20T...",
  "proofs_by_robot": { "robot-1": 25, "robot-2": 17 },
  "proofs_by_task": { "inspection": 30, "transport": 12 },
  "activity_timeline": [...]
}</code></pre>
            
            <h3>Check Access</h3>
            <p><strong>POST</strong> <code>/v1/access/check</code></p>
            <p>Check if a Solana wallet address has sufficient token holdings for access.</p>
            <pre><code>{
  "rpc_url": "https://api.mainnet-beta.solana.com",
  "owner": "WALLET_ADDRESS",
  "mint": "TOKEN_MINT_ADDRESS",
  "minimum": 1.0
}</code></pre>
        `
    },
    useCases: {
        title: "Use Cases",
        content: `
            <h3>Robotics Execution Verification</h3>
            <p>Generate and verify proofs of robot task execution for:</p>
            <ul>
                <li>Quality assurance and compliance</li>
                <li>Audit trails and accountability</li>
                <li>Performance benchmarking</li>
                <li>Insurance and liability documentation</li>
            </ul>
            
            <h3>Reputation Systems</h3>
            <p>Use proof scoring to build reputation systems that:</p>
            <ul>
                <li>Rank robot performance</li>
                <li>Enable trust networks</li>
                <li>Facilitate robot-to-robot interactions</li>
            </ul>
            
            <h3>Access Control</h3>
            <p>The ACTO API uses Solana token-based access control to ensure only authorized users can access the service. All API requests require:</p>
            <ul>
                <li>A valid API key (Bearer token authentication)</li>
                <li>A Solana wallet with at least 50,000 tokens of the required token</li>
            </ul>
            <p>This enables:</p>
            <ul>
                <li>Gated robot services based on token holdings</li>
                <li>Premium feature access for token holders</li>
                <li>DAO-governed permissions and access control</li>
                <li>Secure, decentralized authentication without traditional user accounts</li>
            </ul>
        `
    },
    fleetManagement: {
        title: "Fleet Management",
        content: `
            <h3>Overview</h3>
            <p>Fleet Management allows you to monitor, organize, and manage all your connected robots and devices from a single dashboard. All data is persisted to database and tied to your wallet.</p>
            
            <h3>Features</h3>
            <ul>
                <li><strong>Device Overview:</strong> See all devices with proof counts, task history, and activity status</li>
                <li><strong>Device Details:</strong> Click on any device to view complete activity logs and health metrics</li>
                <li><strong>Custom Names:</strong> Rename devices with friendly names for easier identification</li>
                <li><strong>Device Groups:</strong> Organize robots into groups (e.g., "Warehouse A", "Production Line")</li>
                <li><strong>Health Monitoring:</strong> View CPU, RAM, battery, and other metrics (when available)</li>
            </ul>
            
            <h3>Device Status</h3>
            <p>Devices are categorized by their last activity:</p>
            <ul>
                <li><strong style="color: #10b981;">● Active:</strong> Activity within the last hour</li>
                <li><strong style="color: #f59e0b;">● Idle:</strong> Activity within the last 24 hours</li>
                <li><strong style="color: #6b7280;">● Inactive:</strong> No activity for more than 24 hours</li>
            </ul>
            
            <h3>Health Metrics</h3>
            <p>Devices can optionally report health metrics. All fields are optional - devices only send what they support:</p>
            <ul>
                <li><strong>CPU:</strong> Processor usage percentage</li>
                <li><strong>Memory:</strong> RAM usage percentage</li>
                <li><strong>Battery:</strong> Battery level and charging status (for mobile robots)</li>
                <li><strong>Disk:</strong> Storage usage</li>
                <li><strong>Network:</strong> Connection status and signal strength</li>
                <li><strong>Temperature:</strong> Device or ambient temperature</li>
                <li><strong>Uptime:</strong> Time since last restart</li>
            </ul>
            <p>If a device doesn't report health data, the dashboard shows "Health metrics not available".</p>
            
            <h3>Device Groups</h3>
            <p>Groups help organize your fleet:</p>
            <ul>
                <li>Create groups with custom names and descriptions</li>
                <li>Assign devices to groups</li>
                <li>Filter the device list by group</li>
                <li>Move devices between groups</li>
            </ul>
            <p>Example groups: "Warehouse A", "Production Line 1", "QA Team", "Development"</p>
            
            <h3>Fleet API Endpoints</h3>
            <p>All fleet endpoints require JWT authentication (wallet login):</p>
            
            <h4>Fleet Overview</h4>
            <pre><code>GET /v1/fleet</code></pre>
            <p>Returns all devices with groups and summary statistics.</p>
            
            <h4>Device Details</h4>
            <pre><code>GET /v1/fleet/devices/{device_id}</code></pre>
            <p>Returns detailed info including activity logs and task history.</p>
            
            <h4>Rename Device</h4>
            <pre><code>PATCH /v1/fleet/devices/{device_id}/name
{
  "name": "My Robot Alpha"
}</code></pre>
            
            <h4>Report Health Metrics</h4>
            <pre><code>POST /v1/fleet/devices/{device_id}/health
{
  "cpu_percent": 45.2,
  "memory_percent": 68.0,
  "battery_percent": 85.0,
  "battery_charging": true
}</code></pre>
            <p>All fields are optional. Send only what your device supports.</p>
            
            <h4>Create Group</h4>
            <pre><code>POST /v1/fleet/groups
{
  "name": "Warehouse A",
  "description": "Main warehouse robots"
}</code></pre>
            
            <h4>Assign Devices to Group</h4>
            <pre><code>POST /v1/fleet/groups/{group_id}/assign
{
  "device_ids": ["robot-001", "robot-002"]
}</code></pre>
        `
    },
    bestPractices: {
        title: "Best Practices",
        content: `
            <h3>Security</h3>
            <ul>
                <li><strong>Never commit API keys to version control</strong></li>
                <li><strong>Rotate keys regularly</strong> - Delete old keys and create new ones</li>
                <li><strong>Use different keys for different environments</strong> (development, staging, production)</li>
                <li><strong>Monitor key usage</strong> - Check statistics regularly for suspicious activity</li>
                <li><strong>Revoke compromised keys immediately</strong></li>
            </ul>
            
            <h3>Performance</h3>
            <ul>
                <li>Cache verification results when possible</li>
                <li>Batch requests when submitting multiple proofs</li>
                <li>Use appropriate rate limits for your use case</li>
            </ul>
            
            <h3>Error Handling</h3>
            <ul>
                <li>Always check HTTP status codes</li>
                <li><strong>401 (Unauthorized):</strong> Invalid or missing API key - verify your Bearer token</li>
                <li><strong>400 (Bad Request):</strong> Missing <code>X-Wallet-Address</code> header - include your Solana wallet address</li>
                <li><strong>403 (Forbidden):</strong> Insufficient token balance - ensure your wallet holds at least 50,000 tokens</li>
                <li><strong>429 (Rate Limited):</strong> Too many requests - implement exponential backoff</li>
                <li>Log errors for debugging and monitoring</li>
            </ul>
            
            <h3>Token Balance Requirements</h3>
            <ul>
                <li><strong>Required Token:</strong> <code id="doc-token-mint-3">Loading...</code></li>
                <li><strong>Minimum Balance:</strong> <span id="doc-token-minimum-2">50,000</span> tokens</li>
                <li><strong>Network:</strong> Solana Mainnet</li>
                <li>The balance is checked on every API request via Solana RPC</li>
            </ul>
        `
    }
};

let currentDocSection = 'overview';
let menuListenersSetup = false;

// Define showDocumentation and make it globally available immediately
window.showDocumentation = function showDocumentation(section = 'overview') {
    currentDocSection = section;
    
    // Try to find docContent
    let docContent = document.getElementById('docContent');
    if (!docContent) {
        // Element not found, retry once after short delay
        setTimeout(() => {
            const retryContent = document.getElementById('docContent');
            if (retryContent && documentation[section]) {
                retryContent.innerHTML = documentation[section].content;
                updateDocumentationWithConfig();
            }
        }, 100);
        return;
    }
    
    const doc = documentation[section];
    if (!doc) {
        docContent.innerHTML = '<p>Documentation section not found.</p>';
        return;
    }
    
    // Set the content
    docContent.innerHTML = doc.content;
    
    // Update active menu item
    document.querySelectorAll('.doc-menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === section) {
            item.classList.add('active');
        }
    });
    
    // Update config values after rendering (once, not recursively)
    setTimeout(() => {
        updateDocumentationWithConfig();
    }, 100);
};

// Set up event listeners for documentation navigation menu
function setupDocumentationMenuListeners() {
    const menuItems = document.querySelectorAll('.doc-menu-item');
    if (menuItems.length === 0) {
        // Retry after a short delay
        setTimeout(setupDocumentationMenuListeners, 100);
        return;
    }
    
    menuItems.forEach((item) => {
        // Remove existing listeners by cloning the element
        const newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);
        
        // Add click event listener
        newItem.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const section = this.dataset.section;
            if (section && typeof window.showDocumentation === 'function') {
                window.showDocumentation(section);
            }
        });
    });
    
    menuListenersSetup = true;
}

