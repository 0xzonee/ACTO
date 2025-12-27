// ============================================================
// ACTO Dashboard - Keys Module
// API Key management, filtering, pagination, and bulk actions
// ============================================================

var API_BASE = window.API_BASE || '';

// ============================================================
// State Management
// ============================================================

const KeysState = {
    keys: [],
    groups: [],
    selectedKeys: new Set(),
    activeGroupFilter: null,
    searchQuery: '',
    statusFilter: 'all',
    sortBy: 'created_desc',
    // Pagination
    currentPage: 1,
    keysPerPage: 10,
    // Drag and Drop
    draggedKeyId: null,
    dropTargetKeyId: null,
    dropPosition: null, // 'before' or 'after'
};

// Pagination and filtering state (legacy compatibility)
let keysCurrentPage = 1;
const KEYS_PER_PAGE = 10;
let selectedKeys = new Set();

// ============================================================
// LOAD AND DISPLAY KEYS
// ============================================================

async function loadKeys() {
    if (!window.accessToken) return;
    
    const keysListEl = document.getElementById('keysList');
    if (!keysListEl) return;
    
    keysListEl.innerHTML = '<div class="empty-state"><p>Loading keys...</p></div>';
    
    try {
        // Load keys and groups in parallel
        const [keysResult, groupsResult] = await Promise.all([
            apiRequest('/v1/keys?include_inactive=true'),
            apiRequest('/v1/keys/groups'),
        ]);
        
        if (!keysResult) {
            keysListEl.innerHTML = '<div class="empty-state"><p>Failed to load keys.</p></div>';
            return;
        }
        
        // Update state
        window.keysList = keysResult.keys || [];
        KeysState.keys = keysResult.keys || [];
        KeysState.groups = groupsResult?.groups || [];
        
        // Reset state
        keysCurrentPage = 1;
        KeysState.currentPage = 1;
        selectedKeys.clear();
        KeysState.selectedKeys.clear();
        updateBulkActionsBar();
        
        // Update UI
        updateKeysStats();
        renderKeyGroupsList();
        filterAndRenderKeys();
        
        // Also update stats tab if it's visible
        if (document.getElementById('tab-stats')?.classList.contains('active')) {
            loadStatsKeys();
        }
    } catch (error) {
        console.error('Failed to load keys:', error);
        keysListEl.innerHTML = '<div class="empty-state"><p>Failed to load keys.</p></div>';
    }
}
window.loadKeys = loadKeys;

// ============================================================
// Update Keys Stats
// ============================================================

function updateKeysStats() {
    const keys = KeysState.keys;
    const groups = KeysState.groups;
    
    const activeKeys = keys.filter(k => k.is_active).length;
    const totalKeys = keys.length;
    const totalGroups = groups.length;
    
    const elements = {
        'keysActiveCount': activeKeys,
        'keysTotalCount': totalKeys,
        'keysGroupsCount': totalGroups,
    };
    
    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }
}

// ============================================================
// Render Key Groups List
// ============================================================

