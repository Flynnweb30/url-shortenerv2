import { auth } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { createShortLink } from './shortener.js';

// ==========================================
// PARTICLES BACKGROUND
// ==========================================
function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    
    const colors = ['#6C63F9', '#00D4AA', '#FBBF24', '#EF4444', '#3B82F6'];
    const count = 30;
    
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        const size = Math.random() * 6 + 2;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDuration = (Math.random() * 20 + 10) + 's';
        particle.style.animationDelay = (Math.random() * 10) + 's';
        particle.style.opacity = Math.random() * 0.3 + 0.1;
        container.appendChild(particle);
    }
}

// Initialize particles
document.addEventListener('DOMContentLoaded', createParticles);

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
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

// ==========================================
// DOM ELEMENTS
// ==========================================
const shortenForm = document.getElementById('shortenForm');
const longUrl = document.getElementById('longUrl');
const customAlias = document.getElementById('customAlias');
const analyticsPassword = document.getElementById('analyticsPassword');
const linkTitle = document.getElementById('linkTitle');
const expiresInDays = document.getElementById('expiresInDays');
const resultMessage = document.getElementById('resultMessage');
const guestNotice = document.getElementById('guestNotice');
const modalOverlay = document.getElementById('modalOverlay');
const modalShortUrl = document.getElementById('modalShortUrl');
const modalAlias = document.getElementById('modalAlias');
const modalOriginalUrl = document.getElementById('modalOriginalUrl');
const modalExpiry = document.getElementById('modalExpiry');
const modalPassword = document.getElementById('modalPassword');
const modalGuestMessage = document.getElementById('modalGuestMessage');
const modalCopyBtn = document.getElementById('modalCopyBtn');
const modalOpenBtn = document.getElementById('modalOpenBtn');
const modalCloseBtns = document.querySelectorAll('#modalCloseBtn, #modalCloseBtn2');

// ==========================================
// AUTHENTICATION STATE
// ==========================================
let currentUser = null;

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    updateUI(user);
});

function updateUI(user) {
    const loginLink = document.getElementById('loginLink');
    const signupBtn = document.getElementById('signupBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const dashboardLink = document.getElementById('dashboardLink');
    const benefitsTitle = document.getElementById('benefitsTitle');
    const ctaText = document.getElementById('ctaText');
    const ctaSection = document.getElementById('ctaSection');

    if (user) {
        if (loginLink) loginLink.style.display = 'none';
        if (signupBtn) signupBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (userNameDisplay) {
            userNameDisplay.style.display = 'inline-block';
            userNameDisplay.textContent = user.displayName || user.email || 'User';
        }
        if (dashboardLink) dashboardLink.style.display = 'inline-block';
        if (guestNotice) guestNotice.style.display = 'none';
        if (benefitsTitle) benefitsTitle.textContent = '🎉 Welcome back! You have access to all features';
        if (ctaText) ctaText.textContent = 'Create, save, and manage all your links in one place.';
        if (ctaSection) {
            const btn = ctaSection.querySelector('.cta-box .btn');
            if (btn) {
                btn.textContent = 'Go to Dashboard';
                btn.href = '/dashboard.html';
            }
        }
    } else {
        if (loginLink) loginLink.style.display = 'inline-block';
        if (signupBtn) signupBtn.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (userNameDisplay) userNameDisplay.style.display = 'none';
        if (dashboardLink) dashboardLink.style.display = 'none';
        if (guestNotice) guestNotice.style.display = 'flex';
        if (benefitsTitle) benefitsTitle.textContent = '🚀 Sign up for free to unlock more features';
        if (ctaText) ctaText.textContent = 'Start shortening URLs instantly - no account needed! Create an account to save and manage your links.';
        if (ctaSection) {
            const btn = ctaSection.querySelector('.cta-box .btn');
            if (btn) {
                btn.textContent = 'Sign Up Free';
                btn.href = '/register.html';
            }
        }
    }
}

// ==========================================
// FORM SUBMISSION
// ==========================================
if (shortenForm) {
    shortenForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('shortenBtn');
        const btnLabel = submitBtn.querySelector('.btn-label');
        const btnIcon = submitBtn.querySelector('.btn-icon');
        const btnLoader = submitBtn.querySelector('.btn-loader');
        
        // Show loading state
        submitBtn.disabled = true;
        btnLabel.textContent = 'Creating...';
        btnIcon.style.display = 'none';
        btnLoader.style.display = 'inline-block';

        try {
            const result = await createShortLink(
                longUrl.value,
                customAlias.value,
                analyticsPassword.value,
                linkTitle.value,
                expiresInDays.value ? parseInt(expiresInDays.value) : null,
                currentUser ? currentUser.uid : null
            );

            showToast('🎉 Link created successfully!');
            showModal(result);
            shortenForm.reset();

        } catch (error) {
            console.error('Error creating link:', error);
            showToast(error.message || 'Failed to create short link', 'error');
        } finally {
            // Reset button
            submitBtn.disabled = false;
            btnLabel.textContent = 'SHORTEN';
            btnIcon.style.display = 'inline-block';
            btnLoader.style.display = 'none';
        }
    });
}

// ==========================================
// MODAL
// ==========================================
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

    if (!currentUser) {
        modalGuestMessage.style.display = 'block';
    } else {
        modalGuestMessage.style.display = 'none';
    }

    modalOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    modalOverlay.dataset.shortUrl = shortUrl;
    modalOverlay.dataset.longUrl = linkData.longUrl;
}

function closeModal() {
    modalOverlay.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Copy short URL from modal
window.copyShortUrl = function() {
    const shortUrl = modalOverlay.dataset.shortUrl;
    if (shortUrl) {
        navigator.clipboard.writeText(shortUrl).then(() => {
            showToast('Link copied to clipboard!');
        }).catch(() => {
            const textArea = document.createElement('textarea');
            textArea.value = shortUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            textArea.remove();
            showToast('Link copied to clipboard!');
        });
    }
};

// Copy to clipboard
if (modalCopyBtn) {
    modalCopyBtn.addEventListener('click', window.copyShortUrl);
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

// ==========================================
// MOBILE TOGGLE
// ==========================================
const mobileToggle = document.getElementById('mobileToggle');
const navLinks = document.getElementById('navLinks');

if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
}

// ==========================================
// HANDLE LOGOUT
// ==========================================
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