/**
 * Authentication Service
 * 
 * Handles all user authentication operations using Firebase Auth.
 * 
 * Key Functions:
 * - signIn: Authenticate existing users
 * - signUp: Create new user accounts with Firestore profile
 * - logout: Sign out current user
 * - resetPassword: Send password reset email
 * - adminCreateUser: Create users without logging out admin (uses secondary Firebase app)
 * - deleteNonAdminUsers: Batch delete all non-admin user profiles
 * - deleteUser: Remove specific user profile from Firestore
 * 
 * Note: Uses a secondary Firebase app instance for admin user creation to prevent
 * the current admin session from being terminated.
 */
import { auth, db } from '../firebaseConfig';
import { Platform, Alert } from 'react-native';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile, GoogleAuthProvider, signInWithPopup, OAuthProvider, FacebookAuthProvider } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, writeBatch, deleteDoc, getDoc } from 'firebase/firestore';

export const authService = {
    signInWithGoogle: async () => {
        if (Platform.OS !== 'web') {
            Alert.alert("Mobile Sign-in", "Google Sign-in on mobile requires native configuration. Please use Email/Password or use the web version at mygamevote.com");
            return;
        }
        try {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });
            const credential = await signInWithPopup(auth, provider);
            const user = credential.user;

            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                let isApproved = true;
                try {
                    const settingsSnap = await getDoc(doc(db, 'settings', 'general'));
                    if (settingsSnap.exists() && settingsSnap.data().requireApproval) {
                        isApproved = false;
                    }
                } catch (err) { }

                await setDoc(userRef, {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || '',
                    firstName: user.displayName?.split(' ')[0] || '',
                    lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
                    sportsInterests: [],
                    isAdmin: false,
                    isApproved: isApproved,
                    orgIds: [], // Empty to trigger onboarding
                    createdAt: Date.now(),
                    lastLoginAt: Date.now()
                });
            } else {
                await setDoc(userRef, { lastLoginAt: Date.now() }, { merge: true });
            }
            return credential;
        } catch (error: any) {
            console.error("[AuthService] Google Sign-in Error:", error);
            if (error.code === 'auth/popup-closed-by-user') {
                console.warn("[AuthService] User closed the auth popup.");
            } else if (error.message?.includes('redirect_uri_mismatch')) {
                console.error("[AuthService] Redirect URI mismatch. Ensure 'https://mygamevote.com/__/auth/handler' is added to Google Cloud Console.");
            }
            throw error;
        }
    },

    signInWithFacebook: async () => {
        if (Platform.OS !== 'web') {
            Alert.alert("Mobile Sign-in", "Facebook Sign-in on mobile requires native configuration. Please use Email/Password or use the web version at mygamevote.com");
            return;
        }
        const provider = new FacebookAuthProvider();
        provider.addScope('email');
        provider.addScope('public_profile');

        const credential = await signInWithPopup(auth, provider);
        const user = credential.user;

        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            let isApproved = true;
            try {
                const settingsSnap = await getDoc(doc(db, 'settings', 'general'));
                if (settingsSnap.exists() && settingsSnap.data().requireApproval) {
                    isApproved = false;
                }
            } catch (err) { }

            await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || '',
                firstName: user.displayName?.split(' ')[0] || '',
                lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
                sportsInterests: [],
                isAdmin: false,
                isApproved: isApproved,
                orgIds: [], // Empty to trigger onboarding
                createdAt: Date.now(),
                lastLoginAt: Date.now()
            });
        } else {
            await setDoc(userRef, { lastLoginAt: Date.now() }, { merge: true });
        }
        return credential;
    },

    signInWithApple: async () => {
        if (Platform.OS !== 'web') {
            Alert.alert("Mobile Sign-in", "Apple Sign-in on mobile requires native configuration. Please use Email/Password or use the web version at mygamevote.com");
            return;
        }
        const provider = new OAuthProvider('apple.com');
        provider.addScope('email');
        provider.addScope('name');

        const credential = await signInWithPopup(auth, provider);
        const user = credential.user;

        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            let isApproved = true;
            try {
                const settingsSnap = await getDoc(doc(db, 'settings', 'general'));
                if (settingsSnap.exists() && settingsSnap.data().requireApproval) {
                    isApproved = false;
                }
            } catch (err) { }

            const rawName = user.displayName || '';
            const emailFallback = user.email ? user.email.split('@')[0] : 'User';

            await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                displayName: rawName || emailFallback,
                firstName: rawName ? rawName.split(' ')[0] : emailFallback,
                lastName: rawName ? rawName.split(' ').slice(1).join(' ') : '',
                sportsInterests: [],
                isAdmin: false,
                isApproved: isApproved,
                orgIds: [], // Empty to trigger onboarding
                createdAt: Date.now(),
                lastLoginAt: Date.now()
            });
        } else {
            await setDoc(userRef, { lastLoginAt: Date.now() }, { merge: true });
        }
        return credential;
    },
    signIn: async (email: string, password: string) => {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        // Track Last Login
        try {
            await setDoc(doc(db, 'users', credential.user.uid), {
                lastLoginAt: Date.now()
            }, { merge: true });
        } catch (e) {
            console.warn("[AuthService] Failed to update lastLoginAt", e);
        }
        return credential;
    },

    signUp: async (
        email: string,
        password: string,
        firstName?: string,
        lastName?: string,
        sportsInterests: string[] = [],
        phoneNumber?: string
    ) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update Auth Profile
        if (firstName && lastName) {
            await updateProfile(user, {
                displayName: `${firstName} ${lastName}`
            });
        }

        // START: Approval Workflow Check
        let isApproved = true;
        try {
            const settingsSnap = await getDoc(doc(db, 'settings', 'general'));
            if (settingsSnap.exists() && settingsSnap.data().requireApproval) {
                isApproved = false;
            }
        } catch (err) {
            console.warn('[AuthService] Failed to check approval settings during signup:', err);
        }
        // END: Approval Workflow Check

        // Create user document in Firestore
        console.log('[AuthService] WRITING Profile. isApproved =', isApproved);
        await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            firstName: firstName || '',
            lastName: lastName || '',
            displayName: firstName && lastName ? `${firstName} ${lastName}` : '',
            sportsInterests: sportsInterests, // Added
            phoneNumber: phoneNumber || '', // Added
            isAdmin: false,
            isApproved: isApproved,
            orgIds: [], // Changed from ['default'] to trigger join org
            createdAt: Date.now()
        });

        return userCredential;
    },

    checkApprovalStatus: async (uid: string) => {
        try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
                return userDoc.data().isApproved !== false;
            }
            return false;
        } catch (error) {
            console.error("[AuthService] Error checking approval status:", error);
            return false;
        }
    },

    logout: () => {
        console.log('[AuthService] logout called');
        return signOut(auth);
    },
    signOut: () => {
        console.log('[AuthService] signOut called');
        return signOut(auth);
    }, // Alias for backward compatibility

    resetPassword: (email: string) => sendPasswordResetEmail(auth, email),

    // Create user without logging out the current admin
    adminCreateUser: async (email: string, password: string, firstName: string, lastName: string, phoneNumber?: string, sportsInterests: string[] = []) => {
        console.log('[AuthService] adminCreateUser called for:', email);

        // Dynamic imports to ensure isolation, but strictly typed
        const { initializeApp, deleteApp } = await import('firebase/app');
        const { initializeAuth, inMemoryPersistence, createUserWithEmailAndPassword, signOut } = await import('firebase/auth');
        const { firebaseConfig } = await import('../firebaseConfig');

        console.log('[AuthService] Initializing secondary app with inMemoryPersistence...');
        // Initialize a secondary Firebase app instance
        const secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');

        // Use initializeAuth with inMemoryPersistence to prevent session bleeding/auto-logout
        const secondaryAuth = initializeAuth(secondaryApp, {
            persistence: inMemoryPersistence
        });

        try {
            console.log('[AuthService] Creating user in secondary app...');
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
            const user = userCredential.user;
            console.log('[AuthService] User created in Auth. UID:', user.uid);

            // Sign out immediately from the secondary app to prevent session conflicts
            await signOut(secondaryAuth);
            console.log('[AuthService] Signed out from secondary app.');

            // Now write to Firestore using the PRIMARY app's db instance (which is authenticated as Admin)
            console.log('[AuthService] Writing Firestore doc using Primary DB instance...');
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: email,
                firstName: firstName,
                lastName: lastName,
                displayName: `${firstName} ${lastName}`,
                phoneNumber: phoneNumber || '',
                sportsInterests: sportsInterests,
                isAdmin: false,
                isApproved: true, // Admin-created users are auto-approved
                createdAt: Date.now()
            });
            console.log('[AuthService] Firestore doc written successfully.');

        } catch (error) {
            console.error('[AuthService] Error in adminCreateUser:', error);
            throw error;
        } finally {
            // Clean up the secondary app
            console.log('[AuthService] Deleting secondary app instance...');
            await deleteApp(secondaryApp);
        }
    },

    deleteNonAdminUsers: async () => {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('isAdmin', '==', false));
        const snapshot = await getDocs(q);

        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        await batch.commit();
    },

    deleteUser: async (userId: string) => {
        await deleteDoc(doc(db, 'users', userId));
    },

    setApprovalStatus: async (userId: string, isApproved: boolean) => {
        await setDoc(doc(db, 'users', userId), { isApproved }, { merge: true });
    },

    updateUserProfile: async (userId: string, data: Partial<{
        sportsInterests: string[];
        phoneNumber: string;
        displayName: string;
        firstName: string;
        lastName: string;
    }>) => {
        await setDoc(doc(db, 'users', userId), data, { merge: true });
    }
};
