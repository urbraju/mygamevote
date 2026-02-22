import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { authService } from '../services/authService';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import SignupForm from '../components/SignupForm';

export default function LoginScreen() {
    const [isSignup, setIsSignup] = useState(false);
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
        } catch (error: any) {
            Alert.alert('Login Failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            Alert.alert('Email Required', 'Please enter your email address in the field above to reset your password.');
            return;
        }
        try {
            await authService.resetPassword(email);
            Alert.alert('Reset Email Sent', 'Check your inbox for instructions to reset your password.');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    if (isSignup) {
        return (
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1 bg-background"
            >
                <View className="flex-1 justify-center p-6">
                    <SignupForm
                        onBack={() => setIsSignup(false)}
                        onSuccess={() => {/* Auth listener will auto-navigate */ }}
                    />
                </View>
            </KeyboardAvoidingView>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-background"
        >
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
                <View className="items-center mb-12">
                    <View className="w-20 h-20 bg-primary/20 rounded-3xl items-center justify-center mb-6 border border-primary/30 rotate-12">
                        <MaterialCommunityIcons name="stadium-variant" size={48} color="#00E5FF" />
                    </View>
                    <Text className="text-white text-4xl font-black uppercase italic tracking-tighter">
                        MyGame<Text className="text-primary">Vote</Text>
                    </Text>
                    <Text className="text-gray-500 font-bold uppercase tracking-[4px] text-[10px] mt-2">
                        Official Player Portal
                    </Text>
                </View>

                <View className="bg-surface p-8 rounded-[40px] border border-white-10 shadow-2xl">
                    <Text className="text-white font-black uppercase italic text-lg mb-6 tracking-tight">Stadium Entry</Text>

                    <View className="mb-4">
                        <View className="absolute left-4 top-4 z-10">
                            <MaterialCommunityIcons name="email-outline" size={20} color="#4B5563" />
                        </View>
                        <TextInput
                            className="w-full bg-white-10/50 p-4 pl-12 rounded-2xl text-white border border-white-10"
                            placeholder="Email Address"
                            placeholderTextColor="#6B7280"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View className="mb-2">
                        <View className="absolute left-4 top-4 z-10">
                            <MaterialCommunityIcons name="lock-outline" size={20} color="#4B5563" />
                        </View>
                        <TextInput
                            className="w-full bg-white-10/50 p-4 pl-12 rounded-2xl text-white border border-white-10"
                            placeholder="Password"
                            placeholderTextColor="#6B7280"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>
                    <TouchableOpacity onPress={handleForgotPassword} className="mb-6 items-end pr-2">
                        <Text className="text-primary font-bold text-xs hover:underline">Forgot Password?</Text>
                    </TouchableOpacity>

                    {loading ? (
                        <View className="py-4">
                            <ActivityIndicator size="large" color="#00E5FF" />
                        </View>
                    ) : (
                        <View>
                            <TouchableOpacity
                                className="w-full bg-primary py-5 rounded-2xl items-center mb-4 shadow-lg shadow-primary/20"
                                onPress={handleLogin}
                            >
                                <Text className="text-black font-black text-lg">ENTER ARENA</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="w-full py-4 items-center"
                                onPress={() => setIsSignup(true)}
                            >
                                <Text className="text-gray-400 font-medium">
                                    New Player? <Text className="text-primary font-bold">Draft Yourself (Sign Up)</Text>
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <View className="mt-12 items-center opacity-40">
                    <MaterialCommunityIcons name="shield-check-outline" size={24} color="#9CA3AF" />
                    <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[2px] mt-2">Secure Voting Network</Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
