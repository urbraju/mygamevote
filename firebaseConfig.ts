/**
 * Firebase Configuration
 * 
 * Initializes the Firebase app and services (Auth, Firestore).
 * Uses Expo's public environment variables for configuration.
 */
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: Replace with your Firebase project configuration
export const firebaseConfig = {
    apiKey: "AIzaSyB15Kt1QJFxq84yFgBjDMwILj6WDYE6_qU",
    authDomain: "mygameslot-324a5.firebaseapp.com",
    projectId: "mygameslot-324a5",
    storageBucket: "mygameslot-324a5.firebasestorage.app",
    messagingSenderId: "722571257298",
    appId: "1:722571257298:web:3b29b9fa2dc28b4250140b",
    measurementId: "G-4N1ZGL4B56"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
import { getFunctions } from 'firebase/functions';
export const functions = getFunctions(app);

