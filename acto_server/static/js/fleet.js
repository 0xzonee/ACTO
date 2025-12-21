// ============================================
// Fleet Management Module
// ============================================

var API_BASE = window.API_BASE || '';

// Load fleet data
async function loadFleet() {
    const fleetList = document.getElementById('fleetList');
    if (!fleetList) return;
    
    // Show loading state
    fleetList.innerHTML = `
        <div class="fleet-loading">
            <div class="loading-spinner"></div>
            <p>Loading fleet data...</p>
        </div>
    `;
    
    if (!window.currentUser || !window.accessToken) {
        showFleetEmpty('Connect your wallet to view your fleet.');
        return;
    }
    
    try {
        // Fetch fleet data using JWT (tied to wallet, not API key)
        const response = await fetch(`${API_BASE}/v1/fleet`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${window.accessToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Update fleet stats from summary
        document.getElementById('fleetActiveCount').textContent = data.summary.active_devices;
        document.getElementById('fleetTotalCount').textContent = data.summary.total_devices;
        document.getElementById('fleetTotalProofs').textContent = data.summary.total_proofs.toLocaleString();
        document.getElementById('fleetTotalTasks').textContent = data.summary.total_tasks.toLocaleString();
        
        // Display devices
        displayFleetDevices(data.devices);
        
    } catch (error) {
        console.error('Failed to load fleet:', error);
        showFleetEmpty('Could not load fleet data. Please try again.');
    }
}

// Display fleet devices from API response
function displayFleetDevices(devices) {
    const fleetList = document.getElementById('fleetList');
    if (!fleetList) return;
    
    if (!devices || devices.length === 0) {
        showFleetEmpty('No devices found. Submit proofs from your robots to see them here.');
        return;
    }
    
    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    
    fleetList.innerHTML = devices.map(device => {
        const isOnline = device.last_activity && new Date(device.last_activity) > oneDayAgo;
        const lastActivityText = device.last_activity 
            ? formatRelativeTime(device.last_activity)
            : 'Never';
        
        return `
            <div class="fleet-device">
                <div class="fleet-device-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                        <rect x="9" y="9" width="6" height="6"></rect>
                        <line x1="9" y1="1" x2="9" y2="4"></line>
                        <line x1="15" y1="1" x2="15" y2="4"></line>
                        <line x1="9" y1="20" x2="9" y2="23"></line>
                        <line x1="15" y1="20" x2="15" y2="23"></line>
                        <line x1="20" y1="9" x2="23" y2="9"></line>
                        <line x1="20" y1="14" x2="23" y2="14"></line>
                        <line x1="1" y1="9" x2="4" y2="9"></line>
                        <line x1="1" y1="14" x2="4" y2="14"></line>
                    </svg>
                </div>
                <div class="fleet-device-info">
                    <div class="fleet-device-name">${escapeHtml(device.name)}</div>
                    <div class="fleet-device-id">${escapeHtml(device.id)}</div>
                </div>
                <div class="fleet-device-stats">
                    <div class="fleet-device-stat">
                        <div class="fleet-device-stat-value">${device.proof_count}</div>
                        <div class="fleet-device-stat-label">Proofs</div>
                    </div>
                    <div class="fleet-device-stat">
                        <div class="fleet-device-stat-value">${device.task_count}</div>
                        <div class="fleet-device-stat-label">Tasks</div>
                    </div>
                    <div class="fleet-device-stat">
                        <div class="fleet-device-stat-value">${lastActivityText}</div>
                        <div class="fleet-device-stat-label">Last Active</div>
                    </div>
                </div>
                <div class="fleet-device-status ${isOnline ? 'online' : 'offline'}">
                    <span class="status-dot"></span>
                    ${isOnline ? 'Active' : 'Inactive'}
                </div>
            </div>
        `;
    }).join('');
}

// Show empty fleet state
function showFleetEmpty(message) {
    const fleetList = document.getElementById('fleetList');
    if (!fleetList) return;
    
    fleetList.innerHTML = `
        <div class="fleet-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                <rect x="9" y="9" width="6" height="6"></rect>
                <line x1="9" y1="1" x2="9" y2="4"></line>
                <line x1="15" y1="1" x2="15" y2="4"></line>
            </svg>
            <h3>No Devices Found</h3>
            <p>${message}</p>
        </div>
    `;
    
    // Reset stats
    const elements = ['fleetActiveCount', 'fleetTotalCount', 'fleetTotalProofs', 'fleetTotalTasks'];
    elements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '0';
    });
}

// Format relative time
function formatRelativeTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

// Escape HTML to prevent XSS
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Refresh fleet data
window.refreshFleet = function() {
    loadFleet();
};

// Export for use in dashboard.js
window.loadFleet = loadFleet;

