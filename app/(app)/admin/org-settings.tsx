import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Share, Platform } from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { organizationService, Organization } from '../../../services/organizationService';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function OrgSettingsScreen() {
    const { user, activeOrgId, isOrgAdmin, isAdmin, setActiveOrgId } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [org, setOrg] = useState<Organization | null>(null);
    const [members, setMembers] = useState<any[]>([]);

    // Form fields
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (!activeOrgId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const [orgData, memberData] = await Promise.all([
                    organizationService.getOrganization(activeOrgId),
                    organizationService.getOrganizationMembers(activeOrgId)
                ]);

                if (orgData) {
                    setOrg(orgData);
                    setName(orgData.name);
                    setDescription(orgData.description || '');
                }
                setMembers(memberData);
            } catch (err) {
                console.error("Failed to fetch org settings", err);
                Alert.alert("Error", "Failed to load settings");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [activeOrgId]);

    const handleSave = async () => {
        if (!activeOrgId || !name.trim()) return;
        setSaving(true);
        try {
            await organizationService.updateOrganization(activeOrgId, {
                name: name.trim(),
                description: description.trim()
            });
            Alert.alert("Success", "Settings saved");
        } catch (err) {
            Alert.alert("Error", "Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    const handleGenerateInvite = async () => {
        if (!activeOrgId) return;
        try {
            const code = await organizationService.generateInviteCode(activeOrgId);
            setOrg(prev => prev ? { ...prev, inviteCode: code } : null);
            Alert.alert("New Invite Code", `Code: ${code}`);
        } catch (err) {
            Alert.alert("Error", "Failed to generate code");
        }
    };

    const handleShareInvite = async () => {
        if (!org?.inviteCode) return;
        try {
            await Share.share({
                message: `Join our group ${org.name} on MyGameVote! Use invite code: ${org.inviteCode}`,
                title: 'Join Group'
            });
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async () => {
        if (!activeOrgId || activeOrgId === 'default') return;

        console.log(`[OrgSettings] Delete requested for: ${activeOrgId}`);

        const confirmMessage = "Are you sure you want to permanently close and delete this group? This action cannot be undone.";

        const executeDelete = async () => {
            console.log(`[OrgSettings] Executing deletion for: ${activeOrgId}`);
            setDeleting(true);
            try {
                await organizationService.deleteOrganization(activeOrgId);
                console.log(`[OrgSettings] Deletion successful. Clearing activeOrgId and routing to onboarding...`);
                // Clear active org to trigger join/create flow on index
                await setActiveOrgId('');
                Alert.alert("Success", "Group deleted successfully.");
                router.replace('/');
            } catch (err) {
                console.error("[OrgSettings] Failed to delete org", err);
                Alert.alert("Error", "Failed to delete group.");
            } finally {
                setDeleting(false);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm(confirmMessage)) {
                executeDelete();
            }
        } else {
            Alert.alert(
                "Delete Group",
                confirmMessage,
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: executeDelete }
                ]
            );
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    const canEdit = isOrgAdmin || isAdmin;

    return (
        <View className="flex-1 bg-gray-100">
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: 'Group Settings',
                    headerStyle: { backgroundColor: '#ffffff' },
                    headerTintColor: '#1f2937',
                    headerTitleStyle: { fontWeight: 'bold' },
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} className="mr-4">
                            <MaterialCommunityIcons name="arrow-left" size={24} color="#1f2937" />
                        </TouchableOpacity>
                    )
                }}
            />

            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
                <View className="p-4">
                    {/* Standard BACK button to match Dashboard */}
                    <View className="flex-row justify-between items-center mb-6">
                        <TouchableOpacity
                            onPress={() => router.back()}
                            className="bg-blue-600 px-4 py-2 rounded-lg shadow-sm"
                        >
                            <Text className="text-white font-bold uppercase text-xs tracking-wider">BACK</Text>
                        </TouchableOpacity>
                    </View>

                    <Text className="text-[10px] font-black text-gray-400 mb-4 uppercase tracking-[2px]">Organization Info</Text>

                    <View className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
                        <Text className="text-xs font-bold text-gray-500 mb-2 uppercase">Display Name</Text>
                        <TextInput
                            className="p-3 bg-gray-50 rounded-lg border border-gray-300 text-gray-800 mb-4"
                            value={name}
                            onChangeText={setName}
                            editable={canEdit}
                            placeholder="Group Name"
                        />

                        <Text className="text-xs font-bold text-gray-500 mb-2 uppercase">Description</Text>
                        <TextInput
                            className="p-3 bg-gray-50 rounded-lg border border-gray-300 text-gray-800 mb-6"
                            value={description}
                            onChangeText={setDescription}
                            editable={canEdit}
                            placeholder="Brief description..."
                            multiline
                        />

                        {canEdit && (
                            <TouchableOpacity
                                className={`bg-blue-600 p-3 rounded-lg items-center shadow-sm flex-row justify-center ${saving ? 'opacity-50' : ''}`}
                                onPress={handleSave}
                                disabled={saving}
                            >
                                <MaterialCommunityIcons name="content-save" size={18} color="white" style={{ marginRight: 8 }} />
                                <Text className="text-white font-bold text-sm uppercase">Save Changes</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <Text className="text-[10px] font-black text-gray-400 mb-4 uppercase tracking-[2px]">Invites</Text>
                    <View className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
                        {org?.inviteCode ? (
                            <View>
                                <View className="bg-gray-50 p-4 rounded-lg items-center mb-4 border border-gray-100">
                                    <Text className="text-gray-400 text-[10px] uppercase font-bold tracking-widest mb-1">Invite Code</Text>
                                    <Text className="text-2xl font-black text-gray-800 tracking-tighter">{org.inviteCode}</Text>
                                </View>
                                <View className="flex-row gap-x-2">
                                    <TouchableOpacity
                                        className="flex-1 bg-green-600 p-4 rounded-lg items-center flex-row justify-center shadow-sm"
                                        onPress={handleShareInvite}
                                    >
                                        <MaterialCommunityIcons name="share-variant" size={20} color="white" style={{ marginRight: 8 }} />
                                        <Text className="text-white font-bold uppercase text-xs">Share Link</Text>
                                    </TouchableOpacity>
                                    {canEdit && (
                                        <TouchableOpacity
                                            className="bg-gray-50 p-4 rounded-lg items-center justify-center border border-gray-200"
                                            onPress={handleGenerateInvite}
                                        >
                                            <MaterialCommunityIcons name="refresh" size={20} color="#666" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        ) : (
                            <TouchableOpacity
                                className="bg-blue-600 p-4 rounded-lg items-center shadow-sm"
                                onPress={handleGenerateInvite}
                                disabled={!canEdit}
                            >
                                <Text className="text-white font-bold uppercase text-xs">Generate Invite Code</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <Text className="text-[10px] font-black text-gray-400 mb-4 uppercase tracking-[2px]">Members ({members.length})</Text>
                    <View className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        {members.map((u, i) => (
                            <View key={u.uid} className={`p-4 flex-row items-center ${i < members.length - 1 ? 'border-b border-gray-100' : ''}`}>
                                <View className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center mr-3 border border-gray-200">
                                    <MaterialCommunityIcons name="account" size={20} color="#999" />
                                </View>
                                <View className="flex-1">
                                    <Text className="font-bold text-gray-800">{u.firstName} {u.lastName}</Text>
                                    <Text className="text-gray-400 text-xs">{u.email}</Text>
                                </View>
                                {org?.ownerId === u.uid && (
                                    <View className="bg-amber-100 px-2 py-1 rounded">
                                        <Text className="text-amber-600 text-[10px] font-bold">OWNER</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>

                    {/* Danger Zone */}
                    {(isAdmin || (org?.ownerId === user?.uid)) && activeOrgId !== 'default' && (
                        <View className="mt-8">
                            <Text className="text-[10px] font-black text-red-500 mb-4 uppercase tracking-[2px]">Danger Zone</Text>
                            <View className="bg-red-50 p-4 rounded-lg shadow-sm border border-red-100">
                                <Text className="text-sm font-bold text-red-800 mb-2">Close Group</Text>
                                <Text className="text-xs text-red-600 mb-4">
                                    Permanently delete this organization and all its data. This action is irreversible.
                                </Text>
                                <TouchableOpacity
                                    className={`bg-red-600 p-3 rounded-lg items-center shadow-sm flex-row justify-center ${deleting ? 'opacity-50' : ''}`}
                                    onPress={handleDelete}
                                    disabled={deleting}
                                >
                                    <MaterialCommunityIcons name="trash-can-outline" size={18} color="white" style={{ marginRight: 8 }} />
                                    <Text className="text-white font-bold text-sm uppercase">Delete Group</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
