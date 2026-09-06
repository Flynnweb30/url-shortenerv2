import { getLinkByShortCode, incrementClicks } from './shortener.js';

// THIS RUNS ON EVERY PAGE LOAD - HANDLES ALL SHORT URL REDIRECTS
(async function() {
    try {
        // Get the current path
        const path = window.location.pathname;
        
        // Skip if this is a known page or asset
        const skipPaths = [
            '/', '/index.html', '/dashboard.html', '/login.html', 
            '/register.html', '/404.html', '/favicon.ico'
        ];
        
        if (skipPaths.includes(path) || path === '/') {
            return;
        }

        // Skip assets
        const assetExtensions = ['.css', '.js', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.json'];
        if (assetExtensions.some(ext => path.endsWith(ext))) {
            return;
        }

        // Extract the short code
        const shortCode = path.substring(1);
        
        // Validate format
        if (!shortCode || !/^[a-zA-Z0-9-_]{3,30}$/.test(shortCode)) {
            return;
        }

        console.log('🔗 Redirecting short code:', shortCode);

        // Show loading
        showLoading();

        // Get the link
        const link = await getLinkByShortCode(shortCode);
        
        if (link && link.longUrl) {
            // Increment clicks
            if (link.id) {
                await incrementClicks(link.id);
            }
            
            // Redirect after a moment
            setTimeout(() => {
                window.location.href = link.longUrl;
            }, 500);
        } else {
            // Link not found
            setTimeout(() => {
                window.location.href = '/404.html';
            }, 1500);
            showError('Link not found or has expired.');
        }
    } catch (error) {
        console.error('Redirect error:', error);
        setTimeout(() => {
            window.location.href = '/404.html';
        }, 1500);
    }
})();

function showLoading() {
    document.body.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:center; min-height:100vh; flex-direction:column; font-family:system-ui; background:#f8fafc;">
            <div style="font-size:48px; margin-bottom:20px;">🔗</div>
            <div style="font-size:20px; font-weight:600; color:#1e293b;">Redirecting you...</div>
            <div style="color:#64748b; margin-top:8px;">Please wait</div>
            <div style="width:200px; height:4px; background:#e2e8f0; border-radius:2px; margin-top:20px; overflow:hidden;">
                <div style="width:30%; height:100%; background:linear-gradient(90deg,#6C63F9,#00D4AA); border-radius:2px; animation:progress 1.2s ease-in-out infinite;"></div>
            </div>
            <style>
                @keyframes progress {
                    0% { width: 10%; }
                    50% { width: 70%; }
                    100% { width: 90%; }
                }
            </style>
        </div>
    `;
}

function showError(message) {
    const el = document.querySelector('body > div');
    if (el) {
        el.innerHTML = `
            <div style="font-size:48px; margin-bottom:20px;">😕</div>
            <div style="font-size:20px; font-weight:600; color:#dc2626;">${message}</div>
            <div style="color:#64748b; margin-top:8px;">Redirecting to home...</div>
        `;
    }
}