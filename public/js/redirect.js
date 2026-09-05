import { getLinkByShortCode, incrementClicks } from './shortener.js';

// This script runs on the root path to handle short URL redirects
(async function() {
    try {
        // Get the path from the URL
        const path = window.location.pathname;
        
        // Skip if root path or known paths
        if (path === '/' || 
            path === '/dashboard.html' || 
            path === '/login.html' || 
            path === '/register.html' ||
            path === '/404.html' ||
            path.startsWith('/css/') ||
            path.startsWith('/js/') ||
            path.startsWith('/img/')) {
            return;
        }

        // Extract short code (remove leading slash)
        const shortCode = path.substring(1);
        
        if (!shortCode) {
            return;
        }

        // Check if it's a valid short code (alphanumeric, hyphens, underscores)
        if (!/^[a-zA-Z0-9-_]{3,30}$/.test(shortCode)) {
            return;
        }

        // Get the link
        const link = await getLinkByShortCode(shortCode);
        
        if (link && link.longUrl) {
            // Increment click count
            if (link.id) {
                await incrementClicks(link.id);
            }
            
            // Redirect to the original URL
            window.location.href = link.longUrl;
        } else {
            // Link not found or expired, redirect to 404
            window.location.href = '/404.html';
        }
    } catch (error) {
        console.error('Redirect error:', error);
        // On error, redirect to 404
        window.location.href = '/404.html';
    }
})();