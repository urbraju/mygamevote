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

// TODO: Replace with your Firebase project configuration
const getApiKey = () => {
    if (Platform.OS === 'ios') return "AIzaSyC6QJYVd7KXnl62oI5C_Mw908SSDkgi3Ns";
    if (Platform.OS === 'android') return "AIzaSyDZ0s2Tn_209je_iPfAN-C07WiPRyNp8ho";
    return "AIzaSyCKSsWcII16luCPgp9LfOpDjNgH6N4rqv4"; // Default / Web key
};

export const firebaseConfig = {
    apiKey: getApiKey(),
    authDomain: "mygamevote.com",
    projectId: "mygameslot-324a5",
    storageBucket: "mygameslot-324a5.firebasestorage.app",
    messagingSenderId: "722571257298",
    appId: "1:722571257298:web:3b29b9fa2dc28b4250140b",
    measurementId: "G-4N1ZGL4B56"
};

// Initialize Firebase (Check for existing apps to prevent HMR errors)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);