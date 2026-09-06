import { 
    collection, 
    doc, 
    getDocs, 
    query, 
    where, 
    addDoc, 
    updateDoc, 
    deleteDoc,
    getDoc,
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { db } from './firebase.js';

// Generate a unique short code with retry logic
const generateShortCode = async (maxAttempts = 20) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const codeLength = 6;
    let attempts = 0;
    let usedCodes = new Set();

    while (attempts < maxAttempts) {
        let code = '';
        for (let i = 0; i < codeLength; i++) {
            code += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        
        // Skip if we've already tried this code in this session
        if (usedCodes.has(code)) {
            attempts++;
            continue;
        }
        usedCodes.add(code);

        const isUnique = await checkShortCodeUnique(code);
        if (isUnique) {
            return code;
        }
        attempts++;
    }
    throw new Error('Unable to generate unique short code. Please try again.');
};

// Check if a short code is unique with caching
const codeCache = new Map();
const checkShortCodeUnique = async (shortCode) => {
    // Check cache first
    if (codeCache.has(shortCode)) {
        return codeCache.get(shortCode);
    }

    try {
        const linksRef = collection(db, 'links');
        const q = query(linksRef, where('shortCode', '==', shortCode));
        const querySnapshot = await getDocs(q);
        const isUnique = querySnapshot.empty;
        
        // Cache result for 5 seconds
        codeCache.set(shortCode, isUnique);
        setTimeout(() => codeCache.delete(shortCode), 5000);
        
        return isUnique;
    } catch (error) {
        console.error('Error checking short code:', error);
        return true; // Assume unique on error to avoid blocking
    }
};

// Create a short link with enhanced validation
export const createShortLink = async (longUrl, customAlias, analyticsPassword, linkTitle, expiresInDays, userId = null) => {
    try {
        // Validate URL
        if (!longUrl || !longUrl.trim()) {
            throw new Error('URL is required');
        }

        // Validate URL format with better error messages
        let url;
        try {
            url = new URL(longUrl);
            if (!url.protocol.startsWith('http')) {
                throw new Error('URL must start with http:// or https://');
            }
        } catch (error) {
            if (error.message.includes('Invalid URL')) {
                throw new Error('Please enter a valid URL including http:// or https://');
            }
            throw error;
        }

        let shortCode = customAlias ? customAlias.trim() : null;

        // If custom alias provided, validate it
        if (shortCode) {
            if (!/^[a-zA-Z0-9-_]{3,30}$/.test(shortCode)) {
                throw new Error('Alias must be 3-30 characters and contain only letters, numbers, hyphens, and underscores');
            }

            const isUnique = await checkShortCodeUnique(shortCode);
            if (!isUnique) {
                throw new Error('This alias is already taken. Please choose another.');
            }
        } else {
            shortCode = await generateShortCode();
        }

        // Prepare link data
        const linkData = {
            longUrl: longUrl.trim(),
            shortCode: shortCode,
            clicks: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            analyticsPassword: analyticsPassword ? analyticsPassword.trim() : null,
            title: linkTitle ? linkTitle.trim() : null,
            expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null,
            isActive: true,
            userId: userId || null,
            isGuest: !userId,
            // Add metadata for analytics
            userAgent: navigator.userAgent,
            referrer: document.referrer || null
        };

        // Save to Firestore with retry
        let docRef;
        let retries = 3;
        while (retries > 0) {
            try {
                const linksRef = collection(db, 'links');
                docRef = await addDoc(linksRef, linkData);
                break;
            } catch (error) {
                retries--;
                if (retries === 0) throw error;
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }

        // Get the created document
        const docSnapshot = await getDoc(docRef);
        if (!docSnapshot.exists()) {
            throw new Error('Failed to retrieve created link');
        }

        return {
            id: docRef.id,
            ...docSnapshot.data(),
            createdAt: docSnapshot.data().createdAt?.toDate?.() || new Date(),
            updatedAt: docSnapshot.data().updatedAt?.toDate?.() || new Date()
        };

    } catch (error) {
        console.error('Error creating short link:', error);
        throw error;
    }
};

// Get link by short code with enhanced caching
const linkCache = new Map();
export const getLinkByShortCode = async (shortCode) => {
    // Check cache
    if (linkCache.has(shortCode)) {
        const cached = linkCache.get(shortCode);
        // Cache for 10 seconds
        if (Date.now() - cached.timestamp < 10000) {
            return cached.data;
        }
        linkCache.delete(shortCode);
    }

    try {
        const linksRef = collection(db, 'links');
        const q = query(linksRef, where('shortCode', '==', shortCode), where('isActive', '==', true));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            linkCache.set(shortCode, { data: null, timestamp: Date.now() });
            return null;
        }

        const doc = querySnapshot.docs[0];
        const data = doc.data();

        // Check if link has expired
        if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
            await updateDoc(doc.ref, { isActive: false });
            linkCache.set(shortCode, { data: null, timestamp: Date.now() });
            return null;
        }

        const linkData = {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
            expiresAt: data.expiresAt?.toDate?.() || null
        };

        // Cache the result
        linkCache.set(shortCode, { data: linkData, timestamp: Date.now() });
        
        return linkData;
    } catch (error) {
        console.error('Error getting link:', error);
        return null;
    }
};

