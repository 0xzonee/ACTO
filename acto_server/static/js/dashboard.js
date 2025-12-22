// ACTO Dashboard - Multi-Wallet Support for Solana
// Supported wallets: Phantom, Solflare, Backpack, Glow, Coinbase Wallet

// ============================================================
// CRITICAL: Define global functions IMMEDIATELY for onclick handlers
// These must be defined before any other code runs
// ============================================================

// Open wallet selection modal - defined immediately for onclick
function openWalletModal() {
    const modal = document.getElementById('walletModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        // Refresh wallet detection when opening modal
        if (typeof populateWalletList === 'function') {
            populateWalletList();
        }
    }
}
window.openWalletModal = openWalletModal;

// Close wallet selection modal - defined immediately for onclick
function closeWalletModal() {
    const modal = document.getElementById('walletModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}
window.closeWalletModal = closeWalletModal;

// ============================================================
// END CRITICAL SECTION
// ============================================================

// Use existing API_BASE if available (may be set by docs.js), otherwise define it
// Using var to avoid redeclaration errors with const
var API_BASE = window.API_BASE || window.location.origin;
window.API_BASE = API_BASE;

// Global state
let connectedWallet = null;
let currentUser = null;
let accessToken = null;
let keysList = [];

// Make variables globally accessible for other modules
window.keysList = keysList;
window.accessToken = null;
window.currentUser = null;

// Wallet configuration - Define all supported Solana wallets
const SUPPORTED_WALLETS = [
    {
        id: 'phantom',
        name: 'Phantom',
        icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiB2aWV3Qm94PSIwIDAgMTI4IDEyOCI+PGNpcmNsZSBjeD0iNjQiIGN5PSI2NCIgcj0iNjQiIGZpbGw9IiNBQjlGRjIiLz48cGF0aCBkPSJNMTEwLjU4NCA2NC4yMzRoLTcuNjA1YTMzLjM5OCAzMy4zOTggMCAwMC0zMy4yODItMzEuMTZIMzUuNTAzYTMuMzQgMy4zNCAwIDAwLTMuMzQgMy4zNDF2MzcuNDI1YzAgMTguMDMgMTQuNjE2IDMyLjY0NiAzMi42NDYgMzIuNjQ2aDYuMDc1YzE2LjcyNyAwIDMwLjI5OC0xMy41NzEgMzAuMjk4LTMwLjI5OGEzLjM0IDMuMzQgMCAwMTMuMzQtMy4zNGg2LjA2MmEzLjM0IDMuMzQgMCAwMDMuMzQtMy40N3YtMS44MDNhMy4zNCAzLjM0IDAgMDAtMy4zNC0zLjM0em0tNjAuMjM3IDI0LjU3YTUuNzAyIDUuNzAyIDAgMTEwLTExLjQwNCA1LjcwMiA1LjcwMiAwIDAxMCAxMS40MDN6bTIzLjExMiAwYTUuNzAyIDUuNzAyIDAgMTEwLTExLjQwNCA1LjcwMiA1LjcwMiAwIDAxMCAxMS40MDN6IiBmaWxsPSIjRkZGRkZFIi8+PC9zdmc+',
        color: '#AB9FF2',
        getProvider: () => window.phantom?.solana || window.solana,
        isInstalled: () => !!(window.phantom?.solana?.isPhantom || window.solana?.isPhantom),
        downloadUrl: 'https://phantom.app/'
    },
    {
        id: 'solflare',
        name: 'Solflare',
        icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiB2aWV3Qm94PSIwIDAgMTI4IDEyOCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJhIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjRkZDMTBCIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjRkE3NjFGIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PGNpcmNsZSBjeD0iNjQiIGN5PSI2NCIgcj0iNjQiIGZpbGw9InVybCgjYSkiLz48cGF0aCBkPSJNOTcgNTAuNWwtMjMgMzguNWMtMS41IDIuNS00LjUgNC01IDRoLTEwYy0xLjUgMC0yLjUtMS0zLTIuNWwtMTAtMjNjLS41LTEgMC0yLjUgMS0zbDgtNGMxLS41IDIuNSAwIDMgMWw1IDExLjVjLjUgMSAxLjUgMSAyIDBsMTQtMjRjLjUtMSAxLjUtMS41IDIuNS0xaDljMiAwIDMgMiAyIDQuNXoiIGZpbGw9IiNGRkYiLz48L3N2Zz4=',
        color: '#FC7227',
        getProvider: () => window.solflare,
        isInstalled: () => !!window.solflare?.isSolflare,
        downloadUrl: 'https://solflare.com/'
    },
    {
        id: 'backpack',
        name: 'Backpack',
        icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiB2aWV3Qm94PSIwIDAgMTI4IDEyOCI+PHJlY3Qgd2lkdGg9IjEyOCIgaGVpZ2h0PSIxMjgiIHJ4PSIyNiIgZmlsbD0iI0UzMzYzMCIvPjxwYXRoIGQ9Ik04OCA0NEg0MGMtNC40IDAtOCAzLjYtOCA4djMyYzAgNC40IDMuNiA4IDggOGg0OGM0LjQgMCA4LTMuNiA4LThWNTJjMC00LjQtMy42LTgtOC04em0tMjQgMzZjLTYuNiAwLTEyLTUuNC0xMi0xMnM1LjQtMTIgMTItMTIgMTIgNS40IDEyIDEyLTUuNCAxMi0xMiAxMnoiIGZpbGw9IiNGRkYiLz48cmVjdCB4PSI0NCIgeT0iMzIiIHdpZHRoPSI0MCIgaGVpZ2h0PSI4IiByeD0iNCIgZmlsbD0iI0ZGRiIvPjwvc3ZnPg==',
        color: '#E33630',
        getProvider: () => window.backpack,
        isInstalled: () => !!window.backpack,
        downloadUrl: 'https://www.backpack.app/'
    },
    {
        id: 'glow',
        name: 'Glow',
        icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiB2aWV3Qm94PSIwIDAgMTI4IDEyOCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJhIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjQkY1QUY0Ii8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjOTk0NUZGIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PGNpcmNsZSBjeD0iNjQiIGN5PSI2NCIgcj0iNjQiIGZpbGw9InVybCgjYSkiLz48Y2lyY2xlIGN4PSI2NCIgY3k9IjY0IiByPSIzMiIgZmlsbD0iI0ZGRiIvPjxjaXJjbGUgY3g9IjY0IiBjeT0iNjQiIHI9IjE2IiBmaWxsPSIjOTk0NUZGIi8+PC9zdmc+',
        color: '#9945FF',
        getProvider: () => window.glow?.solana,
        isInstalled: () => !!window.glow?.solana,
        downloadUrl: 'https://glow.app/'
    },
    {
        id: 'coinbase',
        name: 'Coinbase Wallet',
        icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiB2aWV3Qm94PSIwIDAgMTI4IDEyOCI+PGNpcmNsZSBjeD0iNjQiIGN5PSI2NCIgcj0iNjQiIGZpbGw9IiMwMDUyRkYiLz48cGF0aCBkPSJNNjQgMjRjMjIuMSAwIDQwIDE3LjkgNDAgNDBzLTE3LjkgNDAtNDAgNDAtNDAtMTcuOS00MC00MCAxNy45LTQwIDQwLTQwem0wIDE2Yy0xMy4zIDAtMjQgMTAuNy0yNCAyNHMxMC43IDI0IDI0IDI0IDI0LTEwLjcgMjQtMjQtMTAuNy0yNC0yNC0yNHoiIGZpbGw9IiNGRkYiLz48cmVjdCB4PSI1MiIgeT0iNTIiIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgcng9IjQiIGZpbGw9IiNGRkYiLz48L3N2Zz4=',
        color: '#0052FF',
        getProvider: () => window.coinbaseSolana,
        isInstalled: () => !!window.coinbaseSolana,
        downloadUrl: 'https://www.coinbase.com/wallet'
    }
];

// Check for existing session on page load
window.addEventListener('DOMContentLoaded', async () => {
    accessToken = localStorage.getItem('acto_access_token');
    window.accessToken = accessToken;
    
    if (accessToken) {
        // Try to restore session from stored token
        const user = await getCurrentUser();
        if (user) {
            currentUser = user;
            window.currentUser = user;
            showMainContent();
            
            // Try to auto-reconnect wallet for signing capabilities
            autoReconnectWallet();
            
            // Show welcome back message
            setTimeout(() => {
                showAlert('Session restored - Welcome back!', 'success');
            }, 500);
        } else {
            // Token expired or invalid - clear it
            localStorage.removeItem('acto_access_token');
            localStorage.removeItem('acto_wallet_type');
            accessToken = null;
            window.accessToken = null;
            
            // Show session expired message
            setTimeout(() => {
                showAlert('Session expired - Please reconnect your wallet', 'warning');
            }, 500);
        }
    }
    
    // Populate wallet list in modal
    populateWalletList();
});

// Auto-reconnect to previously used wallet (for signing capabilities)
async function autoReconnectWallet() {
    const savedWalletType = localStorage.getItem('acto_wallet_type');
    if (!savedWalletType) return;
    
    const wallet = SUPPORTED_WALLETS.find(w => w.id === savedWalletType);
    if (!wallet || !wallet.isInstalled()) return;
    
    try {
        const provider = wallet.getProvider();
        if (provider && provider.isConnected) {
            // Wallet already connected
            connectedWallet = provider;
            window.connectedWallet = connectedWallet;
        } else if (provider && provider.connect) {
            // Try silent connect (won't show popup if previously approved)
            const resp = await provider.connect({ onlyIfTrusted: true });
            if (resp && resp.publicKey) {
                connectedWallet = provider;
                window.connectedWallet = connectedWallet;
            }
        }
    } catch (e) {
        // Silent connect failed - user will need to manually reconnect if they want to sign
        console.debug('Auto-reconnect skipped:', e.message);
    }
}

// Populate the wallet selection modal with available wallets
function populateWalletList() {
    const walletListEl = document.getElementById('walletList');
    if (!walletListEl) return;
    
    walletListEl.innerHTML = SUPPORTED_WALLETS.map(wallet => {
        const isInstalled = wallet.isInstalled();
        return `
            <button class="wallet-option ${isInstalled ? '' : 'not-installed'}" 
                    onclick="${isInstalled ? `connectWallet('${wallet.id}')` : `window.open('${wallet.downloadUrl}', '_blank')`}"
                    data-wallet-id="${wallet.id}">
                <div class="wallet-option-left">
                    <img src="${wallet.icon}" alt="${wallet.name}" class="wallet-icon" />
                    <span class="wallet-name">${wallet.name}</span>
                </div>
                <div class="wallet-option-right">
                    ${isInstalled 
                        ? '<span class="wallet-status detected">Detected</span>' 
                        : '<span class="wallet-status install">Install</span>'}
                </div>
            </button>
        `;
    }).join('');
}

// Note: openWalletModal and closeWalletModal are defined at the top of this file
// for immediate availability to onclick handlers

// Connect to a specific wallet
window.connectWallet = async function(walletId) {
    const wallet = SUPPORTED_WALLETS.find(w => w.id === walletId);
    if (!wallet) {
        showAlert('Wallet not found', 'error');
        return;
    }
    
    if (!wallet.isInstalled()) {
        showAlert(`${wallet.name} is not installed. Please install it first.`, 'error');
        window.open(wallet.downloadUrl, '_blank');
        return;
    }
    
    try {
        const provider = wallet.getProvider();
        if (!provider) {
            showAlert(`Could not connect to ${wallet.name}. Please try again.`, 'error');
            return;
        }
        
        // Close modal and show loading state
        closeWalletModal();
        showConnectingState(wallet.name);
        
        // Connect to wallet
        let response;
        if (walletId === 'solflare') {
            // Solflare has a different connect method
            await provider.connect();
            response = { publicKey: provider.publicKey };
        } else {
            response = await provider.connect();
        }
        
        const walletAddress = response.publicKey.toString();
        
        // Get challenge from server
        const challengeRes = await fetch(`${API_BASE}/v1/auth/wallet/connect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet_address: walletAddress })
        });
        
        if (!challengeRes.ok) {
            throw new Error('Failed to get challenge from server');
        }
        
        const { challenge } = await challengeRes.json();
        
        // Sign message with wallet
        const message = new TextEncoder().encode(challenge);
        let signature;
        
        if (walletId === 'solflare') {
            const signedMessage = await provider.signMessage(message, 'utf8');
            signature = signedMessage;
        } else if (walletId === 'backpack') {
            const signedMessage = await provider.signMessage(message);
            signature = { signature: signedMessage };
        } else {
            signature = await provider.signMessage(message, 'utf8');
        }
        
        // Convert signature to base64
        const signatureBytes = signature.signature || signature;
        const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));
        
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
        
        // Handle insufficient token balance (403)
        if (verifyRes.status === 403) {
            const errorData = await verifyRes.json().catch(() => ({}));
            const detail = errorData.detail || {};
            
            // Show insufficient balance screen
            hideConnectingState();
            closeWalletModal();
            showInsufficientBalanceScreen(
                walletAddress,
                detail.balance || 0,
                detail.required || 50000,
                wallet.name
            );
            return;
        }
        
        if (!verifyRes.ok) {
            throw new Error('Signature verification failed');
        }
        
        const data = await verifyRes.json();
        accessToken = data.access_token;
        window.accessToken = accessToken;
        localStorage.setItem('acto_access_token', accessToken);
        localStorage.setItem('acto_wallet_type', walletId);
        
        currentUser = { 
            user_id: data.user_id, 
            wallet_address: data.wallet_address,
            wallet_type: walletId
        };
        window.currentUser = currentUser;
        
        connectedWallet = { provider, wallet };
        
        hideConnectingState();
        showMainContent();
        showAlert(`Successfully connected with ${wallet.name}!`, 'success');
        await loadKeys();
        
    } catch (error) {
        console.error('Wallet connection error:', error);
        hideConnectingState();
        
        if (error.message.includes('User rejected')) {
            showAlert('Connection cancelled by user', 'info');
        } else {
            showAlert(`Error: ${error.message}`, 'error');
        }
    }
};

// Show connecting state on button
function showConnectingState(walletName) {
    const btn = document.getElementById('connectBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="loading"></span> Connecting to ${walletName}...`;
    }
}

// Hide connecting state
function hideConnectingState() {
    const btn = document.getElementById('connectBtn');
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path>
                <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path>
                <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z"></path>
            </svg>
            Connect Wallet
        `;
    }
}

// Disconnect wallet
window.disconnectWallet = async function() {
    if (connectedWallet?.provider) {
        try {
            await connectedWallet.provider.disconnect();
        } catch (e) {
            console.error('Disconnect error:', e);
        }
    }
    
    connectedWallet = null;
    currentUser = null;
    window.currentUser = null;
    accessToken = null;
    window.accessToken = null;
    localStorage.removeItem('acto_access_token');
    localStorage.removeItem('acto_wallet_type');
    
    document.getElementById('loginCard').classList.remove('hidden');
    document.getElementById('mainContent').classList.add('hidden');
    document.getElementById('walletInfo').style.display = 'none';
    
    showAlert('Disconnected successfully', 'info');
};

// Show insufficient balance screen when wallet doesn't have enough tokens
function showInsufficientBalanceScreen(walletAddress, currentBalance, requiredBalance, walletName) {
    // Hide login card
    document.getElementById('loginCard').classList.add('hidden');
    document.getElementById('mainContent').classList.add('hidden');
    
    // Create or show insufficient balance screen
    let balanceScreen = document.getElementById('insufficientBalanceScreen');
    if (!balanceScreen) {
        balanceScreen = document.createElement('div');
        balanceScreen.id = 'insufficientBalanceScreen';
        balanceScreen.className = 'insufficient-balance-screen';
        // Append to container or body as fallback
        const container = document.querySelector('.container') || document.body;
        container.appendChild(balanceScreen);
    }
    
    const shortAddress = `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`;
    const formattedBalance = currentBalance.toLocaleString('en-US', { maximumFractionDigits: 0 });
    const formattedRequired = requiredBalance.toLocaleString('en-US', { maximumFractionDigits: 0 });
    const deficit = Math.max(0, requiredBalance - currentBalance);
    const formattedDeficit = deficit.toLocaleString('en-US', { maximumFractionDigits: 0 });
    
    balanceScreen.innerHTML = `
        <div class="balance-error-card">
            <div class="balance-error-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            </div>
            <h2>Insufficient Token Balance</h2>
            <p class="balance-error-subtitle">You need ACTO tokens to access the dashboard</p>
            
            <div class="balance-details">
                <div class="balance-row">
                    <span class="balance-label">Connected Wallet</span>
                    <span class="balance-value wallet">${walletName} (${shortAddress})</span>
                </div>
                <div class="balance-row">
                    <span class="balance-label">Your Balance</span>
                    <span class="balance-value current">${formattedBalance} ACTO</span>
                </div>
                <div class="balance-row">
                    <span class="balance-label">Required Balance</span>
                    <span class="balance-value required">${formattedRequired} ACTO</span>
                </div>
                <div class="balance-row deficit">
                    <span class="balance-label">You Need</span>
                    <span class="balance-value">${formattedDeficit} more ACTO</span>
                </div>
            </div>
            
            <div class="balance-actions">
                <button onclick="hideInsufficientBalanceScreen()" class="btn btn-primary">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 4v6h6"></path>
                        <path d="M23 20v-6h-6"></path>
                        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
                    </svg>
                    Try Another Wallet
                </button>
            </div>
            
            <p class="balance-info">
                ACTO token is required to access the API and dashboard features.
                <a href="https://actobotics.net" target="_blank">Learn more →</a>
            </p>
        </div>
    `;
    
    balanceScreen.classList.remove('hidden');
}

// Hide insufficient balance screen and go back to login
window.hideInsufficientBalanceScreen = function() {
    const balanceScreen = document.getElementById('insufficientBalanceScreen');
    if (balanceScreen) {
        balanceScreen.classList.add('hidden');
    }
    document.getElementById('loginCard').classList.remove('hidden');
};

// Show main content after successful login
function showMainContent() {
    document.getElementById('loginCard').classList.add('hidden');
    document.getElementById('mainContent').classList.remove('hidden');
    
    if (currentUser) {
        const walletType = localStorage.getItem('acto_wallet_type') || 'wallet';
        const wallet = SUPPORTED_WALLETS.find(w => w.id === walletType);
        const walletName = wallet ? wallet.name : 'Wallet';
        
        document.getElementById('walletAddress').innerHTML = `
            <span class="wallet-type">${walletName}</span>
            <span class="wallet-addr">${currentUser.wallet_address.substring(0, 4)}...${currentUser.wallet_address.substring(currentUser.wallet_address.length - 4)}</span>
        `;
        document.getElementById('walletInfo').style.display = 'block';
    }
    
    // Load keys and initialize documentation
    loadKeys();
    if (typeof window.initDocumentation === 'function') {
        window.initDocumentation();
    }
}

// Get current user from server
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

// Show alert notification
function showAlert(message, type = 'info') {
    const alert = document.getElementById('alert');
    alert.className = `alert alert-${type} show`;
    alert.textContent = message;
    setTimeout(() => alert.classList.remove('show'), 5000);
}

// Make API request with authentication
// Options: { silent: true } to suppress error alerts
async function apiRequest(endpoint, options = {}) {
    const silent = options.silent || false;
    delete options.silent; // Don't pass to fetch
    
    if (!accessToken) {
        if (!silent) showAlert('Please connect your wallet first', 'error');
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
            // Don't auto-disconnect - silently fail or show warning
            if (!silent) showAlert('Authentication error. Try refreshing the page or reconnecting your wallet.', 'warning');
            return null;
        }
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(error.detail || `HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        if (!silent) showAlert(`Error: ${error.message}`, 'error');
        return null;
    }
}

// ============================================================
// KEYS LIST STATE MANAGEMENT
// ============================================================

// Pagination and filtering state
let keysCurrentPage = 1;
const KEYS_PER_PAGE = 10;
let selectedKeys = new Set();

// Load and display API keys
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
    window.keysList = keysList;
    
    // Reset state
    keysCurrentPage = 1;
    selectedKeys.clear();
    updateBulkActionsBar();
    
    // Render with current filters
    filterAndRenderKeys();
    
    // Also update stats tab if it's visible
    if (document.getElementById('tab-stats').classList.contains('active')) {
        loadStatsKeys();
    }
}

// Filter, sort and render keys
window.filterAndRenderKeys = function() {
    const searchTerm = (document.getElementById('keysSearch')?.value || '').toLowerCase().trim();
    const statusFilter = document.getElementById('keysFilterStatus')?.value || 'all';
    const sortBy = document.getElementById('keysSort')?.value || 'created_desc';
    
    // Filter keys
    let filteredKeys = keysList.filter(key => {
        // Search filter
        const matchesSearch = !searchTerm || 
            key.name.toLowerCase().includes(searchTerm) ||
            key.key_id.toLowerCase().includes(searchTerm);
        
        // Status filter
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && key.is_active) ||
            (statusFilter === 'inactive' && !key.is_active);
        
        return matchesSearch && matchesStatus;
    });
    
    // Sort keys
    filteredKeys.sort((a, b) => {
        switch (sortBy) {
            case 'created_asc':
                return new Date(a.created_at) - new Date(b.created_at);
            case 'created_desc':
                return new Date(b.created_at) - new Date(a.created_at);
            case 'name_asc':
                return a.name.localeCompare(b.name);
            case 'name_desc':
                return b.name.localeCompare(a.name);
            case 'used_desc':
                const aUsed = a.last_used_at ? new Date(a.last_used_at) : new Date(0);
                const bUsed = b.last_used_at ? new Date(b.last_used_at) : new Date(0);
                return bUsed - aUsed;
            case 'requests_desc':
                return (b.request_count || 0) - (a.request_count || 0);
            default:
                return 0;
        }
    });
    
    // Calculate pagination
    const totalKeys = filteredKeys.length;
    const totalPages = Math.ceil(totalKeys / KEYS_PER_PAGE);
    
    // Adjust current page if needed
    if (keysCurrentPage > totalPages) {
        keysCurrentPage = Math.max(1, totalPages);
    }
    
    // Get current page items
    const startIndex = (keysCurrentPage - 1) * KEYS_PER_PAGE;
    const pageKeys = filteredKeys.slice(startIndex, startIndex + KEYS_PER_PAGE);
    
    // Render keys
    renderKeysList(pageKeys, totalKeys);
    
    // Update pagination UI
    updatePagination(totalPages, totalKeys);
};