function renderKeyGroupsList() {
    const container = document.getElementById('keyGroupsList');
    if (!container) return;
    
    const groups = KeysState.groups;
    const totalKeys = KeysState.keys.length;
    
    // Build groups HTML with drop zone support
    let html = `
        <div class="key-group-card key-group-all ${!KeysState.activeGroupFilter ? 'active' : ''}"
             onclick="filterKeysByGroup(null)"
             data-group-id=""
             ondragover="handleKeyGroupDragOver(event)"
             ondragleave="handleKeyGroupDragLeave(event)"
             ondrop="handleKeyGroupDrop(event, null)">
            <div class="key-group-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
            </div>
            <div class="key-group-info">
                <div class="key-group-name">All Keys</div>
                <div class="key-group-count">${totalKeys} key${totalKeys !== 1 ? 's' : ''}</div>
            </div>
            <div class="drop-hint">Drop to unassign</div>
        </div>
    `;
    
    for (const group of groups) {
        // Count keys by checking actual key assignments
        const keyCount = KeysState.keys.filter(k => k.group_id === group.id).length;
        const isActive = KeysState.activeGroupFilter === group.id;
        
        html += `
            <div class="key-group-card ${isActive ? 'active' : ''}"
                 onclick="filterKeysByGroup('${group.id}')"
                 data-group-id="${group.id}"
                 ondragover="handleKeyGroupDragOver(event)"
                 ondragleave="handleKeyGroupDragLeave(event)"
                 ondrop="handleKeyGroupDrop(event, '${group.id}')">
                <div class="key-group-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
                    </svg>
                </div>
                <div class="key-group-info">
                    <div class="key-group-name">${escapeHtml(group.name)}</div>
                    <div class="key-group-count">${keyCount} key${keyCount !== 1 ? 's' : ''}</div>
                </div>
                <div class="key-group-actions">
                    <button class="key-action-btn" onclick="event.stopPropagation(); editKeyGroup('${group.id}')" title="Edit">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="key-action-btn" onclick="event.stopPropagation(); deleteKeyGroup('${group.id}')" title="Delete">
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
// FILTER, SORT AND RENDER
// ============================================================

window.filterAndRenderKeys = function() {
    const searchTerm = (document.getElementById('keysSearch')?.value || '').toLowerCase().trim();
    const statusFilter = document.getElementById('keysFilterStatus')?.value || 'all';
    const sortBy = document.getElementById('keysSort')?.value || 'created_desc';
    
    // Store in state
    KeysState.searchQuery = searchTerm;
    KeysState.statusFilter = statusFilter;
    KeysState.sortBy = sortBy;
    
    // Filter keys
    let filteredKeys = (window.keysList || []).filter(key => {
        const matchesSearch = !searchTerm || 
            key.name.toLowerCase().includes(searchTerm) ||
            key.key_id.toLowerCase().includes(searchTerm);
        
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && key.is_active) ||
            (statusFilter === 'inactive' && !key.is_active);
        
        // Apply group filter
        const matchesGroup = !KeysState.activeGroupFilter ||
            key.group_id === KeysState.activeGroupFilter;
        
        return matchesSearch && matchesStatus && matchesGroup;
    });
    
    // Sort keys - first by sort_order (manual), then by selected sort
    filteredKeys.sort((a, b) => {
        // First sort by manual order if using manual sorting
        const orderDiff = (a.sort_order || 0) - (b.sort_order || 0);
        if (orderDiff !== 0 && sortBy === 'manual') return orderDiff;
        
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
            case 'manual':
                return orderDiff;
            default:
                return 0;
        }
    });
    
    // Calculate pagination
    const totalKeys = filteredKeys.length;
    const totalPages = Math.ceil(totalKeys / KEYS_PER_PAGE);
    
    if (keysCurrentPage > totalPages) {
        keysCurrentPage = Math.max(1, totalPages);
    }
    KeysState.currentPage = keysCurrentPage;
    
    // Get current page items
    const startIndex = (keysCurrentPage - 1) * KEYS_PER_PAGE;
    const pageKeys = filteredKeys.slice(startIndex, startIndex + KEYS_PER_PAGE);
    
    renderKeysList(pageKeys, totalKeys);
    updatePagination(totalPages, totalKeys);
};

// Escape string for use in HTML attributes
function escapeAttr(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
}

// Render the keys list
function renderKeysList(keys, totalCount) {
    const keysListEl = document.getElementById('keysList');
    if (!keysListEl) return;
    
    if (totalCount === 0 && (window.keysList || []).length === 0) {
        keysListEl.innerHTML = '<div class="empty-state"><p>No API keys found. Create your first key above!</p></div>';
        return;
    }
    
    if (keys.length === 0) {
        if (KeysState.activeGroupFilter) {
            keysListEl.innerHTML = '<div class="empty-state"><p>No keys in this group.</p></div>';
        } else {
            keysListEl.innerHTML = '<div class="empty-state"><p>No keys match your search criteria.</p></div>';
        }
        return;
    }
    
    keysListEl.innerHTML = keys.map(key => {
        // Group badge
        let groupBadge = '';
        if (key.group_name) {
            groupBadge = `
                <span class="key-group-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
                    </svg>
                    ${escapeHtml(key.group_name)}
                </span>
            `;
        }
        
        return `
        <div class="key-item ${key.is_active ? '' : 'key-disabled'} ${selectedKeys.has(key.key_id) ? 'selected' : ''}" 
             data-key-id="${escapeAttr(key.key_id)}" 
             data-key-name="${escapeAttr(key.name)}"
             data-sort-order="${key.sort_order || 0}"
             draggable="true"
             ondragstart="handleKeyDragStart(event, '${escapeAttr(key.key_id)}')"
             ondragend="handleKeyDragEnd(event)"
             ondragover="handleKeyDragOverKey(event, '${escapeAttr(key.key_id)}')"
             ondragleave="handleKeyDragLeaveKey(event)"
             ondrop="handleKeyDrop(event, '${escapeAttr(key.key_id)}')">
            <div class="drag-handle" title="Drag to reorder or assign to group">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="9" cy="5" r="1"></circle>
                    <circle cx="9" cy="12" r="1"></circle>
                    <circle cx="9" cy="19" r="1"></circle>
                    <circle cx="15" cy="5" r="1"></circle>
                    <circle cx="15" cy="12" r="1"></circle>
                    <circle cx="15" cy="19" r="1"></circle>
                </svg>
            </div>
            <div class="key-select">
                <input type="checkbox" 
                    class="key-checkbox" 
                    ${selectedKeys.has(key.key_id) ? 'checked' : ''} 
                    onchange="toggleKeySelection('${escapeAttr(key.key_id)}', this.checked)">
            </div>
            <div class="key-info">
                <h3>${escapeHtml(key.name)} ${groupBadge}</h3>
                <p class="key-id-row">
                    <strong>ID:</strong> 
                    <code class="key-id-value">${escapeHtml(key.key_id)}</code>
                    <button class="btn-copy" onclick="event.stopPropagation(); copyToClipboard('${escapeAttr(key.key_id)}', this)" title="Copy Key ID">
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
                <button class="btn btn-icon btn-assign-group" title="Assign to Group" onclick="event.stopPropagation(); openAssignKeyGroupModal('${escapeAttr(key.key_id)}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
                    </svg>
                </button>
                <button class="btn btn-icon btn-rename" title="Rename">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="btn btn-toggle ${key.is_active ? 'active' : ''}" data-active="${key.is_active}" title="${key.is_active ? 'Disable Key' : 'Enable Key'}">
                    <span class="toggle-track">
                        <span class="toggle-thumb"></span>
                    </span>
                </button>
                <button class="btn btn-danger btn-delete" title="Delete Key">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </div>
    `}).join('');
}

// ============================================================
// EVENT DELEGATION FOR KEY ACTIONS
// ============================================================

// Handle key action clicks via event delegation
document.addEventListener('click', (e) => {
    // Find the key-item parent
    const keyItem = e.target.closest('.key-item');
    if (!keyItem) return;
    
    const keyId = keyItem.dataset.keyId;
    const keyName = keyItem.dataset.keyName;
    
    // Handle rename button click
    const renameBtn = e.target.closest('.btn-rename');
    if (renameBtn) {
        e.stopPropagation();
        openRenameModal(keyId, keyName);
        return;
    }
    
    // Handle toggle button click
    const toggleBtn = e.target.closest('.btn-toggle');
    if (toggleBtn) {
        e.stopPropagation();
        const isActive = toggleBtn.dataset.active === 'true';
        toggleKey(keyId, isActive);
        return;
    }
    
    // Handle delete button click
    const deleteBtn = e.target.closest('.btn-delete');
    if (deleteBtn) {
        e.stopPropagation();
        openDeleteModal(keyId, keyName);
        return;
    }
});

// ============================================================
// PAGINATION
// ============================================================

function updatePagination(totalPages, totalCount) {
    const paginationEl = document.getElementById('keysPagination');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const infoEl = document.getElementById('paginationInfo');
    
    if (!paginationEl) return;
    
    if (totalCount > KEYS_PER_PAGE) {
        paginationEl.classList.remove('hidden');
    } else {
        paginationEl.classList.add('hidden');
    }
    
    if (prevBtn) prevBtn.disabled = keysCurrentPage <= 1;
    if (nextBtn) nextBtn.disabled = keysCurrentPage >= totalPages;
    
    if (infoEl) {
        const startItem = ((keysCurrentPage - 1) * KEYS_PER_PAGE) + 1;
        const endItem = Math.min(keysCurrentPage * KEYS_PER_PAGE, totalCount);
        infoEl.textContent = `${startItem}-${endItem} of ${totalCount}`;
    }
}

window.changePage = function(delta) {
    keysCurrentPage += delta;
    filterAndRenderKeys();
};

// ============================================================
// BULK SELECTION
// ============================================================

window.toggleKeySelection = function(keyId, checked) {
    if (checked) {
        selectedKeys.add(keyId);
    } else {
        selectedKeys.delete(keyId);
    }
    
    const keyItem = document.querySelector(`[data-key-id="${keyId}"]`);
    if (keyItem) {
        keyItem.classList.toggle('selected', checked);
    }
    
    updateBulkActionsBar();
};

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

window.clearSelection = function() {
    selectedKeys.clear();
    document.querySelectorAll('.key-checkbox').forEach(cb => cb.checked = false);
    document.querySelectorAll('.key-item.selected').forEach(item => item.classList.remove('selected'));
    const selectAllCb = document.getElementById('selectAllKeys');
    if (selectAllCb) selectAllCb.checked = false;
    updateBulkActionsBar();
};

function updateBulkActionsBar() {
    const bar = document.getElementById('bulkActionsBar');
    const countEl = document.getElementById('selectedCount');
    const selectAllCb = document.getElementById('selectAllKeys');
    
    if (!bar) return;
    
    if (selectedKeys.size > 0) {
        bar.classList.remove('hidden');
        if (countEl) countEl.textContent = `${selectedKeys.size} selected`;
    } else {
        bar.classList.add('hidden');
    }
    
    const visibleCheckboxes = document.querySelectorAll('.key-checkbox');
    if (selectAllCb) {
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
}

window.bulkDeleteKeys = function() {
    if (selectedKeys.size === 0) return;
    openDeleteModal(null, null, Array.from(selectedKeys));
};

// ============================================================
// CREATE KEY
// ============================================================

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
// TOGGLE KEY STATE
// ============================================================

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

// ============================================================
// STATS KEYS (for Statistics Tab)
// ============================================================

// Stats keys pagination state
let statsKeysCurrentPage = 1;
const STATS_KEYS_PER_PAGE = 10;

async function loadStatsKeys() {
    if (!window.accessToken) return;
    
    const statsKeysList = document.getElementById('statsKeysList');
    if (!statsKeysList) return;
    
    statsKeysList.innerHTML = '<div class="empty-state"><p>Loading keys...</p></div>';
    
    try {
        const response = await fetch(`${window.API_BASE}/v1/keys`, {
            headers: {
                'Authorization': `Bearer ${window.accessToken}`,
                'X-Wallet-Address': window.currentUser?.wallet_address || ''
            }
        });
        
        if (!response.ok) {
            statsKeysList.innerHTML = '<div class="empty-state"><p>Could not load keys.</p></div>';
            return;
        }
        
        const result = await response.json();
        window.statsKeysList = result.keys || [];
        
        if (window.statsKeysList.length === 0) {
            statsKeysList.innerHTML = '<div class="empty-state"><p>No API keys found. Create your first key in the API Keys tab!</p></div>';
            updateStatsKeysPagination(0, 0);
            return;
        }
        
        renderStatsKeysList();
    } catch (error) {
        console.error('Failed to load stats keys:', error);
        statsKeysList.innerHTML = '<div class="empty-state"><p>Could not load keys.</p></div>';
    }
}

function renderStatsKeysList() {
    const statsKeysList = document.getElementById('statsKeysList');
    if (!statsKeysList) return;
    
    const keys = window.statsKeysList || [];
    const totalKeys = keys.length;
    const totalPages = Math.ceil(totalKeys / STATS_KEYS_PER_PAGE);
    
    // Adjust page if needed
    if (statsKeysCurrentPage > totalPages) {
        statsKeysCurrentPage = Math.max(1, totalPages);
    }
    
    // Get current page items
    const startIndex = (statsKeysCurrentPage - 1) * STATS_KEYS_PER_PAGE;
    const pageKeys = keys.slice(startIndex, startIndex + STATS_KEYS_PER_PAGE);
    
    statsKeysList.innerHTML = pageKeys.map(key => `
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
    
    updateStatsKeysPagination(totalPages, totalKeys);
}

function updateStatsKeysPagination(totalPages, totalCount) {
    let paginationEl = document.getElementById('statsKeysPagination');
    
    // Create pagination element if it doesn't exist
    if (!paginationEl) {
        const statsKeysCard = document.getElementById('statsKeysList')?.closest('.card');
        if (statsKeysCard) {
            paginationEl = document.createElement('div');
            paginationEl.id = 'statsKeysPagination';
            paginationEl.className = 'pagination';
            statsKeysCard.appendChild(paginationEl);
        }
    }
    
    if (!paginationEl) return;
    
    if (totalCount <= STATS_KEYS_PER_PAGE) {
        paginationEl.classList.add('hidden');
        return;
    }
    
    paginationEl.classList.remove('hidden');
    
    const startItem = ((statsKeysCurrentPage - 1) * STATS_KEYS_PER_PAGE) + 1;
    const endItem = Math.min(statsKeysCurrentPage * STATS_KEYS_PER_PAGE, totalCount);
    
    paginationEl.innerHTML = `
        <button class="btn btn-pagination" onclick="changeStatsKeysPage(-1)" ${statsKeysCurrentPage <= 1 ? 'disabled' : ''}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Previous
        </button>
        <span class="pagination-info">${startItem}-${endItem} of ${totalCount}</span>
        <button class="btn btn-pagination" onclick="changeStatsKeysPage(1)" ${statsKeysCurrentPage >= totalPages ? 'disabled' : ''}>
            Next
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
        </button>
    `;
}

window.changeStatsKeysPage = function(delta) {
    statsKeysCurrentPage += delta;
    renderStatsKeysList();
};

window.loadStatsKeys = loadStatsKeys;

// Legacy delete function (now opens modal)
window.deleteKey = function(keyId) {
    const key = (window.keysList || []).find(k => k.key_id === keyId);
    openDeleteModal(keyId, key?.name || 'Unknown');
};

// ============================================================
// Key Group Filter
// ============================================================

function filterKeysByGroup(groupId) {
    KeysState.activeGroupFilter = groupId;
    keysCurrentPage = 1;
    KeysState.currentPage = 1;
    renderKeyGroupsList();
    filterAndRenderKeys();
}
window.filterKeysByGroup = filterKeysByGroup;

// ============================================================
// Key Group Management
// ============================================================

function openCreateKeyGroupModal() {
    let modal = document.getElementById('keyGroupModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'keyGroupModal';
        modal.className = 'key-group-modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="key-group-modal-overlay" onclick="closeKeyGroupModal()"></div>
        <div class="key-group-modal-content">
            <div class="key-group-modal-header">
                <h3>Create Key Group</h3>
                <button class="modal-close" onclick="closeKeyGroupModal()">&times;</button>
            </div>
            <div class="key-group-modal-body">
                <div class="form-group">
                    <label for="keyGroupNameInput">Group Name</label>
                    <input type="text" id="keyGroupNameInput" placeholder="e.g., Production, Development, Testing" autocomplete="off">
                </div>
                <div class="form-group">
                    <label for="keyGroupDescInput">Description (optional)</label>
                    <input type="text" id="keyGroupDescInput" placeholder="Brief description..." autocomplete="off">
                </div>
            </div>
            <div class="key-group-modal-footer">
                <button class="btn btn-secondary" onclick="closeKeyGroupModal()">Cancel</button>
                <button class="btn btn-primary" id="keyGroupCreateSubmit" onclick="submitCreateKeyGroup()">
                    Create Group
                </button>
            </div>
        </div>
    `;
    
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => document.getElementById('keyGroupNameInput').focus(), 100);
}
window.openCreateKeyGroupModal = openCreateKeyGroupModal;

function closeKeyGroupModal() {
    const modal = document.getElementById('keyGroupModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}
window.closeKeyGroupModal = closeKeyGroupModal;

async function submitCreateKeyGroup() {
    const name = document.getElementById('keyGroupNameInput').value.trim();
    const description = document.getElementById('keyGroupDescInput').value.trim();
    const submitBtn = document.getElementById('keyGroupCreateSubmit');
    
    if (!name) {
        showAlert('Please enter a group name', 'error');
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Creating... <span class="loading"></span>';
    
    try {
        const result = await apiRequest('/v1/keys/groups', {
            method: 'POST',
            body: JSON.stringify({ name, description: description || null }),
        });
        
        if (result && result.success) {
            closeKeyGroupModal();
            showAlert('Group created successfully', 'success');
            KeysState.groups.push(result.group);
            updateKeysStats();
            renderKeyGroupsList();
        }
    } catch (error) {
        console.error('Failed to create group:', error);
        showAlert('Failed to create group', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Create Group';
    }
}
window.submitCreateKeyGroup = submitCreateKeyGroup;

async function editKeyGroup(groupId) {
    const group = KeysState.groups.find(g => g.id === groupId);
    if (!group) return;
    
    let modal = document.getElementById('keyGroupModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'keyGroupModal';
        modal.className = 'key-group-modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="key-group-modal-overlay" onclick="closeKeyGroupModal()"></div>
        <div class="key-group-modal-content">
            <div class="key-group-modal-header">
                <h3>Edit Group</h3>
                <button class="modal-close" onclick="closeKeyGroupModal()">&times;</button>
            </div>
            <div class="key-group-modal-body">
                <div class="form-group">
                    <label for="keyGroupNameInput">Group Name</label>
                    <input type="text" id="keyGroupNameInput" value="${escapeHtml(group.name)}" autocomplete="off">
                </div>
                <div class="form-group">
                    <label for="keyGroupDescInput">Description (optional)</label>
                    <input type="text" id="keyGroupDescInput" value="${escapeHtml(group.description || '')}" autocomplete="off">
                </div>
                <input type="hidden" id="editKeyGroupId" value="${groupId}">
            </div>
            <div class="key-group-modal-footer">
                <button class="btn btn-secondary" onclick="closeKeyGroupModal()">Cancel</button>
                <button class="btn btn-primary" id="keyGroupEditSubmit" onclick="submitEditKeyGroup()">
                    Save Changes
                </button>
            </div>
        </div>
    `;
    
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}
window.editKeyGroup = editKeyGroup;

async function submitEditKeyGroup() {
    const groupId = document.getElementById('editKeyGroupId').value;
    const name = document.getElementById('keyGroupNameInput').value.trim();
    const description = document.getElementById('keyGroupDescInput').value.trim();
    const submitBtn = document.getElementById('keyGroupEditSubmit');
    
    if (!name) {
        showAlert('Please enter a group name', 'error');
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Saving... <span class="loading"></span>';
    
    try {
        const result = await apiRequest(`/v1/keys/groups/${groupId}`, {
            method: 'PATCH',
            body: JSON.stringify({ name, description: description || null }),
        });
        
        if (result && result.success) {
            closeKeyGroupModal();
            showAlert('Group updated successfully', 'success');
            
            const idx = KeysState.groups.findIndex(g => g.id === groupId);
            if (idx >= 0) {
                KeysState.groups[idx] = result.group;
            }
            
            // Update group names on keys
            KeysState.keys.forEach(key => {
                if (key.group_id === groupId) {
                    key.group_name = result.group.name;
                }
            });
            window.keysList = KeysState.keys;
            
            renderKeyGroupsList();
            filterAndRenderKeys();
        }
    } catch (error) {
        console.error('Failed to update group:', error);
        showAlert('Failed to update group', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Save Changes';
    }
}
window.submitEditKeyGroup = submitEditKeyGroup;

async function deleteKeyGroup(groupId) {
    if (!confirm('Are you sure you want to delete this group? Keys will be unassigned but not deleted.')) {
        return;
    }
    
    try {
        const result = await apiRequest(`/v1/keys/groups/${groupId}`, {
            method: 'DELETE',
        });
        
        if (result && result.success) {
            showAlert('Group deleted successfully', 'success');
            KeysState.groups = KeysState.groups.filter(g => g.id !== groupId);
            
            // Update keys that were in this group
            KeysState.keys.forEach(key => {
                if (key.group_id === groupId) {
                    key.group_id = null;
                    key.group_name = null;
                }
            });
            window.keysList = KeysState.keys;
            
            if (KeysState.activeGroupFilter === groupId) {
                KeysState.activeGroupFilter = null;
            }
            
            updateKeysStats();
            renderKeyGroupsList();
            filterAndRenderKeys();
        }
    } catch (error) {
        console.error('Failed to delete group:', error);
        showAlert('Failed to delete group', 'error');
    }
}
window.deleteKeyGroup = deleteKeyGroup;

// ============================================================
// Assign Key to Group Modal
// ============================================================

function openAssignKeyGroupModal(keyId) {
    const key = KeysState.keys.find(k => k.key_id === keyId);
    if (!key) return;
    
    let modal = document.getElementById('keyGroupModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'keyGroupModal';
        modal.className = 'key-group-modal';
        document.body.appendChild(modal);
    }
    
    const groupOptions = KeysState.groups.map(g => `
        <option value="${g.id}" ${key.group_id === g.id ? 'selected' : ''}>${escapeHtml(g.name)}</option>
    `).join('');
    
    modal.innerHTML = `
        <div class="key-group-modal-overlay" onclick="closeKeyGroupModal()"></div>
        <div class="key-group-modal-content">
            <div class="key-group-modal-header">
                <h3>Assign to Group</h3>
                <button class="modal-close" onclick="closeKeyGroupModal()">&times;</button>
            </div>
            <div class="key-group-modal-body">
                <p style="margin-bottom: 16px; color: var(--color-text-secondary);">
                    Assign <strong>${escapeHtml(key.name)}</strong> to a group:
                </p>
                <div class="form-group">
                    <label for="assignKeyGroupSelect">Select Group</label>
                    <select id="assignKeyGroupSelect" class="key-filter-select" style="width: 100%;">
                        <option value="">No Group</option>
                        ${groupOptions}
                    </select>
                </div>
                <input type="hidden" id="assignKeyId" value="${keyId}">
            </div>
            <div class="key-group-modal-footer">
                <button class="btn btn-secondary" onclick="closeKeyGroupModal()">Cancel</button>
                <button class="btn btn-primary" id="assignKeyGroupSubmit" onclick="submitAssignKeyGroup()">
                    Assign
                </button>
            </div>
        </div>
    `;
    
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}
window.openAssignKeyGroupModal = openAssignKeyGroupModal;

async function submitAssignKeyGroup() {
    const keyId = document.getElementById('assignKeyId').value;
    const groupId = document.getElementById('assignKeyGroupSelect').value;
    const submitBtn = document.getElementById('assignKeyGroupSubmit');
    const key = KeysState.keys.find(k => k.key_id === keyId);
    
    if (!key) return;
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Assigning... <span class="loading"></span>';
    
    try {
        // If removing from current group
        if (key.group_id && key.group_id !== groupId) {
            await apiRequest(`/v1/keys/groups/${key.group_id}/unassign`, {
                method: 'POST',
                body: JSON.stringify({ key_ids: [keyId] }),
            });
        }
        
        // If assigning to new group
        if (groupId) {
            await apiRequest(`/v1/keys/groups/${groupId}/assign`, {
                method: 'POST',
                body: JSON.stringify({ key_ids: [keyId] }),
            });
            
            const group = KeysState.groups.find(g => g.id === groupId);
            key.group_id = groupId;
            key.group_name = group?.name || null;
        } else {
            key.group_id = null;
            key.group_name = null;
        }
        
        window.keysList = KeysState.keys;
        
        closeKeyGroupModal();
        showAlert('Key group updated', 'success');
        renderKeyGroupsList();
        filterAndRenderKeys();
        
    } catch (error) {
        console.error('Failed to assign group:', error);
        showAlert('Failed to assign group', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Assign';
    }
}
window.submitAssignKeyGroup = submitAssignKeyGroup;

// ============================================================
// Drag and Drop Functions
// ============================================================

/**
 * Handle drag start on a key item
 */
function handleKeyDragStart(event, keyId) {
    KeysState.draggedKeyId = keyId;
    
    // Set drag data
    event.dataTransfer.setData('text/plain', keyId);
    event.dataTransfer.effectAllowed = 'move';
    
    // Add visual feedback to dragged element
    const keyEl = event.target.closest('.key-item');
    if (keyEl) {
        keyEl.classList.add('dragging');
    }
    
    // Highlight all group cards as drop targets
    document.querySelectorAll('.key-group-card').forEach(card => {
        card.classList.add('drop-target');
    });
    
    // Show drag overlay hint
    showKeyDragOverlay(true);
}
window.handleKeyDragStart = handleKeyDragStart;

/**
 * Handle drag end on a key item
 */
function handleKeyDragEnd(event) {
    KeysState.draggedKeyId = null;
    
    // Remove dragging class from all keys
    document.querySelectorAll('.key-item.dragging').forEach(el => {
        el.classList.remove('dragging');
    });
    
    // Remove drop target highlighting from all groups
    document.querySelectorAll('.key-group-card').forEach(card => {
        card.classList.remove('drop-target', 'drag-over');
    });
    
    // Clean up key reorder states
    cleanupKeyReorderStates();
    
    // Hide drag overlay
    showKeyDragOverlay(false);
}
window.handleKeyDragEnd = handleKeyDragEnd;

/**
 * Handle drag over on a group card
 */
function handleKeyGroupDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    
    const groupCard = event.target.closest('.key-group-card');
    if (groupCard) {
        groupCard.classList.add('drag-over');
    }
}
window.handleKeyGroupDragOver = handleKeyGroupDragOver;

/**
 * Handle drag leave on a group card
 */
function handleKeyGroupDragLeave(event) {
    const groupCard = event.target.closest('.key-group-card');
    if (groupCard && !groupCard.contains(event.relatedTarget)) {
        groupCard.classList.remove('drag-over');
    }
}
window.handleKeyGroupDragLeave = handleKeyGroupDragLeave;

/**
 * Handle drop on a group card
 */
async function handleKeyGroupDrop(event, groupId) {
    event.preventDefault();
    event.stopPropagation();
    
    const keyId = event.dataTransfer.getData('text/plain') || KeysState.draggedKeyId;
    if (!keyId) {
        cleanupKeyDragStates();
        return;
    }
    
    const key = KeysState.keys.find(k => k.key_id === keyId);
    if (!key) {
        cleanupKeyDragStates();
        return;
    }
    
    // Don't do anything if key is already in this group
    if (key.group_id === groupId) {
        cleanupKeyDragStates();
        return;
    }
    
    // Show loading state on the group card
    const groupCard = event.target.closest('.key-group-card');
    if (groupCard) {
        groupCard.classList.add('loading');
    }
    
    // Immediately hide overlay and clean most states
    showKeyDragOverlay(false);
    document.querySelectorAll('.key-item.dragging').forEach(el => {
        el.classList.remove('dragging');
    });
    document.querySelectorAll('.key-group-card').forEach(card => {
        if (card !== groupCard) {
            card.classList.remove('drop-target', 'drag-over');
        }
    });
    
    // Store old group ID before any changes
    const oldGroupId = key.group_id;
    
    try {
        // If removing from current group
        if (oldGroupId) {
            await apiRequest(`/v1/keys/groups/${oldGroupId}/unassign`, {
                method: 'POST',
                body: JSON.stringify({ key_ids: [keyId] }),
            });
        }
        
        // If assigning to new group (groupId is not null/empty)
        if (groupId) {
            await apiRequest(`/v1/keys/groups/${groupId}/assign`, {
                method: 'POST',
                body: JSON.stringify({ key_ids: [keyId] }),
            });
            
            const newGroup = KeysState.groups.find(g => g.id === groupId);
            key.group_id = groupId;
            key.group_name = newGroup?.name || null;
        } else {
            // Unassigning from all groups
            key.group_id = null;
            key.group_name = null;
        }
        
        window.keysList = KeysState.keys;
        
        showAlert(groupId ? 'Key assigned to group' : 'Key unassigned from group', 'success');
        renderKeyGroupsList();
        filterAndRenderKeys();
        
    } catch (error) {
        console.error('Failed to assign key to group:', error);
        showAlert('Failed to assign key to group', 'error');
    } finally {
        cleanupKeyDragStates();
    }
}
window.handleKeyGroupDrop = handleKeyGroupDrop;

/**
 * Clean up all drag states
 */
function cleanupKeyDragStates() {
    KeysState.draggedKeyId = null;
    
    document.querySelectorAll('.key-item.dragging').forEach(el => {
        el.classList.remove('dragging');
    });
    
    document.querySelectorAll('.key-group-card').forEach(card => {
        card.classList.remove('drop-target', 'drag-over', 'loading');
    });
    
    showKeyDragOverlay(false);
}
window.cleanupKeyDragStates = cleanupKeyDragStates;

/**
 * Show/hide the drag overlay hint
 */
function showKeyDragOverlay(show) {
    let overlay = document.getElementById('keyDragOverlay');
    
    if (show) {
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'keyDragOverlay';
            overlay.className = 'drag-overlay';
            overlay.innerHTML = `
                <div class="drag-overlay-content">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
                    </svg>
                    <p>Drop on a group to assign</p>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        overlay.classList.add('visible');
    } else {
        if (overlay) {
            overlay.classList.remove('visible');
            setTimeout(() => {
                const el = document.getElementById('keyDragOverlay');
                if (el && !el.classList.contains('visible')) {
                    el.remove();
                }
            }, 200);
        }
    }
}

// ============================================================
// Key Reordering Functions
// ============================================================

/**
 * Handle drag over another key (for reordering)
 */
function handleKeyDragOverKey(event, targetKeyId) {
    // Don't allow dropping on self
    if (targetKeyId === KeysState.draggedKeyId) return;
    
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    
    const targetEl = event.target.closest('.key-item');
    if (!targetEl) return;
    
    // Determine if dropping before or after based on mouse position
    const rect = targetEl.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const dropPosition = event.clientY < midY ? 'before' : 'after';
    
    // Update state
    KeysState.dropTargetKeyId = targetKeyId;
    KeysState.dropPosition = dropPosition;
    
    // Remove existing drop indicators
    document.querySelectorAll('.key-item').forEach(el => {
        el.classList.remove('drop-before', 'drop-after');
    });
    
    // Add drop indicator to target
    targetEl.classList.add(dropPosition === 'before' ? 'drop-before' : 'drop-after');
}
window.handleKeyDragOverKey = handleKeyDragOverKey;

/**
 * Handle drag leave from a key
 */
function handleKeyDragLeaveKey(event) {
    const targetEl = event.target.closest('.key-item');
    if (targetEl && !targetEl.contains(event.relatedTarget)) {
        targetEl.classList.remove('drop-before', 'drop-after');
        if (KeysState.dropTargetKeyId === targetEl.dataset.keyId) {
            KeysState.dropTargetKeyId = null;
            KeysState.dropPosition = null;
        }
    }
}
window.handleKeyDragLeaveKey = handleKeyDragLeaveKey;

/**
 * Handle drop on another key (reorder)
 */
async function handleKeyDrop(event, targetKeyId) {
    event.preventDefault();
    event.stopPropagation();
    
    const draggedId = event.dataTransfer.getData('text/plain') || KeysState.draggedKeyId;
    
    // Don't do anything if dropped on self or no target
    if (!draggedId || draggedId === targetKeyId) {
        cleanupKeyReorderStates();
        return;
    }
    
    const dropPosition = KeysState.dropPosition || 'after';
    
    // Get current filtered/sorted keys
    let keys = getFilteredKeys();
    
    // Find indices
    const draggedIndex = keys.findIndex(k => k.key_id === draggedId);
    const targetIndex = keys.findIndex(k => k.key_id === targetKeyId);
    
    if (draggedIndex === -1 || targetIndex === -1) {
        cleanupKeyReorderStates();
        return;
    }
    
    // Remove dragged key from array
    const [draggedKey] = keys.splice(draggedIndex, 1);
    
    // Calculate new target index after removal
    let newIndex = keys.findIndex(k => k.key_id === targetKeyId);
    if (dropPosition === 'after') {
        newIndex += 1;
    }
    
    // Insert at new position
    keys.splice(newIndex, 0, draggedKey);
    
    // Assign new sort_order values
    const keyOrders = keys.map((key, index) => ({
        key_id: key.key_id,
        sort_order: index
    }));
    
    // Update local state immediately for responsive UI
    keyOrders.forEach(item => {
        const key = KeysState.keys.find(k => k.key_id === item.key_id);
        if (key) {
            key.sort_order = item.sort_order;
        }
    });
    window.keysList = KeysState.keys;
    
    cleanupKeyReorderStates();
    filterAndRenderKeys();
    
    // Save to backend
    try {
        await apiRequest('/v1/keys/order', {
            method: 'PATCH',
            body: JSON.stringify({ key_orders: keyOrders }),
        });
        showAlert('Key order updated', 'success');
    } catch (error) {
        console.error('Failed to save key order:', error);
        showAlert('Failed to save key order', 'error');
    }
}
window.handleKeyDrop = handleKeyDrop;

/**
 * Get filtered keys based on current filters
 */
function getFilteredKeys() {
    let keys = [...KeysState.keys];
    
    // Apply group filter
    if (KeysState.activeGroupFilter) {
        keys = keys.filter(k => k.group_id === KeysState.activeGroupFilter);
    }
    
    // Apply status filter
    if (KeysState.statusFilter && KeysState.statusFilter !== 'all') {
        keys = keys.filter(k => 
            (KeysState.statusFilter === 'active' && k.is_active) ||
            (KeysState.statusFilter === 'inactive' && !k.is_active)
        );
    }
    
    // Apply search filter
    if (KeysState.searchQuery) {
        const query = KeysState.searchQuery.toLowerCase();
        keys = keys.filter(k => 
            k.name?.toLowerCase().includes(query) ||
            k.key_id?.toLowerCase().includes(query)
        );
    }
    
    // Sort by sort_order
    keys.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    
    return keys;
}

/**
 * Clean up key reorder visual states
 */
function cleanupKeyReorderStates() {
    KeysState.dropTargetKeyId = null;
    KeysState.dropPosition = null;
    
    document.querySelectorAll('.key-item').forEach(el => {
        el.classList.remove('drop-before', 'drop-after');
    });
}

