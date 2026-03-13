/**
 * Firebase Configuration
 * 
 * Initializes the Firebase app and services (Auth, Firestore).
 * Uses Expo's public environment variables for configuration.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

import { Platform } from 'react-native';

// Firebase Configuration utilizing Expo Public Environment Variables
const getApiKey = () => {
    if (Platform.OS === 'ios') return process.env.EXPO_PUBLIC_FIREBASE_API_KEY_IOS || "AIzaSyBlVMCf9c3A4eNtZLu6TyAckoADF7KSnik";
    if (Platform.OS === 'android') return process.env.EXPO_PUBLIC_FIREBASE_API_KEY_ANDROID || "AIzaSyDZ0s2Tn_209je_iPfAN-C07WiPRyNp8ho";
    return process.env.EXPO_PUBLIC_FIREBASE_API_KEY_WEB || "AIzaSyCKSsWcII16luCPgp9LfOpDjNgH6N4rqv4";
};

const getAppId = () => {
    if (Platform.OS === 'ios') return process.env.EXPO_PUBLIC_FIREBASE_APP_ID_IOS || "1:722571257298:ios:5f4c4c7b8c7c7f7f"; // Fallback placeholder
    if (Platform.OS === 'android') return process.env.EXPO_PUBLIC_FIREBASE_APP_ID_ANDROID || "1:722571257298:android:5f4c4c7b8c7c7f7f"; // Fallback placeholder
    return process.env.EXPO_PUBLIC_FIREBASE_APP_ID_WEB || "1:722571257298:web:3b29b9fa2dc28b4250140b";
};

export const firebaseConfig = {
    apiKey: getApiKey(),
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "mygamevote.com",
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "mygameslot-324a5",
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "mygameslot-324a5.firebasestorage.app",
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "722571257298",
    appId: getAppId(),
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-4N1ZGL4B56"
};

// Initialize Firebase (Check for existing apps to prevent HMR errors)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);