// Render the keys list
function renderKeysList(keys, totalCount) {
    const keysListEl = document.getElementById('keysList');
    
    if (totalCount === 0 && keysList.length === 0) {
        keysListEl.innerHTML = '<div class="empty-state"><p>No API keys found. Create your first key above!</p></div>';
        return;
    }
    
    if (keys.length === 0) {
        keysListEl.innerHTML = '<div class="empty-state"><p>No keys match your search criteria.</p></div>';
        return;
    }
    
    keysListEl.innerHTML = keys.map(key => `
        <div class="key-item ${key.is_active ? '' : 'key-disabled'} ${selectedKeys.has(key.key_id) ? 'selected' : ''}" data-key-id="${key.key_id}">
            <div class="key-select">
                <input type="checkbox" 
                    class="key-checkbox" 
                    ${selectedKeys.has(key.key_id) ? 'checked' : ''} 
                    onchange="toggleKeySelection('${key.key_id}', this.checked)">
            </div>
            <div class="key-info">
                <h3>${escapeHtml(key.name)}</h3>
                <p class="key-id-row">
                    <strong>ID:</strong> 
                    <code class="key-id-value">${escapeHtml(key.key_id)}</code>
                    <button class="btn-copy" onclick="event.stopPropagation(); copyToClipboard('${escapeHtml(key.key_id)}', this)" title="Copy Key ID">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                </p>
                <p><strong>Created:</strong> ${new Date(key.created_at).toLocaleString()}</p>
                ${key.last_used_at ? `<p><strong>Last Used:</strong> ${new Date(key.last_used_at).toLocaleString()}</p>` : '<p><strong>Last Used:</strong> Never</p>'}
                ${key.request_count !== undefined ? `<p><strong>Requests:</strong> ${key.request_count}</p>` : ''}
                <p><strong>Status:</strong> <span class="status-badge status-${key.is_active ? 'active' : 'inactive'}">${key.is_active ? 'Active' : 'Inactive'}</span></p>
            </div>
            <div class="key-actions">
                <button class="btn btn-icon" onclick="event.stopPropagation(); openRenameModal('${key.key_id}', ${JSON.stringify(key.name)})" title="Rename">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="btn btn-toggle ${key.is_active ? 'active' : ''}" onclick="event.stopPropagation(); toggleKey('${key.key_id}', ${key.is_active})" title="${key.is_active ? 'Disable Key' : 'Enable Key'}">
                    <span class="toggle-track">
                        <span class="toggle-thumb"></span>
                    </span>
                </button>
                <button class="btn btn-danger" onclick="event.stopPropagation(); openDeleteModal('${key.key_id}', ${JSON.stringify(key.name)})" title="Delete Key">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

// Update pagination UI
function updatePagination(totalPages, totalCount) {
    const paginationEl = document.getElementById('keysPagination');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const infoEl = document.getElementById('paginationInfo');
    
    // Show/hide pagination
    if (totalCount > KEYS_PER_PAGE) {
        paginationEl.classList.remove('hidden');
    } else {
        paginationEl.classList.add('hidden');
    }
    
    // Update buttons
    prevBtn.disabled = keysCurrentPage <= 1;
    nextBtn.disabled = keysCurrentPage >= totalPages;
    
    // Update info text
    const startItem = ((keysCurrentPage - 1) * KEYS_PER_PAGE) + 1;
    const endItem = Math.min(keysCurrentPage * KEYS_PER_PAGE, totalCount);
    infoEl.textContent = `${startItem}-${endItem} of ${totalCount}`;
}

// Change page
window.changePage = function(delta) {
    keysCurrentPage += delta;
    filterAndRenderKeys();
};

// ============================================================
// BULK SELECTION FUNCTIONS
// ============================================================

// Toggle single key selection
window.toggleKeySelection = function(keyId, checked) {
    if (checked) {
        selectedKeys.add(keyId);
    } else {
        selectedKeys.delete(keyId);
    }
    
    // Update UI
    const keyItem = document.querySelector(`[data-key-id="${keyId}"]`);
    if (keyItem) {
        keyItem.classList.toggle('selected', checked);
    }
    
    updateBulkActionsBar();
};

// Toggle select all
window.toggleSelectAll = function(checked) {
    const checkboxes = document.querySelectorAll('.key-checkbox');
    checkboxes.forEach(cb => {
        const keyItem = cb.closest('.key-item');
        const keyId = keyItem?.dataset.keyId;
        if (keyId) {
            cb.checked = checked;
            if (checked) {
                selectedKeys.add(keyId);
                keyItem.classList.add('selected');
            } else {
                selectedKeys.delete(keyId);
                keyItem.classList.remove('selected');
            }
        }
    });
    
    updateBulkActionsBar();
};

// Clear selection
window.clearSelection = function() {
    selectedKeys.clear();
    document.querySelectorAll('.key-checkbox').forEach(cb => cb.checked = false);
    document.querySelectorAll('.key-item.selected').forEach(item => item.classList.remove('selected'));
    document.getElementById('selectAllKeys').checked = false;
    updateBulkActionsBar();
};

// Update bulk actions bar visibility
function updateBulkActionsBar() {
    const bar = document.getElementById('bulkActionsBar');
    const countEl = document.getElementById('selectedCount');
    const selectAllCb = document.getElementById('selectAllKeys');
    
    if (selectedKeys.size > 0) {
        bar.classList.remove('hidden');
        countEl.textContent = `${selectedKeys.size} selected`;
    } else {
        bar.classList.add('hidden');
    }
    
    // Update "select all" checkbox state
    const visibleCheckboxes = document.querySelectorAll('.key-checkbox');
    if (visibleCheckboxes.length > 0 && selectedKeys.size === visibleCheckboxes.length) {
        selectAllCb.checked = true;
        selectAllCb.indeterminate = false;
    } else if (selectedKeys.size > 0) {
        selectAllCb.checked = false;
        selectAllCb.indeterminate = true;
    } else {
        selectAllCb.checked = false;
        selectAllCb.indeterminate = false;
    }
}

// Bulk delete keys
window.bulkDeleteKeys = function() {
    if (selectedKeys.size === 0) return;
    
    openDeleteModal(null, null, Array.from(selectedKeys));
};

// Load keys for statistics view (silent - no alerts on error)
async function loadStatsKeys() {
    if (!accessToken) return;
    
    const statsKeysList = document.getElementById('statsKeysList');
    if (!statsKeysList) return;
    
    statsKeysList.innerHTML = '<div class="empty-state"><p>Loading keys...</p></div>';
    
    try {
        // Use fetch directly to avoid showing alerts on error
        const response = await fetch(`${API_BASE}/v1/keys`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'X-Wallet-Address': currentUser?.wallet_address || ''
            }
        });
        
        if (!response.ok) {
            statsKeysList.innerHTML = '<div class="empty-state"><p>Could not load keys.</p></div>';
            return;
        }
        
        const result = await response.json();
        keysList = result.keys || [];
        window.keysList = keysList;
        
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
    } catch (error) {
        console.error('Failed to load stats keys:', error);
        statsKeysList.innerHTML = '<div class="empty-state"><p>Could not load keys.</p></div>';
    }
}

// Tab switching
window.switchTab = function(tabName) {
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
    if (tabName === 'fleet') {
        loadFleet();
    } else if (tabName === 'stats') {
        loadWalletStats();
        loadStatsKeys();
    } else if (tabName === 'playground') {
        // Update wallet display in playground
        updatePlaygroundWallet();
    } else if (tabName === 'docs') {
        setTimeout(() => {
            if (typeof window.initDocumentation === 'function') {
                window.initDocumentation();
            } else {
                console.warn('initDocumentation not yet available, retrying...');
                setTimeout(() => {
                    if (typeof window.initDocumentation === 'function') {
                        window.initDocumentation();
                    } else {
                        console.error('initDocumentation function not found after retry');
                    }
                }, 100);
            }
        }, 10);
    }
};

// Create new API key
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

// ============================================================
// DELETE CONFIRMATION MODAL
// ============================================================

// Current delete context
let deleteContext = { keyId: null, keyName: null, keyIds: null };

// Open delete confirmation modal
window.openDeleteModal = function(keyId, keyName, keyIds = null) {
    deleteContext = { keyId, keyName, keyIds };
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('deleteModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'deleteModal';
        modal.className = 'delete-modal';
        document.body.appendChild(modal);
    }
    
    // Determine content based on single or bulk delete
    const isBulk = keyIds && keyIds.length > 0;
    const count = isBulk ? keyIds.length : 1;
    const title = isBulk ? `Delete ${count} API Keys?` : 'Delete API Key?';
    const message = isBulk
        ? `Are you sure you want to delete <strong>${count} API keys</strong>? This action cannot be undone.`
        : `Are you sure you want to delete the API key <strong>"${escapeHtml(keyName || 'Unknown')}"</strong>? This action cannot be undone.`;
    
    modal.innerHTML = `
        <div class="delete-modal-overlay" onclick="closeDeleteModal()"></div>
        <div class="delete-modal-content">
            <div class="delete-modal-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            </div>
            <h3>${title}</h3>
            <p>${message}</p>
            <div class="delete-modal-actions">
                <button class="btn btn-secondary" onclick="closeDeleteModal()">Cancel</button>
                <button class="btn btn-danger" id="confirmDeleteBtn" onclick="confirmDelete()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Delete${isBulk ? ` (${count})` : ''}
                </button>
            </div>
        </div>
    `;
    
    // Show modal
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
};

// Close delete modal
window.closeDeleteModal = function() {
    const modal = document.getElementById('deleteModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
    deleteContext = { keyId: null, keyName: null, keyIds: null };
};

// Confirm delete action
window.confirmDelete = async function() {
    const btn = document.getElementById('confirmDeleteBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Deleting...';
    
    const { keyId, keyIds } = deleteContext;
    const isBulk = keyIds && keyIds.length > 0;
    
    let successCount = 0;
    let failCount = 0;
    
    if (isBulk) {
        // Bulk delete
        for (const id of keyIds) {
            const result = await apiRequest(`/v1/keys/${id}`, {
                method: 'DELETE',
                silent: true
            });
            if (result && result.success) {
                localStorage.removeItem(`api_key_${id}`);
                successCount++;
            } else {
                failCount++;
            }
        }
    } else if (keyId) {
        // Single delete
        const result = await apiRequest(`/v1/keys/${keyId}`, {
            method: 'DELETE',
        });
        if (result && result.success) {
            localStorage.removeItem(`api_key_${keyId}`);
            successCount = 1;
        } else {
            failCount = 1;
        }
    }
    
    closeDeleteModal();
    
    // Show result message
    if (successCount > 0 && failCount === 0) {
        showAlert(`${successCount} API key${successCount > 1 ? 's' : ''} deleted successfully`, 'success');
    } else if (successCount > 0 && failCount > 0) {
        showAlert(`Deleted ${successCount} key${successCount > 1 ? 's' : ''}, ${failCount} failed`, 'warning');
    } else {
        showAlert('Failed to delete API key(s)', 'error');
    }
    
    // Clear selection and reload
    selectedKeys.clear();
    updateBulkActionsBar();
    await loadKeys();
};

// Legacy delete function (now opens modal)
window.deleteKey = function(keyId) {
    const key = keysList.find(k => k.key_id === keyId);
    openDeleteModal(keyId, key?.name || 'Unknown');
};

// ============================================================
// COPY TO CLIPBOARD FUNCTION
// ============================================================

// Copy newly created API key
window.copyNewApiKey = async function() {
    const keyValue = document.getElementById('newKeyValue').textContent;
    const btn = document.getElementById('copyNewKeyBtn');
    
    try {
        await navigator.clipboard.writeText(keyValue);
        
        btn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Copied!</span>
        `;
        btn.classList.add('copied');
        
        setTimeout(() => {
            btn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span>Copy Key</span>
            `;
            btn.classList.remove('copied');
        }, 3000);
        
        showAlert('API key copied to clipboard!', 'success');
    } catch (err) {
        showAlert('Failed to copy to clipboard', 'error');
    }
};

// Copy text to clipboard with visual feedback
window.copyToClipboard = async function(text, buttonEl) {
    try {
        await navigator.clipboard.writeText(text);
        
        // Visual feedback on button
        if (buttonEl) {
            const originalHTML = buttonEl.innerHTML;
            buttonEl.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Copied!
            `;
            buttonEl.classList.add('copied');
            
            setTimeout(() => {
                buttonEl.innerHTML = originalHTML;
                buttonEl.classList.remove('copied');
            }, 2000);
        }
        
        showAlert('Copied to clipboard!', 'success');
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showAlert('Copied to clipboard!', 'success');
        } catch (e) {
            showAlert('Failed to copy to clipboard', 'error');
        }
        document.body.removeChild(textArea);
    }
};

