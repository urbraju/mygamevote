import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Platform, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { sportsDataService, SportKnowledge } from '../../../services/sportsDataService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

export default function SportDetailScreen() {
    const { sportId } = useLocalSearchParams<{ sportId: string }>();
    const [sport, setSport] = useState<SportKnowledge | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const loadDetail = async () => {
            if (sportId) {
                const data = await sportsDataService.getSportKnowledge(sportId);
                setSport(data);
            }
            setLoading(false);
        };
        loadDetail();
    }, [sportId]);

    if (loading) return null;

    if (!sport) {
        return (
            <View className="flex-1 bg-background items-center justify-center p-6">
                <Text className="text-white text-xl font-bold">Sport Not Found</Text>
                <TouchableOpacity onPress={() => router.back()} className="mt-4 bg-primary px-6 py-2 rounded-full">
                    <Text className="font-bold">Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const Container = Platform.OS === 'web' ? View : SafeAreaView;

    return (
        <Container className="flex-1 bg-background">
            <ScrollView className="flex-1">
                {/* Hero Section */}
                <View className="h-64 sm:h-80 bg-surface overflow-hidden relative">
                    <View className="absolute inset-0 bg-primary/10 items-center justify-center">
                        <MaterialCommunityIcons name={sport.icon as any} size={100} color="#00E5FF20" />
                    </View>
                    <View className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                    <View className="absolute bottom-6 left-6">
                        <TouchableOpacity
                            onPress={() => router.back()}
                            className="w-10 h-10 bg-black/40 rounded-full items-center justify-center mb-4 border border-white-10"
                        >
                            <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
                        </TouchableOpacity>
                        <Text className="text-white text-4xl font-black uppercase tracking-tight">{sport.name}</Text>
                        <Text className="text-primary font-bold uppercase tracking-widest text-xs mt-1">Knowledge Hub</Text>
                    </View>
                </View>

                <View className="px-6 -mt-4">
                    {/* How to Play */}
                    <Section title="Master the Basics" icon="school">
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                            {sport.howToPlay.steps.map((step, idx) => (
                                <View key={idx} className="w-56 bg-surface p-5 rounded-3xl mr-4 border border-white-10">
                                    <View className="w-10 h-10 bg-accent/20 rounded-xl items-center justify-center mb-4">
                                        <MaterialCommunityIcons name={step.icon as any} size={20} color="#FFD700" />
                                    </View>
                                    <Text className="text-white font-black text-lg mb-1">{step.title}</Text>
                                    <Text className="text-gray-400 text-sm leading-5">{step.description}</Text>
                                </View>
                            ))}
                        </ScrollView>
                    </Section>

                    {/* Official Rules */}
                    <Section title="Official Rules" icon="book-open-variant">
                        <View className="bg-surface rounded-3xl border border-white-10 overflow-hidden">
                            {sport.rules.map((rule, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    onPress={() => Linking.openURL(rule.sourceUrl)}
                                    className={`p-5 flex-row items-center justify-between ${idx !== sport.rules.length - 1 ? 'border-b border-white-5' : ''}`}
                                >
                                    <View className="flex-1 pr-4">
                                        <Text className="text-white font-bold text-base">{rule.title}</Text>
                                        <Text className="text-gray-400 text-sm mt-1">{rule.content}</Text>
                                    </View>
                                    <MaterialCommunityIcons name="open-in-new" size={18} color="#00E5FF" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Section>

                    {/* Tutorials */}
                    <Section title="Watch Tutorials" icon="play-circle">
                        {sport.tutorials.map((video, idx) => (
                            <TouchableOpacity
                                key={idx}
                                onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${video.videoId}`)}
                                className="bg-surface rounded-3xl border border-white-10 mb-4 overflow-hidden flex-row p-3 items-center"
                            >
                                <View className="w-24 h-16 bg-black/40 rounded-xl items-center justify-center relative overflow-hidden">
                                    <View className="absolute inset-0 bg-primary/5 items-center justify-center">
                                        <MaterialCommunityIcons name="play" size={32} color="#00E5FF" />
                                    </View>
                                </View>
                                <View className="flex-1 ml-4 justify-center">
                                    <Text className="text-white font-bold text-base" numberOfLines={1}>{video.title}</Text>
                                    <View className="flex-row items-center mt-1">
                                        <View className="bg-gray-800 px-2 py-0.5 rounded-md mr-2">
                                            <Text className="text-gray-400 text-[10px] uppercase font-bold">{video.difficulty}</Text>
                                        </View>
                                        <Text className="text-gray-500 text-[10px] font-bold">{video.duration}</Text>
                                    </View>
                                </View>
                                <MaterialCommunityIcons name="chevron-right" size={24} color="#374151" />
                            </TouchableOpacity>
                        ))}
                    </Section>

                    {/* Events */}
                    <Section title="Upcoming Events" icon="calendar-star">
                        <View className="bg-primary/5 rounded-3xl border border-primary/20 p-5">
                            {sport.events.map((event, idx) => (
                                <View key={idx} className={`flex-row items-center justify-between ${idx !== sport.events.length - 1 ? 'pb-4 mb-4 border-b border-primary/10' : ''}`}>
                                    <View className="flex-1">
                                        <Text className="text-white font-bold text-base">{event.title}</Text>
                                        <View className="flex-row items-center mt-1">
                                            <MaterialCommunityIcons name="map-marker" size={12} color="#9CA3AF" />
                                            <Text className="text-gray-400 text-xs ml-1">{event.location}</Text>
                                        </View>
                                    </View>
                                    <View className="items-end">
                                        <Text className="text-primary font-bold text-xs">{event.date}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </Section>

                    {/* Deals */}
                    <Section title="Gear Deals" icon="tag">
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                            {sport.deals.map((deal, idx) => (
                                <View key={idx} className="w-48 bg-surface rounded-3xl border border-white-10 p-3 mr-4">
                                    <View className="w-full h-32 bg-gray-900 rounded-2xl items-center justify-center mb-3">
                                        <MaterialCommunityIcons name="package-variant-closed" size={40} color="#374151" />
                                    </View>
                                    <Text className="text-white font-bold text-sm" numberOfLines={1}>{deal.title}</Text>
                                    <Text className="text-primary font-black text-lg mt-1">{deal.price}</Text>
                                    <TouchableOpacity
                                        onPress={() => Linking.openURL(deal.shopUrl)}
                                        className="bg-primary/20 border border-primary/30 py-2 rounded-xl mt-3 items-center"
                                    >
                                        <Text className="text-primary text-xs font-bold uppercase">View Deal</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    </Section>
                </View>
                <View className="h-20" />
            </ScrollView>
        </Container>
    );
}

function Section({ title, icon, children }: { title: string, icon: string, children: React.ReactNode }) {
    return (
        <View className="mb-10">
            <View className="flex-row items-center mb-5">
                <View className="w-8 h-8 bg-primary/10 rounded-lg items-center justify-center mr-3">
                    <MaterialCommunityIcons name={icon as any} size={18} color="#00E5FF" />
                </View>
                <Text className="text-white text-xl font-black uppercase tracking-tight">{title}</Text>
            </View>
            {children}
        </View>
    );
}
