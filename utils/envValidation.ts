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
        const errorMsg = `Missing environment variables: ${missing.join(', ')}. Please check your .env file or EAS secrets.`;
        if (__DEV__) {
            console.error(errorMsg);
        } else {
            // In production, we might want to log this to a crash reporter or just fail gracefully
            console.warn(errorMsg);
        }
        return false;
    }

    return true;
};
