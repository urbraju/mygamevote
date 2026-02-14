import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function Header() {
    const { user, isAdmin } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await authService.logout();
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    return (
        <View className="flex-row justify-between items-center px-4 py-6 bg-surface border-b border-white-10">
            <View className="flex-row items-center">
                <View className="w-10 h-10 bg-primary/20 rounded-xl items-center justify-center mr-3 border border-primary/30">
                    <MaterialCommunityIcons name="stadium-variant" size={24} color="#00E5FF" />
                </View>
                <View>
                    <Text className="text-white text-xl font-black uppercase tracking-widest italic">
                        MyGame<Text className="text-primary">Vote</Text>
                    </Text>
                    <View className="flex-row items-center">
                        <View className="w-1.5 h-1.5 bg-accent rounded-full mr-1.5 animate-pulse" />
                        <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-tight">
                            {user?.email?.split('@')[0]}
                        </Text>
                    </View>
                </View>
            </View>

            <View className="flex-row items-center gap-x-3">
                {isAdmin && (
                    <TouchableOpacity
                        onPress={() => router.push('/admin')}
                        className="flex-row items-center bg-gray-800 px-4 py-2.5 rounded-xl border border-gray-700 active:bg-gray-700"
                    >
                        <MaterialCommunityIcons name="shield-account" size={20} color="#00E5FF" style={{ marginRight: 6 }} />
                        <Text className="text-white font-bold text-sm">ADMIN</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    onPress={handleLogout}
                    className="flex-row items-center bg-gray-800 px-4 py-2.5 rounded-xl border border-gray-700 active:bg-gray-700"
                >
                    <MaterialCommunityIcons name="logout-variant" size={20} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text className="text-white font-bold text-sm">SIGNOUT</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
