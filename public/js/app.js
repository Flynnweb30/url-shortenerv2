import { auth } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { createShortLink } from './shortener.js';

// ==========================================
// AUTH STATE
// ==========================================
let currentUser = null;

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    updateUI(user);
});

function updateUI(user) {
    const loginLink = document.getElementById('loginLink');
    const registerLink = document.getElementById('registerLink');
    const logoutBtn = document.getElementById('logoutBtn');
    const userName = document.getElementById('userName');
    const dashboardLink = document.getElementById('dashboardLink');
    const guestNotice = document.getElementById('guestNotice');

    if (user) {
        loginLink.style.display = 'none';
        registerLink.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        userName.style.display = 'inline-block';
        userName.textContent = user.displayName || user.email || 'User';
        dashboardLink.style.display = 'inline-block';
        if (guestNotice) guestNotice.style.display = 'none';
    } else {
        loginLink.style.display = 'inline-block';
        registerLink.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        userName.style.display = 'none';
        dashboardLink.style.display = 'none';
        if (guestNotice) guestNotice.style.display = 'flex';
    }
}

// ==========================================
// LOGOUT
// ==========================================
window.logout = async function() {
    try {
        await signOut(auth);
        showToast('Logged out successfully', 'info');
        setTimeout(() => window.location.href = '/', 500);
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Failed to logout', 'error');
    }
};

// ==========================================
// TOGGLE MOBILE
// ==========================================
window.toggleMobile = function() {
    document.getElementById('navLinks').classList.toggle('open');
};

// ==========================================
// TOAST
// ==========================================
function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ==========================================
// SHORTEN FORM
// ==========================================
const form = document.getElementById('shortenForm');
const longUrl = document.getElementById('longUrl');
const customAlias = document.getElementById('customAlias');
const linkTitle = document.getElementById('linkTitle');
const expiresIn = document.getElementById('expiresIn');
const result = document.getElementById('result');
const btnText = document.getElementById('btnText');
const btnLoader = document.getElementById('btnLoader');
const shortenBtn = document.getElementById('shortenBtn');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Show loading
    btnText.textContent = 'Creating...';
    btnLoader.style.display = 'inline-block';
    shortenBtn.disabled = true;
    result.style.display = 'none';

    try {
        const linkData = await createShortLink(
            longUrl.value,
            customAlias.value,
            linkTitle.value,
            expiresIn.value ? parseInt(expiresIn.value) : null,
            currentUser?.uid
        );

        // Show success
        result.className = 'result success';
        result.textContent = '✅ Link created successfully!';
        result.style.display = 'block';

        // Show modal with link details
        showModal(linkData);

        // Reset form
        form.reset();

    } catch (error) {
        result.className = 'result error';
        result.textContent = '❌ ' + error.message;
        result.style.display = 'block';
        showToast(error.message, 'error');
    } finally {
        btnText.textContent = 'Shorten';
        btnLoader.style.display = 'none';
        shortenBtn.disabled = false;
    }
});

// ==========================================
// MODAL
// ==========================================
function showModal(linkData) {
    const baseUrl = window.location.origin;
    const shortUrl = `${baseUrl}/${linkData.shortCode}`;
    
    document.getElementById('modalShortUrl').href = shortUrl;
    document.getElementById('modalShortUrl').textContent = shortUrl;
    document.getElementById('modalOriginalUrl').textContent = linkData.longUrl;
    
    // Show guest message if not logged in
    if (!currentUser) {
        document.getElementById('modalGuestMsg').style.display = 'block';
    } else {
        document.getElementById('modalGuestMsg').style.display = 'none';
    }
    
    document.getElementById('successModal').style.display = 'flex';
    
    // Store for copy
    document.getElementById('successModal').dataset.shortUrl = shortUrl;
}

window.closeModal = function() {
    document.getElementById('successModal').style.display = 'none';
};

window.copyLink = function() {
    const url = document.getElementById('successModal').dataset.shortUrl;
    if (url) {
        navigator.clipboard.writeText(url).then(() => {
            showToast('Link copied!');
        }).catch(() => {
            // Fallback
            const input = document.createElement('input');
            input.value = url;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            input.remove();
            showToast('Link copied!');
        });
    }
};

// Close modal on overlay click
document.getElementById('successModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        closeModal();
    }
});