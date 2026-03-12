import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { useRouter, Link } from 'expo-router';
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
            <View className="flex-row items-center flex-1 pr-2">
                <View className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/20 rounded-xl items-center justify-center mr-2 sm:mr-3 border border-primary/30 shrink-0">
                    <MaterialCommunityIcons name="stadium-variant" size={20} color="#00E5FF" />
                </View>
                <View className="flex-1 flex-row items-center justify-between">
                    <View className="flex-shrink justify-center mr-2">
                        <Text
                            className="text-white text-base sm:text-lg md:text-xl font-black uppercase tracking-widest italic"
                            numberOfLines={1}
                        >
                            MyGame<Text className="text-primary">Vote</Text>
                        </Text>
                    </View>
                    <View className="hidden sm:flex flex-row items-center flex-shrink-0 max-w-[100px]">
                        <View className="w-1.5 h-1.5 bg-accent rounded-full mr-1.5 animate-pulse" />
                        <Text className="text-gray-400 text-[10px] sm:text-xs font-bold uppercase tracking-tight" numberOfLines={1}>
                            {user?.email?.split('@')[0]}
                        </Text>
                    </View>
                </View>
            </View>

            <View className="flex-row items-center gap-x-2 shrink-0">
                {multiTenancyEnabled && <OrgSwitcher />}

                <Link href="/explore" asChild>
                    <TouchableOpacity
                        role="button"
                        accessibilityLabel="EXPLORE"
                        className="flex-row items-center bg-primary/10 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-primary/20 active:bg-primary/20 hover:bg-primary/15"
                    >
                        <MaterialCommunityIcons name="compass-outline" size={18} color="#00E5FF" style={{ marginRight: 4 }} />
                        <Text className="text-white font-bold text-xs sm:text-sm">EXPLORE</Text>
                    </TouchableOpacity>
                </Link>

                {(isAdmin || isOrgAdmin) && (
                    <Link href="/admin" asChild>
                        <TouchableOpacity
                            role="button"
                            accessibilityLabel="ADMIN"
                            className="flex-row items-center bg-gray-800 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-gray-700 active:bg-gray-700 hover:bg-gray-700/80"
                        >
                            <MaterialCommunityIcons name="shield-crown" size={18} color="#00E5FF" style={{ marginRight: 4 }} />
                            <Text className="text-white font-bold text-xs sm:text-sm">ADMIN</Text>
                        </TouchableOpacity>
                    </Link>
                )}
                <TouchableOpacity
                    onPress={handleLogout}
                    role="button"
                    accessibilityLabel="SIGNOUT"
                    className="flex-row items-center bg-gray-800 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-gray-700 active:bg-gray-700 hover:bg-gray-700/80"
                >
                    <MaterialCommunityIcons name="logout-variant" size={18} color="#EF4444" style={{ marginRight: 4 }} />
                    <Text className="text-white font-bold text-xs sm:text-sm">SIGNOUT</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
