# URL Shortener - my.short

A modern, responsive URL shortener with Firebase authentication, custom aliases, and click tracking.

## Features

- 🔗 **Smart URL Shortening** - Create short, clean URLs instantly
- ✏️ **Custom Aliases** - Brand your links with memorable names
- 🔒 **Password Protection** - Secure your analytics with passwords
- 📊 **Real-time Analytics** - Track clicks and engagement
- 🚀 **Google Sign-In** - Quick and secure authentication
- 📱 **Fully Responsive** - Works on all devices
- 🔐 **User Isolation** - Each user's data is private and secure

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES Modules)
- **Backend**: Firebase (Firestore, Authentication)
- **Hosting**: Static hosting (Netlify, Render, Vercel)

## Setup Instructions

### 1. Firebase Configuration

1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Authentication (Email/Password + Google)
3. Create Firestore Database
4. Copy your Firebase config object

### 2. Update Firebase Config

Open `/public/js/firebase.js` and replace with your config:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};