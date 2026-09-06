import { getLinkByShortCode, incrementClicks } from './shortener.js';

// Enhanced redirect handler with retry logic and fallbacks
(async function() {
    try {
        // Get the path from the URL
        const path = window.location.pathname;
        
        // List of known paths to skip
        const skipPaths = [
            '/', '/dashboard.html', '/login.html', '/register.html', '/404.html',
            '/css/', '/js/', '/img/', '/favicon.ico'
        ];
        
        // Skip if known path
        if (skipPaths.some(p => path === p || path.startsWith(p))) {
            return;
        }

        // Extract short code (remove leading slash)
        const shortCode = path.substring(1);
        
        if (!shortCode) {
            return;
        }

        // Validate short code format
        if (!/^[a-zA-Z0-9-_]{3,30}$/.test(shortCode)) {
            window.location.href = '/404.html';
            return;
        }

        // Show loading state
        document.body.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                <div style="text-align:center;padding:40px;">
                    <div style="display:inline-block;width:50px;height:50px;border:4px solid #e2e8f0;border-top-color:#6C63F9;border-radius:50%;animation:spin 1s linear infinite;"></div>
                    <p style="margin-top:20px;color:#64748b;font-size:16px;">Redirecting you to your destination...</p>
                    <style>
                        @keyframes spin {
                            to { transform: rotate(360deg); }
                        }
                    </style>
                </div>
            </div>
        `;

        // Try to get the link with retry
        let link = null;
        let retries = 3;
        
        while (retries > 0 && !link) {
            try {
                link = await getLinkByShortCode(shortCode);
                if (!link) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            } catch (error) {
                console.error(`Redirect attempt ${4 - retries} failed:`, error);
            }
            retries--;
        }

        if (link && link.longUrl) {
            // Increment click count asynchronously (don't block redirect)
            if (link.id) {
                incrementClicks(link.id).catch(err => console.error('Click tracking failed:', err));
            }
            
            // Small delay to ensure click is tracked, then redirect
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Redirect to the original URL
            window.location.replace(link.longUrl);
        } else {
            // Link not found, redirect to 404
            window.location.replace('/404.html');
        }
    } catch (error) {
        console.error('Redirect error:', error);
        // On error, redirect to 404
        window.location.replace('/404.html');
    }
})();