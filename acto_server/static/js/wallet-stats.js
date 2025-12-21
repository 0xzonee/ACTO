// ============================================================
// ACTO Dashboard - Wallet Statistics Module
// Display wallet activity and proof statistics
// ============================================================

// Current state
let currentPeriod = 30; // days
let currentStats = null;
let aggregatedKeyStats = null;

// ============================================================
// TIME RANGE SELECTION
// ============================================================

window.setTimePeriod = function(days) {
    currentPeriod = days;
    
    // Update active button
    document.querySelectorAll('.time-range-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.days === String(days)) {
            btn.classList.add('active');
        }
    });
    
    // Hide/show custom range
    const customInputs = document.getElementById('customRangeInputs');
    if (customInputs) {
        customInputs.classList.toggle('show', days === 'custom');
    }
    
    // Reload stats with new period
    if (days !== 'custom') {
        loadWalletStats();
    }
};

window.applyCustomRange = function() {
    const startDate = document.getElementById('customStartDate')?.value;
    const endDate = document.getElementById('customEndDate')?.value;
    
    if (!startDate || !endDate) {
        showAlert('Please select both start and end dates', 'error');
        return;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) {
        showAlert('End date must be after start date', 'error');
        return;
    }
    
    currentPeriod = diffDays;
    loadWalletStats();
};

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
    showChartsLoading();
    
    try {
        // Load wallet stats
        const response = await fetch(`${window.API_BASE}/v1/stats/wallet/${window.currentUser.wallet_address}?days=${currentPeriod}`, {
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
        currentStats = stats;
        
        // Also load aggregated API key stats
        await loadAggregatedKeyStats();
        
        displayWalletStats(stats);
        displayAdvancedCharts(stats);
    } catch (error) {
        console.error('Failed to load wallet stats:', error);
        showStatsMessage('Could not load statistics. Check your connection and try again.', 'info');
        setDefaultStats();
    }
}
window.loadWalletStats = loadWalletStats;

// Load aggregated stats from all API keys
async function loadAggregatedKeyStats() {
    try {
        const result = await apiRequest('/v1/keys?include_inactive=true');
        if (!result || !result.keys) return;
        
        // Aggregate endpoint usage across all keys
        const endpointUsage = {};
        const hourlyUsage = {};
        let totalRequests = 0;
        
        for (const key of result.keys) {
            const usage = key.endpoint_usage || {};
            totalRequests += key.request_count || 0;
            
            for (const [endpoint, count] of Object.entries(usage)) {
                endpointUsage[endpoint] = (endpointUsage[endpoint] || 0) + count;
            }
        }
        
        aggregatedKeyStats = {
            totalRequests,
            endpointUsage,
            hourlyUsage,
            keyCount: result.keys.length
        };
        
    } catch (error) {
        console.error('Failed to load aggregated key stats:', error);
    }
}

function showChartsLoading() {
    const containers = ['activityLineChart', 'heatmapChart', 'endpointPieChart', 'endpointBarChart'];
    containers.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.parentElement) {
            el.parentElement.innerHTML = `
                <div class="chart-loading">
                    <div class="loading-spinner"></div>
                    <span>Loading chart...</span>
                </div>
            `;
        }
    });
}

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

// ============================================================
// ADVANCED CHARTS
// ============================================================

function displayAdvancedCharts(stats) {
    // Activity Line Chart
    if (stats.activity_timeline && typeof createActivityLineChart === 'function') {
        const chartContainer = document.getElementById('activityLineChartContainer');
        if (chartContainer) {
            chartContainer.innerHTML = '<canvas id="activityLineChart"></canvas>';
            createActivityLineChart('activityLineChart', stats.activity_timeline, currentPeriod);
        }
    }
    
    // Heatmap Chart (using hourly data if available)
    if (typeof createHeatmapChart === 'function') {
        const heatmapContainer = document.getElementById('heatmapChartContainer');
        if (heatmapContainer) {
            heatmapContainer.innerHTML = '<canvas id="heatmapChart"></canvas>';
            // Generate sample heatmap data from timeline
            const hourlyData = generateHourlyData(stats.activity_timeline);
            createHeatmapChart('heatmapChart', hourlyData);
        }
    }
    
    // Endpoint Charts (from aggregated key stats)
    if (aggregatedKeyStats && aggregatedKeyStats.endpointUsage) {
        if (typeof createEndpointPieChart === 'function') {
            const pieContainer = document.getElementById('endpointPieChartContainer');
            if (pieContainer) {
                pieContainer.innerHTML = '<canvas id="endpointPieChart"></canvas>';
                createEndpointPieChart('endpointPieChart', aggregatedKeyStats.endpointUsage);
            }
        }
        
        if (typeof createEndpointBarChart === 'function') {
            const barContainer = document.getElementById('endpointBarChartContainer');
            if (barContainer) {
                barContainer.innerHTML = '<canvas id="endpointBarChart"></canvas>';
                createEndpointBarChart('endpointBarChart', aggregatedKeyStats.endpointUsage);
            }
        }
        
        // Update endpoint table
        displayEndpointTable(aggregatedKeyStats.endpointUsage);
    }
    
    // Update summary cards
    updateAnalyticsSummary(stats);
}

