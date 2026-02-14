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
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { Platform, Alert, View, Text, ActivityIndicator } from 'react-native';
import { useRef } from 'react';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAdmin: boolean;
    isApproved: boolean | null; // null = unknown/loading

}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, isAdmin: false, isApproved: null });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isApproved, setIsApproved] = useState<boolean | null>(null); // Default to null (unknown)

    // Refs to track current state for snapshot listeners (avoiding closure issues)
    const isAdminRef = useRef(false);
    const isApprovedRef = useRef<boolean | null>(null);
    const lastAdminPromote = useRef(0);

    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        console.log('[AuthContext] v1.2 - Realtime Snapshot & No-Auto-Logout');
        console.log('[AuthContext] Setting up onAuthStateChanged listener...');
        let profileUnsubscribe: (() => void) | null = null;

        const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
            console.log('[AuthContext] Auth state changed:', authUser?.email || 'Logged Out');

            // Clean up previous listener if any
            if (profileUnsubscribe) {
                profileUnsubscribe();
                profileUnsubscribe = null;
            }

            if (authUser) {
                setUser(authUser);
                // Keep loading true until profile flows in
                setLoading(true);

                // Subscribe to Profile Changes
                const userRef = doc(db, 'users', authUser.uid);

                profileUnsubscribe = onSnapshot(userRef, async (userDoc) => {
                    console.log('[AuthContext] Profile Update:', userDoc.exists() ? 'Exists' : 'Missing');

                    // 1. Handle Missing Profile (Race condition with SignUp or Zombie User)
                    if (!userDoc.exists()) {
                        console.log('[AuthContext] No Firestore profile found. Waiting 2s before creation (Race Condition Protection)...');

                        // Wait 2 seconds to allow AuthService.signUp to write the profile first
                        await new Promise(resolve => setTimeout(resolve, 2000));

                        // Check again after delay
                        const doubleCheckSnap = await getDoc(userRef);
                        if (doubleCheckSnap.exists()) {
                            console.log('[AuthContext] Profile appeared after delay. Handling as normal update.');
                            // The listener will fire again automatically for this update, so we can just return.
                            return;
                        }

                        console.log('[AuthContext] Profile still missing after delay. checking settings before creating default...');

                        // CHECK SETTINGS (Race Condition Fix)
                        // DEFAULT: PENDING (Safety First).
                        // If we can't verify settings, we assume approval is required.
                        let shouldBeApproved = false;
                        try {
                            const settingsSnap = await getDoc(doc(db, 'settings', 'general'));
                            if (settingsSnap.exists()) {
                                const settings = settingsSnap.data();
                                // Only approve if EXPLICITLY not required
                                if (!settings.requireApproval) {
                                    shouldBeApproved = true;
                                    console.log('[AuthContext] requireApproval is OFF. Auto-approving.');
                                } else {
                                    console.log('[AuthContext] requireApproval is ON. Defaulting to PENDING.');
                                }
                            } else {
                                console.log('[AuthContext] No settings doc. Defaulting to PENDING.');
                            }
                        } catch (err) {
                            console.warn("[AuthContext] Error reading settings (defaulting to PENDING):", err);
                        }

                        // Create profile
                        // This write will trigger another snapshot update!
                        try {
                            await setDoc(userRef, {
                                uid: authUser.uid,
                                email: authUser.email,
                                createdAt: Date.now(),
                                isAdmin: false,
                                isApproved: shouldBeApproved,
                                displayName: authUser.displayName || '',
                            });
                            console.log('[AuthContext] Default profile created. Approved:', shouldBeApproved);
                        } catch (e) {
                            console.error('[AuthContext] Error creating profile:', e);
                        }
                        return;
                    }

                    // 2. Read Profile Data
                    const data = userDoc.data();

                    // Admin Check
                    const isManualAdmin = authUser.email === 'urbraju@gmail.com';
                    const isFirestoreAdmin = data.isAdmin === true;

                    if (isManualAdmin && !isFirestoreAdmin && (Date.now() - lastAdminPromote.current > 10000)) {
                        console.log('[AuthContext] Manual Admin detected, promoting...');
                        lastAdminPromote.current = Date.now();
                        const userRefPromote = doc(db, 'users', authUser.uid);
                        updateDoc(userRefPromote, { isAdmin: true }).catch(console.error);
                    }

                    // Approval Check
                    const approved = (data.isApproved !== false) || !!isFirestoreAdmin || isManualAdmin;

                    // Only update state if different (prevents infinite re-renders)
                    if (isAdminRef.current !== !!isFirestoreAdmin) {
                        console.log('[AuthContext] Setting isAdmin:', !!isFirestoreAdmin);
                        isAdminRef.current = !!isFirestoreAdmin;
                        setIsAdmin(!!isFirestoreAdmin);
                    }

                    if (isApprovedRef.current !== approved) {
                        console.log('[AuthContext] Setting isApproved:', approved);
                        isApprovedRef.current = approved;
                        setIsApproved(approved);
                    }

                    setLoading(false); // Enable UI
                }, (error) => {
                    console.error('[AuthContext] Profile Snapshot Error:', error);
                    setLoading(false);
                    // Fallback to safe defaults to prevent lockout? 
                    // Or keep loading? let's allow access for safety if DB fails.
                    setIsApproved(true);
                });

            } else {
                // Logged Out
                console.log('[AuthContext] Cleaning up state (Logout)');
                setUser(null);
                setIsAdmin(false);
                setIsApproved(null);
                isAdminRef.current = false;
                isApprovedRef.current = null;
                setLoading(false);
            }
        });

        return () => {
            if (profileUnsubscribe) profileUnsubscribe();
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        // Wait for auth load OR approval check (if user is present)
        // If user is null, isApproved is null, but that's fine, we handle !user case below.
        // If user is present, isApproved MUST be boolean determined before we redirect.

        if (loading) return;

        // If logged in, but approval status unknown, WAIT.
        if (user && isApproved === null) {
            console.log('[AuthContext] User present but approval unknown. Waiting...');
            return;
        }

        const inAuthGroup = segments[0] === '(app)';
        // Fix TS error: segments is sometimes inferred as tuple
        const segs = segments as string[];
        const inAdminRoute = segs.length > 1 && segs[1] === 'admin';

        console.log('[AuthContext] Nav Check - User:', user?.email, 'Appvd:', isApproved, 'Segs:', segments);

        if (!user && inAuthGroup) {
            console.log('[AuthContext] Redirecting to /');
            if (segments.length > 0) router.replace('/');
        } else if (user && !inAuthGroup) {
            if (isApproved === true) {
                console.log('[AuthContext] Redirecting to /home');
                router.replace('/home');
            } else {
                console.log('[AuthContext] User NOT approved. Showing Pending Screen.');
            }
        } else if (user && inAuthGroup && isApproved === false) {
            console.log('[AuthContext] User lost approval. Redirecting to Login.');
            router.replace('/');
        } else if (user && inAdminRoute && !isAdmin) {
            console.log('[AuthContext] Non-admin tried to access admin route. Redirecting home.');
            router.replace('/home');
        }
    }, [user, loading, segments, isAdmin, isApproved]);

    // Blocking UI Logic to prevent "Home Page Flash"
    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    // We REMOVED the blocking "Pending" screen here.
    // Instead, individual screens (like LoginScreen) will handle the "Pending" state inline.

    return (
        <AuthContext.Provider value={{ user, loading, isAdmin, isApproved }}>
            {children}
        </AuthContext.Provider>
    );
};