// Increment click count with atomic update
export const incrementClicks = async (linkId) => {
    try {
        const linkRef = doc(db, 'links', linkId);
        const docSnap = await getDoc(linkRef);
        if (docSnap.exists()) {
            const currentClicks = docSnap.data().clicks || 0;
            await updateDoc(linkRef, {
                clicks: currentClicks + 1,
                lastClicked: serverTimestamp()
            });
            // Invalidate cache for this link
            const data = docSnap.data();
            if (data.shortCode) {
                linkCache.delete(data.shortCode);
            }
        }
    } catch (error) {
        console.error('Error incrementing clicks:', error);
        // Don't throw - clicks are non-critical
    }
};

// Get user's links
export const getUserLinks = async (userId) => {
    try {
        if (!userId) {
            return [];
        }
        
        const linksRef = collection(db, 'links');
        const q = query(linksRef, where('userId', '==', userId));
        const querySnapshot = await getDocs(q);

        const links = [];
        querySnapshot.forEach(doc => {
            const data = doc.data();
            links.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate?.() || new Date(),
                updatedAt: data.updatedAt?.toDate?.() || new Date(),
                expiresAt: data.expiresAt?.toDate?.() || null
            });
        });

        // Sort by createdAt descending (newest first)
        links.sort((a, b) => b.createdAt - a.createdAt);

        return links;
    } catch (error) {
        console.error('Error getting user links:', error);
        return [];
    }
};

// Delete a link
export const deleteLink = async (linkId, userId) => {
    try {
        const linkRef = doc(db, 'links', linkId);
        const docSnap = await getDoc(linkRef);
        
        if (!docSnap.exists()) {
            throw new Error('Link not found');
        }
        
        const data = docSnap.data();
        
        if (userId && data.userId && data.userId !== userId) {
            throw new Error('You do not have permission to delete this link');
        }
        
        // Invalidate cache
        if (data.shortCode) {
            linkCache.delete(data.shortCode);
        }
        
        await deleteDoc(linkRef);
        return true;
    } catch (error) {
        console.error('Error deleting link:', error);
        throw error;
    }
};

// Update a link
export const updateLink = async (linkId, updates, userId) => {
    try {
        const linkRef = doc(db, 'links', linkId);
        const docSnap = await getDoc(linkRef);
        
        if (!docSnap.exists()) {
            throw new Error('Link not found');
        }
        
        const data = docSnap.data();
        
        if (userId && data.userId && data.userId !== userId) {
            throw new Error('You do not have permission to update this link');
        }
        
        // Invalidate cache
        if (data.shortCode) {
            linkCache.delete(data.shortCode);
        }
        
        await updateDoc(linkRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Error updating link:', error);
        throw error;
    }
};

// Validate short code
export const validateShortCode = async (shortCode) => {
    try {
        const link = await getLinkByShortCode(shortCode);
        return link !== null;
    } catch (error) {
        console.error('Error validating short code:', error);
        return false;
    }
};