function generateHourlyData(timeline) {
    const hourlyData = {};
    
    if (!timeline || timeline.length === 0) return hourlyData;
    
    // Distribute proof counts across hours based on day of week
    timeline.forEach(day => {
        const date = new Date(day.date);
        const dayOfWeek = date.getDay();
        const proofCount = day.proof_count || 0;
        
        if (proofCount > 0) {
            // Distribute proofs across typical working hours (8-18)
            const peakHours = [9, 10, 11, 14, 15, 16];
            const proofsPerHour = Math.ceil(proofCount / peakHours.length);
            
            peakHours.forEach(hour => {
                const key = `${dayOfWeek}-${hour}`;
                hourlyData[key] = (hourlyData[key] || 0) + proofsPerHour;
            });
        }
    });
    
    return hourlyData;
}

function updateAnalyticsSummary(stats) {
    const elements = {
        'analyticsTotalProofs': stats.total_proofs_submitted?.toLocaleString() || '0',
        'analyticsTotalVerifications': stats.total_verifications?.toLocaleString() || '0',
        'analyticsSuccessRate': `${stats.verification_success_rate || 0}%`,
        'analyticsTotalRequests': aggregatedKeyStats?.totalRequests?.toLocaleString() || '0',
        'analyticsActiveKeys': aggregatedKeyStats?.keyCount?.toLocaleString() || '0'
    };
    
    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }
}

function displayEndpointTable(endpointUsage) {
    const container = document.getElementById('endpointTableBody');
    if (!container) return;
    
    const sorted = Object.entries(endpointUsage)
        .sort((a, b) => b[1] - a[1]);
    
    if (sorted.length === 0) {
        container.innerHTML = '<tr><td colspan="4" class="empty-state">No endpoint data available</td></tr>';
        return;
    }
    
    const maxCount = sorted[0][1];
    
    container.innerHTML = sorted.map(([endpoint, count]) => {
        const parts = endpoint.split(' ');
        const method = parts[0] || 'GET';
        const path = parts[1] || endpoint;
        const percentage = ((count / maxCount) * 100).toFixed(0);
        
        return `
            <tr>
                <td><span class="endpoint-method ${method.toLowerCase()}">${method}</span></td>
                <td><span class="endpoint-path">${escapeHtml(path)}</span></td>
                <td class="endpoint-count">${count.toLocaleString()}</td>
                <td class="endpoint-bar-cell">
                    <div class="endpoint-bar-bg">
                        <div class="endpoint-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================================
// EXPORT FUNCTIONS
// ============================================================

window.exportStatsCSV = function() {
    if (!currentStats && !aggregatedKeyStats) {
        showAlert('No statistics available to export', 'warning');
        return;
    }
    
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    // Header
    csvContent += 'ACTO Statistics Export\n';
    csvContent += `Generated: ${new Date().toISOString()}\n`;
    csvContent += `Period: Last ${currentPeriod} days\n\n`;
    
    // Summary
    csvContent += 'SUMMARY\n';
    csvContent += 'Metric,Value\n';
    if (currentStats) {
        csvContent += `Total Proofs Submitted,${currentStats.total_proofs_submitted || 0}\n`;
        csvContent += `Total Verifications,${currentStats.total_verifications || 0}\n`;
        csvContent += `Success Rate,${currentStats.verification_success_rate || 0}%\n`;
    }
    if (aggregatedKeyStats) {
        csvContent += `Total API Requests,${aggregatedKeyStats.totalRequests || 0}\n`;
        csvContent += `Active API Keys,${aggregatedKeyStats.keyCount || 0}\n`;
    }
    csvContent += '\n';
    
    // Activity Timeline
    if (currentStats?.activity_timeline) {
        csvContent += 'DAILY ACTIVITY\n';
        csvContent += 'Date,Proof Count\n';
        currentStats.activity_timeline.forEach(day => {
            csvContent += `${day.date},${day.proof_count}\n`;
        });
        csvContent += '\n';
    }
    
    // Endpoint Usage
    if (aggregatedKeyStats?.endpointUsage) {
        csvContent += 'ENDPOINT USAGE\n';
        csvContent += 'Endpoint,Request Count\n';
        Object.entries(aggregatedKeyStats.endpointUsage)
            .sort((a, b) => b[1] - a[1])
            .forEach(([endpoint, count]) => {
                csvContent += `"${endpoint}",${count}\n`;
            });
    }
    
    // Download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `acto-stats-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showAlert('Statistics exported to CSV', 'success');
};

window.exportStatsJSON = function() {
    if (!currentStats && !aggregatedKeyStats) {
        showAlert('No statistics available to export', 'warning');
        return;
    }
    
    const exportData = {
        generated: new Date().toISOString(),
        period_days: currentPeriod,
        wallet_address: window.currentUser?.wallet_address,
        summary: {
            total_proofs_submitted: currentStats?.total_proofs_submitted || 0,
            total_verifications: currentStats?.total_verifications || 0,
            verification_success_rate: currentStats?.verification_success_rate || 0,
            total_api_requests: aggregatedKeyStats?.totalRequests || 0,
            active_api_keys: aggregatedKeyStats?.keyCount || 0
        },
        activity_timeline: currentStats?.activity_timeline || [],
        proofs_by_robot: currentStats?.proofs_by_robot || {},
        proofs_by_task: currentStats?.proofs_by_task || {},
        endpoint_usage: aggregatedKeyStats?.endpointUsage || {}
    };
    
    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `acto-stats-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showAlert('Statistics exported to JSON', 'success');
};

// Escape HTML helper
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

