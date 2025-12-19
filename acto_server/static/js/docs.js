// Documentation module for API usage guide

// Use existing API_BASE if available, otherwise define it
const API_BASE = window.API_BASE || window.location.origin;
window.API_BASE = API_BASE;

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
function updateDocumentationWithConfig() {
    // Update DOM elements with IDs
    const mintElements = document.querySelectorAll('#doc-token-mint, #doc-token-mint-2, #doc-token-mint-3');
    mintElements.forEach(el => {
        if (el) el.textContent = tokenGatingConfig.mint;
    });
    
    const minimumElements = document.querySelectorAll('#doc-token-minimum, #doc-token-minimum-2');
    minimumElements.forEach(el => {
        if (el) el.textContent = tokenGatingConfig.minimum.toLocaleString();
    });
    
    // Re-render current section if it's already displayed
    if (currentDocSection) {
        showDocumentation(currentDocSection);
    }
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
            
            <h3>Score Proof</h3>
            <p><strong>POST</strong> <code>/v1/score</code></p>
            <p>Get a reputation score for a proof based on various factors.</p>
            
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

function showDocumentation(section = 'overview') {
    console.log('showDocumentation called with section:', section);
    currentDocSection = section;
    
    // Try to find docContent, with retry logic
    let docContent = document.getElementById('docContent');
    if (!docContent) {
        console.warn('docContent element not found, retrying...');
        // Try to find it again after a short delay
        setTimeout(() => {
            showDocumentation(section);
        }, 100);
        return;
    }
    
    const doc = documentation[section];
    if (!doc) {
        console.error(`Documentation section '${section}' not found`);
        docContent.innerHTML = '<p>Documentation section not found.</p>';
        return;
    }
    
    console.log('Setting content for section:', section, 'Content length:', doc.content.length);
    
    // Set the content - ensure it's actually set
    docContent.innerHTML = doc.content;
    
    // Verify content was set
    if (!docContent.innerHTML || docContent.innerHTML.trim() === '') {
        console.error('Failed to set content, retrying...');
        setTimeout(() => {
            docContent.innerHTML = doc.content;
        }, 50);
    }
    
    // Update active menu item
    document.querySelectorAll('.doc-menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === section) {
            item.classList.add('active');
        }
    });
    
    // Update config values after rendering
    setTimeout(() => {
        updateDocumentationWithConfig();
    }, 100);
    
    console.log('Documentation section displayed:', section, 'Content set:', docContent.innerHTML.length > 0);
}

// Make showDocumentation globally available immediately
window.showDocumentation = showDocumentation;

function initDocumentation() {
    // Use a small delay to ensure DOM is ready
    setTimeout(() => {
        const docContent = document.getElementById('docContent');
        
        if (!docContent) {
            console.error('docContent element not found, retrying...');
            // Try again after a short delay
            setTimeout(initDocumentation, 100);
            return;
        }
        
        console.log('Initializing documentation, current content:', docContent.innerHTML ? 'has content' : 'empty');
        
        // Reset the flag to allow re-setting listeners when tab is opened
        menuListenersSetup = false;
        
        // Set up event listeners for documentation menu items
        setupDocumentationMenuListeners();
        
        // Always show overview section when initializing
        // This ensures content is displayed even if the tab was just opened
        // Force display even if content seems to exist (might be stale)
        showDocumentation('overview');
        
        // Load token gating configuration
        loadTokenGatingConfig();
    }, 50);
}

// Set up event listeners for documentation navigation menu
function setupDocumentationMenuListeners() {
    const menuItems = document.querySelectorAll('.doc-menu-item');
    if (menuItems.length === 0) {
        console.warn('No documentation menu items found, will retry...');
        // Retry after a short delay
        setTimeout(setupDocumentationMenuListeners, 100);
        return;
    }
    
    console.log(`Setting up event listeners for ${menuItems.length} menu items`);
    
    menuItems.forEach((item, index) => {
        // Remove existing listeners by cloning the element
        const newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);
        
        // Add click event listener
        newItem.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const section = this.dataset.section;
            console.log('Menu item clicked, section:', section, 'index:', index);
            if (section) {
                console.log('Switching to documentation section:', section);
                showDocumentation(section);
            } else {
                console.error('No section found in dataset for menu item');
            }
        });
        
        console.log(`Event listener added to menu item ${index + 1}: ${newItem.dataset.section}`);
    });
    
    menuListenersSetup = true;
    console.log('Documentation menu listeners setup complete');
}

// Make initDocumentation globally available immediately
window.initDocumentation = initDocumentation;

