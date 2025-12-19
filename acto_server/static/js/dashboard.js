// Define API_BASE first (this will be used by other modules)
const API_BASE = window.location.origin;
window.API_BASE = API_BASE;
let phantomWallet = null;
let currentUser = null;
let accessToken = null;
let keysList = [];

// Make variables globally accessible for other modules
window.keysList = keysList;
window.accessToken = null; // Will be updated when token is set
window.currentUser = null; // Will be updated when user is set

// Check for existing session
window.addEventListener('DOMContentLoaded', async () => {
    accessToken = localStorage.getItem('acto_access_token');
    window.accessToken = accessToken;
    if (accessToken) {
        const user = await getCurrentUser();
        if (user) {
            currentUser = user;
            window.currentUser = user;
            showMainContent();
        } else {
            localStorage.removeItem('acto_access_token');
            accessToken = null;
            window.accessToken = null;
        }
    }
});

// Connect Phantom Wallet
async function connectWallet() {
    try {
        if (!window.solana || !window.solana.isPhantom) {
            showAlert('Phantom wallet not found. Please install Phantom wallet extension.', 'error');
            return;
        }
        
        phantomWallet = window.solana;
        const response = await phantomWallet.connect();
        const walletAddress = response.publicKey.toString();
        
        // Get challenge from server
        const challengeRes = await fetch(`${API_BASE}/v1/auth/wallet/connect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet_address: walletAddress })
        });
        
        if (!challengeRes.ok) {
            throw new Error('Failed to get challenge');
        }
        
        const { challenge } = await challengeRes.json();
        
        // Sign message with wallet
        const message = new TextEncoder().encode(challenge);
        const signature = await phantomWallet.signMessage(message, 'utf8');
        
        // Convert signature to base64
        const signatureBase64 = btoa(String.fromCharCode(...signature.signature));
        
        // Verify signature with server
        const verifyRes = await fetch(`${API_BASE}/v1/auth/wallet/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                wallet_address: walletAddress,
                signature: signatureBase64,
                challenge: challenge
            })
        });
        
        if (!verifyRes.ok) {
            throw new Error('Signature verification failed');
        }
        
        const data = await verifyRes.json();
        accessToken = data.access_token;
        window.accessToken = accessToken;
        localStorage.setItem('acto_access_token', accessToken);
        currentUser = { user_id: data.user_id, wallet_address: data.wallet_address };
        window.currentUser = currentUser;
        
        showMainContent();
        showAlert('Successfully connected!', 'success');
        await loadKeys();
        
    } catch (error) {
        console.error('Wallet connection error:', error);
        showAlert(`Error: ${error.message}`, 'error');
    }
}

// Disconnect wallet
async function disconnectWallet() {
    if (phantomWallet) {
        try {
            await phantomWallet.disconnect();
        } catch (e) {
            console.error('Disconnect error:', e);
        }
    }
    phantomWallet = null;
    currentUser = null;
    window.currentUser = null;
    accessToken = null;
    window.accessToken = null;
    localStorage.removeItem('acto_access_token');
    document.getElementById('loginCard').classList.remove('hidden');
    document.getElementById('mainContent').classList.add('hidden');
    document.getElementById('walletInfo').style.display = 'none';
    showAlert('Disconnected successfully', 'info');
}

// Show main content
function showMainContent() {
    document.getElementById('loginCard').classList.add('hidden');
    document.getElementById('mainContent').classList.remove('hidden');
    if (currentUser) {
        document.getElementById('walletAddress').textContent = 
            `${currentUser.wallet_address.substring(0, 4)}...${currentUser.wallet_address.substring(currentUser.wallet_address.length - 4)}`;
        document.getElementById('walletInfo').style.display = 'block';
    }
    // Load keys and initialize documentation
    loadKeys();
    if (typeof initDocumentation === 'function') {
        initDocumentation();
    }
}

