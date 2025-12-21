// ============================================================
// ACTO Dashboard - Core Module
// Global state, utilities, and API functions
// ============================================================

// API Base URL
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
window.connectedWallet = null;

// ============================================================
// INITIALIZATION
// ============================================================

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
            if (typeof autoReconnectWallet === 'function') {
                autoReconnectWallet();
            }
            
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
    if (typeof populateWalletList === 'function') {
        populateWalletList();
    }
});

// ============================================================
// USER & SESSION FUNCTIONS
// ============================================================

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

// Show main content after successful login
function showMainContent() {
    document.getElementById('loginCard').classList.add('hidden');
    document.getElementById('mainContent').classList.remove('hidden');
    
    if (currentUser) {
        const walletType = localStorage.getItem('acto_wallet_type') || 'wallet';
        const wallet = window.SUPPORTED_WALLETS?.find(w => w.id === walletType);
        const walletName = wallet ? wallet.name : 'Wallet';
        
        document.getElementById('walletAddress').innerHTML = `
            <span class="wallet-type">${walletName}</span>
            <span class="wallet-addr">${currentUser.wallet_address.substring(0, 4)}...${currentUser.wallet_address.substring(currentUser.wallet_address.length - 4)}</span>
        `;
        document.getElementById('walletInfo').style.display = 'block';
    }
    
    // Load keys and initialize documentation
    if (typeof loadKeys === 'function') {
        loadKeys();
    }
    if (typeof window.initDocumentation === 'function') {
        window.initDocumentation();
    }
}
window.showMainContent = showMainContent;

// ============================================================
// ALERT NOTIFICATIONS
// ============================================================

// Show alert notification
function showAlert(message, type = 'info') {
    const alert = document.getElementById('alert');
    if (!alert) return;
    alert.className = `alert alert-${type} show`;
    alert.textContent = message;
    setTimeout(() => alert.classList.remove('show'), 5000);
}
window.showAlert = showAlert;

// ============================================================
// API REQUEST HELPER
// ============================================================

// Make API request with authentication
// Options: { silent: true } to suppress error alerts
async function apiRequest(endpoint, options = {}) {
    const silent = options.silent || false;
    delete options.silent; // Don't pass to fetch
    
    if (!window.accessToken) {
        if (!silent) showAlert('Please connect your wallet first', 'error');
        return null;
    }
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.accessToken}`,
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
window.apiRequest = apiRequest;

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
window.escapeHtml = escapeHtml;

// ============================================================
// TAB SWITCHING
// ============================================================

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
        if (typeof loadFleet === 'function') loadFleet();
    } else if (tabName === 'stats') {
        if (typeof loadWalletStats === 'function') loadWalletStats();
        if (typeof loadStatsKeys === 'function') loadStatsKeys();
    } else if (tabName === 'playground') {
        if (typeof updatePlaygroundWallet === 'function') updatePlaygroundWallet();
    } else if (tabName === 'docs') {
        setTimeout(() => {
            if (typeof window.initDocumentation === 'function') {
                window.initDocumentation();
            } else {
                console.warn('initDocumentation not yet available, retrying...');
                setTimeout(() => {
                    if (typeof window.initDocumentation === 'function') {
                        window.initDocumentation();
                    }
                }, 100);
            }
        }, 10);
    }
};

// ============================================================
// KEYBOARD EVENT HANDLERS
// ============================================================

// Close modals on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (typeof closeWalletModal === 'function') closeWalletModal();
        if (typeof closeRenameModal === 'function') closeRenameModal();
        if (typeof closeDeleteModal === 'function') closeDeleteModal();
    }
    
    // Submit rename on Enter (if rename modal is open)
    if (e.key === 'Enter') {
        const renameModal = document.getElementById('renameModal');
        if (renameModal && renameModal.classList.contains('show')) {
            e.preventDefault();
            if (typeof submitRename === 'function') submitRename();
        }
    }
});

