import { auth } from './firebase.js';
import { 
    onAuthStateChanged,
    signOut
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { createShortLink, getUserLinks, deleteLink } from './shortener.js';

// DOM Elements
const shortenForm = document.getElementById('shortenForm');
const longUrl = document.getElementById('longUrl');
const customAlias = document.getElementById('customAlias');
const analyticsPassword = document.getElementById('analyticsPassword');
const linkTitle = document.getElementById('linkTitle');
const expiresInDays = document.getElementById('expiresInDays');
const loginLink = document.getElementById('loginLink');
const signupBtn = document.getElementById('signupBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userNameDisplay = document.getElementById('userNameDisplay');
const dashboardLink = document.getElementById('dashboardLink');
const modalOverlay = document.getElementById('modalOverlay');
const modalShortUrl = document.getElementById('modalShortUrl');
const modalAlias = document.getElementById('modalAlias');
const modalOriginalUrl = document.getElementById('modalOriginalUrl');
const modalExpiry = document.getElementById('modalExpiry');
const modalPassword = document.getElementById('modalPassword');
const modalCopyBtn = document.getElementById('modalCopyBtn');
const modalOpenBtn = document.getElementById('modalOpenBtn');
const modalCloseBtns = document.querySelectorAll('#modalCloseBtn, #modalCloseBtn2');

// Toast notifications
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('toast-removing');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Show modal with link details
function showModal(linkData) {
    const baseUrl = window.location.origin;
    const shortUrl = `${baseUrl}/${linkData.shortCode}`;
    
    modalShortUrl.href = shortUrl;
    modalShortUrl.textContent = shortUrl;
    modalAlias.textContent = linkData.shortCode;
    modalOriginalUrl.href = linkData.longUrl;
    modalOriginalUrl.textContent = linkData.longUrl.length > 50 ? linkData.longUrl.substring(0, 50) + '...' : linkData.longUrl;
    modalExpiry.textContent = linkData.expiresAt ? new Date(linkData.expiresAt).toLocaleDateString() : 'Never expires';
    modalPassword.textContent = linkData.analyticsPassword ? '🔒 Password protected' : 'Public';
    
    modalOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    modalOverlay.dataset.shortUrl = shortUrl;
    modalOverlay.dataset.longUrl = linkData.longUrl;
}

// Close modal
function closeModal() {
    modalOverlay.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Handle form submission
shortenForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('shortenBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    
    try {
        const result = await createShortLink(
            longUrl.value,
            customAlias.value,
            analyticsPassword.value,
            linkTitle.value,
            expiresInDays.value ? parseInt(expiresInDays.value) : null
        );
        
        showToast('Link created successfully!');
        showModal(result);
        shortenForm.reset();
        
    } catch (error) {
        console.error('Error from createShortLink:', error);
        showToast(error.message || 'Failed to create short link. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
});

// Copy to clipboard
modalCopyBtn.addEventListener('click', async () => {
    const shortUrl = modalOverlay.dataset.shortUrl;
    if (shortUrl) {
        try {
            await navigator.clipboard.writeText(shortUrl);
            showToast('Link copied to clipboard!');
        } catch {
            const textArea = document.createElement('textarea');
            textArea.value = shortUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            textArea.remove();
            showToast('Link copied to clipboard!');
        }
    }
});

// Open link
modalOpenBtn.addEventListener('click', () => {
    const longUrl = modalOverlay.dataset.longUrl;
    if (longUrl) {
        window.open(longUrl, '_blank');
    }
});

// Close modal events
modalCloseBtns.forEach(btn => {
    btn.addEventListener('click', closeModal);
});

modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
        closeModal();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.style.display === 'flex') {
        closeModal();
    }
});

// Check if user is authenticated
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginLink.style.display = 'none';
        signupBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        userNameDisplay.style.display = 'inline-block';
        userNameDisplay.textContent = user.displayName || user.email;
        dashboardLink.style.display = 'inline-block';
        
        if (window.location.pathname === '/dashboard') {
            loadUserLinks(user.uid);
        }
    } else {
        loginLink.style.display = 'inline-block';
        signupBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        userNameDisplay.style.display = 'none';
        dashboardLink.style.display = 'none';
    }
});

// Handle logout
window.handleLogout = async function() {
    try {
        await signOut(auth);
        showToast('Logged out successfully');
        window.location.href = '/';
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Failed to logout', 'error');
    }
};

// Load user links for dashboard
async function loadUserLinks(userId) {
    try {
        const links = await getUserLinks(userId);
        const container = document.getElementById('linksContainer');
        if (!container) return;
        
        if (links.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-link" style="font-size: 48px; color: #d1d5db;"></i>
                    <h3>No links yet</h3>
                    <p>Create your first short link using the form above.</p>
                </div>
            `;
            return;
        }
        
        let html = '<div class="links-grid">';
        links.forEach(link => {
            const shortUrl = `${window.location.origin}/${link.shortCode}`;
            html += `
                <div class="link-card">
                    <div class="link-card-header">
                        <h4>${link.title || link.shortCode}</h4>
                        <span class="link-badge">${link.clicks || 0} clicks</span>
                    </div>
                    <div class="link-card-body">
                        <div><strong>Short URL:</strong> <a href="${shortUrl}" target="_blank">${shortUrl}</a></div>
                        <div><strong>Original:</strong> <span class="link-truncate">${link.longUrl}</span></div>
                        ${link.expiresAt ? `<div><strong>Expires:</strong> ${new Date(link.expiresAt).toLocaleDateString()}</div>` : ''}
                    </div>
                    <div class="link-card-actions">
                        <button class="btn btn-sm btn-outline" onclick="window.copyLink('${shortUrl}')">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="window.deleteUserLink('${link.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading links:', error);
        showToast('Failed to load links', 'error');
    }
}

// Copy link function
window.copyLink = async function(url) {
    try {
        await navigator.clipboard.writeText(url);
        showToast('Link copied!');
    } catch {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
        showToast('Link copied!');
    }
};

// Delete link function
window.deleteUserLink = async function(linkId) {
    if (confirm('Are you sure you want to delete this link?')) {
        try {
            await deleteLink(linkId);
            showToast('Link deleted successfully');
            if (auth.currentUser) {
                loadUserLinks(auth.currentUser.uid);
            }
        } catch (error) {
            console.error('Delete error:', error);
            showToast('Failed to delete link', 'error');
        }
    }
};

// Mobile navigation toggle
const mobileToggle = document.getElementById('mobileToggle');
const navLinks = document.getElementById('navLinks');

if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
}