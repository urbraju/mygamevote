import { auth, db } from '../firebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, writeBatch, deleteDoc } from 'firebase/firestore';

export const authService = {
    signIn: (email: string, password: string) => signInWithEmailAndPassword(auth, email, password),

    signUp: async (email: string, password: string, firstName?: string, lastName?: string) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update Auth Profile
        if (firstName && lastName) {
            await updateProfile(user, {
                displayName: `${firstName} ${lastName}`
            });
        }

        // Create user document in Firestore
        await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            firstName: firstName || '',
            lastName: lastName || '',
            displayName: firstName && lastName ? `${firstName} ${lastName}` : '',
            isAdmin: false,
            createdAt: Date.now()
        });

        return userCredential;
    },

    logout: () => signOut(auth),

    resetPassword: (email: string) => sendPasswordResetEmail(auth, email),

    // Create user without logging out the current admin
    // Create user without logging out the current admin
    adminCreateUser: async (email: string, password: string, firstName: string, lastName: string) => {
        console.log('[AuthService] adminCreateUser called for:', email);

        // Dynamic imports to ensure isolation, but strictly typed
        const { initializeApp, deleteApp } = await import('firebase/app');
        const { getAuth, createUserWithEmailAndPassword, signOut } = await import('firebase/auth');
        const { firebaseConfig } = await import('../firebaseConfig');

        console.log('[AuthService] Initializing secondary app...');
        // Initialize a secondary app
        const secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
        const secondaryAuth = getAuth(secondaryApp);

        try {
            console.log('[AuthService] Creating user in secondary auth...');
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
            const user = userCredential.user;

            // Set Display Name in Auth (Vital for UI)
            await updateProfile(user, {
                displayName: `${firstName} ${lastName}`
            });
            console.log('[AuthService] User created in Auth:', user.uid);

            // Store user details in the MAIN app's Firestore (global 'db' var)
            console.log('[AuthService] Saving user profile to Firestore...');
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: user.email,
                firstName: firstName,
                lastName: lastName,
                displayName: `${firstName} ${lastName}`,
                isAdmin: false,
                createdAt: Date.now()
            });
            console.log('[AuthService] Firestore profile saved.');

            // Sign out from the secondary app just in case
            await signOut(secondaryAuth);
            console.log('[AuthService] Secondary app signed out.');

            return user;
        } catch (error) {
            console.error('[AuthService] adminCreateUser Error:', error);
            throw error;
        } finally {
            // Clean up
            await deleteApp(secondaryApp);
            console.log('[AuthService] Secondary app deleted.');
        }
    },

    // Delete all users who are NOT admins from Firestore
    deleteNonAdminUsers: async () => {
        console.log('[AuthService] Deleting all non-admin users...');
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('isAdmin', '!=', true));

        const querySnapshot = await getDocs(q);
        const batch = writeBatch(db);
        let count = 0;

        querySnapshot.forEach((doc) => {
            batch.delete(doc.ref);
            count++;
        });

        if (count > 0) {
            await batch.commit();
            console.log(`[AuthService] Deleted ${count} non-admin users.`);
        } else {
            console.log('[AuthService] No non-admin users found to delete.');
        }
    },

    // Delete a specific user profile
    deleteUser: async (uid: string) => {
        await deleteDoc(doc(db, 'users', uid));
    }
};
