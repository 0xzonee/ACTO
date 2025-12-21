// ============================================================
// ACTO Dashboard - Keys Module
// API Key management, filtering, pagination, and bulk actions
// ============================================================

// Pagination and filtering state
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
    
    // Load all keys including inactive (toggled off) ones
    const result = await apiRequest('/v1/keys?include_inactive=true');
    if (!result) {
        keysListEl.innerHTML = '<div class="empty-state"><p>Failed to load keys.</p></div>';
        return;
    }
    
    window.keysList = result.keys || [];
    
    // Reset state
    keysCurrentPage = 1;
    selectedKeys.clear();
    updateBulkActionsBar();
    
    // Render with current filters
    filterAndRenderKeys();
    
    // Also update stats tab if it's visible
    if (document.getElementById('tab-stats')?.classList.contains('active')) {
        loadStatsKeys();
    }
}
window.loadKeys = loadKeys;

// ============================================================
// FILTER, SORT AND RENDER
// ============================================================

window.filterAndRenderKeys = function() {
    const searchTerm = (document.getElementById('keysSearch')?.value || '').toLowerCase().trim();
    const statusFilter = document.getElementById('keysFilterStatus')?.value || 'all';
    const sortBy = document.getElementById('keysSort')?.value || 'created_desc';
    
    // Filter keys
    let filteredKeys = (window.keysList || []).filter(key => {
        const matchesSearch = !searchTerm || 
            key.name.toLowerCase().includes(searchTerm) ||
            key.key_id.toLowerCase().includes(searchTerm);
        
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
    
    if (keysCurrentPage > totalPages) {
        keysCurrentPage = Math.max(1, totalPages);
    }
    
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
        keysListEl.innerHTML = '<div class="empty-state"><p>No keys match your search criteria.</p></div>';
        return;
    }
    
    keysListEl.innerHTML = keys.map(key => `
        <div class="key-item ${key.is_active ? '' : 'key-disabled'} ${selectedKeys.has(key.key_id) ? 'selected' : ''}" data-key-id="${escapeAttr(key.key_id)}" data-key-name="${escapeAttr(key.name)}">
            <div class="key-select">
                <input type="checkbox" 
                    class="key-checkbox" 
                    ${selectedKeys.has(key.key_id) ? 'checked' : ''} 
                    onchange="toggleKeySelection('${escapeAttr(key.key_id)}', this.checked)">
            </div>
            <div class="key-info">
                <h3>${escapeHtml(key.name)}</h3>
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
    `).join('');
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
        window.keysList = result.keys || [];
        
        if (window.keysList.length === 0) {
            statsKeysList.innerHTML = '<div class="empty-state"><p>No API keys found. Create your first key in the API Keys tab!</p></div>';
            return;
        }
        
        statsKeysList.innerHTML = window.keysList.map(key => `
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
window.loadStatsKeys = loadStatsKeys;

// Legacy delete function (now opens modal)
window.deleteKey = function(keyId) {
    const key = (window.keysList || []).find(k => k.key_id === keyId);
    openDeleteModal(keyId, key?.name || 'Unknown');
};

