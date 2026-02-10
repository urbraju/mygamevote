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

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password');
            return;
        }

        setLoading(true);
        try {
            await authService.signIn(email, password);
            // Navigation is handled by AuthContext
        } catch (error: any) {
            Alert.alert('Login Failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password');
            return;
        }

        setLoading(true);
        try {
            await authService.signUp(email, password);
            // Navigation is handled by AuthContext
        } catch (error: any) {
            Alert.alert('Sign Up Failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 justify-center items-center bg-background p-6">
            <View className="bg-surface p-8 rounded-2xl shadow-lg w-full max-w-sm">
                <Text className="text-4xl font-extrabold text-primary mb-2 text-center">MyGameSlot</Text>
                <Text className="text-gray-500 mb-8 text-center font-medium">Join the Squad. Secure your spot.</Text>

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
                    className="w-full bg-gray-50 p-4 rounded-xl mb-6 border border-gray-200 text-gray-800"
                    placeholder="Password"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                {loading ? (
                    <ActivityIndicator size="large" color="#2563EB" />
                ) : (
                    <View className="gap-y-4">
                        <TouchableOpacity
                            className="w-full bg-primary p-4 rounded-xl items-center shadow-md active:opacity-90"
                            onPress={handleLogin}
                        >
                            <Text className="text-white font-bold text-lg tracking-wide">LOGIN</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="w-full bg-white border-2 border-primary p-4 rounded-xl items-center active:bg-gray-50"
                            onPress={handleSignUp}
                        >
                            <Text className="text-primary font-bold text-lg tracking-wide">SIGN UP</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
}