// Get current user
async function getCurrentUser() {
    if (!accessToken) return null;
    try {
        const res = await fetch(`${API_BASE}/v1/auth/me`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (res.ok) {
            return await res.json();
        }
    } catch (e) {
        console.error('Get user error:', e);
    }
    return null;
}

// Show alert
function showAlert(message, type = 'info') {
    const alert = document.getElementById('alert');
    alert.className = `alert alert-${type} show`;
    alert.textContent = message;
    setTimeout(() => alert.classList.remove('show'), 5000);
}

// Make API request
async function apiRequest(endpoint, options = {}) {
    if (!accessToken) {
        showAlert('Please connect your wallet first', 'error');
        return null;
    }
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        ...options.headers,
    };
    
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers,
        });
        
        if (response.status === 401) {
            showAlert('Session expired. Please reconnect your wallet.', 'error');
            disconnectWallet();
            return null;
        }
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(error.detail || `HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        showAlert(`Error: ${error.message}`, 'error');
        return null;
    }
}

// Load and display keys
async function loadKeys() {
    if (!accessToken) return;
    
    const keysListEl = document.getElementById('keysList');
    keysListEl.innerHTML = '<div class="empty-state"><p>Loading keys...</p></div>';
    
    const result = await apiRequest('/v1/keys');
    if (!result) {
        keysListEl.innerHTML = '<div class="empty-state"><p>Failed to load keys.</p></div>';
        return;
    }
    
    keysList = result.keys || [];
    window.keysList = keysList; // Update global reference
    
    if (keysList.length === 0) {
        keysListEl.innerHTML = '<div class="empty-state"><p>No API keys found. Create your first key above!</p></div>';
        return;
    }
    
    keysListEl.innerHTML = keysList.map(key => `
        <div class="key-item">
            <div class="key-info">
                <h3>${escapeHtml(key.name)}</h3>
                <p><strong>ID:</strong> ${escapeHtml(key.key_id)}</p>
                <p><strong>Created:</strong> ${new Date(key.created_at).toLocaleString()}</p>
                ${key.last_used_at ? `<p><strong>Last Used:</strong> ${new Date(key.last_used_at).toLocaleString()}</p>` : '<p><strong>Last Used:</strong> Never</p>'}
                ${key.request_count !== undefined ? `<p><strong>Requests:</strong> ${key.request_count}</p>` : ''}
                <p><strong>Status:</strong> <span class="status-badge status-${key.is_active ? 'active' : 'inactive'}">${key.is_active ? 'Active' : 'Inactive'}</span></p>
            </div>
            <div class="key-actions">
                ${key.is_active ? `<button class="btn btn-danger" onclick="deleteKey('${key.key_id}')">Delete</button>` : ''}
            </div>
        </div>
    `).join('');
    
    // Also update stats tab if it's visible
    if (document.getElementById('tab-stats').classList.contains('active')) {
        loadStatsKeys();
    }
}

// Load keys for statistics view
async function loadStatsKeys() {
    if (!accessToken) return;
    
    const statsKeysList = document.getElementById('statsKeysList');
    if (!statsKeysList) return;
    
    statsKeysList.innerHTML = '<div class="empty-state"><p>Loading keys...</p></div>';
    
    const result = await apiRequest('/v1/keys');
    if (!result) {
        statsKeysList.innerHTML = '<div class="empty-state"><p>Failed to load keys.</p></div>';
        return;
    }
    
    keysList = result.keys || [];
    window.keysList = keysList; // Update global reference
    
    if (keysList.length === 0) {
        statsKeysList.innerHTML = '<div class="empty-state"><p>No API keys found. Create your first key in the API Keys tab!</p></div>';
        return;
    }
    
    statsKeysList.innerHTML = keysList.map(key => `
        <div class="key-item">
            <div class="key-info">
                <h3>${escapeHtml(key.name)}</h3>
                <p><strong>ID:</strong> ${escapeHtml(key.key_id)}</p>
                <p><strong>Total Requests:</strong> ${key.request_count || 0}</p>
                <p><strong>Endpoints Used:</strong> ${Object.keys(key.endpoint_usage || {}).length}</p>
                ${key.last_used_at ? `<p><strong>Last Used:</strong> ${new Date(key.last_used_at).toLocaleString()}</p>` : '<p><strong>Last Used:</strong> Never</p>'}
            </div>
            <div class="key-actions">
                <button class="btn btn-primary" onclick="showKeyStats('${key.key_id}')">View Statistics</button>
            </div>
        </div>
    `).join('');
}

// Tab switching
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`tab-${tabName}`).classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Load content for specific tabs
    if (tabName === 'stats') {
        loadStatsKeys();
    } else if (tabName === 'docs') {
        if (typeof initDocumentation === 'function') {
            initDocumentation();
        }
    }
}

// Create new key
document.addEventListener('DOMContentLoaded', () => {
    const createKeyForm = document.getElementById('createKeyForm');
    if (createKeyForm) {
        createKeyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const form = e.target;
            const name = form.name.value.trim();
            const createBtn = document.getElementById('createBtn');
            
            if (!name) {
                showAlert('Please enter a key name', 'error');
                return;
            }
            
            createBtn.disabled = true;
            createBtn.innerHTML = 'Creating... <span class="loading"></span>';
            
            const result = await apiRequest('/v1/keys', {
                method: 'POST',
                body: JSON.stringify({ name }),
            });
            
            createBtn.disabled = false;
            createBtn.innerHTML = 'Create API Key';
            
            if (result) {
                document.getElementById('newKeyValue').textContent = result.key;
                document.getElementById('newKeyDisplay').classList.add('show');
                showAlert('API key created successfully!', 'success');
                
                // Store API key in localStorage
                if (result.key && result.key_id) {
                    localStorage.setItem(`api_key_${result.key_id}`, result.key);
                }
                
                form.reset();
                await loadKeys();
                
            }
        });
    }
});

// Delete key
async function deleteKey(keyId) {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
        return;
    }
    
    const result = await apiRequest(`/v1/keys/${keyId}`, {
        method: 'DELETE',
    });
    
    if (result && result.success) {
        showAlert('API key deleted successfully', 'success');
        await loadKeys();
    }
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

