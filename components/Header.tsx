import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { OrgSwitcher } from './OrgSwitcher';

export default function Header() {
    const { user, isAdmin, isOrgAdmin, multiTenancyEnabled } = useAuth();
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
            <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 bg-primary/20 rounded-xl items-center justify-center mr-3 border border-primary/30">
                    <MaterialCommunityIcons name="stadium-variant" size={24} color="#00E5FF" />
                </View>
                <View className="flex-1 flex-row items-center justify-between">
                    <View className="flex-1 mr-2 justify-center">
                        <Text
                            className="text-white text-lg sm:text-lg md:text-xl font-black uppercase tracking-widest italic"
                            numberOfLines={1}
                            adjustsFontSizeToFit
                        >
                            MyGame<Text className="text-primary">Vote</Text>
                        </Text>
                    </View>
                    <View className="flex-row items-center flex-shrink-0 max-w-[80px]">
                        <View className="w-1.5 h-1.5 bg-accent rounded-full mr-1.5 animate-pulse" />
                        <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-tight" numberOfLines={1}>
                            {user?.email?.split('@')[0]}
                        </Text>
                    </View>
                </View>
            </View>

            <View className="flex-row items-center gap-x-2">
                {multiTenancyEnabled && <OrgSwitcher />}

                {(isAdmin || isOrgAdmin) && (
                    <TouchableOpacity
                        onPress={() => router.push('/admin')}
                        className="flex-row items-center bg-gray-800 px-4 py-2.5 rounded-xl border border-gray-700 active:bg-gray-700 hover:bg-gray-700/80"
                    >
                        <MaterialCommunityIcons name="shield-crown" size={20} color="#00E5FF" style={{ marginRight: 6 }} />
                        <Text className="text-white font-bold text-sm">ADMIN</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    onPress={handleLogout}
                    className="flex-row items-center bg-gray-800 px-4 py-2.5 rounded-xl border border-gray-700 active:bg-gray-700 hover:bg-gray-700/80"
                >
                    <MaterialCommunityIcons name="logout-variant" size={20} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text className="text-white font-bold text-sm">SIGNOUT</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
