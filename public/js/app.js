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

// Generate a unique short code
const generateShortCode = async () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const codeLength = 6;
    let attempts = 0;
    const maxAttempts = 15;

    while (attempts < maxAttempts) {
        let code = '';
        for (let i = 0; i < codeLength; i++) {
            code += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        const isUnique = await checkShortCodeUnique(code);
        if (isUnique) {
            return code;
        }
        attempts++;
    }
    throw new Error('Unable to generate unique short code. Please try again.');
};

// Check if a short code is unique
const checkShortCodeUnique = async (shortCode) => {
    try {
        const linksRef = collection(db, 'links');
        const q = query(linksRef, where('shortCode', '==', shortCode));
        const querySnapshot = await getDocs(q);
        return querySnapshot.empty;
    } catch (error) {
        console.error('Error checking short code:', error);
        return true;
    }
};

// Create a short link
export const createShortLink = async (longUrl, customAlias, analyticsPassword, linkTitle, expiresInDays, userId = null) => {
    try {
        // Validate URL
        if (!longUrl || !longUrl.trim()) {
            throw new Error('URL is required');
        }

        // Validate URL format
        try {
            new URL(longUrl);
        } catch {
            throw new Error('Invalid URL format. Please include http:// or https://');
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
            // Store userId if provided, otherwise set as guest
            userId: userId || null,
            isGuest: !userId
        };

        // Save to Firestore
        const linksRef = collection(db, 'links');
        const docRef = await addDoc(linksRef, linkData);

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

// Get link by short code
export const getLinkByShortCode = async (shortCode) => {
    try {
        const linksRef = collection(db, 'links');
        const q = query(linksRef, where('shortCode', '==', shortCode), where('isActive', '==', true));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return null;
        }

        const doc = querySnapshot.docs[0];
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
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
            expiresAt: data.expiresAt?.toDate?.() || null
        };
    } catch (error) {
        console.error('Error getting link:', error);
        return null;
    }
};

// Increment click count
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
        }
    } catch (error) {
        console.error('Error incrementing clicks:', error);
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
        // Verify ownership before deletion
        const linkRef = doc(db, 'links', linkId);
        const docSnap = await getDoc(linkRef);
        
        if (!docSnap.exists()) {
            throw new Error('Link not found');
        }
        
        const data = docSnap.data();
        
        // Only allow deletion if user owns the link or if it's a guest link and no userId provided
        if (userId && data.userId && data.userId !== userId) {
            throw new Error('You do not have permission to delete this link');
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
        // Verify ownership before update
        const linkRef = doc(db, 'links', linkId);
        const docSnap = await getDoc(linkRef);
        
        if (!docSnap.exists()) {
            throw new Error('Link not found');
        }
        
        const data = docSnap.data();
        
        // Only allow update if user owns the link
        if (userId && data.userId && data.userId !== userId) {
            throw new Error('You do not have permission to update this link');
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