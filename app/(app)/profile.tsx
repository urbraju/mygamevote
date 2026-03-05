import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { sportsService, Sport } from '../../services/sportsService';
import { interestRequestService } from '../../services/interestRequestService';
import { db } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';

export default function ProfileScreen() {
    const { user, isAdmin, isOrgAdmin } = useAuth();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [allSports, setAllSports] = useState<Sport[]>([]);
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [profileData, setProfileData] = useState<any>(null);
    const [selectedSkills, setSelectedSkills] = useState<{ [key: string]: number }>({});
    const [pendingRequest, setPendingRequest] = useState<boolean>(false);

    useEffect(() => {
        console.log('[ProfileScreen] Mount - User:', user?.email);
        const loadData = async () => {
            if (!user) return;
            console.log('[ProfileScreen] Starting data load...');
            try {
                // Fetch Sports, Profile, and Pending Request
                const [sports, userDoc] = await Promise.all([
                    sportsService.getAllSports(),
                    getDoc(doc(db, 'users', user.uid))
                ]);

                setAllSports(sports);
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setProfileData(data);
                    setSelectedInterests(data.sportsInterests || []);
                    setSelectedSkills(data.skills || {});

                    // Fetch accurate pending request using the correct activeOrgId from profile
                    const orgId = data.activeOrgId || 'default';
                    const actualPending = await interestRequestService.getPendingRequestForUser(user.uid, orgId);
                    setPendingRequest(!!actualPending);
                }
            } catch (error) {
                console.error("Failed to load profile data:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [user]);

    const toggleInterest = (id: string) => {
        if (pendingRequest) return;

        if (selectedInterests.includes(id)) {
            setSelectedInterests(prev => prev.filter(i => i !== id));
            // Also remove skill if interest removed
            const nextSkills = { ...selectedSkills };
            delete nextSkills[id];
            setSelectedSkills(nextSkills);
        } else {
            setSelectedInterests(prev => [...prev, id]);
            // Default skill level 3
            setSelectedSkills(prev => ({ ...prev, [id]: 3 }));
        }
    };

    const updateSkill = (sportId: string, level: number) => {
        if (pendingRequest) return;
        setSelectedSkills(prev => ({ ...prev, [sportId]: level }));
    };

    const handleSave = async () => {
        if (!user || !profileData) return;
        setSaving(true);
        try {
            const orgId = profileData.activeOrgId || 'default';
            const name = profileData.displayName || user.email || 'Player';

            // Auto-approve for Admins
            if (isAdmin || isOrgAdmin) {
                const { updateDoc, doc } = await import('firebase/firestore');
                const { db } = await import('../../firebaseConfig');
                await updateDoc(doc(db, 'users', user.uid), {
                    sportsInterests: selectedInterests,
                    skills: selectedSkills
                });
                // Clear any existing pending requests as they are now redundant
                const existing = await interestRequestService.getPendingRequestForUser(user.uid, orgId);
                if (existing?.id) {
                    const { deleteDoc, doc: fsDoc } = await import('firebase/firestore');
                    await deleteDoc(fsDoc(db, 'interestRequests', existing.id));
                }
                setPendingRequest(false);
                // if (Alert?.alert) Alert.alert("Success", "Interests updated successfully.");
            } else {
                await interestRequestService.createRequest(
                    user.uid,
                    orgId,
                    selectedInterests,
                    name,
                    user.email || '',
                    selectedSkills
                );
                setPendingRequest(true);
            }

            // Re-fetch fresh interests instantly so UI updates
            const freshProfileDoc = await getDoc(doc(db, 'users', user.uid));
            if (freshProfileDoc.exists() && freshProfileDoc.data().sportsInterests) {
                setSelectedInterests(freshProfileDoc.data().sportsInterests as string[]);
            }
        } catch (error: any) {
            console.error("Save error:", error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A0A' }}>
                <ActivityIndicator size="large" color="#00E5FF" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-background">
            <Stack.Screen options={{
                headerTitle: "Edit Profile",
                headerShown: true,
                headerStyle: { backgroundColor: '#000' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' }
            }} />

            <ScrollView className="flex-1 p-6" contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Identity Header */}
                <View className="items-center mb-8">
                    <View className="w-24 h-24 bg-primary/20 rounded-full items-center justify-center mb-4 border-2 border-primary/30">
                        <MaterialCommunityIcons name="account" size={60} color="#00E5FF" />
                    </View>
                    <Text className="text-white text-2xl font-black italic">{profileData?.displayName || 'Player'}</Text>
                    <Text className="text-gray-500 font-bold">{user?.email}</Text>
                </View>

                {/* Interests Section */}
                <View className="mb-8">
                    <Text className="text-white font-black text-xs uppercase tracking-[3px] mb-4">Your Interests</Text>
                    <Text className="text-gray-400 mb-6 text-sm italic">
                        Select the sports you want to participate in. You will see polls and matches for these sports.
                    </Text>

                    <View>
                        {allSports.map((sport) => {
                            const isSelected = selectedInterests.includes(sport.id);
                            const currentSkill = selectedSkills[sport.id] || 3;

                            return (
                                <View key={sport.id} className="mb-6">
                                    <TouchableOpacity
                                        onPress={() => toggleInterest(sport.id)}
                                        disabled={pendingRequest}
                                        className={`w-full p-4 rounded-3xl border ${isSelected ? 'bg-primary/20 border-primary' : 'bg-surface border-white/10'
                                            } flex-row items-center ${pendingRequest ? 'opacity-50' : 'opacity-100'}`}
                                    >
                                        <View className={`p-2 rounded-xl ${isSelected ? 'bg-primary/20' : 'bg-black/20'}`}>
                                            <MaterialCommunityIcons
                                                name={sport.icon as any}
                                                size={20}
                                                color={isSelected ? '#000' : '#4B5563'}
                                                style={isSelected ? { backgroundColor: '#00E5FF', borderRadius: 6, padding: 2 } : {}}
                                            />
                                        </View>
                                        <Text className={`ml-3 font-bold flex-1 ${isSelected ? 'text-white' : 'text-gray-500'}`}>
                                            {sport.name}
                                        </Text>
                                        {isSelected && (
                                            <MaterialCommunityIcons name="check-circle" size={20} color="#00E5FF" />
                                        )}
                                    </TouchableOpacity>

                                    {isSelected && (
                                        <View className="mt-3 px-4 flex-row items-center justify-between">
                                            <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider">Skill Level</Text>
                                            <View className="flex-row items-center">
                                                {[1, 2, 3, 4, 5].map((level) => (
                                                    <TouchableOpacity
                                                        key={level}
                                                        onPress={() => updateSkill(sport.id, level)}
                                                        disabled={pendingRequest}
                                                        className="mx-1"
                                                    >
                                                        <MaterialCommunityIcons
                                                            name={level <= currentSkill ? "star" : "star-outline"}
                                                            size={24}
                                                            color={level <= currentSkill ? "#00E5FF" : "#374151"}
                                                        />
                                                    </TouchableOpacity>
                                                ))}
                                                <Text className="ml-2 text-primary font-black w-4">{currentSkill}</Text>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* Pending Request Banner */}
                {pendingRequest && (
                    <View className="mb-6 bg-amber-500/10 p-4 rounded-2xl border border-amber-500/30">
                        <View className="flex-row items-center mb-1">
                            <MaterialCommunityIcons name="clock-outline" size={16} color="#F59E0B" style={{ marginRight: 6 }} />
                            <Text className="text-amber-500 font-black text-xs uppercase tracking-wider">Pending Approval</Text>
                        </View>
                        <Text className="text-white text-sm italic">
                            Your request to update sports interests is currently awaiting administrator review. You cannot make further changes right now.
                        </Text>
                    </View>
                )}

                {/* Action Button */}
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={saving || pendingRequest}
                    className={`w-full py-5 rounded-[24px] shadow-2xl items-center ${saving || pendingRequest ? 'bg-gray-800' : 'bg-primary shadow-primary/40'}`}
                    role="button"
                    accessibilityLabel="SAVE INTERESTS"
                >
                    {saving ? (
                        <ActivityIndicator color="#000" />
                    ) : (
                        <Text className="text-black font-black tracking-widest text-lg">
                            {pendingRequest ? 'REQUEST PENDING...' : 'SAVE INTERESTS'}
                        </Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => {
                        if (router.canGoBack()) {
                            router.back();
                        } else {
                            router.replace('/(app)/home');
                        }
                    }}
                    className={`w-full mt-4 py-5 rounded-[24px] border ${pendingRequest ? 'border-primary/50 bg-primary/10' : 'border-white/10 bg-transparent'} items-center`}
                    role="button"
                    accessibilityLabel="GO BACK HOME"
                >
                    <Text className={`${pendingRequest ? 'text-primary' : 'text-gray-400'} font-black uppercase tracking-widest text-lg`}>
                        {pendingRequest ? 'GO BACK HOME' : 'CANCEL'}
                    </Text>
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
}
