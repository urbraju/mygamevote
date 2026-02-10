/**
 * Login Screen
 * 
 * A standalone login screen component. Handles user authentication (Sign In / Sign Up)
 * via Firebase Auth.
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
        <View className="flex-1 justify-center items-center bg-gray-100 p-6">
            <Text className="text-3xl font-bold text-blue-600 mb-8">MyGameSlot Login</Text>

            <TextInput
                className="w-full bg-white p-4 rounded-lg mb-4 border border-gray-300"
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
            />

            <TextInput
                className="w-full bg-white p-4 rounded-lg mb-6 border border-gray-300"
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            {loading ? (
                <ActivityIndicator size="large" color="#2563eb" />
            ) : (
                <>
                    <TouchableOpacity
                        className="w-full bg-blue-600 p-4 rounded-lg items-center mb-4"
                        onPress={handleLogin}
                    >
                        <Text className="text-white font-bold text-lg">Login</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="w-full bg-white border border-blue-600 p-4 rounded-lg items-center"
                        onPress={handleSignUp}
                    >
                        <Text className="text-blue-600 font-bold text-lg">Sign Up</Text>
                    </TouchableOpacity>
                </>
            )}
        </View>
    );
}
