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

export default function Layout() {
    return (
        <AuthProvider>
            <Slot />
        </AuthProvider>
    );
}
