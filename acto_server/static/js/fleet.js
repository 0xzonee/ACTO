// ============================================================
// ACTO Dashboard - Fleet Management Module
// Features: Device Details, Groups, Rename, Health Monitoring
// ============================================================

var API_BASE = window.API_BASE || '';

// ============================================================
// State Management
// ============================================================

const FleetState = {
    devices: [],
    groups: [],
    summary: {},
    selectedDevices: new Set(),
    activeGroupFilter: null,
    searchQuery: '',
    statusFilter: 'all',
    viewMode: 'list', // 'list' or 'grid'
    currentDeviceModal: null,
    // Pagination
    currentPage: 1,
    devicesPerPage: 10,
    // Drag and Drop
    draggedDeviceId: null,
};

const FLEET_DEVICES_PER_PAGE = 10;

// ============================================================
// Load Fleet Data
// ============================================================

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
        
        // Store in state
        FleetState.devices = data.devices || [];
        FleetState.groups = data.groups || [];
        FleetState.summary = data.summary || {};
        
        // Update UI
        updateFleetStats();
        renderGroupsList();
        renderFleetList();
        
    } catch (error) {
        console.error('Failed to load fleet:', error);
        showFleetEmpty('Could not load fleet data. Please try again.');
    }
}

// ============================================================
// Update Fleet Stats
// ============================================================

function updateFleetStats() {
    const stats = FleetState.summary;
    
    const elements = {
        'fleetActiveCount': stats.active_devices || 0,
        'fleetTotalCount': stats.total_devices || 0,
        'fleetTotalProofs': (stats.total_proofs || 0).toLocaleString(),
        'fleetTotalTasks': (stats.total_tasks || 0).toLocaleString(),
        'fleetGroupsCount': stats.total_groups || 0,
    };
    
    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }
}

// ============================================================
// Render Groups List
// ============================================================

