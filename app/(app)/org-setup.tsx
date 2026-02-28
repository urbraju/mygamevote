import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { organizationService } from '../../services/organizationService';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBanner } from '../../components/StatusBanner';
import { slugify, isValidOrgSlug } from '../../utils/orgUtils';

export default function OrgSetupScreen() {
    const { user, setActiveOrgId } = useAuth();
    const router = useRouter();
    const [orgName, setOrgName] = useState('');
    const [orgSlug, setOrgSlug] = useState('');
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'create' | 'join'>('create');
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<{ message: string; type: 'success' | 'info' | 'error' | 'warning' } | null>(null);

    const handleCreate = async () => {
        setError(null);
        if (!user) return;
        if (!orgName || !orgSlug) {
            setError('Please enter both name and unique ID');
            return;
        }

        const slug = slugify(orgSlug);

        if (!isValidOrgSlug(slug)) {
            setError('Unique ID can only contain letters, numbers, and hyphens (e.g. masti-group)');
            return;
        }

        setLoading(true);
        try {
            // Check if exists
            const existing = await organizationService.getOrganization(slug);
            if (existing) {
                setError('This unique ID is already taken. Try another.');
                setLoading(false);
                return;
            }

            await organizationService.createOrganization({
                id: slug,
                name: orgName,
                ownerId: user!.uid,
                createdAt: Date.now(),
                members: [user!.uid],
                admins: [user!.uid],
                settings: {
                    requireApproval: true,
                    allowPublicVoting: false,
                    currency: 'USD'
                },
                pendingMembers: []
            });

            // Update user's orgIds
            const { authService } = await import('../../services/authService');
            await authService.updateUserProfile(user!.uid, {
                // @ts-ignore - orgIds is new
                orgIds: [slug]
            });

            setActiveOrgId(slug);
            setStatus({ message: 'Group Created! Redirecting...', type: 'success' });

            // Allow user to see the success message before redirecting
            setTimeout(() => {
                router.replace('/home');
            }, 1500);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async () => {
        setError(null);
        if (!user) return;
        if (!orgSlug) {
            setError('Please enter the unique ID or Invite Code');
            return;
        }

        setLoading(true);
        try {
            const input = orgSlug.trim().toUpperCase();
            let slug = '';

            // Try joining by invite code first if it looks like one (6 chars, alphanumeric)
            if (input.length === 6) {
                try {
                    console.log('[OrgSetup] Attempting join by invite code:', input);
                    slug = await organizationService.joinByInviteCode(input, user!.uid);
                } catch (e) {
                    console.log('[OrgSetup] Invite code join failed, trying as slug...');
                }
            }

            if (!slug) {
                slug = orgSlug.toLowerCase().trim();
                const org = await organizationService.getOrganization(slug);

                if (!org) {
                    setError('Group not found. Please check the ID or Invite Code.');
                    setLoading(false);
                    return;
                }
                await organizationService.joinOrganization(slug, user!.uid);
            }

            // Update local user profile for security rules consistency
            const { authService } = await import('../../services/authService');
            const userDoc = await import('firebase/firestore').then(fs => fs.getDoc(fs.doc(require('../../firebaseConfig').db, 'users', user!.uid)));
            const currentOrgs = userDoc.exists() ? (userDoc.data().orgIds || []) : [];

            if (!currentOrgs.includes(slug)) {
                await authService.updateUserProfile(user!.uid, {
                    // @ts-ignore
                    orgIds: [...currentOrgs, slug]
                });
            }

            setActiveOrgId(slug);
            setStatus({ message: 'Joined successfully! Redirecting...', type: 'success' });

            setTimeout(() => {
                router.replace('/home');
            }, 1500);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView
            className="flex-1 bg-background"
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        >
            <View className="bg-surface p-8 rounded-3xl shadow-xl max-w-lg self-center w-full">
                <View className="items-center mb-6">
                    <View className="bg-primary/10 p-4 rounded-full mb-4">
                        <MaterialCommunityIcons name="account-group" size={48} color="#2563EB" />
                    </View>
                    <Text className="text-3xl font-extrabold text-gray-900 text-center">
                        {mode === 'create' ? 'Start a New Group' : 'Join a Group'}
                    </Text>
                    <Text className="text-gray-500 text-center mt-2 px-4">
                        {mode === 'create'
                            ? "Launch your own community and start managing games."
                            : "Enter the unique ID or 6-character Invite Code."}
                    </Text>
                </View>

                {mode === 'create' && (
                    <View className="mb-4">
                        <Text className="text-gray-700 font-bold mb-2 ml-1">Group Name</Text>
                        <TextInput
                            className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-black"
                            placeholder="e.g. Masti Volleyball Club"
                            placeholderTextColor="#9CA3AF"
                            value={orgName}
                            onChangeText={setOrgName}
                        />
                    </View>
                )}

                <View className="mb-8">
                    <Text className="text-gray-700 font-bold mb-2 ml-1">Unique Group ID</Text>
                    <TextInput
                        className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-black"
                        placeholder="e.g. masti-volleyball"
                        placeholderTextColor="#9CA3AF"
                        autoCapitalize="none"
                        value={orgSlug}
                        onChangeText={setOrgSlug}
                    />
                    {mode === 'create' ? (
                        <View className="flex-row items-center mt-1 ml-1">
                            <MaterialCommunityIcons name="information-outline" size={12} color="#3B82F6" />
                            <Text className="text-[10px] text-blue-500 ml-1 font-medium italic">
                                Only letters, numbers, and hyphens (e.g. my-group-id)
                            </Text>
                        </View>
                    ) : (
                        <Text className="text-[10px] text-gray-400 mt-1 ml-1">
                            Tip: You can use the ID or the 6-character Invite Code.
                        </Text>
                    )}
                </View>

                <StatusBanner
                    message={status?.message || error}
                    type={status?.type || 'error'}
                    className="mb-6"
                    onDismiss={() => {
                        setStatus(null);
                        setError(null);
                    }}
                />

                {loading ? (
                    <ActivityIndicator size="large" color="#2563EB" />
                ) : (
                    <View className="gap-y-4">
                        <TouchableOpacity
                            className="bg-primary p-4 rounded-xl items-center shadow-md shadow-primary/20 hover:opacity-90 active:opacity-80"
                            onPress={mode === 'create' ? handleCreate : handleJoin}
                        >
                            <Text className="text-white font-bold text-lg">
                                {mode === 'create' ? 'Create Group' : 'Join Group'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="items-center py-2"
                            onPress={() => {
                                setMode(mode === 'create' ? 'join' : 'create');
                                setError(null);
                            }}
                        >
                            <Text className="text-gray-600 font-medium">
                                {mode === 'create' ? 'Already have a group? Join here' : 'Want to start your own? Create here'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <TouchableOpacity
                className="mt-8 self-center"
                onPress={() => {
                    const { authService } = require('../../services/authService');
                    authService.signOut();
                }}
            >
                <Text className="text-gray-400 font-bold">Sign Out</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}
