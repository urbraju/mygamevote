import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { sportsService, Sport } from '../../services/sportsService';
import { db } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';

export default function ProfileScreen() {
    const { user } = useAuth();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [allSports, setAllSports] = useState<Sport[]>([]);
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [profileData, setProfileData] = useState<any>(null);

    useEffect(() => {
        const loadData = async () => {
            if (!user) return;
            try {
                // Fetch Sports and Profile in parallel
                const [sports, userDoc] = await Promise.all([
                    sportsService.getAllSports(),
                    getDoc(doc(db, 'users', user.uid))
                ]);

                setAllSports(sports);
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setProfileData(data);
                    setSelectedInterests(data.sportsInterests || []);
                }
            } catch (error) {
                console.error("Failed to load profile data:", error);
                Alert.alert("Error", "Failed to load profile settings.");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [user]);

    const toggleInterest = (id: string) => {
        if (selectedInterests.includes(id)) {
            setSelectedInterests(prev => prev.filter(i => i !== id));
        } else {
            setSelectedInterests(prev => [...prev, id]);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            await authService.updateUserProfile(user.uid, {
                sportsInterests: selectedInterests
            });
            Alert.alert("Success", "Your interests have been updated!");
            router.back();
        } catch (error: any) {
            Alert.alert("Save Failed", error.message);
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

                    <View className="flex-row flex-wrap justify-between">
                        {allSports.map((sport) => {
                            const isSelected = selectedInterests.includes(sport.id);
                            return (
                                <TouchableOpacity
                                    key={sport.id}
                                    onPress={() => toggleInterest(sport.id)}
                                    className={`w-[48%] mb-4 p-4 rounded-3xl border ${isSelected ? 'bg-primary/20 border-primary' : 'bg-surface border-white/10'
                                        } flex-row items-center`}
                                >
                                    <View className={`p-2 rounded-xl ${isSelected ? 'bg-primary/20' : 'bg-black/20'}`}>
                                        <MaterialCommunityIcons
                                            name={sport.icon as any}
                                            size={20}
                                            color={isSelected ? '#000' : '#4B5563'}
                                            style={isSelected ? { backgroundColor: '#00E5FF', borderRadius: 6, padding: 2 } : {}}
                                        />
                                    </View>
                                    <Text className={`ml-3 font-bold ${isSelected ? 'text-white' : 'text-gray-500'}`}>
                                        {sport.name}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Action Button */}
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={saving}
                    className={`w-full py-5 rounded-[24px] shadow-2xl items-center ${saving ? 'bg-gray-800' : 'bg-primary shadow-primary/40'}`}
                >
                    {saving ? (
                        <ActivityIndicator color="#000" />
                    ) : (
                        <Text className="text-black font-black tracking-widest text-lg">SAVE INTERESTS</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => router.back()}
                    className="w-full mt-4 py-4 items-center"
                >
                    <Text className="text-gray-500 font-bold uppercase tracking-widest text-xs">Cancel</Text>
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
}