function renderGroupsList() {
    const container = document.getElementById('fleetGroupsList');
    if (!container) return;
    
    const groups = FleetState.groups;
    const totalDevices = FleetState.devices.length;
    
    // Build groups HTML with drop zone support
    let html = `
        <div class="fleet-group-card fleet-group-all ${!FleetState.activeGroupFilter ? 'active' : ''}"
             onclick="filterByGroup(null)"
             data-group-id=""
             ondragover="handleGroupDragOver(event)"
             ondragleave="handleGroupDragLeave(event)"
             ondrop="handleGroupDrop(event, null)">
            <div class="fleet-group-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
            </div>
            <div class="fleet-group-info">
                <div class="fleet-group-name">All Devices</div>
                <div class="fleet-group-count">${totalDevices} device${totalDevices !== 1 ? 's' : ''}</div>
            </div>
            <div class="drop-hint">Drop to unassign</div>
        </div>
    `;
    
    for (const group of groups) {
        const deviceCount = group.device_ids?.length || 0;
        const isActive = FleetState.activeGroupFilter === group.id;
        
        html += `
            <div class="fleet-group-card ${isActive ? 'active' : ''}"
                 onclick="filterByGroup('${group.id}')"
                 data-group-id="${group.id}"
                 ondragover="handleGroupDragOver(event)"
                 ondragleave="handleGroupDragLeave(event)"
                 ondrop="handleGroupDrop(event, '${group.id}')">
                <div class="fleet-group-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                </div>
                <div class="fleet-group-info">
                    <div class="fleet-group-name">${escapeHtml(group.name)}</div>
                    <div class="fleet-group-count">${deviceCount} device${deviceCount !== 1 ? 's' : ''}</div>
                </div>
                <div class="fleet-group-actions">
                    <button class="fleet-action-btn" onclick="event.stopPropagation(); editGroup('${group.id}')" title="Edit">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="fleet-action-btn" onclick="event.stopPropagation(); deleteGroup('${group.id}')" title="Delete">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
                <div class="drop-hint">Drop here</div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// ============================================================
// Render Fleet List
// ============================================================

function renderFleetList() {
    const fleetList = document.getElementById('fleetList');
    if (!fleetList) return;
    
    let devices = [...FleetState.devices];
    
    // Apply group filter
    if (FleetState.activeGroupFilter) {
        devices = devices.filter(d => d.group_id === FleetState.activeGroupFilter);
    }
    
    // Apply status filter
    const statusFilter = FleetState.statusFilter || document.getElementById('fleetStatusFilter')?.value || 'all';
    if (statusFilter !== 'all') {
        devices = devices.filter(d => d.status === statusFilter);
    }
    
    // Apply search filter
    if (FleetState.searchQuery) {
        const query = FleetState.searchQuery.toLowerCase();
        devices = devices.filter(d => 
            d.name?.toLowerCase().includes(query) ||
            d.custom_name?.toLowerCase().includes(query) ||
            d.id?.toLowerCase().includes(query)
        );
    }
    
    const totalDevices = devices.length;
    
    if (totalDevices === 0) {
        if (FleetState.searchQuery) {
            showFleetEmpty(`No devices found matching "${FleetState.searchQuery}".`);
        } else if (FleetState.activeGroupFilter) {
            showFleetEmpty('No devices in this group.');
        } else {
            showFleetEmpty('No devices found. Submit proofs from your robots to see them here.');
        }
        updateFleetPagination(0, 0);
        return;
    }
    
    // Pagination calculations
    const totalPages = Math.ceil(totalDevices / FLEET_DEVICES_PER_PAGE);
    
    // Adjust current page if needed
    if (FleetState.currentPage > totalPages) {
        FleetState.currentPage = Math.max(1, totalPages);
    }
    
    // Get current page items
    const startIndex = (FleetState.currentPage - 1) * FLEET_DEVICES_PER_PAGE;
    const pageDevices = devices.slice(startIndex, startIndex + FLEET_DEVICES_PER_PAGE);
    
    const viewClass = FleetState.viewMode === 'grid' ? 'grid-view' : '';
    
    fleetList.className = `fleet-list ${viewClass}`;
    fleetList.innerHTML = pageDevices.map(device => renderDeviceCard(device)).join('');
    
    // Update pagination UI
    updateFleetPagination(totalPages, totalDevices);
}

function renderDeviceCard(device) {
    const isOnline = device.status === 'online';
    const isWarning = device.status === 'warning';
    const lastActivityText = device.last_activity 
        ? formatRelativeTime(device.last_activity)
        : 'Never';
    
    const displayName = device.custom_name || device.name;
    const hasCustomName = !!device.custom_name;
    const isSelected = FleetState.selectedDevices.has(device.id);
    
    // Health indicators HTML
    let healthHtml = '';
    if (device.health) {
        healthHtml = renderHealthIndicators(device.health);
    }
    
    // Group badge
    let groupBadge = '';
    if (device.group_name) {
        groupBadge = `
            <div class="fleet-device-group">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                </svg>
                ${escapeHtml(device.group_name)}
            </div>
        `;
    }
    
    return `
        <div class="fleet-device ${isSelected ? 'selected' : ''}" 
             data-device-id="${device.id}"
             draggable="true"
             ondragstart="handleDeviceDragStart(event, '${device.id}')"
             ondragend="handleDeviceDragEnd(event)"
             onclick="openDeviceModal('${device.id}')">
            <div class="drag-handle" title="Drag to assign to group">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="9" cy="5" r="1"></circle>
                    <circle cx="9" cy="12" r="1"></circle>
                    <circle cx="9" cy="19" r="1"></circle>
                    <circle cx="15" cy="5" r="1"></circle>
                    <circle cx="15" cy="12" r="1"></circle>
                    <circle cx="15" cy="19" r="1"></circle>
                </svg>
            </div>
            <input type="checkbox" class="fleet-device-checkbox" 
                   ${isSelected ? 'checked' : ''}
                   onclick="event.stopPropagation(); toggleDeviceSelection('${device.id}')">
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
                <div class="fleet-device-name">
                    ${escapeHtml(displayName)}
                    ${hasCustomName ? '<span class="custom-name-badge">Custom</span>' : ''}
                </div>
                <div class="fleet-device-id">${escapeHtml(device.id)}</div>
                ${groupBadge}
            </div>
            ${healthHtml}
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
            <div class="fleet-device-status ${device.status}">
                <span class="status-dot"></span>
                ${isOnline ? 'Active' : isWarning ? 'Idle' : 'Inactive'}
            </div>
            <div class="fleet-device-actions">
                <button class="fleet-action-btn" onclick="event.stopPropagation(); openRenameDeviceModal('${device.id}', '${escapeHtml(displayName)}')" title="Rename">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="fleet-action-btn" onclick="event.stopPropagation(); openAssignGroupModal('${device.id}')" title="Assign to Group">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                </button>
            </div>
        </div>
    `;
}

function renderHealthIndicators(health) {
    if (!health) return '';
    
    const metrics = [];
    
    if (health.cpu_percent !== null && health.cpu_percent !== undefined) {
        const level = health.cpu_percent > 80 ? 'critical' : health.cpu_percent > 60 ? 'warning' : 'good';
        metrics.push({ label: 'CPU', value: health.cpu_percent, level });
    }
    
    if (health.memory_percent !== null && health.memory_percent !== undefined) {
        const level = health.memory_percent > 85 ? 'critical' : health.memory_percent > 70 ? 'warning' : 'good';
        metrics.push({ label: 'RAM', value: health.memory_percent, level });
    }
    
    if (health.battery_percent !== null && health.battery_percent !== undefined) {
        const level = health.battery_percent < 20 ? 'critical' : health.battery_percent < 40 ? 'warning' : 'good';
        metrics.push({ label: 'BAT', value: health.battery_percent, level });
    }
    
    if (metrics.length === 0) return '';
    
    return `
        <div class="fleet-device-health">
            ${metrics.map(m => `
                <div class="health-indicator">
                    <div class="health-indicator-value">${Math.round(m.value)}%</div>
                    <div class="health-indicator-bar">
                        <div class="health-indicator-fill ${m.level}" style="width: ${m.value}%"></div>
                    </div>
                    <div class="health-indicator-label">${m.label}</div>
                </div>
            `).join('')}
        </div>
    `;
}

function updateDeviceHealthIndicators(deviceId, health) {
    const deviceEl = document.querySelector(`[data-device-id="${deviceId}"]`);
    if (!deviceEl) return;
    
    const healthContainer = deviceEl.querySelector('.fleet-device-health');
    if (healthContainer) {
        healthContainer.outerHTML = renderHealthIndicators(health);
    }
}

// ============================================================
// Device Details Modal
// ============================================================

async function openDeviceModal(deviceId) {
    FleetState.currentDeviceModal = deviceId;
    
    // Create modal if not exists
    let modal = document.getElementById('deviceModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'deviceModal';
        modal.className = 'device-modal';
        document.body.appendChild(modal);
    }
    
    // Show loading state
    modal.innerHTML = `
        <div class="device-modal-overlay" onclick="closeDeviceModal()"></div>
        <div class="device-modal-content">
            <div class="device-modal-body">
                <div class="fleet-loading">
                    <div class="loading-spinner"></div>
                    <p>Loading device details...</p>
                </div>
            </div>
        </div>
    `;
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    try {
        const response = await fetch(`${API_BASE}/v1/fleet/devices/${deviceId}`, {
            headers: {
                'Authorization': `Bearer ${window.accessToken}`
            }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const device = await response.json();
        renderDeviceModal(device);
        
    } catch (error) {
        console.error('Failed to load device details:', error);
        modal.innerHTML = `
            <div class="device-modal-overlay" onclick="closeDeviceModal()"></div>
            <div class="device-modal-content">
                <div class="device-modal-header">
                    <h3>Error</h3>
                    <button class="modal-close" onclick="closeDeviceModal()">&times;</button>
                </div>
                <div class="device-modal-body">
                    <div class="fleet-empty">
                        <p>Failed to load device details. Please try again.</p>
                    </div>
                </div>
            </div>
        `;
    }
}

function renderDeviceModal(device) {
    const modal = document.getElementById('deviceModal');
    if (!modal) return;
    
    const displayName = device.custom_name || device.name;
    const statusClass = device.status || 'offline';
    const statusText = device.status === 'online' ? 'Active' : 
                       device.status === 'warning' ? 'Idle' : 'Inactive';
    
    modal.innerHTML = `
        <div class="device-modal-overlay" onclick="closeDeviceModal()"></div>
        <div class="device-modal-content">
            <div class="device-modal-header">
                <div class="device-modal-title">
                    <div class="device-modal-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                            <rect x="9" y="9" width="6" height="6"></rect>
                        </svg>
                    </div>
                    <div>
                        <h3>${escapeHtml(displayName)}</h3>
                        <div class="device-modal-id">${escapeHtml(device.id)}</div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div class="fleet-device-status ${statusClass}">
                        <span class="status-dot"></span>
                        ${statusText}
                    </div>
                    <button class="modal-close" onclick="closeDeviceModal()">&times;</button>
                </div>
            </div>
            
            <div class="device-modal-body">
                <!-- Stats Grid -->
                <div class="device-stats-grid">
                    <div class="device-stat-card">
                        <div class="device-stat-value">${device.proof_count}</div>
                        <div class="device-stat-label">Total Proofs</div>
                    </div>
                    <div class="device-stat-card">
                        <div class="device-stat-value">${device.task_count}</div>
                        <div class="device-stat-label">Unique Tasks</div>
                    </div>
                    <div class="device-stat-card">
                        <div class="device-stat-value">${device.first_activity ? formatRelativeTime(device.first_activity) : 'N/A'}</div>
                        <div class="device-stat-label">First Seen</div>
                    </div>
                    <div class="device-stat-card">
                        <div class="device-stat-value">${device.last_activity ? formatRelativeTime(device.last_activity) : 'N/A'}</div>
                        <div class="device-stat-label">Last Active</div>
                    </div>
                </div>
                
                <!-- Health Section -->
                <div class="device-health-section" id="deviceHealthSection">
                    <div class="device-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                        </svg>
                        Health Metrics
                    </div>
                    ${renderDeviceHealthSection(device.health)}
                </div>
                
                <!-- Activity Logs -->
                <div class="device-logs-section">
                    <div class="device-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        Activity Log
                    </div>
                    <div class="device-logs-list">
                        ${renderDeviceLogs(device.recent_logs)}
                    </div>
                </div>
                
                <!-- Task History -->
                <div class="device-tasks-section">
                    <div class="device-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 11 12 14 22 4"></polyline>
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                        </svg>
                        Task History
                    </div>
                    <div class="device-tasks-list">
                        ${device.task_history?.map(t => `<span class="device-task-tag">${escapeHtml(t)}</span>`).join('') || '<p style="color: var(--color-text-tertiary);">No tasks recorded</p>'}
                    </div>
                </div>
            </div>
            
            <div class="device-modal-actions">
                <div class="device-modal-actions-left">
                    <button class="btn btn-secondary" onclick="openRenameDeviceModal('${device.id}', '${escapeHtml(device.display_name || device.name)}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Rename
                    </button>
                    <button class="btn btn-secondary" onclick="openAssignGroupModal('${device.id}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                        </svg>
                        Assign Group
                    </button>
                </div>
                <div class="device-modal-actions-right">
                    <button class="btn btn-primary" onclick="closeDeviceModal()">Close</button>
                </div>
            </div>
        </div>
    `;
}

function renderDeviceHealthSection(health) {
    if (!health || !health.last_updated) {
        return `
            <div class="health-not-available">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                </svg>
                <p>Health metrics not available.<br>Device needs to report health data.</p>
            </div>
        `;
    }
    
    const metrics = [
        { label: 'CPU', value: health.cpu_percent, unit: '%' },
        { label: 'Memory', value: health.memory_percent, unit: '%' },
        { label: 'Battery', value: health.battery_percent, unit: '%', extra: health.battery_charging ? '⚡' : '' },
        { label: 'Disk', value: health.disk_percent, unit: '%' },
    ];
    
    return `
        <div class="health-metrics-grid">
            ${metrics.filter(m => m.value !== null && m.value !== undefined).map(m => {
                const level = m.label === 'Battery' 
                    ? (m.value < 20 ? 'critical' : m.value < 40 ? 'warning' : 'good')
                    : (m.value > 80 ? 'critical' : m.value > 60 ? 'warning' : 'good');
                return `
                    <div class="health-metric-card">
                        <div class="health-metric-header">
                            <span class="health-metric-label">${m.label}</span>
                            <span class="health-metric-value">${Math.round(m.value)}${m.unit} ${m.extra || ''}</span>
                        </div>
                        <div class="health-metric-bar">
                            <div class="health-metric-bar-fill ${level}" style="width: ${m.value}%"></div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
        <p style="font-size: 11px; color: var(--color-text-tertiary); margin-top: 8px;">
            Last updated: ${formatRelativeTime(health.last_updated)}
        </p>
    `;
}

function renderDeviceLogs(logs) {
    if (!logs || logs.length === 0) {
        return '<div class="device-log-entry"><p style="color: var(--color-text-tertiary);">No activity recorded</p></div>';
    }
    
    return logs.map(log => `
        <div class="device-log-entry">
            <div class="log-icon ${log.level}">
                ${getLogIcon(log.level)}
            </div>
            <div class="log-content">
                <div class="log-message">${escapeHtml(log.message)}</div>
                <div class="log-meta">
                    ${log.task_id ? `<span>Task: <code>${escapeHtml(log.task_id)}</code></span>` : ''}
                    ${log.proof_id ? `<span>Proof: <code>${escapeHtml(log.proof_id)}</code></span>` : ''}
                </div>
            </div>
            <div class="log-timestamp">${formatRelativeTime(log.timestamp)}</div>
        </div>
    `).join('');
}

function getLogIcon(level) {
    switch (level) {
        case 'success':
            return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        case 'warning':
            return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
        case 'error':
            return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
        default:
            return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }
}

function renderDeviceHealth(health) {
    const section = document.getElementById('deviceHealthSection');
    if (section) {
        section.innerHTML = `
            <div class="device-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                </svg>
                Health Metrics
            </div>
            ${renderDeviceHealthSection(health)}
        `;
    }
}

function closeDeviceModal() {
    FleetState.currentDeviceModal = null;
    const modal = document.getElementById('deviceModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// ============================================================
// Device Rename Modal
// ============================================================

function openRenameDeviceModal(deviceId, currentName) {
    let modal = document.getElementById('deviceRenameModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'deviceRenameModal';
        modal.className = 'rename-modal device-rename-modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="rename-modal-overlay" onclick="closeRenameDeviceModal()"></div>
        <div class="rename-modal-content">
            <div class="rename-modal-header">
                <h3>Rename Device</h3>
                <button class="modal-close" onclick="closeRenameDeviceModal()">&times;</button>
            </div>
            <div class="rename-modal-body">
                <div class="form-group">
                    <label for="deviceRenameInput">Device Name</label>
                    <input type="text" id="deviceRenameInput" value="${escapeHtml(currentName)}" placeholder="Enter device name..." autocomplete="off">
                </div>
                <input type="hidden" id="deviceRenameId" value="${deviceId}">
            </div>
            <div class="rename-modal-footer">
                <button class="btn btn-secondary" onclick="closeRenameDeviceModal()">Cancel</button>
                <button class="btn btn-primary" id="deviceRenameSubmit" onclick="submitDeviceRename()">
                    Save Changes
                </button>
            </div>
        </div>
    `;
    
    modal.classList.add('show');
    
    setTimeout(() => {
        document.getElementById('deviceRenameInput').focus();
        document.getElementById('deviceRenameInput').select();
    }, 100);
}

function closeRenameDeviceModal() {
    const modal = document.getElementById('deviceRenameModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

async function submitDeviceRename() {
    const deviceId = document.getElementById('deviceRenameId').value;
    const newName = document.getElementById('deviceRenameInput').value.trim();
    const submitBtn = document.getElementById('deviceRenameSubmit');
    
    if (!newName) {
        showAlert('Please enter a name', 'error');
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Saving... <span class="loading"></span>';
    
    try {
        const response = await fetch(`${API_BASE}/v1/fleet/devices/${deviceId}/name`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${window.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: newName })
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        
        if (result.success) {
            closeRenameDeviceModal();
            showAlert('Device renamed successfully', 'success');
            
            // Update local state
            const device = FleetState.devices.find(d => d.id === deviceId);
            if (device) {
                device.custom_name = newName;
                device.name = newName;
            }
            
            renderFleetList();
            
            // Refresh modal if open
            if (FleetState.currentDeviceModal === deviceId) {
                openDeviceModal(deviceId);
            }
        }
    } catch (error) {
        console.error('Failed to rename device:', error);
        showAlert('Failed to rename device', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Save Changes';
    }
}

// ============================================================
// Group Management
// ============================================================

function openCreateGroupModal() {
    let modal = document.getElementById('groupModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'groupModal';
        modal.className = 'group-modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="group-modal-overlay" onclick="closeGroupModal()"></div>
        <div class="group-modal-content">
            <div class="group-modal-header">
                <h3>Create Device Group</h3>
                <button class="modal-close" onclick="closeGroupModal()">&times;</button>
            </div>
            <div class="group-modal-body">
                <div class="form-group">
                    <label for="groupNameInput">Group Name</label>
                    <input type="text" id="groupNameInput" placeholder="e.g., Warehouse A, Production Line" autocomplete="off">
                </div>
                <div class="form-group">
                    <label for="groupDescInput">Description (optional)</label>
                    <input type="text" id="groupDescInput" placeholder="Brief description..." autocomplete="off">
                </div>
            </div>
            <div class="group-modal-footer">
                <button class="btn btn-secondary" onclick="closeGroupModal()">Cancel</button>
                <button class="btn btn-primary" id="groupCreateSubmit" onclick="submitCreateGroup()">
                    Create Group
                </button>
            </div>
        </div>
    `;
    
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => document.getElementById('groupNameInput').focus(), 100);
}

function closeGroupModal() {
    const modal = document.getElementById('groupModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

async function submitCreateGroup() {
    const name = document.getElementById('groupNameInput').value.trim();
    const description = document.getElementById('groupDescInput').value.trim();
    const submitBtn = document.getElementById('groupCreateSubmit');
    
    if (!name) {
        showAlert('Please enter a group name', 'error');
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Creating... <span class="loading"></span>';
    
    try {
        const response = await fetch(`${API_BASE}/v1/fleet/groups`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${window.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, description: description || null })
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        
        if (result.success) {
            closeGroupModal();
            showAlert('Group created successfully', 'success');
            FleetState.groups.push(result.group);
            FleetState.summary.total_groups = (FleetState.summary.total_groups || 0) + 1;
            updateFleetStats();
            renderGroupsList();
        }
    } catch (error) {
        console.error('Failed to create group:', error);
        showAlert('Failed to create group', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Create Group';
    }
}

async function editGroup(groupId) {
    const group = FleetState.groups.find(g => g.id === groupId);
    if (!group) return;
    
    let modal = document.getElementById('groupModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'groupModal';
        modal.className = 'group-modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="group-modal-overlay" onclick="closeGroupModal()"></div>
        <div class="group-modal-content">
            <div class="group-modal-header">
                <h3>Edit Group</h3>
                <button class="modal-close" onclick="closeGroupModal()">&times;</button>
            </div>
            <div class="group-modal-body">
                <div class="form-group">
                    <label for="groupNameInput">Group Name</label>
                    <input type="text" id="groupNameInput" value="${escapeHtml(group.name)}" autocomplete="off">
                </div>
                <div class="form-group">
                    <label for="groupDescInput">Description (optional)</label>
                    <input type="text" id="groupDescInput" value="${escapeHtml(group.description || '')}" autocomplete="off">
                </div>
                <input type="hidden" id="editGroupId" value="${groupId}">
            </div>
            <div class="group-modal-footer">
                <button class="btn btn-secondary" onclick="closeGroupModal()">Cancel</button>
                <button class="btn btn-primary" id="groupEditSubmit" onclick="submitEditGroup()">
                    Save Changes
                </button>
            </div>
        </div>
    `;
    
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

async function submitEditGroup() {
    const groupId = document.getElementById('editGroupId').value;
    const name = document.getElementById('groupNameInput').value.trim();
    const description = document.getElementById('groupDescInput').value.trim();
    const submitBtn = document.getElementById('groupEditSubmit');
    
    if (!name) {
        showAlert('Please enter a group name', 'error');
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Saving... <span class="loading"></span>';
    
    try {
        const response = await fetch(`${API_BASE}/v1/fleet/groups/${groupId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${window.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, description: description || null })
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        
        if (result.success) {
            closeGroupModal();
            showAlert('Group updated successfully', 'success');
            
            const idx = FleetState.groups.findIndex(g => g.id === groupId);
            if (idx >= 0) {
                FleetState.groups[idx] = result.group;
            }
            renderGroupsList();
        }
    } catch (error) {
        console.error('Failed to update group:', error);
        showAlert('Failed to update group', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Save Changes';
    }
}

async function deleteGroup(groupId) {
    if (!confirm('Are you sure you want to delete this group? Devices will be unassigned but not deleted.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/v1/fleet/groups/${groupId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${window.accessToken}`
            }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('Group deleted successfully', 'success');
            FleetState.groups = FleetState.groups.filter(g => g.id !== groupId);
            FleetState.summary.total_groups = Math.max(0, (FleetState.summary.total_groups || 1) - 1);
            
            // Update devices that were in this group
            for (const device of FleetState.devices) {
                if (device.group_id === groupId) {
                    device.group_id = null;
                    device.group_name = null;
                }
            }
            
            if (FleetState.activeGroupFilter === groupId) {
                FleetState.activeGroupFilter = null;
            }
            
            updateFleetStats();
            renderGroupsList();
            renderFleetList();
        }
    } catch (error) {
        console.error('Failed to delete group:', error);
        showAlert('Failed to delete group', 'error');
    }
}

function openAssignGroupModal(deviceId) {
    const device = FleetState.devices.find(d => d.id === deviceId);
    if (!device) return;
    
    let modal = document.getElementById('groupModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'groupModal';
        modal.className = 'group-modal';
        document.body.appendChild(modal);
    }
    
    const groupOptions = FleetState.groups.map(g => `
        <option value="${g.id}" ${device.group_id === g.id ? 'selected' : ''}>${escapeHtml(g.name)}</option>
    `).join('');
    
    modal.innerHTML = `
        <div class="group-modal-overlay" onclick="closeGroupModal()"></div>
        <div class="group-modal-content">
            <div class="group-modal-header">
                <h3>Assign to Group</h3>
                <button class="modal-close" onclick="closeGroupModal()">&times;</button>
            </div>
            <div class="group-modal-body">
                <p style="margin-bottom: 16px; color: var(--color-text-secondary);">
                    Assign <strong>${escapeHtml(device.name)}</strong> to a group:
                </p>
                <div class="form-group">
                    <label for="assignGroupSelect">Select Group</label>
                    <select id="assignGroupSelect" class="fleet-filter-select" style="width: 100%;">
                        <option value="">No Group</option>
                        ${groupOptions}
                    </select>
                </div>
                <input type="hidden" id="assignDeviceId" value="${deviceId}">
            </div>
            <div class="group-modal-footer">
                <button class="btn btn-secondary" onclick="closeGroupModal()">Cancel</button>
                <button class="btn btn-primary" id="assignGroupSubmit" onclick="submitAssignGroup()">
                    Assign
                </button>
            </div>
        </div>
    `;
    
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

async function submitAssignGroup() {
    const deviceId = document.getElementById('assignDeviceId').value;
    const groupId = document.getElementById('assignGroupSelect').value;
    const submitBtn = document.getElementById('assignGroupSubmit');
    const device = FleetState.devices.find(d => d.id === deviceId);
    
    if (!device) return;
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Assigning... <span class="loading"></span>';
    
    try {
        // If removing from current group
        if (device.group_id && device.group_id !== groupId) {
            await fetch(`${API_BASE}/v1/fleet/groups/${device.group_id}/unassign`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${window.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ device_ids: [deviceId] })
            });
        }
        
        // If assigning to new group
        if (groupId) {
            const response = await fetch(`${API_BASE}/v1/fleet/groups/${groupId}/assign`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${window.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ device_ids: [deviceId] })
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const group = FleetState.groups.find(g => g.id === groupId);
            device.group_id = groupId;
            device.group_name = group?.name || null;
        } else {
            device.group_id = null;
            device.group_name = null;
        }
        
        closeGroupModal();
        showAlert('Device group updated', 'success');
        renderGroupsList();
        renderFleetList();
        
        // Refresh device modal if open
        if (FleetState.currentDeviceModal === deviceId) {
            openDeviceModal(deviceId);
        }
        
    } catch (error) {
        console.error('Failed to assign group:', error);
        showAlert('Failed to assign group', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Assign';
    }
}

// ============================================================
// Filtering and Search
// ============================================================

function filterByGroup(groupId) {
    FleetState.activeGroupFilter = groupId;
    FleetState.currentPage = 1; // Reset to first page
    renderGroupsList();
    renderFleetList();
}

function handleFleetSearch(query) {
    FleetState.searchQuery = query;
    FleetState.currentPage = 1; // Reset to first page on search
    renderFleetList();
}

// Update status filter from dropdown
function handleFleetStatusFilter() {
    const statusFilter = document.getElementById('fleetStatusFilter')?.value || 'all';
    FleetState.statusFilter = statusFilter;
    FleetState.currentPage = 1; // Reset to first page
    renderFleetList();
}

// ============================================================
// Fleet Pagination
// ============================================================

function updateFleetPagination(totalPages, totalCount) {
    let paginationEl = document.getElementById('fleetPagination');
    
    // Create pagination element if it doesn't exist
    if (!paginationEl) {
        const fleetListCard = document.getElementById('fleetList')?.closest('.card');
        if (fleetListCard) {
            paginationEl = document.createElement('div');
            paginationEl.id = 'fleetPagination';
            paginationEl.className = 'pagination fleet-pagination';
            fleetListCard.appendChild(paginationEl);
        }
    }
    
    if (!paginationEl) return;
    
    if (totalCount <= FLEET_DEVICES_PER_PAGE) {
        paginationEl.classList.add('hidden');
        return;
    }
    
    paginationEl.classList.remove('hidden');
    
    const startItem = ((FleetState.currentPage - 1) * FLEET_DEVICES_PER_PAGE) + 1;
    const endItem = Math.min(FleetState.currentPage * FLEET_DEVICES_PER_PAGE, totalCount);
    
    paginationEl.innerHTML = `
        <button class="btn btn-pagination" onclick="changeFleetPage(-1)" ${FleetState.currentPage <= 1 ? 'disabled' : ''}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Previous
        </button>
        <span class="pagination-info">${startItem}-${endItem} of ${totalCount}</span>
        <button class="btn btn-pagination" onclick="changeFleetPage(1)" ${FleetState.currentPage >= totalPages ? 'disabled' : ''}>
            Next
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
        </button>
    `;
}

function changeFleetPage(delta) {
    FleetState.currentPage += delta;
    renderFleetList();
    
    // Scroll to top of fleet list
    const fleetList = document.getElementById('fleetList');
    if (fleetList) {
        fleetList.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function setFleetViewMode(mode) {
    FleetState.viewMode = mode;
    
    // Update toggle buttons
    document.querySelectorAll('.fleet-view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === mode);
    });
    
    renderFleetList();
}

// ============================================================
// Device Selection (for bulk operations)
// ============================================================

function toggleDeviceSelection(deviceId) {
    if (FleetState.selectedDevices.has(deviceId)) {
        FleetState.selectedDevices.delete(deviceId);
    } else {
        FleetState.selectedDevices.add(deviceId);
    }
    renderFleetList();
    updateBulkActionsBar();
}

function selectAllDevices(checked) {
    if (checked) {
        FleetState.devices.forEach(d => FleetState.selectedDevices.add(d.id));
    } else {
        FleetState.selectedDevices.clear();
    }
    renderFleetList();
    updateBulkActionsBar();
}

function updateBulkActionsBar() {
    const bar = document.getElementById('fleetBulkActions');
    if (!bar) return;
    
    const count = FleetState.selectedDevices.size;
    if (count > 0) {
        bar.classList.remove('hidden');
        bar.querySelector('.bulk-count').textContent = `${count} device${count !== 1 ? 's' : ''} selected`;
    } else {
        bar.classList.add('hidden');
    }
}

// ============================================================
// Utility Functions
// ============================================================

function formatRelativeTime(dateStr) {
    if (!dateStr) return 'Never';
    
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

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

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
    
    // Reset stats if showing empty
    if (!FleetState.searchQuery && !FleetState.activeGroupFilter) {
        const elements = ['fleetActiveCount', 'fleetTotalCount', 'fleetTotalProofs', 'fleetTotalTasks'];
        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '0';
        });
    }
}

// ============================================================
// Refresh and Export
// ============================================================

window.refreshFleet = function() {
    FleetState.currentPage = 1; // Reset pagination on refresh
    loadFleet();
};

// ============================================================
// Drag and Drop Functions
// ============================================================

/**
 * Handle drag start on a device card
 */
function handleDeviceDragStart(event, deviceId) {
    FleetState.draggedDeviceId = deviceId;
    
    // Set drag data
    event.dataTransfer.setData('text/plain', deviceId);
    event.dataTransfer.effectAllowed = 'move';
    
    // Add visual feedback to dragged element
    const deviceEl = event.target.closest('.fleet-device');
    if (deviceEl) {
        deviceEl.classList.add('dragging');
    }
    
    // Highlight all group cards as drop targets
    document.querySelectorAll('.fleet-group-card').forEach(card => {
        card.classList.add('drop-target');
    });
    
    // Show drag overlay hint
    showDragOverlay(true);
}

/**
 * Handle drag end on a device card
 */
function handleDeviceDragEnd(event) {
    FleetState.draggedDeviceId = null;
    
    // Remove dragging class
    const deviceEl = event.target.closest('.fleet-device');
    if (deviceEl) {
        deviceEl.classList.remove('dragging');
    }
    
    // Remove drop target highlighting from all groups
    document.querySelectorAll('.fleet-group-card').forEach(card => {
        card.classList.remove('drop-target', 'drag-over');
    });
    
    // Hide drag overlay
    showDragOverlay(false);
}

/**
 * Handle drag over on a group card
 */
function handleGroupDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    
    const groupCard = event.target.closest('.fleet-group-card');
    if (groupCard) {
        groupCard.classList.add('drag-over');
    }
}

/**
 * Handle drag leave on a group card
 */
function handleGroupDragLeave(event) {
    const groupCard = event.target.closest('.fleet-group-card');
    if (groupCard && !groupCard.contains(event.relatedTarget)) {
        groupCard.classList.remove('drag-over');
    }
}

/**
 * Handle drop on a group card
 */
async function handleGroupDrop(event, groupId) {
    event.preventDefault();
    
    const deviceId = event.dataTransfer.getData('text/plain') || FleetState.draggedDeviceId;
    if (!deviceId) return;
    
    const device = FleetState.devices.find(d => d.id === deviceId);
    if (!device) return;
    
    // Don't do anything if device is already in this group
    if (device.group_id === groupId) {
        // Clean up visual states
        document.querySelectorAll('.fleet-group-card').forEach(card => {
            card.classList.remove('drop-target', 'drag-over');
        });
        showDragOverlay(false);
        return;
    }
    
    // Show loading state on the group card
    const groupCard = event.target.closest('.fleet-group-card');
    if (groupCard) {
        groupCard.classList.add('loading');
    }
    
    try {
        // If removing from current group
        if (device.group_id) {
            await fetch(`${API_BASE}/v1/fleet/groups/${device.group_id}/unassign`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${window.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ device_ids: [deviceId] })
            });
        }
        
        // If assigning to new group (groupId is not null/empty)
        if (groupId) {
            const response = await fetch(`${API_BASE}/v1/fleet/groups/${groupId}/assign`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${window.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ device_ids: [deviceId] })
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const group = FleetState.groups.find(g => g.id === groupId);
            device.group_id = groupId;
            device.group_name = group?.name || null;
            
            // Update group device count
            if (group && !group.device_ids) {
                group.device_ids = [];
            }
            if (group && !group.device_ids.includes(deviceId)) {
                group.device_ids.push(deviceId);
            }
        } else {
            // Unassigning from all groups
            device.group_id = null;
            device.group_name = null;
        }
        
        // Update old group device count
        if (device.group_id !== groupId) {
            const oldGroup = FleetState.groups.find(g => g.id === device.group_id);
            if (oldGroup && oldGroup.device_ids) {
                oldGroup.device_ids = oldGroup.device_ids.filter(id => id !== deviceId);
            }
        }
        
        showAlert(groupId ? 'Device assigned to group' : 'Device unassigned from group', 'success');
        renderGroupsList();
        renderFleetList();
        
    } catch (error) {
        console.error('Failed to assign device to group:', error);
        showAlert('Failed to assign device to group', 'error');
    } finally {
        // Clean up visual states
        document.querySelectorAll('.fleet-group-card').forEach(card => {
            card.classList.remove('drop-target', 'drag-over', 'loading');
        });
        showDragOverlay(false);
    }
}

/**
 * Show/hide the drag overlay hint
 */
function showDragOverlay(show) {
    let overlay = document.getElementById('dragOverlay');
    
    if (show) {
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'dragOverlay';
            overlay.className = 'drag-overlay';
            overlay.innerHTML = `
                <div class="drag-overlay-content">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <p>Drop on a group to assign</p>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        overlay.classList.add('visible');
    } else if (overlay) {
        overlay.classList.remove('visible');
    }
}

// Export drag and drop functions to window
window.handleDeviceDragStart = handleDeviceDragStart;
window.handleDeviceDragEnd = handleDeviceDragEnd;
window.handleGroupDragOver = handleGroupDragOver;
window.handleGroupDragLeave = handleGroupDragLeave;
window.handleGroupDrop = handleGroupDrop;

window.loadFleet = loadFleet;
window.openDeviceModal = openDeviceModal;
window.closeDeviceModal = closeDeviceModal;
window.openRenameDeviceModal = openRenameDeviceModal;
window.closeRenameDeviceModal = closeRenameDeviceModal;
window.submitDeviceRename = submitDeviceRename;
window.openCreateGroupModal = openCreateGroupModal;
window.closeGroupModal = closeGroupModal;
window.submitCreateGroup = submitCreateGroup;
window.editGroup = editGroup;
window.submitEditGroup = submitEditGroup;
window.deleteGroup = deleteGroup;
window.openAssignGroupModal = openAssignGroupModal;
window.submitAssignGroup = submitAssignGroup;
window.filterByGroup = filterByGroup;
window.handleFleetSearch = handleFleetSearch;
window.handleFleetStatusFilter = handleFleetStatusFilter;
window.setFleetViewMode = setFleetViewMode;
window.toggleDeviceSelection = toggleDeviceSelection;
window.selectAllDevices = selectAllDevices;
window.changeFleetPage = changeFleetPage;
