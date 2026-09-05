import { auth, db } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { collection, query, where, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { createShortLink } from './shortener.js';

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
const shortenSection = document.getElementById('shortenSection');
const authMessage = document.getElementById('authMessage');
const shortenForm = document.getElementById('shortenForm');
const longUrl = document.getElementById('longUrl');
const customAlias = document.getElementById('customAlias');
const analyticsPassword = document.getElementById('analyticsPassword');
const linkTitle = document.getElementById('linkTitle');
const expiresInDays = document.getElementById('expiresInDays');
const resultMessage = document.getElementById('resultMessage');
const modalOverlay = document.getElementById('modalOverlay');
const modalShortUrl = document.getElementById('modalShortUrl');
const modalAlias = document.getElementById('modalAlias');
const modalOriginalUrl = document.getElementById('modalOriginalUrl');
const modalExpiry = document.getElementById('modalExpiry');
const modalPassword = document.getElementById('modalPassword');
const modalCopyBtn = document.getElementById('modalCopyBtn');
const modalOpenBtn = document.getElementById('modalOpenBtn');
const modalCloseBtns = document.querySelectorAll('#modalCloseBtn, #modalCloseBtn2');

// Authentication state
let currentUser = null;

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    updateUI(user);
});

function updateUI(user) {
    const shortenSection = document.getElementById('shortenSection');
    const authMessage = document.getElementById('authMessage');
    const loginLink = document.getElementById('loginLink');
    const signupBtn = document.getElementById('signupBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const dashboardLink = document.getElementById('dashboardLink');

    if (user) {
        // User is authenticated
        if (shortenSection) shortenSection.style.display = 'block';
        if (authMessage) authMessage.style.display = 'none';
        if (loginLink) loginLink.style.display = 'none';
        if (signupBtn) signupBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (userNameDisplay) {
            userNameDisplay.style.display = 'inline-block';
            userNameDisplay.textContent = user.displayName || user.email || 'User';
        }
        if (dashboardLink) dashboardLink.style.display = 'inline-block';
    } else {
        // User is not authenticated
        if (shortenSection) shortenSection.style.display = 'none';
        if (authMessage) authMessage.style.display = 'block';
        if (loginLink) loginLink.style.display = 'inline-block';
        if (signupBtn) signupBtn.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (userNameDisplay) userNameDisplay.style.display = 'none';
        if (dashboardLink) dashboardLink.style.display = 'none';
    }
}

// Handle form submission
if (shortenForm) {
    shortenForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentUser) {
            showToast('Please login to shorten URLs', 'error');
            window.location.href = '/login.html';
            return;
        }

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
                expiresInDays.value ? parseInt(expiresInDays.value) : null,
                currentUser.uid
            );

            showToast('Link created successfully!');
            showModal(result);
            shortenForm.reset();

        } catch (error) {
            console.error('Error creating link:', error);
            showToast(error.message || 'Failed to create short link', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
}

// Show modal
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

// Copy to clipboard
if (modalCopyBtn) {
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
}

// Open link
if (modalOpenBtn) {
    modalOpenBtn.addEventListener('click', () => {
        const longUrl = modalOverlay.dataset.longUrl;
        if (longUrl) {
            window.open(longUrl, '_blank');
        }
    });
}

// Close modal events
modalCloseBtns.forEach(btn => {
    btn.addEventListener('click', closeModal);
});

if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.style.display === 'flex') {
        closeModal();
    }
});

// Mobile toggle
const mobileToggle = document.getElementById('mobileToggle');
const navLinks = document.getElementById('navLinks');

if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
}

// Handle logout globally
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