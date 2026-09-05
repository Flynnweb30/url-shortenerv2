# URL Shortener - my.short

A modern, responsive URL shortener application with analytics tracking and custom aliases.

## Features

- 🔗 **Smart URL Shortening** - Create short, clean URLs instantly
- ✏️ **Custom Aliases** - Brand your links with memorable names
- 🔒 **Password Protection** - Secure your analytics with passwords
- 📊 **Real-time Analytics** - Track clicks and engagement
- 📱 **Fully Responsive** - Works on all devices
- 🎨 **Modern UI** - Clean, intuitive interface

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES Modules)
- **Backend**: Firebase (Firestore, Authentication)
- **Hosting**: Netlify Ready

## Setup Instructions

### 1. Firebase Configuration

1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Authentication (Email/Password)
3. Create Firestore Database
4. Copy your Firebase config object

### 2. Update Firebase Config

Open `/public/js/firebase.js` and replace with your config:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBFF9m_6NidWN0HxpDG9TRjOLiytOgNbn4",
  authDomain: "url-shortener-61f15.firebaseapp.com",
  projectId: "url-shortener-61f15",
  storageBucket: "url-shortener-61f15.firebasestorage.app",
  messagingSenderId: "641845296081",
  appId: "1:641845296081:web:e4bafa6ceb44db0f763ef0",
};
