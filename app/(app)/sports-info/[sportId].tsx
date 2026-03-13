import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Platform, Linking, RefreshControl, ActivityIndicator, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { db, functions } from '../../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { sportsDataService, SportKnowledge } from '../../../services/sportsDataService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../../components/Header';

export default function SportDetailScreen() {
    const { sportId } = useLocalSearchParams<{ sportId: string }>();
    const [sport, setSport] = useState<SportKnowledge | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const router = useRouter();

    const [refreshing, setRefreshing] = useState(false);

    const loadDetail = async (showRefresh = true) => {
        if (showRefresh) setLoading(true);
        if (sportId) {
            const data = await sportsDataService.getSportKnowledge(sportId);
            setSport(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadDetail();
    }, [sportId]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadDetail(false);
        setRefreshing(false);
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        try {
            const searchSportGear = httpsCallable(functions, 'searchSportGear');
            const response = await searchSportGear({ 
                query: searchQuery, 
                sportName: sport?.name 
            });
            const data = response.data as any;
            if (data.success) {
                // Apply stable link normalization to dynamic results
                const normalizedResults = (data.results || []).map((res: any) => ({
                    ...res,
                    stableSearchUrl: sportsDataService.getSearchUrl(res.title, res.shopUrl)
                }));
                setSearchResults(normalizedResults);
            }
        } catch (error) {
            console.error('[SportHub] Smart Search failed:', error);
        } finally {
            setIsSearching(false);
        }
    };

    if (loading) return null;

    if (!sport) {
        return (
            <View className="flex-1 bg-background items-center justify-center p-6">
                <Text className="text-white text-xl font-bold">Sport Not Found</Text>
                <TouchableOpacity 
                    onPress={() => router.back()}
                    className="flex-row items-center bg-primary px-6 py-3 rounded-full mt-6"
                >
                    <MaterialCommunityIcons name="arrow-left" size={20} color="#000" />
                    <Text className="text-black font-black uppercase ml-2">Back to Sports Hub</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const Container = Platform.OS === 'web' ? View : SafeAreaView;

    return (
        <Container className="flex-1 bg-background">
            <Header />
            <ScrollView
                className="flex-1"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00E5FF" />
                }
            >
                <View className="max-w-7xl w-full self-center">
                    {/* Hero Section */}
                    <View className="h-64 sm:h-80 md:h-[400px] bg-surface overflow-hidden relative">
                        {sport.heroImage ? (
                            <Image
                                source={{ uri: sport.heroImage }}
                                className="absolute inset-0 w-full h-full opacity-30"
                                resizeMode="cover"
                            />
                        ) : (
                            <View className="absolute inset-0 bg-primary/10 items-center justify-center">
                                <MaterialCommunityIcons name={sport.icon as any} size={100} color="#00E5FF20" />
                            </View>
                        )}
                        <View className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                        <View className="absolute bottom-6 left-6 md:left-12 md:bottom-12 right-6">
                            <TouchableOpacity
                                onPress={() => router.back()}
                                className="flex-row items-center bg-black/40 rounded-full px-4 py-2 mb-4 border border-white/5 self-start"
                            >
                                <MaterialCommunityIcons name="arrow-left" size={20} color="white" />
                                <Text className="text-white text-[10px] font-black uppercase ml-2 tracking-widest">Back to Hub</Text>
                            </TouchableOpacity>
                            <View className="flex-row items-end justify-between">
                                <View className="flex-1">
                                    <Text className="text-white text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight">{sport.name}</Text>
                                    <Text className="text-primary font-bold uppercase tracking-widest text-xs mt-1 md:text-sm">Knowledge Hub</Text>
                                </View>
                                {sport.lastAutoRefresh && (
                                    <View className="bg-success/20 border border-success/30 px-3 py-1 rounded-full flex-row items-center mb-2">
                                        <MaterialCommunityIcons name="robot" size={12} color="#4CAF50" className="mr-1" />
                                        <Text className="text-success text-[10px] font-bold uppercase">Auto-Updated</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>

                    <View className="px-6 md:px-12 -mt-4">
                        {/* Master the Basics */}
                        <Section title="Master the Basics" icon="school">
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                                {(sport.howToPlay?.steps || []).map((step, idx) => (
                                    <View key={idx} className="w-56 sm:w-64 bg-surface p-5 rounded-3xl mr-4 border border-white-10">
                                        <View className="w-10 h-10 bg-accent/20 rounded-xl items-center justify-center mb-4">
                                            <MaterialCommunityIcons name={(step.icon || 'star') as any} size={20} color="#FFD700" />
                                        </View>
                                        <Text className="text-white font-black text-lg mb-1">{step.title}</Text>
                                        <Text className="text-gray-400 text-sm leading-5">{step.description}</Text>
                                    </View>
                                ))}
                            </ScrollView>
                        </Section>

                        <View className="flex-col lg:flex-row lg:space-x-10">
                            <View className="flex-1">
                                {/* Official Rules */}
                                <Section title="Official Rules" icon="book-open-variant">
                                    <View className="bg-surface rounded-3xl border border-white-10 overflow-hidden">
                                        {(sport.rules || []).map((rule, idx) => (
                                            <TouchableOpacity
                                                key={idx}
                                                onPress={() => rule.sourceUrl && Linking.openURL(rule.sourceUrl)}
                                                className={`p-5 flex-row items-center justify-between active:bg-white-5 ${idx !== (sport.rules || []).length - 1 ? 'border-b border-white-5' : ''}`}
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
                                    {(sport.tutorials || []).map((video, idx) => (
                                        <TouchableOpacity
                                            key={idx}
                                            onPress={() => {
                                                if (!video.videoId) return;
                                                const url = video.videoId.startsWith('http') ? video.videoId : `https://www.youtube.com/watch?v=${video.videoId}`;
                                                console.log(`[SportHub] Opening Tutorial: ${url}`);
                                                Linking.openURL(url);
                                            }}
                                            className="bg-surface rounded-3xl border border-white-10 mb-4 overflow-hidden flex-row p-3 items-center active:scale-[0.98] transition-transform"
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
                            </View>

                            <View className="flex-1 lg:max-w-md">
                                {/* Events */}
                                <Section title="Upcoming Events" icon="calendar-star">
                                    <View className="bg-primary/5 rounded-3xl border border-primary/20 p-5">
                                        {(sport.events || []).map((event, idx) => (
                                            <TouchableOpacity
                                                key={idx}
                                                onPress={() => {
                                                    if (event.trackUrl) {
                                                        console.log(`[SportHub] Opening Event: ${event.trackUrl}`);
                                                        Linking.openURL(event.trackUrl);
                                                    }
                                                }}
                                                disabled={!event.trackUrl}
                                                className={`flex-row items-center justify-between ${idx !== (sport.events || []).length - 1 ? 'pb-4 mb-4 border-b border-primary/10' : ''}`}
                                            >
                                                <View className="flex-1">
                                                    <Text className="text-white font-bold text-base">{event.title}</Text>
                                                    <View className="flex-row items-center mt-1">
                                                        <MaterialCommunityIcons name="map-marker" size={12} color="#9CA3AF" />
                                                        <Text className="text-gray-400 text-xs ml-1">{event.location}</Text>
                                                    </View>
                                                </View>
                                                <View className="items-end">
                                                    <Text className="text-primary font-bold text-xs">{event.date}</Text>
                                                    {event.trackUrl && (
                                                        <View className="flex-row items-center mt-1">
                                                            <Text className="text-primary/60 text-[10px] uppercase font-bold mr-1">Track</Text>
                                                            <MaterialCommunityIcons name="chevron-right" size={10} color="#00E5FF66" />
                                                        </View>
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </Section>

                                {/* Smart Gear Search Section */}
                                <View className="mb-6">
                                    <View className="flex-row items-center mb-4">
                                        <View className="bg-primary/20 p-2 rounded-lg mr-3">
                                            <MaterialCommunityIcons name="magnify" size={20} color="#00E5FF" />
                                        </View>
                                        <Text className="text-white text-xl font-black uppercase tracking-tighter">Smart Gear Search</Text>
                                    </View>

                                    <View className="bg-secondary/30 border border-white/10 rounded-2xl p-4">
                                        <View className="flex-row items-center bg-black/40 border border-white/5 rounded-xl px-3 mb-3">
                                            <TextInput
                                                className="flex-1 py-3 text-white text-base"
                                                placeholder={`Search for ${sport?.name} gear...`}
                                                placeholderTextColor="#999"
                                                value={searchQuery}
                                                onChangeText={setSearchQuery}
                                                onSubmitEditing={handleSearch}
                                            />
                                            {isSearching ? (
                                                <ActivityIndicator color="#00E5FF" size="small" />
                                            ) : (
                                                <TouchableOpacity onPress={handleSearch} disabled={!searchQuery.trim()}>
                                                    <MaterialCommunityIcons 
                                                        name="arrow-right-circle" 
                                                        size={28} 
                                                        color={searchQuery.trim() ? "#00E5FF" : "#333"} 
                                                    />
                                                </TouchableOpacity>
                                            )}
                                        </View>

                                        {searchResults.length > 0 && (
                                            <View className="mt-2 space-y-3">
                                                <Text className="text-white/40 text-[10px] font-bold uppercase mb-1">Top Intelligence Results</Text>
                                                {searchResults.map((item, index) => (
                                                    <View key={index} className="bg-white/5 border border-white/5 rounded-xl p-3 flex-row items-center">
                                                        <Image 
                                                            source={{ uri: item.imageUrl || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=100&h=100&fit=crop' }} 
                                                            className="w-12 h-12 rounded-lg bg-black/50"
                                                        />
                                                        <View className="flex-1 ml-3 mr-2">
                                                            <Text className="text-white text-xs font-bold" numberOfLines={1}>{item.title}</Text>
                                                            <Text className="text-primary font-black text-sm">{item.price}</Text>
                                                        </View>
                                                        <TouchableOpacity 
                                                            onPress={() => {
                                                                const targetUrl = item.shopUrl || item.stableSearchUrl;
                                                                if (targetUrl) {
                                                                    Linking.openURL(targetUrl).catch(() => {
                                                                        if (item.stableSearchUrl) Linking.openURL(item.stableSearchUrl);
                                                                    });
                                                                }
                                                            }}
                                                            className="bg-primary/20 px-3 py-1.5 rounded-lg"
                                                        >
                                                            <Text className="text-primary text-[10px] font-black uppercase">Link</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                ))}
                                                <TouchableOpacity onPress={() => setSearchResults([])} className="items-center py-2">
                                                    <Text className="text-white/30 text-[10px] font-bold uppercase">Clear Results</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                        {!isSearching && searchResults.length === 0 && (
                                            <Text className="text-white/30 text-[10px] text-center italic">Type and search for real-time intelligent gear deals</Text>
                                        )}
                                    </View>
                                </View>

                                {/* Static Gear Deals Section */}
                                <View className="mb-6">
                                    <View className="flex-row items-center mb-4">
                                        <View className="bg-primary/20 p-2 rounded-lg mr-3">
                                            <MaterialCommunityIcons name="tag" size={20} color="#00E5FF" />
                                        </View>
                                        <Text className="text-white text-xl font-black uppercase tracking-tighter">Featured Deals</Text>
                                    </View>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                                        {(sport.deals || []).map((deal, idx) => (
                                            <View key={idx} className="w-48 bg-surface rounded-3xl border border-white-10 p-3 mr-4">
                                                <View className="w-full h-32 bg-gray-900 rounded-2xl items-center justify-center mb-3 overflow-hidden">
                                                    {deal.imageUrl ? (
                                                        <Image
                                                            source={{ uri: deal.imageUrl }}
                                                            className="w-full h-full"
                                                            resizeMode="contain"
                                                            onError={() => {
                                                                console.warn(`[SportHub][DealImage] FAILED to load image for "${deal.title}": ${deal.imageUrl}`);
                                                            }}
                                                        />
                                                    ) : (
                                                        <MaterialCommunityIcons name="package-variant-closed" size={40} color="#374151" />
                                                    )}
                                                </View>
                                                <Text className="text-white font-bold text-sm" numberOfLines={1}>{deal.title}</Text>
                                                <Text className="text-primary font-black text-lg mt-1">{deal.price}</Text>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        const targetUrl = deal.shopUrl || (deal as any).stableSearchUrl;
                                                        console.log(`[SportHub] Opening Deal for "${deal.title}": ${targetUrl}`);
                                                        if (targetUrl) {
                                                            Linking.openURL(targetUrl).catch(err => {
                                                                console.error(`[SportHub] Failed to open URL: ${targetUrl}`, err);
                                                                // If primary fails, try the stable search fallback
                                                                if ((deal as any).stableSearchUrl && targetUrl !== (deal as any).stableSearchUrl) {
                                                                    console.log(`[SportHub] Retrying with stable fallback: ${(deal as any).stableSearchUrl}`);
                                                                    Linking.openURL((deal as any).stableSearchUrl);
                                                                }
                                                            });
                                                        }
                                                    }}
                                                    className="bg-primary/20 border border-primary/30 py-2 rounded-xl mt-3 items-center active:bg-primary/30"
                                                >
                                                    <Text className="text-primary text-xs font-bold uppercase">View Deal</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </ScrollView>
                                </View>

                                {/* Latest News */}
                                <Section title="Latest Sports News" icon="rss">
                                    <View className="bg-surface rounded-3xl border border-white-10 overflow-hidden">
                                        {(sport.news || []).map((item, idx) => (
                                            <TouchableOpacity
                                                key={idx}
                                                onPress={() => {
                                                    if (!item.url) return;
                                                    console.log(`[SportHub] Opening News: ${item.url}`);
                                                    Linking.openURL(item.url);
                                                }}
                                                className={`p-4 flex-row items-center justify-between active:bg-white-5 ${idx !== (sport.news || []).length - 1 ? 'border-b border-white-5' : ''}`}
                                            >
                                                <View className="flex-1 pr-4">
                                                    <View className="flex-row items-center mb-1">
                                                        <Text className="text-primary text-[10px] font-bold uppercase tracking-wider">{item.source}</Text>
                                                        <Text className="text-gray-500 text-[10px] ml-2">{item.date}</Text>
                                                    </View>
                                                    <Text className="text-white font-bold text-sm leading-5">{item.title}</Text>
                                                </View>
                                                <MaterialCommunityIcons name="arrow-top-right" size={16} color="#9CA3AF" />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </Section>
                            </View>
                        </View>
                    </View>
                </View>
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
