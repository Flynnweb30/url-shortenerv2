import { getLinkByShortCode, incrementClicks } from './shortener.js';

// ==========================================
// CRITICAL: RELIABLE URL REDIRECT SYSTEM
// ==========================================

// This script runs on EVERY page load at the root path
// It intercepts short URLs and redirects to the original

(function() {
    'use strict';
    
    // Get the current path
    const path = window.location.pathname;
    
    // List of valid paths that should NOT be treated as short codes
    const validPaths = [
        '/', '/dashboard.html', '/login.html', '/register.html', 
        '/404.html', '/index.html', '/favicon.ico'
    ];
    
    // Check if this is a static asset
    const assetExtensions = ['.css', '.js', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.json', '.xml'];
    const isAsset = assetExtensions.some(ext => path.endsWith(ext));
    
    // Skip redirect for valid paths and assets
    if (validPaths.includes(path) || isAsset || path === '/') {
        return;
    }

    // Extract short code (remove leading slash)
    const shortCode = path.substring(1);
    
    // Validate short code format
    if (!shortCode || !/^[a-zA-Z0-9-_]{3,30}$/.test(shortCode)) {
        // Not a valid short code format - let the page load normally
        return;
    }

    // --- WE HAVE A VALID SHORT CODE ---
    // Show loading state
    showRedirectLoading();

    // Attempt to find and redirect
    handleRedirect(shortCode);

    async function handleRedirect(shortCode) {
        try {
            // Get the link from Firestore
            const link = await getLinkByShortCode(shortCode);
            
            if (link && link.longUrl) {
                // Increment click count (fire and forget)
                if (link.id) {
                    incrementClicks(link.id).catch(err => {
                        console.warn('Failed to increment clicks:', err);
                    });
                }
                
                // Show success animation
                showRedirectSuccess(link);
                
                // Redirect after a small delay for the animation
                setTimeout(() => {
                    window.location.href = link.longUrl;
                }, 600);
            } else {
                // Link not found or expired
                showRedirectError('Link not found or has expired.');
                setTimeout(() => {
                    window.location.href = '/404.html';
                }, 2000);
            }
        } catch (error) {
            console.error('Redirect error:', error);
            showRedirectError('Something went wrong. Redirecting to home...');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        }
    }

    function showRedirectLoading() {
        // Remove any existing content
        document.body.innerHTML = '';
        document.body.style.cssText = `
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        const container = document.createElement('div');
        container.style.cssText = `
            text-align: center;
            padding: 40px;
            animation: fadeInUp 0.6s ease;
        `;
        
        container.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 20px; display: inline-block; animation: spin 2s linear infinite;">
                🔗
            </div>
            <h2 style="color: #1E293B; margin-bottom: 8px;">Finding your link...</h2>
            <p style="color: #64748B; margin-bottom: 20px;">Please wait while we redirect you</p>
            <div style="width: 200px; height: 4px; background: #E2E8F0; border-radius: 2px; margin: 0 auto; overflow: hidden;">
                <div style="width: 30%; height: 100%; background: linear-gradient(90deg, #6C63F9, #00D4AA); border-radius: 2px; animation: progress 1.5s ease-in-out infinite;"></div>
            </div>
            <style>
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
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
        // Update the page with success state
        const container = document.querySelector('div');
        if (container) {
            container.innerHTML = `
                <div style="font-size: 64px; margin-bottom: 20px; animation: bounceIn 0.6s ease;">
                    🎯
                </div>
                <h2 style="color: #16A34A; margin-bottom: 4px;">Redirecting...</h2>
                <p style="color: #64748B; margin-bottom: 4px;">Taking you to</p>
                <p style="color: #1E293B; font-weight: 600; word-break: break-all; max-width: 400px; margin: 0 auto;">
                    ${link.longUrl}
                </p>
                <p style="color: #94A3B8; font-size: 14px; margin-top: 12px;">
                    <i class="fas fa-check-circle" style="color: #16A34A;"></i> 
                    Link found! You'll be redirected shortly.
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

    function showRedirectError(message) {
        const container = document.querySelector('div');
        if (container) {
            container.innerHTML = `
                <div style="font-size: 64px; margin-bottom: 20px;">😕</div>
                <h2 style="color: #DC2626; margin-bottom: 4px;">Oops!</h2>
                <p style="color: #64748B;">${message}</p>
            `;
        }
    }
})();