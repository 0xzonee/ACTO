/**
 * Account Settings Module
 * Handles user profile management and account settings
 */

// Profile data cache
let currentProfile = null;

/**
 * Initialize account module when tab is switched to
 */
function initAccountTab() {
    loadProfile();
    setupProfileForm();
}

/**
 * Load user profile from API
 */
async function loadProfile() {
    const token = getToken();
    if (!token) {
        console.warn('No auth token available');
        return;
    }

    try {
        const response = await fetch('/v1/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to load profile: ${response.status}`);
        }

        const profile = await response.json();
        currentProfile = profile;
        populateProfileForm(profile);
        updateAccountInfo(profile);
    } catch (error) {
        console.error('Error loading profile:', error);
        showAlert('Failed to load profile data', 'error');
    }
}

/**
 * Populate form fields with profile data
 */
function populateProfileForm(profile) {
    const form = document.getElementById('profileForm');
    if (!form) return;

    // Set form values (handle null/undefined gracefully)
    const fields = ['contact_name', 'company_name', 'email', 'phone', 'website', 'location', 'industry'];
    
    fields.forEach(field => {
        const input = form.querySelector(`[name="${field}"]`);
        if (input) {
            input.value = profile[field] || '';
        }
    });
}

/**
 * Update account information display
 */
function updateAccountInfo(profile) {
    // Wallet address
    const walletEl = document.getElementById('accountWalletAddress');
    if (walletEl && profile.wallet_address) {
        walletEl.textContent = formatWalletAddress(profile.wallet_address);
        walletEl.title = profile.wallet_address;
    }

    // User ID
    const userIdEl = document.getElementById('accountUserId');
    if (userIdEl && profile.user_id) {
        userIdEl.textContent = profile.user_id;
    }

    // Created at
    const createdEl = document.getElementById('accountCreatedAt');
    if (createdEl && profile.created_at) {
        createdEl.textContent = formatDateTime(profile.created_at);
    }

    // Last login
    const lastLoginEl = document.getElementById('accountLastLogin');
    if (lastLoginEl && profile.last_login_at) {
        lastLoginEl.textContent = formatDateTime(profile.last_login_at);
    }

    // Updated at
    const updatedEl = document.getElementById('accountUpdatedAt');
    if (updatedEl) {
        updatedEl.textContent = profile.updated_at ? formatDateTime(profile.updated_at) : 'Never';
    }

    // Account status
    const statusEl = document.getElementById('accountStatus');
    if (statusEl) {
        statusEl.textContent = profile.is_active ? 'Active' : 'Inactive';
        statusEl.className = `status-badge ${profile.is_active ? 'active' : 'inactive'}`;
    }
}

/**
 * Format wallet address for display
 */
function formatWalletAddress(address) {
    if (!address || address.length < 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

/**
 * Format datetime string for display
 */
function formatDateTime(isoString) {
    if (!isoString) return '-';
    try {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return isoString;
    }
}

/**
 * Setup profile form submission handler
 */
function setupProfileForm() {
    const form = document.getElementById('profileForm');
    if (!form) return;

    // Remove existing listener if any
    form.removeEventListener('submit', handleProfileSubmit);
    form.addEventListener('submit', handleProfileSubmit);
}

/**
 * Handle profile form submission
 */
async function handleProfileSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const saveBtn = document.getElementById('saveProfileBtn');
    
    // Set loading state
    form.classList.add('loading');
    if (saveBtn) {
        saveBtn.classList.add('loading');
        saveBtn.disabled = true;
    }

    try {
        const formData = new FormData(form);
        const data = {};
        
        // Convert FormData to object, only include non-empty values
        for (const [key, value] of formData.entries()) {
            // Include the field in update (empty string will clear the field)
            data[key] = value.trim();
        }

        const token = getToken();
        if (!token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch('/v1/profile', {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || `Failed to update profile: ${response.status}`);
        }

        const updatedProfile = await response.json();
        currentProfile = updatedProfile;
        
        // Update the account info display
        updateAccountInfo(updatedProfile);
        
        showAlert('Profile updated successfully!', 'success');
        
        // Brief success animation on inputs
        form.querySelectorAll('input, select').forEach(input => {
            input.classList.add('success');
            setTimeout(() => input.classList.remove('success'), 2000);
        });

    } catch (error) {
        console.error('Error updating profile:', error);
        showAlert(error.message || 'Failed to update profile', 'error');
    } finally {
        // Remove loading state
        form.classList.remove('loading');
        if (saveBtn) {
            saveBtn.classList.remove('loading');
            saveBtn.disabled = false;
        }
    }
}

/**
 * Reset profile form to last saved values
 */
function resetProfileForm() {
    if (currentProfile) {
        populateProfileForm(currentProfile);
        showAlert('Form reset to saved values', 'info');
    } else {
        // Clear all fields
        const form = document.getElementById('profileForm');
        if (form) {
            form.reset();
        }
    }
}

/**
 * Get authentication token from storage
 */
function getToken() {
    // Try to get token from window.authToken (set by wallet.js)
    if (window.authToken) {
        return window.authToken;
    }
    // Fallback to localStorage
    return localStorage.getItem('authToken');
}

/**
 * Show alert message (uses existing alert system if available)
 */
function showAlert(message, type = 'info') {
    // Use existing showAlert if available (from core.js)
    if (typeof window.showAlert === 'function' && window.showAlert !== showAlert) {
        window.showAlert(message, type);
        return;
    }

    // Fallback implementation
    const alertEl = document.getElementById('alert');
    if (alertEl) {
        alertEl.textContent = message;
        alertEl.className = `alert alert-${type} show`;
        
        setTimeout(() => {
            alertEl.classList.remove('show');
        }, 4000);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// Hook into tab switching
const originalSwitchTab = window.switchTab;
window.switchTab = function(tabName) {
    if (originalSwitchTab) {
        originalSwitchTab(tabName);
    }
    
    if (tabName === 'account') {
        initAccountTab();
    }
};

// Initialize if already on account tab
document.addEventListener('DOMContentLoaded', () => {
    const accountTab = document.getElementById('tab-account');
    if (accountTab && accountTab.classList.contains('active')) {
        initAccountTab();
    }
});

