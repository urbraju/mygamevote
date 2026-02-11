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

import { ErrorBoundary } from "../components/ErrorBoundary";

export default function Layout() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <Slot />
            </AuthProvider>
        </ErrorBoundary>
    );
}
