import { auth, googleProvider } from './firebase.js';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signOut,
    updateProfile,
    onAuthStateChanged,
    sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { doc, setDoc, getDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { db } from './firebase.js';

// Toast notifications
function showToast(message, type = 'success') {
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
    toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-removing');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Toggle password visibility
window.togglePassword = function(inputId, button) {
    const input = document.getElementById(inputId);
    const icon = button.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
};

// Login functionality
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const errorDisplay = document.getElementById('loginError');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            const rememberMe = document.getElementById('rememberMe')?.checked || false;

            // Clear previous errors
            clearErrors('login');

            // Validate
            if (!email || !password) {
                showFieldError('loginEmail', 'Please enter your email');
                showFieldError('loginPassword', 'Please enter your password');
                return;
            }

            // Show loading state
            loginBtn.disabled = true;
            loginBtn.querySelector('.btn-text').textContent = 'Signing in...';
            loginBtn.querySelector('.btn-spinner').style.display = 'inline-block';
            errorDisplay.style.display = 'none';

            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Update user profile if needed
                if (!user.displayName && user.email) {
                    await updateProfile(user, {
                        displayName: user.email.split('@')[0]
                    });
                }

                showToast('Welcome back! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 1000);
            } catch (error) {
                console.error('Login error:', error);
                errorDisplay.textContent = getAuthErrorMessage(error.code);
                errorDisplay.style.display = 'block';
                loginBtn.querySelector('.btn-text').textContent = 'Sign In';
                loginBtn.querySelector('.btn-spinner').style.display = 'none';
                loginBtn.disabled = false;
            }
        });
    }

    // Google Login
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async () => {
            googleLoginBtn.disabled = true;
            googleLoginBtn.querySelector('span').textContent = 'Signing in...';

            try {
                const result = await signInWithPopup(auth, googleProvider);
                const user = result.user;

                // Create user document if new
                await createUserDocument(user);

                showToast('Welcome! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 1000);
            } catch (error) {
                console.error('Google login error:', error);
                showToast(getAuthErrorMessage(error.code), 'error');
                googleLoginBtn.disabled = false;
                googleLoginBtn.querySelector('span').textContent = 'Sign in with Google';
            }
        });
    }

    // Register functionality
    const registerForm = document.getElementById('registerForm');
    const registerBtn = document.getElementById('registerBtn');
    const googleRegisterBtn = document.getElementById('googleRegisterBtn');
    const registerError = document.getElementById('registerError');

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('registerName').value.trim();
            const email = document.getElementById('registerEmail').value.trim();
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('registerConfirmPassword').value;
            const termsChecked = document.getElementById('termsCheckbox').checked;

            // Clear previous errors
            clearErrors('register');

            let hasError = false;

            // Validate
            if (!email) {
                showFieldError('registerEmail', 'Please enter your email');
                hasError = true;
            }
            if (!password) {
                showFieldError('registerPassword', 'Please create a password');
                hasError = true;
            }
            if (password.length < 6) {
                showFieldError('registerPassword', 'Password must be at least 6 characters');
                hasError = true;
            }
            if (password !== confirmPassword) {
                showFieldError('registerConfirm', 'Passwords do not match');
                hasError = true;
            }
            if (!termsChecked) {
                showFieldError('registerTerms', 'Please agree to the Terms of Service');
                hasError = true;
            }

            if (hasError) return;

            // Show loading state
            registerBtn.disabled = true;
            registerBtn.querySelector('.btn-text').textContent = 'Creating account...';
            registerBtn.querySelector('.btn-spinner').style.display = 'inline-block';
            registerError.style.display = 'none';

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Update profile with name
                if (name) {
                    await updateProfile(user, { displayName: name });
                }

                // Create user document in Firestore
                await createUserDocument(user);

                showToast('Account created! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 1000);
            } catch (error) {
                console.error('Registration error:', error);
                registerError.textContent = getAuthErrorMessage(error.code);
                registerError.style.display = 'block';
                registerBtn.querySelector('.btn-text').textContent = 'Create Account';
                registerBtn.querySelector('.btn-spinner').style.display = 'none';
                registerBtn.disabled = false;
            }
        });
    }

    // Google Register
    if (googleRegisterBtn) {
        googleRegisterBtn.addEventListener('click', async () => {
            googleRegisterBtn.disabled = true;
            googleRegisterBtn.querySelector('span').textContent = 'Signing up...';

            try {
                const result = await signInWithPopup(auth, googleProvider);
                const user = result.user;

                await createUserDocument(user);

                showToast('Account created! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 1000);
            } catch (error) {
                console.error('Google registration error:', error);
                showToast(getAuthErrorMessage(error.code), 'error');
                googleRegisterBtn.disabled = false;
                googleRegisterBtn.querySelector('span').textContent = 'Sign up with Google';
            }
        });
    }

    // Check if already authenticated
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // If on login or register page, redirect to dashboard
            const path = window.location.pathname;
            if (path === '/login.html' || path === '/register.html') {
                window.location.href = '/dashboard.html';
            }
        }
    });
});

// Helper: Create user document in Firestore
async function createUserDocument(user) {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
        await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            photoURL: user.photoURL || null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            totalLinks: 0,
            totalClicks: 0
        });
    }
}

// Helper: Show field error
function showFieldError(fieldId, message) {
    const errorElement = document.getElementById(`${fieldId}Error`);
    if (errorElement) {
        errorElement.textContent = message;
    }
    const input = document.getElementById(fieldId.replace('Error', ''));
    if (input) {
        input.classList.add('error');
    }
}

// Helper: Clear all errors
function clearErrors(prefix) {
    const errorElements = document.querySelectorAll(`[id^="${prefix}"]`);
    errorElements.forEach(el => {
        if (el.id.endsWith('Error')) {
            el.textContent = '';
        }
    });
    const inputs = document.querySelectorAll(`#${prefix}Form input`);
    inputs.forEach(input => input.classList.remove('error'));
}

// Helper: Get user-friendly auth error message
function getAuthErrorMessage(code) {
    const messages = {
        'auth/user-not-found': 'No account found with this email address.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/email-already-in-use': 'This email is already registered. Please login.',
        'auth/invalid-email': 'Invalid email format. Please check your email.',
        'auth/weak-password': 'Password should be at least 6 characters.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/network-request-failed': 'Network error. Please check your connection.',
        'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.',
        'auth/cancelled-popup-request': 'Another sign-in attempt is already in progress.',
        'auth/requires-recent-login': 'Please sign in again to continue.',
        'auth/account-exists-with-different-credential': 'An account exists with the same email but different sign-in method.'
    };
    return messages[code] || 'An error occurred. Please try again.';
}

// Handle logout globally
window.handleLogout = async function() {
    try {
        await signOut(auth);
        showToast('Logged out successfully', 'info');
        setTimeout(() => {
            window.location.href = '/';
        }, 500);
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Failed to logout', 'error');
    }
};