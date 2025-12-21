// ============================================================
// ACTO Dashboard - API Playground Module
// Test API endpoints directly from the browser
// ============================================================

// Token requirements (hardcoded - mandatory for ACTO API access)
const ACTO_TOKEN_MINT = '9wpLm21ab8ZMVJWH3pHeqgqNJqWos73G8qDRfaEwtray';
const ACTO_MINIMUM_BALANCE = 50000;

// ============================================================
// PLAYGROUND UTILITIES
// ============================================================

// Toggle API key visibility
window.toggleApiKeyVisibility = function() {
    const input = document.getElementById('playgroundApiKey');
    const icon = document.getElementById('toggleKeyIcon');
    if (!input || !icon) return;
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.textContent = 'Hide';
    } else {
        input.type = 'password';
        icon.textContent = 'Show';
    }
};

// Update playground wallet display when tab is opened
function updatePlaygroundWallet() {
    const walletDisplay = document.getElementById('playgroundWalletAddress');
    const indicator = document.querySelector('.wallet-indicator');
    
    if (window.currentUser && window.currentUser.wallet_address) {
        if (walletDisplay) walletDisplay.textContent = window.currentUser.wallet_address;
        if (indicator) indicator.classList.add('connected');
    } else {
        if (walletDisplay) walletDisplay.textContent = 'Not connected - Please connect wallet first';
        if (indicator) indicator.classList.remove('connected');
    }
}
window.updatePlaygroundWallet = updatePlaygroundWallet;

// Format JSON response for display
function formatResponse(data, status, duration) {
    const statusClass = status >= 200 && status < 300 ? 'success' : 'error';
    return `
        <div class="response-header">
            <span class="response-status ${statusClass}">Status: ${status}</span>
            <span class="response-time">${duration}ms</span>
        </div>
        <pre class="response-body">${JSON.stringify(data, null, 2)}</pre>
    `;
}

// Show loading state on button
function setButtonLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    
    if (loading) {
        btn.innerHTML = '<span class="loading"></span> Loading...';
        btn.disabled = true;
    } else {
        btn.innerHTML = 'Execute';
        btn.disabled = false;
    }
}

// ============================================================
// ENDPOINT FUNCTIONS
// ============================================================

// Execute Health Check
window.executeHealthCheck = async function() {
    const responseContainer = document.getElementById('healthResponse');
    if (!responseContainer) return;
    
    responseContainer.innerHTML = '<div class="loading-state">Executing request...</div>';
    setButtonLoading('healthBtnText', true);
    
    const startTime = performance.now();
    
    try {
        const response = await fetch(`${window.API_BASE}/health`);
        const data = await response.json();
        const duration = Math.round(performance.now() - startTime);
        
        responseContainer.innerHTML = formatResponse(data, response.status, duration);
    } catch (error) {
        const duration = Math.round(performance.now() - startTime);
        responseContainer.innerHTML = formatResponse({ error: error.message }, 0, duration);
    } finally {
        setButtonLoading('healthBtnText', false);
    }
};

// Execute Access Check (Token Balance)
window.executeAccessCheck = async function() {
    const responseContainer = document.getElementById('accessResponse');
    const apiKey = document.getElementById('playgroundApiKey')?.value.trim();
    
    if (!responseContainer) return;
    
    if (!window.currentUser || !window.currentUser.wallet_address) {
        responseContainer.innerHTML = formatResponse({ error: 'Please connect your wallet first' }, 400, 0);
        return;
    }
    
    if (!apiKey) {
        responseContainer.innerHTML = formatResponse({ error: 'Please enter your API key' }, 400, 0);
        return;
    }
    
    responseContainer.innerHTML = '<div class="loading-state">Checking token balance...</div>';
    setButtonLoading('accessBtnText', true);
    
    const startTime = performance.now();
    
    try {
        const response = await fetch(`${window.API_BASE}/v1/access/check`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'X-Wallet-Address': window.currentUser.wallet_address
            },
            body: JSON.stringify({
                owner: window.currentUser.wallet_address,
                mint: ACTO_TOKEN_MINT,
                minimum: ACTO_MINIMUM_BALANCE
            })
        });
        
        const data = await response.json();
        const duration = Math.round(performance.now() - startTime);
        
        responseContainer.innerHTML = formatResponse(data, response.status, duration);
    } catch (error) {
        const duration = Math.round(performance.now() - startTime);
        responseContainer.innerHTML = formatResponse({ error: error.message }, 0, duration);
    } finally {
        setButtonLoading('accessBtnText', false);
    }
};

// Execute Verify Proof
window.executeVerify = async function() {
    const responseContainer = document.getElementById('verifyResponse');
    const apiKey = document.getElementById('playgroundApiKey')?.value.trim();
    const proofEnvelopeText = document.getElementById('proofEnvelope')?.value.trim();
    
    if (!responseContainer) return;
    
    if (!window.currentUser || !window.currentUser.wallet_address) {
        responseContainer.innerHTML = formatResponse({ error: 'Please connect your wallet first' }, 400, 0);
        return;
    }
    
    if (!apiKey) {
        responseContainer.innerHTML = formatResponse({ error: 'Please enter your API key' }, 400, 0);
        return;
    }
    
    if (!proofEnvelopeText) {
        responseContainer.innerHTML = formatResponse({ error: 'Please enter a proof envelope' }, 400, 0);
        return;
    }
    
    let proofEnvelope;
    try {
        proofEnvelope = JSON.parse(proofEnvelopeText);
    } catch (e) {
        responseContainer.innerHTML = formatResponse({ error: 'Invalid JSON format in proof envelope' }, 400, 0);
        return;
    }
    
    responseContainer.innerHTML = '<div class="loading-state">Verifying proof...</div>';
    setButtonLoading('verifyBtnText', true);
    
    const startTime = performance.now();
    
    try {
        const response = await fetch(`${window.API_BASE}/v1/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'X-Wallet-Address': window.currentUser.wallet_address
            },
            body: JSON.stringify({ envelope: proofEnvelope })
        });
        
        const data = await response.json();
        const duration = Math.round(performance.now() - startTime);
        
        responseContainer.innerHTML = formatResponse(data, response.status, duration);
    } catch (error) {
        const duration = Math.round(performance.now() - startTime);
        responseContainer.innerHTML = formatResponse({ error: error.message }, 0, duration);
    } finally {
        setButtonLoading('verifyBtnText', false);
    }
};