// ============================================================
// RENAME API KEY FUNCTIONS
// ============================================================

// Open rename modal
window.openRenameModal = function(keyId, currentName) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('renameModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'renameModal';
        modal.className = 'rename-modal';
        modal.innerHTML = `
            <div class="rename-modal-overlay" onclick="closeRenameModal()"></div>
            <div class="rename-modal-content">
                <div class="rename-modal-header">
                    <h3>Rename API Key</h3>
                    <button class="modal-close" onclick="closeRenameModal()">&times;</button>
                </div>
                <div class="rename-modal-body">
                    <div class="form-group">
                        <label for="renameKeyInput">New Name</label>
                        <input type="text" id="renameKeyInput" placeholder="Enter new name..." autocomplete="off">
                    </div>
                    <input type="hidden" id="renameKeyId">
                </div>
                <div class="rename-modal-footer">
                    <button class="btn btn-secondary" onclick="closeRenameModal()">Cancel</button>
                    <button class="btn btn-primary" id="renameSubmitBtn" onclick="submitRename()">
                        Save Changes
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Set values
    document.getElementById('renameKeyInput').value = currentName;
    document.getElementById('renameKeyId').value = keyId;
    
    // Show modal
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Focus input
    setTimeout(() => {
        document.getElementById('renameKeyInput').focus();
        document.getElementById('renameKeyInput').select();
    }, 100);
};

// Close rename modal
window.closeRenameModal = function() {
    const modal = document.getElementById('renameModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
};

// Submit rename
window.submitRename = async function() {
    const keyId = document.getElementById('renameKeyId').value;
    const newName = document.getElementById('renameKeyInput').value.trim();
    const submitBtn = document.getElementById('renameSubmitBtn');
    
    if (!newName) {
        showAlert('Please enter a name', 'error');
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Saving... <span class="loading"></span>';
    
    const result = await apiRequest(`/v1/keys/${keyId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: newName }),
    });
    
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Save Changes';
    
    if (result && result.success) {
        closeRenameModal();
        showAlert('API key renamed successfully', 'success');
        await loadKeys();
    }
};

