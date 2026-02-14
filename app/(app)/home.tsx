/**
 * Home Screen (Main Voting Interface)
 * 
 * This is the core screen where users view the game status, vote for a slot,
 * join the waitlist, and navigate to payment options. It subscribes to real-time
 * Firestore updates for the current week's slots.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert, RefreshControl, TouchableOpacity, Linking, Platform } from 'react-native';
import { CustomAlert } from '../../components/CustomAlert';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import VoteButton from '../../components/VoteButton';
import SlotList from '../../components/SlotList';
import PaymentModal from '../../components/PaymentModal';
import { votingService, WeeklySlotData, SlotUser } from '../../services/votingService';
import { eventService, GameEvent } from '../../services/eventService';
import { authService } from '../../services/authService';
import { db } from '../../firebaseConfig';
import { doc, getDoc, onSnapshot, query, where, orderBy, collection } from 'firebase/firestore';
import { getNextGameDate, isVotingOpen, getScanningGameId, formatInCentralTime, getVotingStartTime, getMillis, getVotingStartForDate } from '../../utils/dateUtils';
import { generateWhatsAppLink } from '../../utils/shareUtils';
import { format } from 'date-fns';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import ServerClock from '../../components/ServerClock';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [data, setData] = useState<WeeklySlotData | null>(null);
    const [loading, setLoading] = useState(true);
    const [votingLoading, setVotingLoading] = useState(false);
    const [canVote, setCanVote] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    const [events, setEvents] = useState<GameEvent[]>([]);
    const [joinedEvents, setJoinedEvents] = useState<GameEvent[]>([]);
    const [activeTab, setActiveTab] = useState<'discover' | 'joined'>('discover');
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [userInterests, setUserInterests] = useState<string[]>([]);
    const [interestNames, setInterestNames] = useState<string[]>([]);
    const [showInterestAlert, setShowInterestAlert] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [now, setNow] = useState(Date.now());

    // Timer to force re-renders for voting window activation
    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now());
        }, 30000); // Update every 30 seconds
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const fetchUserData = async () => {
            if (!user) return;
            try {
                const [userDoc, allSports] = await Promise.all([
                    getDoc(doc(db, 'users', user.uid)),
                    require('../../services/sportsService').sportsService.getAllSports()
                ]);

                if (userDoc.exists()) {
                    const interests = userDoc.data().sportsInterests || [];
                    setUserInterests(interests);

                    // Map IDs to names
                    const names = interests.map((id: string) => {
                        const sport = allSports.find((s: any) => s.id === id);
                        return sport ? sport.name : id;
                    });
                    setInterestNames(names);
                }
            } catch (err) {
                console.error("Failed to fetch user data for home", err);
            }
        };
        fetchUserData();
    }, [user]);

    useEffect(() => {
        // Subscribe to legacy slots as a secondary source/fallback
        const unsubscribe = votingService.subscribeToSlots((slotData) => {
            setData(slotData);
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        if (userInterests.length === 0) {
            setLoading(false);
            return;
        }

        const unsubscribeDiscover = eventService.subscribeToEvents(userInterests, (items) => {
            setEvents(items);
            if (items.length > 0 && !selectedEventId && activeTab === 'discover') {
                setSelectedEventId(items[0].id || null);
            }
            setLoading(false);
        });

        const unsubscribeJoined = onSnapshot(
            query(
                collection(db, 'events'),
                where('participantIds', 'array-contains', user?.uid || ''),
                orderBy('eventDate', 'asc')
            ),
            (snap) => {
                // Filter out completed events in memory to avoid complex index
                const items = snap.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as GameEvent))
                    .filter(event => event.status !== 'completed');
                setJoinedEvents(items);
                if (items.length > 0 && !selectedEventId && activeTab === 'joined') {
                    setSelectedEventId(items[0].id || null);
                }
            }
        );

        return () => {
            unsubscribeDiscover();
            unsubscribeJoined();
        };
    }, [userInterests, user, activeTab]);

    // Create a virtual event for the legacy/default match
    const legacyEvent: GameEvent | null = data ? {
        id: 'default-match',
        sportId: 'volleyball',
        sportName: data.sportName || 'Every Saturday',
        sportIcon: data.sportIcon || 'volleyball',
        eventDate: getNextGameDate().getTime(),
        votingOpensAt: data.votingOpensAt || getVotingStartForDate(getNextGameDate()).getTime(),
        votingClosesAt: data.votingClosesAt || (getVotingStartForDate(getNextGameDate()).getTime() + (48 * 60 * 60 * 1000)),
        maxSlots: data.maxSlots || 14,
        maxWaitlist: data.maxWaitlist || 4,
        isOpen: data.isOpen ?? true, // Master toggle should default to true for legacy match
        status: 'scheduled', // Always scheduled, activation is handled by time window
        location: data.location || 'Beach at Craig Ranch',
        slots: data.slots || [],
        participantIds: data.slots?.map(s => s.userId) || [],
        fees: data.fees,
        currency: data.currency,
        createdAt: Date.now()
    } : null;

    // Check if user has voted on the legacy/default game
    const hasVotedOnLegacy = data?.slots?.some(slot => slot.userId === user?.uid) || false;

    // Unified list of events for the carousel
    const displayedEvents = [
        ...(activeTab === 'discover'
            ? (legacyEvent ? [legacyEvent] : [])
            : (hasVotedOnLegacy && legacyEvent ? [legacyEvent] : [])),
        ...(activeTab === 'discover' ? events : joinedEvents)
    ];

    const activeEvent = displayedEvents.find(e => e.id === selectedEventId) || displayedEvents[0] || null;

    // Default to the first event if none selected
    useEffect(() => {
        if (!selectedEventId && displayedEvents.length > 0) {
            setSelectedEventId(displayedEvents[0].id || null);
        }
    }, [displayedEvents, selectedEventId]);

    const onRefresh = async () => {
        setLoading(true);
        await votingService.initializeWeek();
        setLoading(false);
    };

    const handleShare = () => {
        if (!data) return;
        const url = generateWhatsAppLink(data);
        if (Platform.OS === 'web') {
            window.open(url, '_blank');
        } else {
            Linking.openURL(url);
        }
    };

    const handleVote = async () => {
        if (!user) {
            Alert.alert('Error', 'Please log in to vote.');
            return;
        }

        // Check if user has selected sports interests
        console.log('[Home] Checking sports interests. Count:', userInterests.length);
        if (userInterests.length === 0) {
            console.log('[Home] No sports interests - showing alert');
            setShowInterestAlert(true);
            return;
        }

        setVotingLoading(true);
        try {
            let displayName = user.displayName;
            if (!displayName) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        displayName = userDoc.data().displayName;
                    }
                } catch (e) {
                    console.log('Failed to fetch fallback name', e);
                }
            }

            const finalName = displayName || user.email || 'Anonymous';
            const finalEmail = user.email || '';

            if (activeEvent?.id === 'default-match') {
                // Legacy system
                await votingService.legacyVote(user.uid, finalName, finalEmail);
            } else if (activeEvent?.id) {
                // Multi-sport system
                await votingService.vote(activeEvent.id, user.uid, finalName, finalEmail);
            } else {
                throw new Error("No active match selected.");
            }

            Alert.alert('Success', 'Your vote has been recorded!');
        } catch (error: any) {
            Alert.alert('Vote Failed', error?.message || error);
        } finally {
            setVotingLoading(false);
        }
    };

    const handleLeave = async () => {
        if (!user) return;
        setVotingLoading(true);
        try {
            if (activeEvent?.id === 'default-match') {
                await votingService.leaveGame(user.uid);
            } else if (activeEvent?.id) {
                await votingService.removeVote(activeEvent.id, user.uid);
            }
            setShowLeaveConfirm(false);
            Alert.alert('Success', 'You have left the match.');
        } catch (error: any) {
            const errorMsg = typeof error === 'string' ? error : (error.message || 'Failed to leave match');
            Alert.alert('Error', errorMsg);
        } finally {
            setVotingLoading(false);
        }
    };


    const handleMarkPaid = async () => {
        if (!user || !activeEvent?.id) return;
        try {
            await votingService.markAsPaid(activeEvent.id, user.uid);
            setShowPaymentModal(false);
            Alert.alert("Success", "You have marked your slot as PAID.");
        } catch (error: any) {
            Alert.alert("Error", error.message);
        }
    };

    const userSlot = activeEvent?.slots.find(s => s.userId === user?.uid);
    const hasVoted = !!userSlot;

    // Calculate if user can leave (must be at least 24 hours before game)
    const gameTime = activeEvent ? getMillis(activeEvent.eventDate) : 0;
    const hoursUntilGame = gameTime ? (gameTime - now) / (1000 * 60 * 60) : 0;
    const canLeaveMatch = hoursUntilGame >= 0; // Completely restored functionality: users can leave anytime before game starts

    // Debug logging
    if (hasVoted) {
        console.log('[Home] Leave Match Debug:', {
            gameTime: new Date(gameTime),
            now: new Date(),
            hoursUntilGame: hoursUntilGame.toFixed(2),
            canLeaveMatch
        });
    }

    return (
        <View className="flex-1 bg-background">
            <Header />
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 40 }}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#00E5FF" />
                }
            >
                {/* No Interests Warning Banner */}
                {userInterests.length === 0 && (
                    <View className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-6">
                        <View className="flex-row items-center mb-2">
                            <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#F59E0B" style={{ marginRight: 8 }} />
                            <Text className="text-amber-500 font-black text-sm">Set Your Sports Interests</Text>
                        </View>
                        <Text className="text-white text-sm mb-3 leading-5">
                            You need to select your sports interests to vote for matches and see personalized recommendations.
                        </Text>
                        <TouchableOpacity
                            onPress={() => router.push('/profile')}
                            className="bg-amber-500 px-4 py-2 rounded-xl self-start"
                        >
                            <Text className="text-black font-black text-xs">SET INTERESTS NOW</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Server Time & Interests */}
                <View className="flex-row justify-between items-center mb-6">
                    <ServerClock />
                    <TouchableOpacity
                        onPress={() => router.push('/profile')}
                        className="bg-white/10 px-3 py-1.5 rounded-full border border-white/20"
                    >
                        <Text className="text-white text-[10px] font-bold">EDIT INTERESTS</Text>
                    </TouchableOpacity>
                </View>

                {/* Tabs: Discover vs Joined */}
                <View className="flex-row bg-surface rounded-2xl p-1.5 mb-8 border border-white/10 shadow-lg">
                    <TouchableOpacity
                        onPress={() => {
                            setActiveTab('discover');
                            if (events.length > 0) setSelectedEventId(events[0].id || null);
                            else setSelectedEventId(null);
                        }}
                        className={`flex-1 py-3 rounded-xl flex-row items-center justify-center gap-2 ${activeTab === 'discover' ? 'bg-primary' : ''}`}
                    >
                        <MaterialCommunityIcons name="compass-outline" size={18} color={activeTab === 'discover' ? 'black' : 'white'} />
                        <Text className={`font-black uppercase tracking-widest text-[10px] ${activeTab === 'discover' ? 'text-black' : 'text-white'}`}>
                            Discover
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => {
                            setActiveTab('joined');
                            if (joinedEvents.length > 0) setSelectedEventId(joinedEvents[0].id || null);
                            else setSelectedEventId(null);
                        }}
                        className={`flex-1 py-3 rounded-xl flex-row items-center justify-center gap-2 ${activeTab === 'joined' ? 'bg-primary' : ''}`}
                    >
                        <MaterialCommunityIcons name="check-decagram-outline" size={18} color={activeTab === 'joined' ? 'black' : 'white'} />
                        <Text className={`font-black uppercase tracking-widest text-[10px] ${activeTab === 'joined' ? 'text-black' : 'text-white'}`}>
                            My Matches
                        </Text>
                        {(joinedEvents.length > 0 || hasVotedOnLegacy) && (
                            <View className={`rounded-full px-1.5 py-0.5 ${activeTab === 'joined' ? 'bg-black/20' : 'bg-primary'}`}>
                                <Text className={`text-[8px] font-black ${activeTab === 'joined' ? 'text-black' : 'text-black'}`}>
                                    {joinedEvents.length + (hasVotedOnLegacy ? 1 : 0)}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Match Selection (Horizontal Scroll) */}
                <View className="mb-6">
                    <Text className="text-white font-black text-xs uppercase tracking-[2px] mb-3 ml-1">
                        {activeTab === 'discover' ? 'Available Matches' : 'Joined Matches'}
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                        {displayedEvents.map((event) => (
                            <TouchableOpacity
                                key={event.id}
                                onPress={() => setSelectedEventId(event.id || null)}
                                className={`mr-3 px-6 py-4 rounded-3xl border ${selectedEventId === event.id ? 'bg-primary border-primary' : 'bg-surface border-white/10'} items-center min-w-[120px]`}
                            >
                                <MaterialCommunityIcons
                                    name={event.sportIcon as any || 'help'}
                                    size={32}
                                    color={selectedEventId === event.id ? 'black' : 'white'}
                                />
                                <Text className={`mt-2 font-black text-sm ${selectedEventId === event.id ? 'text-black' : 'text-white'}`}>
                                    {event.id === 'default-match' ? 'Default' : event.sportName}
                                </Text>
                            </TouchableOpacity>
                        ))}
                        {displayedEvents.length === 0 && !loading && !(activeTab === 'joined' && hasVotedOnLegacy) && !(activeTab === 'discover' && data) && (
                            <View className="bg-surface p-6 rounded-3xl border border-white/10 w-full">
                                <Text className="text-white/60 text-center italic">
                                    {activeTab === 'discover'
                                        ? interestNames.length > 0
                                            ? `No ${interestNames.join(' or ')} matches scheduled yet.`
                                            : "No matches scheduled for your interests yet."
                                        : "You haven't joined any matches yet."}
                                </Text>
                            </View>
                        )}
                    </ScrollView>
                </View>

                {/* Selected Match Hero Section */}
                {activeEvent ? (
                    <View className="bg-surface rounded-3xl p-6 shadow-2xl mb-8 border border-white/10 relative overflow-hidden">
                        <View className="absolute -right-8 -bottom-8 opacity-5">
                            <MaterialCommunityIcons name={activeEvent.sportIcon as any || 'soccer'} size={200} color="#00E5FF" />
                        </View>

                        <View className="flex-row justify-between items-start mb-6">
                            <View>
                                <View className="flex-row items-center mb-1">
                                    <MaterialCommunityIcons name="trophy-outline" size={14} color="#39FF14" style={{ marginRight: 6 }} />
                                    <Text className="text-white font-black text-xs uppercase tracking-[2px]">
                                        {activeEvent.id === 'default-match' ? (data?.sportName || 'Every Saturday') : activeEvent.sportName} Match
                                    </Text>
                                </View>
                                <Text className="text-3xl font-black text-white italic tracking-tighter">
                                    {formatInCentralTime(getMillis(activeEvent.eventDate), 'MMM do')}
                                </Text>
                            </View>
                            {(() => {
                                const opensAt = getMillis(activeEvent.votingOpensAt);
                                const closesAt = getMillis(activeEvent.votingClosesAt);
                                const isTimeOpen = now >= opensAt && (closesAt === 0 || now <= closesAt);
                                // Master toggle (isOpen) must be true, AND either manually opened or scheduled window reached
                                const isLive = (activeEvent.isOpen ?? true) && (activeEvent.status === 'open' || (activeEvent.status === 'scheduled' && isTimeOpen));

                                return (
                                    <View className={`px-3 py-1.5 rounded-xl border ${isLive ? 'bg-primary/10 border-primary/30' : 'bg-red-500/10 border-red-500/30'}`}>
                                        <Text className={`${isLive ? 'text-primary' : 'text-red-500'} font-black text-[10px] uppercase italic`}>
                                            {isLive ? 'Voting Live' : 'Not Open'}
                                        </Text>
                                    </View>
                                );
                            })()}
                        </View>

                        <View className="space-y-3 mb-6">
                            <View className="flex-row items-center">
                                <MaterialCommunityIcons name="calendar-clock" size={16} color="#00E5FF" style={{ marginRight: 8 }} />
                                <Text className="text-white text-sm font-medium">
                                    {activeEvent.id === 'default-match'
                                        ? `${formatInCentralTime(getMillis(activeEvent.eventDate), 'EEEE, MMM do')}, 7:00 AM - 9:00 AM`
                                        : formatInCentralTime(getMillis(activeEvent.eventDate), 'EEEE, MMMM do, h:mm a')}
                                </Text>
                            </View>
                            <View className="flex-row items-center">
                                <MaterialCommunityIcons name="map-marker" size={16} color="#00E5FF" style={{ marginRight: 8 }} />
                                <Text className="text-white text-sm font-medium">{activeEvent.location}</Text>
                            </View>
                            {(activeEvent.fees ?? 0) > 0 && (
                                <View className="flex-row items-center">
                                    <MaterialCommunityIcons name="currency-usd" size={16} color="#00E5FF" style={{ marginRight: 8 }} />
                                    <Text className="text-white text-sm font-medium">{activeEvent.currency || '$'}{activeEvent.fees} per player</Text>
                                </View>
                            )}
                        </View>

                        <View className="flex-row justify-between items-center pt-4 border-t border-white/10">
                            <View className="flex-row items-center">
                                <MaterialCommunityIcons name="account-group" size={18} color="#39FF14" style={{ marginRight: 6 }} />
                                <Text className="text-white/60 text-xs">
                                    {activeEvent.slots?.length || 0} / {activeEvent.maxSlots || 14} Players
                                </Text>
                            </View>
                            <TouchableOpacity onPress={handleShare} className="bg-primary/10 px-4 py-2 rounded-xl border border-primary/20">
                                <View className="flex-row items-center">
                                    <MaterialCommunityIcons name="share-variant" size={14} color="#00E5FF" style={{ marginRight: 4 }} />
                                    <Text className="text-primary font-bold text-xs">SHARE</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    // Unified Empty State
                    <View className="bg-surface rounded-3xl p-8 shadow-2xl mb-8 border border-white/10 items-center">
                        <MaterialCommunityIcons
                            name={activeTab === 'joined' ? "calendar-remove-outline" : "calendar-search"}
                            size={64}
                            color="#666"
                            style={{ marginBottom: 16 }}
                        />
                        <Text className="text-white font-black text-lg mb-2">
                            {activeTab === 'joined' ? "No Joined Matches" : "No Matches Found"}
                        </Text>
                        <Text className="text-white/60 text-sm text-center mb-4">
                            {activeTab === 'joined'
                                ? "You haven't joined any matches yet. Switch to \"Discover\" to find upcoming games!"
                                : "No matches found for your interests. Try updating your profile or check back later!"}
                        </Text>
                        {activeTab === 'joined' && (
                            <TouchableOpacity
                                onPress={() => setActiveTab('discover')}
                                className="bg-primary px-6 py-3 rounded-xl"
                            >
                                <Text className="text-black font-black text-sm">DISCOVER MATCHES</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Vote Button / Status */}
                {activeEvent && (
                    <View className="mb-4">
                        {(() => {
                            const opensAt = getMillis(activeEvent.votingOpensAt);
                            const closesAt = getMillis(activeEvent.votingClosesAt);
                            const status = activeEvent.status;

                            const isTimeOpen = now >= opensAt && (closesAt === 0 || now <= closesAt);
                            const isLive = (activeEvent.isOpen ?? true) && (status === 'open' || (status === 'scheduled' && isTimeOpen));

                            return (
                                <VoteButton
                                    onVote={handleVote}
                                    onLeave={() => setShowLeaveConfirm(true)}
                                    loading={votingLoading}
                                    disabled={!isLive || (hasVoted && !userSlot?.paid)}
                                    hasVoted={hasVoted}
                                    isOpen={isLive}
                                    status={userSlot?.status}
                                />
                            );
                        })()}
                    </View>
                )}

                {/* Squad List */}
                {(activeEvent || (activeTab === 'discover' && data) || (activeTab === 'joined' && hasVotedOnLegacy && data)) && (
                    <SlotList
                        slots={activeEvent ? (activeEvent.slots || []) : (data?.slots || [])}
                        maxSlots={activeEvent ? (activeEvent.maxSlots || 14) : (data?.maxSlots || 14)}
                        maxWaitlist={activeEvent ? (activeEvent.maxWaitlist || 4) : (data?.maxWaitlist || 4)}
                        currentUserId={user?.uid}
                    />
                )}
                {/* Debug Info Removed */}

                {/* Payment Action */}
                {hasVoted && (activeEvent?.fees ?? 0) > 0 && !userSlot?.paid && activeEvent?.paymentDetails && (
                    <View className="mb-6 bg-primary/10 p-4 rounded-xl border border-primary/20">
                        <Text className="text-white font-bold text-center mb-4 text-lg">
                            Secure your slot by paying now!
                        </Text>
                        <TouchableOpacity
                            onPress={() => setShowPaymentModal(true)}
                            className="bg-primary py-4 px-8 rounded-full shadow-lg shadow-primary/40 items-center self-center w-full"
                        >
                            <Text className="text-black font-black tracking-wide text-lg">PAY NOW</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Footer Section */}
                <View className="mt-12 mb-16 border-t border-gray-100 pt-8 items-center">
                    <small className="text-gray-400 text-[10px] font-bold uppercase tracking-[2px] mb-3">
                        Support & Feedback
                    </small>
                    <TouchableOpacity
                        onPress={() => Linking.openURL('mailto:brutechgyan@gmail.com?subject=MyGameVote%20Issue%20Report')}
                        className="items-center mb-8"
                    >
                        <Text className="text-gray-500 text-sm font-medium mb-1">Contact Admin for any issues</Text>
                        <Text className="text-gray-400 font-medium text-sm tracking-wide">brutechgyan@gmail.com</Text>
                    </TouchableOpacity>

                    <View className="opacity-30">
                        <Text className="text-gray-500 text-[9px] font-bold tracking-[4px] uppercase">
                            Developed by BRUTECHGYAN
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {activeEvent?.paymentDetails && (
                <PaymentModal
                    visible={showPaymentModal}
                    onClose={() => setShowPaymentModal(false)}
                    paymentDetails={activeEvent.paymentDetails}
                    onMarkPaid={handleMarkPaid}
                    amount={activeEvent.fees || 0}
                />
            )}

            {/* Sports Interest Alert */}
            <CustomAlert
                visible={showInterestAlert}
                title="No Sports Interests"
                message="Please select your sports interests in your profile before voting."
                buttons={[
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Set Interests',
                        onPress: () => {
                            setShowInterestAlert(false);
                            router.push('/profile');
                        }
                    }
                ]}
                onDismiss={() => setShowInterestAlert(false)}
            />

            {/* Leave Match Confirmation */}
            <CustomAlert
                visible={showLeaveConfirm}
                title="Leave Match?"
                message="Are you sure you want to leave this match? Your slot will be given to someone else."
                buttons={[
                    { text: 'Cancel', style: 'cancel', onPress: () => setShowLeaveConfirm(false) },
                    {
                        text: 'Leave',
                        style: 'destructive',
                        onPress: handleLeave
                    }
                ]}
                onDismiss={() => setShowLeaveConfirm(false)}
            />
        </View>
    );
}
