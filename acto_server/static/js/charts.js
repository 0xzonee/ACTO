// ============================================================
// ACTO Dashboard - Charts Module
// Interactive charts using Chart.js for analytics
// ============================================================

// Global chart instances
let activityLineChart = null;
let heatmapChart = null;
let endpointPieChart = null;
let endpointBarChart = null;

// Chart color palette
const CHART_COLORS = {
    primary: '#3b82f6',
    primaryLight: '#60a5fa',
    primaryDark: '#2563eb',
    secondary: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    gray: '#6b7280',
    grayLight: '#9ca3af',
    gradient: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#84cc16']
};

// ============================================================
// ACTIVITY LINE CHART
// ============================================================

window.createActivityLineChart = function(canvasId, timeline, periodDays = 30) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    
    // Destroy existing chart
    if (activityLineChart) {
        activityLineChart.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    
    // Prepare data
    const labels = timeline.map(t => {
        const date = new Date(t.date);
        return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    });
    
    const data = timeline.map(t => t.proof_count);
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.01)');
    
    activityLineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Proofs',
                data: data,
                borderColor: CHART_COLORS.primary,
                backgroundColor: gradient,
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 6,
                pointBackgroundColor: CHART_COLORS.primary,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        title: function(context) {
                            const idx = context[0].dataIndex;
                            return timeline[idx]?.date || '';
                        },
                        label: function(context) {
                            return `${context.raw} proofs`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxTicksLimit: 8,
                        color: '#9ca3af',
                        font: { size: 11 }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(156, 163, 175, 0.1)'
                    },
                    ticks: {
                        precision: 0,
                        color: '#9ca3af',
                        font: { size: 11 }
                    }
                }
            }
        }
    });
    
    return activityLineChart;
};

// ============================================================
// REQUEST HEATMAP
// ============================================================

