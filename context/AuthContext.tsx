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
import { auth, db } from '../firebaseConfig';
import { useRouter, useSegments } from 'expo-router';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, isAdmin: false });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        console.log('[AuthContext] Setting up onAuthStateChanged listener...');
        const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
            console.log('[AuthContext] Auth state changed:', authUser?.email || 'Logged Out');
            setUser(authUser);

            if (authUser) {
                try {
                    console.log('[AuthContext] Checking admin status for:', authUser.uid);
                    const userRef = doc(db, 'users', authUser.uid);
                    const userDoc = await getDoc(userRef);

                    // 1. Handle Missing Profile (Zombie User)
                    if (!userDoc.exists()) {
                        console.log('[AuthContext] No Firestore profile found. Creating default profile...');
                        await setDoc(userRef, {
                            uid: authUser.uid,
                            email: authUser.email,
                            createdAt: Date.now(),
                            isAdmin: false,
                            displayName: authUser.displayName || ''
                        });
                        console.log('[AuthContext] Default profile created.');
                    }

                    // 2. Check Admin Status
                    // Re-fetch doc if we just created it? Or just proceed. 
                    // Let's assume the above setDoc worked.

                    const isManualAdmin = authUser.email === 'urbraju@gmail.com';
                    // Check doc data again or use what we expected
                    const currentData = userDoc.exists() ? userDoc.data() : { isAdmin: false };
                    const isFirestoreAdmin = currentData.isAdmin === true;

                    if (isManualAdmin && !isFirestoreAdmin) {
                        console.log('[AuthContext] Auto-promoting Manual Admin to Firestore Admin...');
                        await updateDoc(userRef, { isAdmin: true });
                        setIsAdmin(true);
                    } else if (isFirestoreAdmin) {
                        console.log('[AuthContext] User IS Firestore Admin.');
                        setIsAdmin(true);
                    } else {
                        console.log('[AuthContext] User is NOT Admin.');
                        setIsAdmin(false);
                    }

                } catch (e) {
                    console.error('[AuthContext] Error checking/updating user status:', e);
                    setIsAdmin(false);
                }
            } else {
                setIsAdmin(false);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    useEffect(() => {
        if (loading) return;

        const inAuthGroup = segments[0] === '(app)';
        const inAdminRoute = segments.length > 1 && segments[1] === 'admin';

        console.log('[AuthContext] User:', user?.email, 'Segments:', segments, 'inAuthGroup:', inAuthGroup, 'isAdmin:', isAdmin);

        if (!user && inAuthGroup) {
            console.log('[AuthContext] Redirecting to /');
            router.replace('/');
        } else if (user && !inAuthGroup) {
            console.log('[AuthContext] Redirecting to /home');
            router.replace('/home');
        } else if (user && inAdminRoute && !isAdmin) {
            // Protect Admin Route
            console.log('[AuthContext] Non-admin tried to access admin route. Redirecting home.');
            router.replace('/home');
        }
    }, [user, loading, segments, isAdmin]);

    return (
        <AuthContext.Provider value={{ user, loading, isAdmin }}>
            {children}
        </AuthContext.Provider>
    );
};
