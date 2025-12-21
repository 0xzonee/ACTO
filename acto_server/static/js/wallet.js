// ============================================================
// ACTO Dashboard - Wallet Module
// Solana wallet connection and authentication
// ============================================================

// Supported Solana wallets configuration
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
window.SUPPORTED_WALLETS = SUPPORTED_WALLETS;

// ============================================================
// WALLET MODAL FUNCTIONS
// ============================================================

// Open wallet selection modal
function openWalletModal() {
    const modal = document.getElementById('walletModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        populateWalletList();
    }
}
window.openWalletModal = openWalletModal;

// Close wallet selection modal
function closeWalletModal() {
    const modal = document.getElementById('walletModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}
window.closeWalletModal = closeWalletModal;

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
window.populateWalletList = populateWalletList;

// ============================================================
// WALLET CONNECTION
// ============================================================

// Auto-reconnect to previously used wallet (for signing capabilities)
async function autoReconnectWallet() {
    const savedWalletType = localStorage.getItem('acto_wallet_type');
    if (!savedWalletType) return;
    
    const wallet = SUPPORTED_WALLETS.find(w => w.id === savedWalletType);
    if (!wallet || !wallet.isInstalled()) return;
    
    try {
        const provider = wallet.getProvider();
        if (provider && provider.isConnected) {
            window.connectedWallet = provider;
        } else if (provider && provider.connect) {
            const resp = await provider.connect({ onlyIfTrusted: true });
            if (resp && resp.publicKey) {
                window.connectedWallet = provider;
            }
        }
    } catch (e) {
        console.debug('Auto-reconnect skipped:', e.message);
    }
}
window.autoReconnectWallet = autoReconnectWallet;

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
        
        closeWalletModal();
        showConnectingState(wallet.name);
        
        // Connect to wallet
        let response;
        if (walletId === 'solflare') {
            await provider.connect();
            response = { publicKey: provider.publicKey };
        } else {
            response = await provider.connect();
        }
        
        const walletAddress = response.publicKey.toString();
        
        // Get challenge from server
        const challengeRes = await fetch(`${window.API_BASE}/v1/auth/wallet/connect`, {
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
        const verifyRes = await fetch(`${window.API_BASE}/v1/auth/wallet/verify`, {
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
        window.accessToken = data.access_token;
        localStorage.setItem('acto_access_token', data.access_token);
        localStorage.setItem('acto_wallet_type', walletId);
        
        window.currentUser = { 
            user_id: data.user_id, 
            wallet_address: data.wallet_address,
            wallet_type: walletId
        };
        
        window.connectedWallet = { provider, wallet };
        
        hideConnectingState();
        showMainContent();
        showAlert(`Successfully connected with ${wallet.name}!`, 'success');
        if (typeof loadKeys === 'function') loadKeys();
        
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

// ============================================================
// CONNECTING STATE UI
// ============================================================

function showConnectingState(walletName) {
    const btn = document.getElementById('connectBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="loading"></span> Connecting to ${walletName}...`;
    }
}

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

// ============================================================
// DISCONNECT WALLET
// ============================================================

window.disconnectWallet = async function() {
    if (window.connectedWallet?.provider) {
        try {
            await window.connectedWallet.provider.disconnect();
        } catch (e) {
            console.error('Disconnect error:', e);
        }
    }
    
    window.connectedWallet = null;
    window.currentUser = null;
    window.accessToken = null;
    localStorage.removeItem('acto_access_token');
    localStorage.removeItem('acto_wallet_type');
    
    document.getElementById('loginCard').classList.remove('hidden');
    document.getElementById('mainContent').classList.add('hidden');
    document.getElementById('walletInfo').style.display = 'none';
    
    showAlert('Disconnected successfully', 'info');
};

// ============================================================
// INSUFFICIENT BALANCE SCREEN
// ============================================================

function showInsufficientBalanceScreen(walletAddress, currentBalance, requiredBalance, walletName) {
    document.getElementById('loginCard').classList.add('hidden');
    document.getElementById('mainContent').classList.add('hidden');
    
    let balanceScreen = document.getElementById('insufficientBalanceScreen');
    if (!balanceScreen) {
        balanceScreen = document.createElement('div');
        balanceScreen.id = 'insufficientBalanceScreen';
        balanceScreen.className = 'insufficient-balance-screen';
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

window.hideInsufficientBalanceScreen = function() {
    const balanceScreen = document.getElementById('insufficientBalanceScreen');
    if (balanceScreen) {
        balanceScreen.classList.add('hidden');
    }
    document.getElementById('loginCard').classList.remove('hidden');
};

