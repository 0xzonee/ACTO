// ============================================================
// ACTO Dashboard - Clipboard Module
// Copy to clipboard functionality
// ============================================================

// Copy newly created API key
window.copyNewApiKey = async function() {
    const keyValue = document.getElementById('newKeyValue')?.textContent;
    const btn = document.getElementById('copyNewKeyBtn');
    
    if (!keyValue) return;
    
    try {
        await navigator.clipboard.writeText(keyValue);
        
        if (btn) {
            btn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Copied!</span>
            `;
            btn.classList.add('copied');
            
            setTimeout(() => {
                btn.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span>Copy Key</span>
                `;
                btn.classList.remove('copied');
            }, 3000);
        }
        
        showAlert('API key copied to clipboard!', 'success');
    } catch (err) {
        showAlert('Failed to copy to clipboard', 'error');
    }
};

// Copy text to clipboard with visual feedback
window.copyToClipboard = async function(text, buttonEl) {
    try {
        await navigator.clipboard.writeText(text);
        
        if (buttonEl) {
            const originalHTML = buttonEl.innerHTML;
            buttonEl.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Copied!
            `;
            buttonEl.classList.add('copied');
            
            setTimeout(() => {
                buttonEl.innerHTML = originalHTML;
                buttonEl.classList.remove('copied');
            }, 2000);
        }
        
        showAlert('Copied to clipboard!', 'success');
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showAlert('Copied to clipboard!', 'success');
        } catch (e) {
            showAlert('Failed to copy to clipboard', 'error');
        }
        document.body.removeChild(textArea);
    }
};

