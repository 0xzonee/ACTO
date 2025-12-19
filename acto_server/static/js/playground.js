// API Playground module for testing API endpoints

const API_BASE = window.location.origin;

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
        }
    } catch (error) {
        console.error('Failed to load token gating config:', error);
        // Use defaults if API call fails
    }
}

const API_ENDPOINTS = {
    'GET /v1/proofs': {
        method: 'GET',
        path: '/v1/proofs',
        description: 'List all proofs',
        requiresBody: false,
        params: ['limit']
    },
    'GET /v1/proofs/{id}': {
        method: 'GET',
        path: '/v1/proofs',
        description: 'Get a specific proof by ID',
        requiresBody: false,
        params: ['proof_id'],
        isDynamic: true
    },
    'POST /v1/proofs': {
        method: 'POST',
        path: '/v1/proofs',
        description: 'Submit a new proof',
        requiresBody: true,
        exampleBody: {
            envelope: {
                payload: {
                    version: "1",
                    subject: {
                        task_id: "example-task",
                        robot_id: "example-robot",
                        run_id: "run-001"
                    },
                    created_at: new Date().toISOString(),
                    telemetry_normalized: {},
                    telemetry_hash: "example-hash",
                    payload_hash: "example-payload-hash",
                    hash_alg: "blake3",
                    signature_alg: "ed25519",
                    meta: {}
                },
                signature_b64: "example-signature",
                signer_public_key_b64: "example-public-key"
            }
        }
    },
    'POST /v1/verify': {
        method: 'POST',
        path: '/v1/verify',
        description: 'Verify a proof without storing it',
        requiresBody: true,
        exampleBody: {
            envelope: {
                payload: {
                    version: "1",
                    subject: {
                        task_id: "example-task"
                    },
                    created_at: new Date().toISOString(),
                    telemetry_normalized: {},
                    telemetry_hash: "example-hash",
                    payload_hash: "example-payload-hash",
                    hash_alg: "blake3",
                    signature_alg: "ed25519",
                    meta: {}
                },
                signature_b64: "example-signature",
                signer_public_key_b64: "example-public-key"
            }
        }
    },
    'POST /v1/score': {
        method: 'POST',
        path: '/v1/score',
        description: 'Get reputation score for a proof',
        requiresBody: true,
        exampleBody: {
            envelope: {
                payload: {
                    version: "1",
                    subject: {
                        task_id: "example-task"
                    },
                    created_at: new Date().toISOString(),
                    telemetry_normalized: {},
                    telemetry_hash: "example-hash",
                    payload_hash: "example-payload-hash",
                    hash_alg: "blake3",
                    signature_alg: "ed25519",
                    meta: {}
                },
                signature_b64: "example-signature",
                signer_public_key_b64: "example-public-key"
            }
        }
    },
    'POST /v1/access/check': {
        method: 'POST',
        path: '/v1/access/check',
        description: 'Check if a wallet has sufficient token balance',
        requiresBody: true,
        getExampleBody: () => ({
            rpc_url: tokenGatingConfig.rpc_url,
            owner: "WALLET_ADDRESS",
            mint: tokenGatingConfig.mint,
            minimum: tokenGatingConfig.minimum
        })
    }
};

let currentEndpoint = null;
let playgroundApiKey = '';

function selectEndpoint(endpointKey) {
    currentEndpoint = API_ENDPOINTS[endpointKey];
    if (!currentEndpoint) return;
    
    const bodyEditor = document.getElementById('playgroundBody');
    const paramsContainer = document.getElementById('playgroundParams');
    const descriptionEl = document.getElementById('playgroundDescription');
    
    if (descriptionEl) {
        descriptionEl.textContent = currentEndpoint.description;
    }
    
    // Show/hide body editor
    if (bodyEditor) {
        if (currentEndpoint.requiresBody) {
            bodyEditor.parentElement.style.display = 'block';
            if (currentEndpoint.exampleBody) {
                bodyEditor.value = JSON.stringify(currentEndpoint.exampleBody, null, 2);
            } else if (currentEndpoint.getExampleBody) {
                bodyEditor.value = JSON.stringify(currentEndpoint.getExampleBody(), null, 2);
            } else {
                bodyEditor.value = '{}';
            }
        } else {
            bodyEditor.parentElement.style.display = 'none';
        }
    }
    
    // Show/hide params
    if (paramsContainer) {
        paramsContainer.innerHTML = '';
        if (currentEndpoint.params && currentEndpoint.params.length > 0) {
            currentEndpoint.params.forEach(param => {
                const div = document.createElement('div');
                div.className = 'form-group';
                div.innerHTML = `
                    <label for="param_${param}">${param.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</label>
                    <input type="text" id="param_${param}" class="form-control" placeholder="Enter ${param}">
                `;
                paramsContainer.appendChild(div);
            });
            paramsContainer.style.display = 'block';
        } else {
            paramsContainer.style.display = 'none';
        }
    }
}

