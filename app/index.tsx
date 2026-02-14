/**
 * Login/Landing Screen
 * 
 * This is the entry point of the app. It handles user authentication (Login/Signup)
 * using Firebase Auth. It redirects to the main app flow upon successful login.
 */
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Linking } from 'react-native';
import { authService } from '../services/authService';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebaseConfig';
import SignupForm from '../components/SignupForm';
// No change needed here, just checking.

// Helper to map Firebase errors to user-friendly messages
const getFriendlyErrorMessage = (error: any) => {
    const msg = error.message || error.toString();
    if (msg.includes('auth/invalid-credential') || msg.includes('auth/user-not-found') || msg.includes('auth/wrong-password')) {
        return "Invalid email or password.";
    }
    if (msg.includes('auth/email-already-in-use')) {
        return "This email is already registered. Please login instead.";
    }
    if (msg.includes('auth/invalid-email')) {
        return "Please enter a valid email address.";
    }
    if (msg.includes('auth/weak-password')) {
        return "Password is too weak. Must be 4-8 chars with 1 uppercase.";
    }
    if (msg.includes('Account pending approval')) {
        return "Your account is pending admin approval. You will be able to login once approved.";
    }

    return "Something went wrong. Please try again.";
};

// Password Validation Helper
const validatePassword = (pass: string) => {
    // 4-8 characters, no special characters, at least 1 uppercase letter
    const regex = /^(?=.*[A-Z])[A-Za-z0-9]{4,8}$/;
    return regex.test(pass);
};

