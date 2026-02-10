/**
 * Auth Service
 * 
 * Wraps Firebase Authentication methods.
 * - SignIn, SignUp, Logout.
 * - consistently used across the app context.
 */
import { auth } from '../firebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

export const authService = {
    signIn: (email: string, password: string) => signInWithEmailAndPassword(auth, email, password),
    signUp: (email: string, password: string) => createUserWithEmailAndPassword(auth, email, password),
    logout: () => signOut(auth),
};
