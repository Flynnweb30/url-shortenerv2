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
    serverTimestamp,
    limit
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { db } from './firebase.js';

// Generate unique short code
async function generateShortCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length = 6;
    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
        let code = '';
        for (let i = 0; i < length; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        const exists = await checkShortCodeExists(code);
        if (!exists) {
            return code;
        }
        attempts++;
    }
    throw new Error('Unable to generate unique code');
}

// Check if short code exists
async function checkShortCodeExists(shortCode) {
    try {
        const linksRef = collection(db, 'links');
        const q = query(linksRef, where('shortCode', '==', shortCode), limit(1));
        const snapshot = await getDocs(q);
        return !snapshot.empty;
    } catch (error) {
        console.error('Error checking short code:', error);
        return false;
    }
}

// Create short link
export async function createShortLink(longUrl, customAlias, title, expiresIn, userId = null) {
    try {
        if (!longUrl || !longUrl.trim()) {
            throw new Error('URL is required');
        }

        try {
            new URL(longUrl);
        } catch {
            throw new Error('Invalid URL format. Include http:// or https://');
        }

        let shortCode = customAlias ? customAlias.trim() : null;

        if (shortCode) {
            if (!/^[a-zA-Z0-9-_]{3,30}$/.test(shortCode)) {
                throw new Error('Alias must be 3-30 characters (letters, numbers, -, _)');
            }
            
            const exists = await checkShortCodeExists(shortCode);
            if (exists) {
                throw new Error('This alias is already taken');
            }
        } else {
            shortCode = await generateShortCode();
        }

        const linkData = {
            longUrl: longUrl.trim(),
            shortCode: shortCode,
            clicks: 0,
            createdAt: serverTimestamp(),
            title: title ? title.trim() : null,
            expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000) : null,
            isActive: true,
            userId: userId || null,
            isGuest: !userId
        };

        const linksRef = collection(db, 'links');
        const docRef = await addDoc(linksRef, linkData);
        const docSnap = await getDoc(docRef);

        return {
            id: docRef.id,
            ...docSnap.data(),
            createdAt: docSnap.data().createdAt?.toDate?.() || new Date()
        };
    } catch (error) {
        console.error('Create link error:', error);
        throw error;
    }
}

// Get link by short code - CRITICAL for redirects
export async function getLinkByShortCode(shortCode) {
    try {
        const linksRef = collection(db, 'links');
        const q = query(linksRef, where('shortCode', '==', shortCode), where('isActive', '==', true), limit(1));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return null;
        }

        const doc = snapshot.docs[0];
        const data = doc.data();

        // Check if link has expired
        if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
            await updateDoc(doc.ref, { isActive: false });
            return null;
        }

        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            expiresAt: data.expiresAt?.toDate?.() || null
        };
    } catch (error) {
        console.error('Get link error:', error);
        return null;
    }
}

// Increment clicks
export async function incrementClicks(linkId) {
    try {
        const linkRef = doc(db, 'links', linkId);
        const snap = await getDoc(linkRef);
        if (snap.exists()) {
            const clicks = snap.data().clicks || 0;
            await updateDoc(linkRef, {
                clicks: clicks + 1,
                lastClicked: serverTimestamp()
            });
        }
    } catch (error) {
        console.error('Increment clicks error:', error);
    }
}

// Get user links
export async function getUserLinks(userId) {
    try {
        if (!userId) return [];
        
        const linksRef = collection(db, 'links');
        const q = query(linksRef, where('userId', '==', userId));
        const snapshot = await getDocs(q);

        const links = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            links.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate?.() || new Date(),
                expiresAt: data.expiresAt?.toDate?.() || null
            });
        });

        links.sort((a, b) => b.createdAt - a.createdAt);
        return links;
    } catch (error) {
        console.error('Get user links error:', error);
        return [];
    }
}

// Delete link
export async function deleteLink(linkId, userId) {
    try {
        const linkRef = doc(db, 'links', linkId);
        const snap = await getDoc(linkRef);
        
        if (!snap.exists()) {
            throw new Error('Link not found');
        }

        const data = snap.data();
        if (data.userId && data.userId !== userId) {
            throw new Error('Permission denied');
        }

        await deleteDoc(linkRef);
        return true;
    } catch (error) {
        console.error('Delete link error:', error);
        throw error;
    }
}