export default function LoginScreen() {
    const { user, isApproved } = useAuth();
    const [isLogin, setIsLogin] = useState(true); // Toggle between Login and Sign Up
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Sign Up Fields
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');

    // Forgot Password
    const [showForgot, setShowForgot] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetStatus, setResetStatus] = useState({ message: '', type: '' }); // 'success' or 'error'

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const router = useRouter();

    const handleAction = async () => {
        if (!email || !password) {
            setErrorMsg('Please enter email and password');
            return;
        }

        if (!isLogin && (!firstName || !lastName)) {
            setErrorMsg('Please enter First and Last Name');
            return;
        }

        if (!isLogin && !validatePassword(password)) {
            setErrorMsg('Password must be 4–8 chars, NO special characters, and include 1 uppercase letter.');
            return;
        }

        setLoading(true);
        setErrorMsg('');
        try {
            if (isLogin) {
                const credential = await authService.signIn(email, password);

                const userDoc = await import('firebase/firestore').then(fs => fs.getDoc(fs.doc(db, 'users', credential.user.uid)));
                if (userDoc.exists()) {
                    const profile = userDoc.data();
                    const approved = profile.isApproved !== false;
                    if (!approved) return;
                }
            } else {
                const credential = await authService.signUp(email, password, firstName, lastName);
                // Check approval status (in case requirement was just turned on)
                const isApproved = await authService.checkApprovalStatus(credential.user.uid);
                if (!isApproved) {
                    // await authService.signOut(); // Managed by inline UI now
                    return;
                }
            }
        } catch (error: any) {
            setErrorMsg(getFriendlyErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!resetEmail) {
            setResetStatus({ message: 'Please enter your email address', type: 'error' });
            return;
        }

        setResetStatus({ message: 'Sending...', type: 'info' });

        try {
            console.log('Attempting password reset for:', resetEmail);
            await authService.resetPassword(resetEmail);
            console.log('Password reset email sent successfully');
            setResetStatus({ message: 'Success! Check your email for the reset link.', type: 'success' });
            // Don't close immediately so they can read the message
            setTimeout(() => setShowForgot(false), 3000);
        } catch (error: any) {
            console.error('Password Reset Error:', error);
            setResetStatus({ message: getFriendlyErrorMessage(error), type: 'error' });
        }
    };

    if (!isLogin) {
        return (
            <View className="flex-1 justify-center items-center bg-background p-6">
                <View className="bg-surface p-8 rounded-2xl shadow-lg w-full max-w-sm">
                    <SignupForm
                        onBack={() => {
                            setIsLogin(true);
                            setErrorMsg('');
                        }}
                        onSuccess={() => {
                            // Auth state change will trigger redirect in _layout or context
                            console.log('Signup success');
                        }}
                    />
                </View>
            </View>
        );
    }

    return (
        <View className="flex-1 justify-center items-center bg-background p-6">
            <View className="bg-surface p-8 rounded-2xl shadow-lg w-full max-w-sm">
                <Text className="text-4xl font-extrabold text-primary mb-2 text-center">MyGameVote</Text>
                <Text className="text-gray-500 mb-8 text-center font-medium">Join the Squad. Secure your spot.</Text>

                {errorMsg ? <Text className="text-red-500 text-center mb-4">{errorMsg}</Text> : null}

                {/* Inline Approval Pending Message */}
                {user && isApproved === false ? (
                    <View className="items-center w-full">
                        <Text className="text-xl font-bold text-yellow-600 mb-2 text-center">⏳ Approval Pending</Text>
                        <Text className="text-gray-600 text-center mb-6">
                            "Your account is waiting for administrator approval. You will NOT be able to access the game until approved."
                        </Text>

                        <View className="w-full gap-y-3">
                            <TouchableOpacity
                                className="w-full bg-blue-100 p-4 rounded-xl items-center"
                                onPress={() => {
                                    // Force reload/re-check
                                    if (typeof window !== 'undefined') window.location.reload();
                                }}
                            >
                                <Text className="text-blue-700 font-bold">🔄 Check Status</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="w-full bg-red-50 p-4 rounded-xl items-center border border-red-100"
                                onPress={() => authService.signOut()}
                            >
                                <Text className="text-red-600 font-bold">Sign Out</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    /* Normal Login Form */
                    <>
                        <TextInput
                            className="w-full bg-gray-50 p-4 rounded-xl mb-4 border border-gray-200 text-gray-800"
                            placeholder="Email"
                            placeholderTextColor="#9CA3AF"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            onSubmitEditing={handleAction}
                            returnKeyType="next"
                        />

                        <TextInput
                            className="w-full bg-gray-50 p-4 rounded-xl mb-2 border border-gray-200 text-gray-800"
                            placeholder="Password"
                            placeholderTextColor="#9CA3AF"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            onSubmitEditing={handleAction}
                            returnKeyType="done"
                        />

                        {isLogin && (
                            <TouchableOpacity onPress={() => { setShowForgot(true); setResetStatus({ message: '', type: '' }); }} className="self-end mb-6">
                                <Text className="text-blue-500 text-sm font-semibold">Forgot Password?</Text>
                            </TouchableOpacity>
                        )}
                        {!isLogin && <View className="mb-6" />}


                        {loading ? (
                            <ActivityIndicator size="large" color="#2563EB" />
                        ) : (
                            <View className="gap-y-4">
                                <TouchableOpacity
                                    className="w-full bg-primary p-4 rounded-xl items-center shadow-md active:opacity-90"
                                    onPress={handleAction}
                                >
                                    <Text className="text-white font-bold text-lg tracking-wide">
                                        LOGIN
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    className="w-full items-center active:opacity-70"
                                    onPress={() => {
                                        setIsLogin(false);
                                        setErrorMsg('');
                                    }}
                                >
                                    <Text className="text-gray-600">
                                        Don't have an account? <Text className="text-primary font-bold">Sign Up</Text>
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </>
                )}
            </View>

            {/* Support Footer */}
            <View className="mt-8 items-center">
                <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-[2px] mb-2">
                    Support & Feedback
                </Text>
                <TouchableOpacity
                    onPress={() => Linking.openURL('mailto:brutechgyan@gmail.com?subject=GameSlot%20Registration%20Issue')}
                    className="items-center"
                >
                    <Text className="text-gray-500 font-bold text-sm">brutechgyan@gmail.com</Text>
                </TouchableOpacity>
            </View>

            {/* Forgot Password Modal (Simple Overlay) */}
            {showForgot && (
                <View className="absolute inset-0 bg-black/50 justify-center items-center p-6">
                    <View className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-xl">
                        <Text className="text-xl font-bold mb-2 text-gray-800">Reset Password</Text>

                        <View className="bg-blue-50 p-3 rounded-lg mb-4 border border-blue-100">
                            <Text className="text-blue-800 font-bold text-xs mb-1">PASSWORD REQUIREMENTS:</Text>
                            <Text className="text-blue-700 text-[11px]">• 4 to 8 characters long</Text>
                            <Text className="text-blue-700 text-[11px]">• No special characters (@, #, !, etc.)</Text>
                            <Text className="text-blue-700 text-[11px]">• At least 1 Uppercase letter</Text>
                        </View>

                        <Text className="text-gray-500 mb-4 text-sm">Enter your email to receive reset instructions.</Text>

                        {resetStatus.message ? (
                            <Text className={`text-center mb-4 ${resetStatus.type === 'success' ? 'text-green-600 font-bold' : 'text-red-500'}`}>
                                {resetStatus.message}
                            </Text>
                        ) : null}

                        <TextInput
                            className="w-full bg-gray-50 p-4 rounded-xl mb-4 border border-gray-200 text-gray-800"
                            placeholder="Email"
                            value={resetEmail}
                            onChangeText={setResetEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                        <View className="flex-row justify-end gap-x-2">
                            <TouchableOpacity onPress={() => setShowForgot(false)} className="p-3">
                                <Text className="text-gray-600 font-bold">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleResetPassword} className="bg-primary p-3 rounded-lg">
                                <Text className="text-white font-bold">Send Email</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
}