// ============================================================
// TOGGLE API KEY FUNCTIONS
// ============================================================

// Toggle API key active state
window.toggleKey = async function(keyId, currentState) {
    const action = currentState ? 'disable' : 'enable';
    if (!confirm(`Are you sure you want to ${action} this API key?`)) {
        return;
    }
    
    const result = await apiRequest(`/v1/keys/${keyId}/toggle`, {
        method: 'POST',
    });
    
    if (result && result.success) {
        const newState = result.is_active ? 'enabled' : 'disabled';
        showAlert(`API key ${newState} successfully`, 'success');
        await loadKeys();
    }
};

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Close modals on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeWalletModal();
        closeRenameModal();
        closeDeleteModal();
    }
    
    // Submit rename on Enter (if rename modal is open)
    if (e.key === 'Enter') {
        const renameModal = document.getElementById('renameModal');
        if (renameModal && renameModal.classList.contains('show')) {
            e.preventDefault();
            submitRename();
        }
    }
});

// ============================================================
// WALLET STATISTICS FUNCTIONS
// ============================================================

// Load wallet statistics
async function loadWalletStats() {
    if (!currentUser || !currentUser.wallet_address) {
        showStatsMessage('Connect your wallet to view statistics', 'info');
        return;
    }
    
    // Stats endpoint requires API key (not JWT), so get one from localStorage
    const apiKey = await getFirstApiKey();
    if (!apiKey) {
        showStatsMessage('Create an API Key in the "Keys" tab to view your wallet statistics', 'warning');
        setDefaultStats();
        return;
    }
    
    // Clear any previous messages
    hideStatsMessage();
    
    try {
        // Use API key for stats endpoint (it requires token balance check)
        const response = await fetch(`${API_BASE}/v1/stats/wallet/${currentUser.wallet_address}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'X-Wallet-Address': currentUser.wallet_address
            }
        });
        
        if (response.status === 401) {
            showStatsMessage('API Key invalid or expired. Try creating a new one in the "Keys" tab.', 'warning');
            setDefaultStats();
            return;
        }
        
        if (response.status === 403) {
            // Token balance check failed - user doesn't have enough tokens
            showStatsMessage('Insufficient token balance. You need at least 50,000 ACTO tokens.', 'warning');
            setDefaultStats();
            return;
        }
        
        if (response.status === 500) {
            // Internal server error - likely token balance check failure
            const errorData = await response.json().catch(() => ({}));
            const detail = errorData.detail || '';
            if (detail.includes('token balance') || detail.includes('Token balance')) {
                showStatsMessage('Token balance verification failed. Make sure you have at least 50,000 ACTO tokens in your wallet.', 'warning');
            } else {
                showStatsMessage('Server error while loading statistics. Please try again later.', 'error');
            }
            setDefaultStats();
            return;
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const stats = await response.json();
        displayWalletStats(stats);
    } catch (error) {
        console.error('Failed to load wallet stats:', error);
        // Show empty state instead of crashing
        showStatsMessage('Could not load statistics. Check your connection and try again.', 'info');
        setDefaultStats();
    }
}

// Set default stats values
function setDefaultStats() {
    const elements = {
        'statProofsSubmitted': '0',
        'statVerifications': '0',
        'statSuccessRate': '0%',
        'statLastActivity': 'Never'
    };
    
    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }
}

// Show message in stats tab
function showStatsMessage(message, type = 'info') {
    let msgBox = document.getElementById('statsMessageBox');
    if (!msgBox) {
        msgBox = document.createElement('div');
        msgBox.id = 'statsMessageBox';
        const statsTab = document.getElementById('tab-stats');
        if (statsTab) {
            statsTab.insertBefore(msgBox, statsTab.firstChild);
        }
    }
    
    const icons = {
        info: '💡',
        warning: '⚠️',
        error: '❌'
    };
    
    msgBox.className = `stats-message stats-message-${type}`;
    msgBox.innerHTML = `<span class="stats-message-icon">${icons[type] || icons.info}</span> ${message}`;
    msgBox.style.display = 'flex';
}

// Hide stats message
function hideStatsMessage() {
    const msgBox = document.getElementById('statsMessageBox');
    if (msgBox) {
        msgBox.style.display = 'none';
    }
}

// Get first available API key for stats requests
async function getFirstApiKey() {
    // Try to get from localStorage (stored when creating keys)
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('api_key_')) {
            return localStorage.getItem(key);
        }
    }
    return null;
}

// Display wallet statistics
function displayWalletStats(stats) {
    // Update stat cards
    document.getElementById('statProofsSubmitted').textContent = stats.total_proofs_submitted.toLocaleString();
    document.getElementById('statVerifications').textContent = stats.total_verifications.toLocaleString();
    document.getElementById('statSuccessRate').textContent = `${stats.verification_success_rate}%`;
    
    // Format last activity
    if (stats.last_activity) {
        const lastDate = new Date(stats.last_activity);
        const now = new Date();
        const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            document.getElementById('statLastActivity').textContent = 'Today';
        } else if (diffDays === 1) {
            document.getElementById('statLastActivity').textContent = 'Yesterday';
        } else if (diffDays < 7) {
            document.getElementById('statLastActivity').textContent = `${diffDays} days ago`;
        } else {
            document.getElementById('statLastActivity').textContent = lastDate.toLocaleDateString();
        }
    } else {
        document.getElementById('statLastActivity').textContent = 'Never';
    }
    
    // Display activity chart
    displayActivityChart(stats.activity_timeline);
    
    // Display breakdowns
    displayBreakdown('proofsByRobot', stats.proofs_by_robot, 'robot');
    displayBreakdown('proofsByTask', stats.proofs_by_task, 'task');
}

// Display activity timeline chart
function displayActivityChart(timeline) {
    const container = document.getElementById('activityChart');
    if (!timeline || timeline.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No activity data available</p></div>';
        return;
    }
    
    const maxCount = Math.max(...timeline.map(t => t.proof_count), 1);
    
    const barsHtml = timeline.map((day, index) => {
        const height = (day.proof_count / maxCount) * 100;
        const date = new Date(day.date);
        const dayLabel = date.getDate();
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        
        return `
            <div class="activity-bar-container" title="${day.date}: ${day.proof_count} proofs">
                <div class="activity-bar ${isWeekend ? 'weekend' : ''}" style="height: ${Math.max(height, 2)}%"></div>
                ${index % 7 === 0 ? `<span class="activity-label">${dayLabel}</span>` : ''}
            </div>
        `;
    }).join('');
    
    container.innerHTML = `
        <div class="activity-bars">
            ${barsHtml}
        </div>
        <div class="activity-summary">
            Total: ${timeline.reduce((sum, t) => sum + t.proof_count, 0)} proofs in the last 30 days
        </div>
    `;
}

// Display breakdown list
function displayBreakdown(containerId, data, type) {
    const container = document.getElementById(containerId);
    if (!data || Object.keys(data).length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No data available</p></div>';
        return;
    }
    
    // Sort by count descending
    const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((sum, [_, count]) => sum + count, 0);
    
    // Show top 5
    const topItems = sorted.slice(0, 5);
    
    const itemsHtml = topItems.map(([name, count]) => {
        const percentage = ((count / total) * 100).toFixed(1);
        return `
            <div class="breakdown-item">
                <div class="breakdown-info">
                    <span class="breakdown-name" title="${name}">${truncateId(name)}</span>
                    <span class="breakdown-count">${count}</span>
                </div>
                <div class="breakdown-bar-bg">
                    <div class="breakdown-bar" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = itemsHtml;
    
    if (sorted.length > 5) {
        container.innerHTML += `<div class="breakdown-more">+${sorted.length - 5} more ${type}s</div>`;
    }
}

// Truncate long IDs for display
function truncateId(id) {
    if (id.length > 20) {
        return id.substring(0, 8) + '...' + id.substring(id.length - 8);
    }
    return id;
}

// ============================================================
// API PLAYGROUND FUNCTIONS
// ============================================================

// Toggle API key visibility
window.toggleApiKeyVisibility = function() {
    const input = document.getElementById('playgroundApiKey');
    const icon = document.getElementById('toggleKeyIcon');
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
    
    if (currentUser && currentUser.wallet_address) {
        walletDisplay.textContent = currentUser.wallet_address;
        if (indicator) indicator.classList.add('connected');
    } else {
        walletDisplay.textContent = 'Not connected - Please connect wallet first';
        if (indicator) indicator.classList.remove('connected');
    }
}

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
    if (loading) {
        btn.innerHTML = '<span class="loading"></span> Loading...';
        btn.disabled = true;
    } else {
        btn.innerHTML = 'Execute';
        btn.disabled = false;
    }
}

// Execute Health Check
window.executeHealthCheck = async function() {
    const responseContainer = document.getElementById('healthResponse');
    responseContainer.innerHTML = '<div class="loading-state">Executing request...</div>';
    setButtonLoading('healthBtnText', true);
    
    const startTime = performance.now();
    
    try {
        const response = await fetch(`${API_BASE}/health`);
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
// Token requirements are loaded from server config via window.tokenGatingConfig
// Set by docs.js loadTokenGatingConfig() or fallback to defaults

window.executeAccessCheck = async function() {
    const responseContainer = document.getElementById('accessResponse');
    const apiKey = document.getElementById('playgroundApiKey').value.trim();
    
    // Get token config from global (set by docs.js) or use fallbacks
    const tokenMint = window.tokenGatingConfig?.mint || '';
    const minimumBalance = window.tokenGatingConfig?.minimum || 50000;
    
    if (!currentUser || !currentUser.wallet_address) {
        responseContainer.innerHTML = formatResponse({ error: 'Please connect your wallet first' }, 400, 0);
        return;
    }
    
    if (!apiKey) {
        responseContainer.innerHTML = formatResponse({ error: 'Please enter your API key' }, 400, 0);
        return;
    }
    
    if (!tokenMint) {
        responseContainer.innerHTML = formatResponse({ error: 'Token configuration not loaded. Please refresh the page.' }, 400, 0);
        return;
    }
    
    responseContainer.innerHTML = '<div class="loading-state">Checking token balance...</div>';
    setButtonLoading('accessBtnText', true);
    
    const startTime = performance.now();
    
    try {
        const response = await fetch(`${API_BASE}/v1/access/check`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'X-Wallet-Address': currentUser.wallet_address
            },
            body: JSON.stringify({
                owner: currentUser.wallet_address,
                mint: tokenMint,
                minimum: minimumBalance
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
    const apiKey = document.getElementById('playgroundApiKey').value.trim();
    const proofEnvelopeText = document.getElementById('proofEnvelope').value.trim();
    
    if (!currentUser || !currentUser.wallet_address) {
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
        const response = await fetch(`${API_BASE}/v1/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'X-Wallet-Address': currentUser.wallet_address
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
