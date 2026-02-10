/**
 * Auth Context
 * 
 * Manages the global authentication state of the application.
 * - Provides `user`, `loading`, and `isAdmin` states to the app.
 * - Wraps Firebase Auth state change listener.
 * - Exposes generic `signIn`, `signUp`, and `logout` wrappers.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { useRouter, useSegments } from 'expo-router';

interface AuthContextType {
    user: User | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (authUser) => {
            setUser(authUser);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    useEffect(() => {
        if (loading) return;

        const inAuthGroup = segments[0] === '(app)';

        if (!user && inAuthGroup) {
            router.replace('/');
        } else if (user && !inAuthGroup) {
            router.replace('/(app)/home');
        }
    }, [user, loading, segments]);

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
