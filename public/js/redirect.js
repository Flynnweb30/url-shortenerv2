// ==========================================
// URL REDIRECT HANDLER - Runs on EVERY page load
// This is the most important file for redirects!
// ==========================================

(async function() {
    try {
        // Get the current path
        const path = window.location.pathname;
        console.log('📍 Redirect check for path:', path);
        
        // Skip known pages and assets
        const skipPaths = [
            '/', '/index.html', '/dashboard.html', '/login.html', 
            '/register.html', '/404.html', '/favicon.ico'
        ];
        
        if (skipPaths.includes(path) || path === '/') {
            console.log('⏭️ Skipping redirect (known path)');
            return;
        }

        // Skip static assets
        const assetExtensions = ['.css', '.js', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.json', '.xml', '.webmanifest'];
        if (assetExtensions.some(ext => path.endsWith(ext))) {
            console.log('⏭️ Skipping redirect (asset file)');
            return;
        }

        // Extract short code
        const shortCode = path.substring(1);
        console.log('🔗 Short code detected:', shortCode);
        
        // Validate format - must be 3-30 chars, alphanumeric + - _
        if (!shortCode || !/^[a-zA-Z0-9-_]{3,30}$/.test(shortCode)) {
            console.log('⏭️ Skipping redirect (invalid short code format)');
            return;
        }

        console.log('🚀 Attempting redirect for:', shortCode);

        // Show loading animation immediately
        showRedirectLoading();

        // Load Firebase and shortener dynamically
        const { getLinkByShortCode, incrementClicks } = await import('./shortener.js');
        
        // Look up the link in Firestore
        const link = await getLinkByShortCode(shortCode);
        console.log('📦 Link found:', link ? 'Yes' : 'No');
        
        if (link && link.longUrl) {
            // Increment clicks
            if (link.id) {
                await incrementClicks(link.id);
            }
            
            // Show success then redirect
            showRedirectSuccess(link);
            setTimeout(() => {
                console.log('🔀 Redirecting to:', link.longUrl);
                window.location.href = link.longUrl;
            }, 800);
        } else {
            console.log('❌ Link not found for:', shortCode);
            showRedirectError();
            setTimeout(() => {
                window.location.href = '/404.html';
            }, 2000);
        }
    } catch (error) {
        console.error('💥 Redirect error:', error);
        // Show error and redirect to 404
        showRedirectError();
        setTimeout(() => {
            window.location.href = '/404.html';
        }, 2000);
    }
})();

function showRedirectLoading() {
    // Clear and style page
    document.body.innerHTML = '';
    document.body.style.cssText = `
        margin: 0;
        padding: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    const container = document.createElement('div');
    container.style.cssText = `
        text-align: center;
        padding: 40px;
        animation: fadeInUp 0.6s ease;
    `;
    
    container.innerHTML = `
        <div style="font-size: 64px; margin-bottom: 20px; display: inline-block; animation: pulse 1.5s ease-in-out infinite;">
            🔗
        </div>
        <h2 style="color: #1e293b; margin-bottom: 8px; font-size: 24px;">Redirecting you...</h2>
        <p style="color: #64748b; margin-bottom: 24px;">Finding your link</p>
        <div style="width: 240px; height: 4px; background: #e2e8f0; border-radius: 2px; margin: 0 auto; overflow: hidden;">
            <div style="width: 30%; height: 100%; background: linear-gradient(90deg, #6C63F9, #00D4AA); border-radius: 2px; animation: progress 1.5s ease-in-out infinite;"></div>
        </div>
        <style>
            @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
            @keyframes progress {
                0% { width: 10%; }
                50% { width: 70%; }
                100% { width: 90%; }
            }
        </style>
    `;
    
    document.body.appendChild(container);
}

function showRedirectSuccess(link) {
    const container = document.querySelector('body > div');
    if (container) {
        container.innerHTML = `
            <div style="font-size: 64px; margin-bottom: 20px; animation: bounceIn 0.6s ease;">
                🎯
            </div>
            <h2 style="color: #16a34a; margin-bottom: 4px; font-size: 24px;">Redirecting...</h2>
            <p style="color: #64748b; margin-bottom: 4px;">Taking you to</p>
            <p style="color: #1e293b; font-weight: 600; word-break: break-all; max-width: 500px; margin: 8px auto;">
                ${link.longUrl}
            </p>
            <p style="color: #94a3b8; font-size: 14px; margin-top: 12px;">
                ✅ Link found! Redirecting shortly...
            </p>
            <style>
                @keyframes bounceIn {
                    0% { transform: scale(0.3); opacity: 0; }
                    50% { transform: scale(1.1); }
                    70% { transform: scale(0.9); }
                    100% { transform: scale(1); opacity: 1; }
                }
            </style>
        `;
    }
}

function showRedirectError() {
    const container = document.querySelector('body > div');
    if (container) {
        container.innerHTML = `
            <div style="font-size: 64px; margin-bottom: 20px;">😕</div>
            <h2 style="color: #dc2626; margin-bottom: 4px; font-size: 24px;">Link Not Found</h2>
            <p style="color: #64748b; margin-top: 8px;">This short link doesn't exist or has expired.</p>
            <p style="color: #94a3b8; font-size: 14px; margin-top: 12px;">Redirecting to home...</p>
        `;
    }
}