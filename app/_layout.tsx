/**
 * Root Layout
 * 
 * Defines the global layout structure and providers.
 * - Wraps the app in the AuthProvider for session management.
 * - Sets up the SafeAreaProvider.
 * - Configures the global Slot (Expo Router).
 */
import { AuthProvider } from "../context/AuthContext";
import "../global.css";
import { Slot } from 'expo-router';
import { View, Platform } from 'react-native';

import { ErrorBoundary } from "../components/ErrorBoundary"; // Handles uncaught UI errors

export default function Layout() {
    // Explicitly anchor the web root to the browser viewport window frame
    // This stops Safari from stretching the root layout to infinity when content loads
    const rootStyle = Platform.OS === 'web'
        ? ({ height: '100vh', width: '100vw', overflow: 'hidden' } as any)
        : { flex: 1 };

    return (
        <ErrorBoundary>
            <AuthProvider>
                <View style={rootStyle} className="bg-background w-full h-full">
                    <Slot />
                </View>
            </AuthProvider>
        </ErrorBoundary>
    );
}
