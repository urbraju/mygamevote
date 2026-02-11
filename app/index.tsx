/**
 * Login/Landing Screen
 * 
 * This is the entry point of the app. It handles user authentication (Login/Signup)
 * using Firebase Auth. It redirects to the main app flow upon successful login.
 */
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { authService } from '../services/authService';
import { useRouter } from 'expo-router';

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
        return "Password works, but it's too weak. Try 6+ chars.";
    }
    return "Something went wrong. Please try again.";
};

export default function LoginScreen() {
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

        setLoading(true);
        setErrorMsg('');
        try {
            if (isLogin) {
                await authService.signIn(email, password);
            } else {
                await authService.signUp(email, password, firstName, lastName);
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

    return (
        <View className="flex-1 justify-center items-center bg-background p-6">
            <View className="bg-surface p-8 rounded-2xl shadow-lg w-full max-w-sm">
                <Text className="text-4xl font-extrabold text-primary mb-2 text-center">MyGameSlot</Text>
                <Text className="text-gray-500 mb-8 text-center font-medium">Join the Squad. Secure your spot.</Text>

                {errorMsg ? <Text className="text-red-500 text-center mb-4">{errorMsg}</Text> : null}

                {/* Main Logic: Login vs Signup Fields */}
                {!isLogin && (
                    <View className="flex-row gap-x-2 mb-4">
                        <TextInput
                            className="flex-1 bg-gray-50 p-4 rounded-xl border border-gray-200 text-gray-800"
                            placeholder="First Name"
                            value={firstName}
                            onChangeText={setFirstName}
                        />
                        <TextInput
                            className="flex-1 bg-gray-50 p-4 rounded-xl border border-gray-200 text-gray-800"
                            placeholder="Last Name"
                            value={lastName}
                            onChangeText={setLastName}
                        />
                    </View>
                )}

                <TextInput
                    className="w-full bg-gray-50 p-4 rounded-xl mb-4 border border-gray-200 text-gray-800"
                    placeholder="Email"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />

                <TextInput
                    className="w-full bg-gray-50 p-4 rounded-xl mb-2 border border-gray-200 text-gray-800"
                    placeholder="Password"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
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
                                {isLogin ? 'LOGIN' : 'CREATE ACCOUNT'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="w-full items-center active:opacity-70"
                            onPress={() => {
                                setIsLogin(!isLogin);
                                setErrorMsg('');
                            }}
                        >
                            <Text className="text-gray-600">
                                {isLogin ? "Don't have an account? " : "Already have an account? "}
                                <Text className="text-primary font-bold">
                                    {isLogin ? "Sign Up" : "Login"}
                                </Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Forgot Password Modal (Simple Overlay) */}
            {showForgot && (
                <View className="absolute inset-0 bg-black/50 justify-center items-center p-6">
                    <View className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-xl">
                        <Text className="text-xl font-bold mb-4 text-gray-800">Reset Password</Text>
                        <Text className="text-gray-500 mb-4">Enter your email to receive reset instructions.</Text>

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
