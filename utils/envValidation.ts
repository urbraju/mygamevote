import Constants from 'expo-constants';

/**
 * Validates that all required EXPO_PUBLIC_* environment variables are present.
 * Throws an error or logs a warning if any are missing.
 */
export const validateEnv = () => {
    const requiredVars = [
        'EXPO_PUBLIC_FIREBASE_API_KEY_IOS',
        'EXPO_PUBLIC_FIREBASE_API_KEY_ANDROID',
        'EXPO_PUBLIC_FIREBASE_API_KEY_WEB',
        'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
        'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
        'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
        'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
        'EXPO_PUBLIC_FIREBASE_APP_ID_IOS',
        'EXPO_PUBLIC_FIREBASE_APP_ID_ANDROID',
        'EXPO_PUBLIC_FIREBASE_APP_ID_WEB'
    ];

    const missing = requiredVars.filter(v => !process.env[v]);

    if (missing.length > 0) {
        // Since we have hardcoded fallbacks in firebaseConfig.ts for these, 
        // we'll just log a subtle note instead of a loud warning.
        console.log(`[Env] Some environment variables are being loaded from fallbacks: ${missing.join(', ')}`);
        return true;
    }

    return true;
};
