import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Platform,
    Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { superAdminService, OrganizationInfo, SystemConfig } from '../../../services/superAdminService';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'expo-router';

export default function GlobalConsoleScreen() {
    const { isAdmin, user, setActiveOrgId } = useAuth();
    const router = useRouter();

    const [searchTerm, setSearchTerm] = useState('');
    const [organizations, setOrganizations] = useState<OrganizationInfo[]>([]);
    const [searching, setSearching] = useState(false);
    const [config, setConfig] = useState<SystemConfig | null>(null);
    const [updatingConfig, setUpdatingConfig] = useState(false);

    // Initial Security Check
    useEffect(() => {
        if (!isAdmin) {
            router.replace('/home');
        }
    }, [isAdmin]);

    // Fetch System Config on mount
    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        const sysConfig = await superAdminService.getSystemConfig();
        setConfig(sysConfig);
    };

    const handleSearch = async () => {
        if (!searchTerm.trim()) return;
        setSearching(true);
        const results = await superAdminService.searchOrganizations(searchTerm);
        setOrganizations(results);
        setSearching(false);
    };

    const handleDeleteOrg = (org: OrganizationInfo) => {
        const performDelete = async () => {
            try {
                await superAdminService.deleteOrganizationGlobal(org.id);
                setOrganizations(prev => prev.filter(o => o.id !== org.id));
                Alert.alert("Deleted", `Organization "${org.name}" has been removed.`);
            } catch (err: any) {
                Alert.alert("Error", err.message);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm(`⚠️ DANGER: Completely delete "${org.name}"? This cannot be undone.`)) {
                performDelete();
            }
        } else {
            Alert.alert(
                "Delete Organization?",
                `Are you sure you want to permanently delete "${org.name}"?`,
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "DELETE", style: "destructive", onPress: performDelete }
                ]
            );
        }
    };

    const toggleFeature = async (key: keyof SystemConfig, value: boolean) => {
        if (!config) return;
        setUpdatingConfig(true);
        try {
            await superAdminService.updateSystemConfig({ [key]: value });
            setConfig(prev => prev ? { ...prev, [key]: value } : null);
        } catch (err: any) {
            Alert.alert("Error", "Failed to update toggle");
        } finally {
            setUpdatingConfig(false);
        }
    };

    if (!isAdmin) return null;

    return (
        <SafeAreaView className="flex-1 bg-gray-950">
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-900">
                <View className="flex-row items-center">
                    <MaterialCommunityIcons name="shield-crown" size={28} color="#00E5FF" />
                    <View className="ml-3">
                        <Text className="text-white font-bold text-xl uppercase tracking-tighter">Global Console</Text>
                        <Text className="text-gray-500 text-xs">Super User Management</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => router.back()} className="p-2">
                    <MaterialCommunityIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1">
                <View className="max-w-4xl w-full self-center px-4 py-6">
                    {/* 🛠️ SYSTEM FEATURE TOGGLES */}
                    <View className="bg-gray-900/50 rounded-2xl border border-gray-800 p-5 mb-8">
                        <Text className="text-primary font-bold text-xs mb-4 uppercase tracking-widest">Global Feature Toggles</Text>

                        <View className="space-y-4">
                            <View className="flex-row items-center justify-between">
                                <View className="flex-1 pr-4">
                                    <Text className="text-white font-bold text-base">Enable Sports Knowledge Hub</Text>
                                    <Text className="text-gray-500 text-xs">Toggle visibility of the "Explore" tab for all users</Text>
                                </View>
                                <Switch
                                    value={config?.sportsHubEnabled ?? true}
                                    onValueChange={(v) => toggleFeature('sportsHubEnabled', v)}
                                    trackColor={{ false: '#333', true: '#00E5FF33' }}
                                    thumbColor={config?.sportsHubEnabled ? '#00E5FF' : '#666'}
                                    disabled={updatingConfig}
                                />
                            </View>

                            <View className="h-[1px] bg-gray-800 my-2" />

                            <View className="flex-row items-center justify-between">
                                <View className="flex-1 pr-4">
                                    <Text className="text-white font-bold text-base">Multi-Tenancy Mode</Text>
                                    <Text className="text-gray-500 text-xs">Allow users to join/create multiple organizations</Text>
                                </View>
                                <Switch
                                    value={config?.multiTenancyEnabled ?? true}
                                    onValueChange={(v) => toggleFeature('multiTenancyEnabled', v)}
                                    trackColor={{ false: '#333', true: '#00E5FF33' }}
                                    thumbColor={config?.multiTenancyEnabled ? '#00E5FF' : '#666'}
                                    disabled={updatingConfig}
                                />
                            </View>
                        </View>
                    </View>

                    {/* 🔍 ORGANIZATION SEARCH & MANAGEMENT */}
                    <View className="bg-gray-900/50 rounded-2xl border border-gray-800 p-5">
                        <Text className="text-primary font-bold text-xs mb-4 uppercase tracking-widest">Manage Organizations</Text>

                        <View className="flex-row items-center bg-black/40 rounded-xl px-4 border border-gray-800 mb-6">
                            <MaterialCommunityIcons name="magnify" size={20} color="#666" />
                            <TextInput
                                className="flex-1 h-12 text-white ml-2 text-base"
                                placeholder="Org Name or Invite Code..."
                                placeholderTextColor="#444"
                                value={searchTerm}
                                onChangeText={(t) => {
                                    setSearchTerm(t);
                                    if (t.length > 2) handleSearch();
                                }}
                                autoCapitalize="none"
                            />
                            {searching && <ActivityIndicator size="small" color="#00E5FF" />}
                        </View>

                        {organizations.length > 0 ? (
                            <View className="space-y-3">
                                {organizations.map(org => (
                                    <View key={org.id} className="bg-gray-800/60 rounded-xl p-4 flex-row items-center justify-between border border-gray-700">
                                        <View className="flex-1">
                                            <Text className="text-white font-bold text-lg">{org.name}</Text>
                                            <View className="flex-row items-center mt-1">
                                                <View className="bg-primary/10 px-2 py-0.5 rounded mr-2">
                                                    <Text className="text-primary font-bold text-[10px]">{org.inviteCode}</Text>
                                                </View>
                                                <Text className="text-gray-500 text-[10px]">{org.membersCount} Members</Text>
                                            </View>
                                        </View>

                                        <View className="flex-row items-center">
                                            <TouchableOpacity
                                                onPress={async () => {
                                                    await setActiveOrgId(org.id);
                                                    router.push('/admin');
                                                }}
                                                className="bg-primary/10 p-3 rounded-xl border border-primary/20 mr-2"
                                            >
                                                <MaterialCommunityIcons name="cog-outline" size={20} color="#00E5FF" />
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                onPress={() => handleDeleteOrg(org)}
                                                className="bg-red-500/10 p-3 rounded-xl border border-red-500/20"
                                            >
                                                <MaterialCommunityIcons name="trash-can-outline" size={20} color="#FF5252" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ) : searchTerm.length > 0 ? (
                            <View className="py-8 items-center">
                                <Text className="text-gray-500 italic">No organizations found for "{searchTerm}"</Text>
                            </View>
                        ) : (
                            <View className="py-8 items-center">
                                <MaterialCommunityIcons name="office-building-marker-outline" size={48} color="#222" />
                                <Text className="text-gray-600 mt-2 text-center">Search for a squad to view details or perform admin actions</Text>
                            </View>
                        )}
                    </View>

                    <View className="h-20" />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
