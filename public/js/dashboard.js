import { auth, db } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getUserLinks, deleteLink } from './shortener.js';

// Toast notifications
function showToast(message, type = 'success') {
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
    toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-removing');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// DOM Elements
const linksContainer = document.getElementById('linksContainer');
const totalLinksEl = document.getElementById('totalLinks');
const totalClicksEl = document.getElementById('totalClicks');
const activeLinksEl = document.getElementById('activeLinks');

// Authentication state
let currentUser = null;

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        updateUI(user);
        loadLinks(user.uid);
    } else {
        // Redirect to login if not authenticated
        window.location.href = '/login.html';
    }
});

function updateUI(user) {
    const userNameDisplay = document.getElementById('userNameDisplay');
    const loginLink = document.getElementById('loginLink');
    const signupBtn = document.getElementById('signupBtn');

    if (user) {
        if (userNameDisplay) {
            userNameDisplay.style.display = 'inline-block';
            userNameDisplay.textContent = user.displayName || user.email || 'User';
        }
        if (loginLink) loginLink.style.display = 'none';
        if (signupBtn) signupBtn.style.display = 'none';
    }
}

// Load links
async function loadLinks(userId) {
    if (!userId) return;

    try {
        const links = await getUserLinks(userId);

        // Update stats
        const totalLinks = links.length;
        const totalClicks = links.reduce((sum, link) => sum + (link.clicks || 0), 0);
        const activeLinks = links.filter(link => link.isActive !== false).length;

        if (totalLinksEl) totalLinksEl.textContent = totalLinks;
        if (totalClicksEl) totalClicksEl.textContent = totalClicks;
        if (activeLinksEl) activeLinksEl.textContent = activeLinks;

        // Render links
        renderLinks(links);
    } catch (error) {
        console.error('Error loading links:', error);
        showToast('Failed to load links', 'error');
    }
}

// Render links
function renderLinks(links) {
    if (!linksContainer) return;

    if (links.length === 0) {
        linksContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-link"></i>
                <h3>No links yet</h3>
                <p>Start shortening URLs and they'll appear here!</p>
                <a href="/" class="btn btn-primary">Create your first link</a>
            </div>
        `;
        return;
    }

    let html = '<div class="links-grid">';
    links.forEach((link, index) => {
        const shortUrl = `${window.location.origin}/${link.shortCode}`;
        const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();
        const status = isExpired ? 'Expired' : link.isActive === false ? 'Inactive' : 'Active';
        const statusClass = isExpired || link.isActive === false ? 'status-inactive' : 'status-active';

        html += `
            <div class="link-card" data-index="${index}">
                <div class="link-info">
                    <div class="link-title">${link.title || link.shortCode}</div>
                    <div class="link-url">
                        <a href="${shortUrl}" target="_blank">${shortUrl}</a>
                        <button class="btn btn-sm btn-outline" onclick="copyLink('${shortUrl}')">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                    <div class="link-original">${link.longUrl}</div>
                    <div class="link-meta">
                        <span><i class="fas fa-mouse-pointer"></i> ${link.clicks || 0} clicks</span>
                        ${link.expiresAt ? `<span><i class="fas fa-clock"></i> Expires: ${new Date(link.expiresAt).toLocaleDateString()}</span>` : ''}
                        <span class="${statusClass}"><i class="fas fa-circle"></i> ${status}</span>
                        ${link.analyticsPassword ? `<span><i class="fas fa-lock"></i> Password protected</span>` : ''}
                    </div>
                </div>
                <div class="link-actions">
                    <button class="btn btn-sm btn-danger" onclick="deleteUserLink('${link.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    linksContainer.innerHTML = html;
}

// Copy link
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

// Delete link
window.deleteUserLink = async function(linkId) {
    if (!confirm('Are you sure you want to delete this link?')) return;

    try {
        await deleteLink(linkId);
        showToast('Link deleted successfully');
        if (currentUser) {
            loadLinks(currentUser.uid);
        }
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Failed to delete link', 'error');
    }
};

// Refresh links
window.refreshLinks = function() {
    if (currentUser) {
        loadLinks(currentUser.uid);
        showToast('Links refreshed', 'info');
    }
};

// Handle logout
window.handleLogout = async function() {
    try {
        const { signOut } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js');
        await signOut(auth);
        showToast('Logged out successfully', 'info');
        setTimeout(() => {
            window.location.href = '/';
        }, 500);
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Failed to logout', 'error');
    }
};

// Mobile toggle
const mobileToggle = document.getElementById('mobileToggle');
const navLinks = document.getElementById('navLinks');

if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
}