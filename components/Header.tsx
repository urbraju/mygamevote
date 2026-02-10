/**
 * Header Component
 * 
 * Displays the app title and the current user's info (e.g., email avatar).
 * Includes the LOGOUT functionality to sign out of Firebase.
 */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { useRouter } from 'expo-router';

export default function Header() {
    const { user } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await authService.logout();
            // AuthContext handles redirect
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    return (
        <View className="flex-row justify-between items-center px-4 py-5 bg-surface shadow-md border-b border-gray-100">
            <View className="flex-row items-center">
                <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center mr-3">
                    <Text className="text-primary font-bold text-lg">
                        {user?.email?.charAt(0).toUpperCase()}
                    </Text>
                </View>
                <View>
                    <Text className="text-gray-900 text-lg font-bold italic tracking-tighter">MyGameSlot</Text>
                    <Text className="text-gray-500 text-xs font-medium">{user?.email?.split('@')[0]}</Text>
                </View>
            </View>
            <TouchableOpacity
                onPress={handleLogout}
                className="bg-gray-100 px-4 py-2 rounded-full active:bg-gray-200"
            >
                <Text className="text-gray-600 font-bold text-xs">LOGOUT</Text>
            </TouchableOpacity>
        </View>
    );
}