window.createHeatmapChart = function(canvasId, hourlyData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    
    if (heatmapChart) {
        heatmapChart.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    
    // Days of week (0 = Sunday)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hours = Array.from({length: 24}, (_, i) => i);
    
    // Generate heatmap data (if no data provided, use sample structure)
    const heatmapData = [];
    let maxValue = 0;
    
    if (hourlyData && Object.keys(hourlyData).length > 0) {
        for (let day = 0; day < 7; day++) {
            for (let hour = 0; hour < 24; hour++) {
                const key = `${day}-${hour}`;
                const value = hourlyData[key] || 0;
                maxValue = Math.max(maxValue, value);
                heatmapData.push({
                    x: hour,
                    y: day,
                    v: value
                });
            }
        }
    } else {
        // Default empty heatmap
        for (let day = 0; day < 7; day++) {
            for (let hour = 0; hour < 24; hour++) {
                heatmapData.push({ x: hour, y: day, v: 0 });
            }
        }
    }
    
    heatmapChart = new Chart(ctx, {
        type: 'matrix',
        data: {
            datasets: [{
                label: 'Requests',
                data: heatmapData,
                backgroundColor: function(context) {
                    const value = context.dataset.data[context.dataIndex]?.v || 0;
                    if (maxValue === 0) return 'rgba(59, 130, 246, 0.1)';
                    const alpha = Math.min(0.1 + (value / maxValue) * 0.8, 0.9);
                    return `rgba(59, 130, 246, ${alpha})`;
                },
                borderColor: 'rgba(255, 255, 255, 0.5)',
                borderWidth: 1,
                width: ({ chart }) => (chart.chartArea || {}).width / 24 - 2,
                height: ({ chart }) => (chart.chartArea || {}).height / 7 - 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: () => '',
                        label: function(context) {
                            const d = context.raw;
                            return `${days[d.y]} ${d.x}:00 - ${d.v} requests`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'top',
                    min: 0,
                    max: 23,
                    ticks: {
                        stepSize: 4,
                        callback: value => `${value}:00`,
                        color: '#9ca3af',
                        font: { size: 10 }
                    },
                    grid: { display: false }
                },
                y: {
                    type: 'linear',
                    min: 0,
                    max: 6,
                    ticks: {
                        stepSize: 1,
                        callback: value => days[value] || '',
                        color: '#9ca3af',
                        font: { size: 10 }
                    },
                    grid: { display: false }
                }
            }
        }
    });
    
    return heatmapChart;
};

// ============================================================
// ENDPOINT PIE/DOUGHNUT CHART
// ============================================================

window.createEndpointPieChart = function(canvasId, endpointData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    
    if (endpointPieChart) {
        endpointPieChart.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    
    // Sort and take top 8 endpoints
    const sorted = Object.entries(endpointData || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
    
    if (sorted.length === 0) {
        canvas.parentElement.innerHTML = '<div class="empty-state"><p>No endpoint data available</p></div>';
        return null;
    }
    
    const labels = sorted.map(([endpoint]) => {
        // Shorten endpoint names
        return endpoint.replace('POST ', '').replace('GET ', '').replace('DELETE ', '').replace('PATCH ', '');
    });
    const data = sorted.map(([, count]) => count);
    
    endpointPieChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: CHART_COLORS.gradient.slice(0, sorted.length),
                borderColor: '#1a1a1a',
                borderWidth: 2,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#9ca3af',
                        font: { size: 11 },
                        padding: 12,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.raw / total) * 100).toFixed(1);
                            return ` ${context.raw} requests (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    
    return endpointPieChart;
};

// ============================================================
// ENDPOINT BAR CHART
// ============================================================

window.createEndpointBarChart = function(canvasId, endpointData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    
    if (endpointBarChart) {
        endpointBarChart.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    
    // Sort and take top 10 endpoints
    const sorted = Object.entries(endpointData || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    if (sorted.length === 0) {
        canvas.parentElement.innerHTML = '<div class="empty-state"><p>No endpoint data available</p></div>';
        return null;
    }
    
    const labels = sorted.map(([endpoint]) => {
        // Extract method and path
        const parts = endpoint.split(' ');
        if (parts.length >= 2) {
            return parts[1].length > 25 ? parts[1].substring(0, 25) + '...' : parts[1];
        }
        return endpoint.length > 30 ? endpoint.substring(0, 30) + '...' : endpoint;
    });
    const data = sorted.map(([, count]) => count);
    
    // Color based on HTTP method
    const colors = sorted.map(([endpoint]) => {
        if (endpoint.startsWith('GET')) return '#10b981';
        if (endpoint.startsWith('POST')) return '#3b82f6';
        if (endpoint.startsWith('DELETE')) return '#ef4444';
        if (endpoint.startsWith('PATCH')) return '#f59e0b';
        if (endpoint.startsWith('PUT')) return '#8b5cf6';
        return '#6b7280';
    });
    
    endpointBarChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Requests',
                data: data,
                backgroundColor: colors,
                borderRadius: 4,
                borderSkipped: false,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        title: function(context) {
                            return sorted[context[0].dataIndex][0];
                        },
                        label: function(context) {
                            return `${context.raw} requests`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(156, 163, 175, 0.1)'
                    },
                    ticks: {
                        precision: 0,
                        color: '#9ca3af',
                        font: { size: 11 }
                    }
                },
                y: {
                    grid: { display: false },
                    ticks: {
                        color: '#9ca3af',
                        font: { size: 11 }
                    }
                }
            }
        }
    });
    
    return endpointBarChart;
};

// ============================================================
// DESTROY ALL CHARTS
// ============================================================

window.destroyAllCharts = function() {
    if (activityLineChart) { activityLineChart.destroy(); activityLineChart = null; }
    if (heatmapChart) { heatmapChart.destroy(); heatmapChart = null; }
    if (endpointPieChart) { endpointPieChart.destroy(); endpointPieChart = null; }
    if (endpointBarChart) { endpointBarChart.destroy(); endpointBarChart = null; }
};


