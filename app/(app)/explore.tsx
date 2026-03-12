import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Platform, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { sportsDataService, SportKnowledge } from '../../services/sportsDataService';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ExploreScreen() {
    const { sportsInterests, isAdmin } = useAuth();
    const [availableSports, setAvailableSports] = useState<SportKnowledge[]>([]);
    const [isHubEnabled, setIsHubEnabled] = useState(true);
    const [checkingStatus, setCheckingStatus] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const loadSportsAndStatus = async () => {
            try {
                const [all, config] = await Promise.all([
                    sportsDataService.getAllSports(),
                    sportsDataService.getSystemConfig()
                ]);

                setIsHubEnabled(config.sportsHubEnabled);

                // Filter by user's interests (case-insensitive)
                const filtered = all.filter((s: SportKnowledge) =>
                    sportsInterests.some(interest => interest.toLowerCase() === s.id.toLowerCase())
                );
                setAvailableSports(filtered);
            } catch (err) {
                console.error("Failed to load Explore data", err);
            } finally {
                setCheckingStatus(false);
            }
        };
        loadSportsAndStatus();
    }, [sportsInterests]);

    const Container = Platform.OS === 'web' ? View : SafeAreaView;

    return (
        <Container className="flex-1 bg-background">
            <Header />
            <ScrollView className="flex-1 px-4 pt-6">
                <View className="mb-8">
                    <Text className="text-white text-3xl font-black uppercase tracking-tight">
                        Sports <Text className="text-primary">Hub</Text>
                    </Text>
                    <Text className="text-gray-400 mt-2 font-medium">
                        Personalized knowledge for your favorite sports.
                    </Text>
                    {!isHubEnabled && (
                        <View className="flex-row items-center bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-2 mt-4">
                            <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#F97316" />
                            <Text className="text-orange-500 text-[10px] font-bold ml-2 uppercase">Global Testing Mode: Admins Only</Text>
                        </View>
                    )}
                </View>

                {checkingStatus ? (
                    <View className="py-20 justify-center items-center">
                        <ActivityIndicator color="#00E5FF" />
                    </View>
                ) : !isHubEnabled && !isAdmin ? (
                    <View className="bg-surface rounded-3xl p-8 border border-white-10 items-center">
                        <MaterialCommunityIcons name="lock-outline" size={48} color="#9CA3AF" />
                        <Text className="text-white text-lg font-bold mt-4 text-center">Sports Hub Coming Soon</Text>
                        <Text className="text-gray-400 text-center mt-2">
                            This feature is currently undergoing maintenance or is disabled by the platform administrators.
                        </Text>
                    </View>
                ) : availableSports.length === 0 ? (
                    <View className="bg-surface rounded-3xl p-8 border border-white-10 items-center">
                        <MaterialCommunityIcons name="trophy-outline" size={48} color="#9CA3AF" />
                        <Text className="text-white text-lg font-bold mt-4 text-center">No Sports Selected</Text>
                        <Text className="text-gray-400 text-center mt-2">
                            Update your interests in your profile to see curated content here.
                        </Text>
                        <TouchableOpacity
                            onPress={() => router.push('/profile')}
                            className="bg-primary/20 border border-primary/30 px-6 py-3 rounded-full mt-6"
                        >
                            <Text className="text-primary font-bold">Manage Interests</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View className="flex-row flex-wrap justify-between">
                        {availableSports.map((sport) => (
                            <TouchableOpacity
                                key={sport.id}
                                onPress={() => router.push({ pathname: '/sports-info/[sportId]', params: { sportId: sport.id } } as any)}
                                className="w-[48%] bg-surface rounded-3xl border border-white-10 p-4 mb-4 overflow-hidden"
                            >
                                <View className="w-12 h-12 bg-primary/20 rounded-2xl items-center justify-center mb-4 border border-primary/30">
                                    <MaterialCommunityIcons
                                        name={sport.icon as any}
                                        size={28}
                                        color="#00E5FF"
                                    />
                                </View>
                                <Text className="text-white text-xl font-black uppercase tracking-tight">
                                    {sport.name}
                                </Text>
                                <Text className="text-gray-400 text-xs mt-1" numberOfLines={2}>
                                    {sport.description}
                                </Text>
                                <View className="flex-row items-center mt-4">
                                    <Text className="text-primary text-xs font-bold uppercase mr-1">Explore</Text>
                                    <MaterialCommunityIcons name="arrow-right" size={14} color="#00E5FF" />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <View className="h-20" />
            </ScrollView>
        </Container>
    );
}
