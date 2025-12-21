// ============================================================
// ACTO Dashboard - Modals Module
// Rename and Delete modal dialogs
// ============================================================

// ============================================================
// RENAME MODAL
// ============================================================

window.openRenameModal = function(keyId, currentName) {
    let modal = document.getElementById('renameModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'renameModal';
        modal.className = 'rename-modal';
        modal.innerHTML = `
            <div class="rename-modal-overlay" onclick="closeRenameModal()"></div>
            <div class="rename-modal-content">
                <div class="rename-modal-header">
                    <h3>Rename API Key</h3>
                    <button class="modal-close" onclick="closeRenameModal()">&times;</button>
                </div>
                <div class="rename-modal-body">
                    <div class="form-group">
                        <label for="renameKeyInput">New Name</label>
                        <input type="text" id="renameKeyInput" placeholder="Enter new name..." autocomplete="off">
                    </div>
                    <input type="hidden" id="renameKeyId">
                </div>
                <div class="rename-modal-footer">
                    <button class="btn btn-secondary" onclick="closeRenameModal()">Cancel</button>
                    <button class="btn btn-primary" id="renameSubmitBtn" onclick="submitRename()">
                        Save Changes
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById('renameKeyInput').value = currentName;
    document.getElementById('renameKeyId').value = keyId;
    
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => {
        document.getElementById('renameKeyInput').focus();
        document.getElementById('renameKeyInput').select();
    }, 100);
};

window.closeRenameModal = function() {
    const modal = document.getElementById('renameModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
};

window.submitRename = async function() {
    const keyId = document.getElementById('renameKeyId').value;
    const newName = document.getElementById('renameKeyInput').value.trim();
    const submitBtn = document.getElementById('renameSubmitBtn');
    
    if (!newName) {
        showAlert('Please enter a name', 'error');
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Saving... <span class="loading"></span>';
    
    const result = await apiRequest(`/v1/keys/${keyId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: newName }),
    });
    
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Save Changes';
    
    if (result && result.success) {
        closeRenameModal();
        showAlert('API key renamed successfully', 'success');
        await loadKeys();
    }
};

// ============================================================
// DELETE MODAL
// ============================================================

let deleteContext = { keyId: null, keyName: null, keyIds: null };

window.openDeleteModal = function(keyId, keyName, keyIds = null) {
    deleteContext = { keyId, keyName, keyIds };
    
    let modal = document.getElementById('deleteModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'deleteModal';
        modal.className = 'delete-modal';
        document.body.appendChild(modal);
    }
    
    const isBulk = keyIds && keyIds.length > 0;
    const count = isBulk ? keyIds.length : 1;
    const title = isBulk ? `Delete ${count} API Keys?` : 'Delete API Key?';
    const message = isBulk
        ? `Are you sure you want to delete <strong>${count} API keys</strong>? This action cannot be undone.`
        : `Are you sure you want to delete the API key <strong>"${escapeHtml(keyName || 'Unknown')}"</strong>? This action cannot be undone.`;
    
    modal.innerHTML = `
        <div class="delete-modal-overlay" onclick="closeDeleteModal()"></div>
        <div class="delete-modal-content">
            <div class="delete-modal-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            </div>
            <h3>${title}</h3>
            <p>${message}</p>
            <div class="delete-modal-actions">
                <button class="btn btn-secondary" onclick="closeDeleteModal()">Cancel</button>
                <button class="btn btn-danger" id="confirmDeleteBtn" onclick="confirmDelete()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Delete${isBulk ? ` (${count})` : ''}
                </button>
            </div>
        </div>
    `;
    
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
};

window.closeDeleteModal = function() {
    const modal = document.getElementById('deleteModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
    deleteContext = { keyId: null, keyName: null, keyIds: null };
};

window.confirmDelete = async function() {
    const btn = document.getElementById('confirmDeleteBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Deleting...';
    
    const { keyId, keyIds } = deleteContext;
    const isBulk = keyIds && keyIds.length > 0;
    
    let successCount = 0;
    let failCount = 0;
    
    if (isBulk) {
        for (const id of keyIds) {
            const result = await apiRequest(`/v1/keys/${id}`, {
                method: 'DELETE',
                silent: true
            });
            if (result && result.success) {
                localStorage.removeItem(`api_key_${id}`);
                successCount++;
            } else {
                failCount++;
            }
        }
    } else if (keyId) {
        const result = await apiRequest(`/v1/keys/${keyId}`, {
            method: 'DELETE',
        });
        if (result && result.success) {
            localStorage.removeItem(`api_key_${keyId}`);
            successCount = 1;
        } else {
            failCount = 1;
        }
    }
    
    closeDeleteModal();
    
    if (successCount > 0 && failCount === 0) {
        showAlert(`${successCount} API key${successCount > 1 ? 's' : ''} deleted successfully`, 'success');
    } else if (successCount > 0 && failCount > 0) {
        showAlert(`Deleted ${successCount} key${successCount > 1 ? 's' : ''}, ${failCount} failed`, 'warning');
    } else {
        showAlert('Failed to delete API key(s)', 'error');
    }
    
    // Clear selection and reload
    if (typeof clearSelection === 'function') clearSelection();
    await loadKeys();
};

