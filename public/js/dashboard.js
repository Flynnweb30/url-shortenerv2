import { auth } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getUserLinks, deleteLink } from './shortener.js';

// Auth check
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = '/login.html';
        return;
    }
    loadLinks(user.uid);
});

// Load links
async function loadLinks(userId) {
    try {
        const links = await getUserLinks(userId);
        renderLinks(links);
        updateStats(links);
    } catch (error) {
        console.error('Load links error:', error);
        showToast('Failed to load links', 'error');
    }
}

// Render links
function renderLinks(links) {
    const container = document.getElementById('linksContainer');
    
    if (!container) return;
    
    if (links.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div style="font-size:48px; margin-bottom:16px;">🔗</div>
                <h3>No links yet</h3>
                <p>Create your first short link</p>
                <a href="/" class="btn-primary" style="display:inline-block; padding:10px 24px; border-radius:8px; text-decoration:none; margin-top:12px;">Create Link</a>
            </div>
        `;
        return;
    }

    let html = '<div class="links-list">';
    links.forEach(link => {
        const shortUrl = `${window.location.origin}/${link.shortCode}`;
        const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();
        const status = isExpired ? 'Expired' : 'Active';
        const statusClass = isExpired ? 'status-expired' : 'status-active';

        html += `
            <div class="link-item">
                <div class="link-info">
                    <div class="link-title">${link.title || link.shortCode}</div>
                    <div class="link-short">
                        <a href="${shortUrl}" target="_blank">${shortUrl}</a>
                        <button onclick="copyLink('${shortUrl}')" style="background:none; border:none; cursor:pointer;">📋</button>
                    </div>
                    <div class="link-original">${link.longUrl}</div>
                    <div class="link-meta">
                        <span>👆 ${link.clicks || 0} clicks</span>
                        <span class="${statusClass}">● ${status}</span>
                        ${link.expiresAt ? `<span>📅 Expires: ${new Date(link.expiresAt).toLocaleDateString()}</span>` : ''}
                    </div>
                </div>
                <div class="link-actions">
                    <button onclick="deleteLink('${link.id}')" class="btn-danger">Delete</button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

// Update stats
function updateStats(links) {
    const total = document.getElementById('totalLinks');
    const clicks = document.getElementById('totalClicks');
    const active = document.getElementById('activeLinks');
    
    if (total) total.textContent = links.length;
    if (clicks) clicks.textContent = links.reduce((sum, l) => sum + (l.clicks || 0), 0);
    if (active) active.textContent = links.filter(l => l.isActive !== false).length;
}

// Copy link
window.copyLink = function(url) {
    navigator.clipboard.writeText(url).then(() => {
        showToast('Link copied!');
    }).catch(() => {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        input.remove();
        showToast('Link copied!');
    });
};

// Delete link
window.deleteLink = async function(linkId) {
    if (!confirm('Delete this link?')) return;
    
    try {
        const user = auth.currentUser;
        if (!user) return;
        
        await deleteLink(linkId, user.uid);
        showToast('Link deleted');
        loadLinks(user.uid);
    } catch (error) {
        console.error('Delete error:', error);
        showToast(error.message, 'error');
    }
};

// Toast
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