function initPlayground() {
    console.log('initPlayground() called');
    const endpointSelect = document.getElementById('playgroundEndpoint');
    if (!endpointSelect) {
        console.log('endpointSelect element not found, retrying...');
        // If element doesn't exist yet, try again after a short delay
        setTimeout(initPlayground, 100);
        return;
    }
    
    console.log('endpointSelect found, clearing options...');
    // Clear existing options (including "Loading...")
    endpointSelect.innerHTML = '';
    
    // Check if API_ENDPOINTS is defined and has entries
    if (!API_ENDPOINTS || Object.keys(API_ENDPOINTS).length === 0) {
        console.error('API_ENDPOINTS is not defined or empty');
        endpointSelect.innerHTML = '<option value="">No endpoints available</option>';
        return;
    }
    
    console.log('API_ENDPOINTS found, adding', Object.keys(API_ENDPOINTS).length, 'endpoints');
    // Populate endpoint dropdown
    Object.keys(API_ENDPOINTS).forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = `${key} - ${API_ENDPOINTS[key].description}`;
        endpointSelect.appendChild(option);
    });
    
    console.log('Endpoints added, total options:', endpointSelect.options.length);
    
    // Set default
    if (endpointSelect.options.length > 0) {
        endpointSelect.value = endpointSelect.options[0].value;
        if (typeof selectEndpoint === 'function') {
            selectEndpoint(endpointSelect.options[0].value);
        } else {
            console.error('selectEndpoint function not found');
        }
    }
    
    // Load token gating configuration
    loadTokenGatingConfig();
}

// Make functions globally available
window.initPlayground = initPlayground;
window.selectEndpoint = selectEndpoint;

function updatePlaygroundApiKey(key) {
    playgroundApiKey = key;
}

async function executePlaygroundRequest() {
    if (!currentEndpoint) {
        showAlert('Please select an endpoint', 'error');
        return;
    }
    
    // Get API key from input or select
    const apiKeyInput = document.getElementById('playgroundApiKey');
    const apiKey = apiKeyInput ? apiKeyInput.value.trim() : playgroundApiKey;
    
    if (!apiKey) {
        showAlert('Please enter an API key', 'error');
        return;
    }
    
    const endpointSelect = document.getElementById('playgroundEndpoint');
    const bodyEditor = document.getElementById('playgroundBody');
    const paramsContainer = document.getElementById('playgroundParams');
    const responseEl = document.getElementById('playgroundResponse');
    const statusEl = document.getElementById('playgroundStatus');
    const executeBtn = document.getElementById('playgroundExecute');
    
    if (!executeBtn || !responseEl || !statusEl) return;
    
    executeBtn.disabled = true;
    executeBtn.textContent = 'Sending...';
    responseEl.textContent = 'Loading...';
    statusEl.textContent = '';
    
    try {
        // Build URL with params
        let url = currentEndpoint.path;
        if (currentEndpoint.params && paramsContainer) {
            currentEndpoint.params.forEach(param => {
                const input = document.getElementById(`param_${param}`);
                if (input && input.value) {
                    if (currentEndpoint.isDynamic && param === 'proof_id') {
                        url = `${currentEndpoint.path}/${input.value}`;
                    } else {
                        url += (url.includes('?') ? '&' : '?') + `${param}=${encodeURIComponent(input.value)}`;
                    }
                }
            });
        }
        
        // Get wallet address from current user
        let walletAddress = '';
        if (currentUser && currentUser.wallet_address) {
            walletAddress = currentUser.wallet_address;
        } else if (window.currentUser && window.currentUser.wallet_address) {
            walletAddress = window.currentUser.wallet_address;
        }
        
        if (!walletAddress) {
            showAlert('Wallet address not found. Please reconnect your wallet.', 'error');
            return;
        }
        
        // Build request options
        const options = {
            method: currentEndpoint.method,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'X-Wallet-Address': walletAddress,
                'Content-Type': 'application/json'
            }
        };
        
        // Add body if needed
        if (currentEndpoint.requiresBody && bodyEditor) {
            try {
                const body = JSON.parse(bodyEditor.value);
                options.body = JSON.stringify(body);
            } catch (e) {
                throw new Error('Invalid JSON in request body: ' + e.message);
            }
        }
        
        // Execute request
        const startTime = Date.now();
        const response = await fetch(`${API_BASE}${url}`, options);
        const duration = Date.now() - startTime;
        
        const responseData = await response.json();
        
        // Display status
        const statusClass = response.ok ? 'status-success' : 'status-error';
        statusEl.innerHTML = `
            <span class="${statusClass}">${response.status} ${response.statusText}</span>
            <span class="status-time">(${duration}ms)</span>
        `;
        
        // Display response
        responseEl.textContent = JSON.stringify(responseData, null, 2);
        
        if (!response.ok) {
            showAlert(`Request failed: ${responseData.detail || response.statusText}`, 'error');
        } else {
            showAlert('Request successful!', 'success');
        }
        
    } catch (error) {
        statusEl.innerHTML = `<span class="status-error">Error</span>`;
        responseEl.textContent = `Error: ${error.message}`;
        showAlert(`Request failed: ${error.message}`, 'error');
    } finally {
        executeBtn.disabled = false;
        executeBtn.textContent = 'Execute Request';
    }
}

function formatPlaygroundResponse() {
    const responseEl = document.getElementById('playgroundResponse');
    if (!responseEl) return;
    
    try {
        const json = JSON.parse(responseEl.textContent);
        responseEl.textContent = JSON.stringify(json, null, 2);
    } catch (e) {
        // Not valid JSON, ignore
    }
}

function copyPlaygroundResponse() {
    const responseEl = document.getElementById('playgroundResponse');
    if (!responseEl) return;
    
    navigator.clipboard.writeText(responseEl.textContent).then(() => {
        showAlert('Response copied to clipboard!', 'success');
    }).catch(err => {
        showAlert('Failed to copy: ' + err.message, 'error');
    });
}

function clearPlaygroundResponse() {
    const responseEl = document.getElementById('playgroundResponse');
    const statusEl = document.getElementById('playgroundStatus');
    if (responseEl) responseEl.textContent = '';
    if (statusEl) statusEl.textContent = '';
}

