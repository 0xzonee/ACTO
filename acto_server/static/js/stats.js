// Statistics module for API key usage tracking

async function loadKeyStats(keyId) {
    const token = window.accessToken || accessToken;
    if (!token) return null;
    
    try {
        const result = await apiRequest(`/v1/keys/${keyId}/stats`);
        return result;
    } catch (error) {
        console.error('Failed to load key statistics:', error);
        return null;
    }
}

function renderKeyStats(key, stats) {
    if (!stats) {
        return `
            <div class="stats-item">
                <p class="stats-label">No statistics available</p>
            </div>
        `;
    }
    
    const endpointUsage = stats.endpoint_usage || {};
    const sortedEndpoints = Object.entries(endpointUsage)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10); // Top 10 endpoints
    
    return `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${stats.request_count || 0}</div>
                <div class="stat-label">Total Requests</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${Object.keys(endpointUsage).length}</div>
                <div class="stat-label">Endpoints Used</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.last_used_at ? new Date(stats.last_used_at).toLocaleDateString() : 'Never'}</div>
                <div class="stat-label">Last Used</div>
            </div>
        </div>
        ${sortedEndpoints.length > 0 ? `
            <div class="endpoint-usage">
                <h4>Endpoint Usage</h4>
                <div class="endpoint-list">
                    ${sortedEndpoints.map(([endpoint, count]) => `
                        <div class="endpoint-item">
                            <span class="endpoint-path">${escapeHtml(endpoint)}</span>
                            <span class="endpoint-count">${count} ${count === 1 ? 'request' : 'requests'}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
    `;
}

// Make it globally available for onclick handlers
window.showKeyStats = function showKeyStats(keyId) {
    const modal = document.getElementById('statsModal');
    if (!modal) return;
    
    modal.classList.add('show');
    modal.querySelector('.modal-content').innerHTML = '<div class="loading-state">Loading statistics...</div>';
    
    loadKeyStats(keyId).then(stats => {
        // Get key from global keysList or fetch it
        let key = window.keysList ? window.keysList.find(k => k.key_id === keyId) : null;
        if (!key) {
            // Fallback: try to find in DOM
            const keyItem = document.querySelector(`[onclick*="${keyId}"]`)?.closest('.key-item');
            if (keyItem) {
                const nameEl = keyItem.querySelector('h3');
                key = { key_id: keyId, name: nameEl ? nameEl.textContent : 'Unknown Key' };
            } else {
                key = { key_id: keyId, name: 'Unknown Key' };
            }
        }
        
        const content = `
            <div class="modal-header">
                <h3>Usage Statistics: ${escapeHtml(key.name)}</h3>
                <button class="modal-close" onclick="closeStatsModal()">&times;</button>
            </div>
            <div class="modal-body">
                ${renderKeyStats(key, stats)}
            </div>
        `;
        modal.querySelector('.modal-content').innerHTML = content;
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function closeStatsModal() {
    const modal = document.getElementById('statsModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Close modal on outside click
document.addEventListener('click', (e) => {
    const modal = document.getElementById('statsModal');
    if (modal && e.target === modal) {
        closeStatsModal();
    }
});

