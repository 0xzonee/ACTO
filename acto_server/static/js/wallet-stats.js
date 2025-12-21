// ============================================================
// ACTO Dashboard - Wallet Statistics Module
// Display wallet activity and proof statistics
// ============================================================

// ============================================================
// LOAD WALLET STATS
// ============================================================

async function loadWalletStats() {
    if (!window.currentUser || !window.currentUser.wallet_address) {
        showStatsMessage('Connect your wallet to view statistics', 'info');
        return;
    }
    
    const apiKey = await getFirstApiKey();
    if (!apiKey) {
        showStatsMessage('Create an API Key in the "Keys" tab to view your wallet statistics', 'warning');
        setDefaultStats();
        return;
    }
    
    hideStatsMessage();
    
    try {
        const response = await fetch(`${window.API_BASE}/v1/stats/wallet/${window.currentUser.wallet_address}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'X-Wallet-Address': window.currentUser.wallet_address
            }
        });
        
        if (response.status === 401) {
            showStatsMessage('API Key invalid or expired. Try creating a new one in the "Keys" tab.', 'warning');
            setDefaultStats();
            return;
        }
        
        if (response.status === 403) {
            showStatsMessage('Insufficient token balance. You need at least 50,000 ACTO tokens.', 'warning');
            setDefaultStats();
            return;
        }
        
        if (response.status === 500) {
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
        showStatsMessage('Could not load statistics. Check your connection and try again.', 'info');
        setDefaultStats();
    }
}
window.loadWalletStats = loadWalletStats;

// ============================================================
// STATS DISPLAY HELPERS
// ============================================================

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

function hideStatsMessage() {
    const msgBox = document.getElementById('statsMessageBox');
    if (msgBox) {
        msgBox.style.display = 'none';
    }
}

async function getFirstApiKey() {
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('api_key_')) {
            return localStorage.getItem(key);
        }
    }
    return null;
}

// ============================================================
// DISPLAY WALLET STATS
// ============================================================

function displayWalletStats(stats) {
    const proofsEl = document.getElementById('statProofsSubmitted');
    const verificationsEl = document.getElementById('statVerifications');
    const successRateEl = document.getElementById('statSuccessRate');
    const lastActivityEl = document.getElementById('statLastActivity');
    
    if (proofsEl) proofsEl.textContent = stats.total_proofs_submitted.toLocaleString();
    if (verificationsEl) verificationsEl.textContent = stats.total_verifications.toLocaleString();
    if (successRateEl) successRateEl.textContent = `${stats.verification_success_rate}%`;
    
    if (lastActivityEl) {
        if (stats.last_activity) {
            const lastDate = new Date(stats.last_activity);
            const now = new Date();
            const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) {
                lastActivityEl.textContent = 'Today';
            } else if (diffDays === 1) {
                lastActivityEl.textContent = 'Yesterday';
            } else if (diffDays < 7) {
                lastActivityEl.textContent = `${diffDays} days ago`;
            } else {
                lastActivityEl.textContent = lastDate.toLocaleDateString();
            }
        } else {
            lastActivityEl.textContent = 'Never';
        }
    }
    
    displayActivityChart(stats.activity_timeline);
    displayBreakdown('proofsByRobot', stats.proofs_by_robot, 'robot');
    displayBreakdown('proofsByTask', stats.proofs_by_task, 'task');
}

// ============================================================
// ACTIVITY CHART
// ============================================================

function displayActivityChart(timeline) {
    const container = document.getElementById('activityChart');
    if (!container) return;
    
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

// ============================================================
// BREAKDOWN DISPLAY
// ============================================================

function displayBreakdown(containerId, data, type) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!data || Object.keys(data).length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No data available</p></div>';
        return;
    }
    
    const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((sum, [_, count]) => sum + count, 0);
    
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

function truncateId(id) {
    if (id.length > 20) {
        return id.substring(0, 8) + '...' + id.substring(id.length - 8);
    }
    return id;
}

