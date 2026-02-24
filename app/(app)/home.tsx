/**
 * Home Screen (Main Voting Interface)
 * 
 * This is the core screen where users view the game status, vote for a slot,
 * join the waitlist, and navigate to payment options. It subscribes to real-time
 * Firestore updates for the current week's slots.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Linking, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomAlert } from '../../components/CustomAlert';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import VoteButton from '../../components/VoteButton';
import SlotList from '../../components/SlotList';
import PaymentModal from '../../components/PaymentModal';
import { votingService, WeeklySlotData, SlotUser } from '../../services/votingService';
import { getMillis, formatInCentralTime } from '../../utils/dateUtils';
import { getCurrencySymbol } from '../../utils/currencyUtils';
import { adminService } from '../../services/adminService';
import { eventService, GameEvent } from '../../services/eventService';
import { authService } from '../../services/authService';
import { db } from '../../firebaseConfig';
import { doc, getDoc, onSnapshot, query, where, orderBy, collection } from 'firebase/firestore';
import { getNextGameDate, isVotingOpen, getScanningGameId, getVotingStartTime, getVotingStartForDate } from '../../utils/dateUtils';
import { generateWhatsAppLink } from '../../utils/shareUtils';
import { format } from 'date-fns';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import ServerClock from '../../components/ServerClock';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
    const { user, activeOrgId } = useAuth();
    const router = useRouter();
    const [data, setData] = useState<WeeklySlotData | null>(null);
    const [loading, setLoading] = useState(true);
    const [votingLoading, setVotingLoading] = useState(false);
    const [canVote, setCanVote] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentEvent, setPaymentEvent] = useState<GameEvent | null>(null);
    const [showToast, setShowToast] = useState(false);

    const [events, setEvents] = useState<GameEvent[]>([]);
    const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(new Set());
    const [userInterests, setUserInterests] = useState<string[]>([]);
    const [interestNames, setInterestNames] = useState<string[]>([]);
    const [showInterestAlert, setShowInterestAlert] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState<string | null>(null); // Stores ID of event to leave
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
        }, activeOrgId);
        return unsubscribe;
    }, [activeOrgId]);

    useEffect(() => {
        if (userInterests.length === 0) {
            setLoading(false);
            return;
        }

        const unsubscribe = eventService.subscribeToEvents(userInterests, (items) => {
            setEvents(items);
            setLoading(false);
        }, activeOrgId);

        return () => {
            unsubscribe();
        };
    }, [userInterests, user, activeOrgId]);

    // Create a virtual event for the legacy/default match
    const legacyEvent: GameEvent | null = data ? {
        id: 'default-match',
        sportId: 'volleyball',
        sportName: (data.isOverrideEnabled && data.nextGameDetailsOverride) ? `${data.sportName || 'Volleyball'} (${data.nextGameDetailsOverride})` : (data.sportName || 'Volleyball'),
        sportIcon: data.sportIcon || 'volleyball',
        eventDate: (data.isOverrideEnabled && data.nextGameDateOverride) ? data.nextGameDateOverride : getNextGameDate().getTime(),
        votingOpensAt: data.votingOpensAt || getVotingStartForDate(getNextGameDate()).getTime(),
        votingClosesAt: data.votingClosesAt || (data.votingOpensAt ? (data.votingOpensAt + (48 * 60 * 60 * 1000)) : (getVotingStartForDate(getNextGameDate()).getTime() + (48 * 60 * 60 * 1000))),
        maxSlots: data.maxSlots || 14,
        maxWaitlist: data.maxWaitlist || 4,
        isOpen: data.isOpen ?? true, // Master toggle should default to true for legacy match
        status: 'scheduled', // Always scheduled, activation is handled by time window
        location: data.location || 'The Beach at Craig Ranch',
        isCancelled: data.isCancelled || false,
        cancelReason: data.cancelReason || '',
        slots: data.slots || [],
        participantIds: data.slots?.map(s => s.userId) || [],
        fees: data.fees,
        currency: data.currency,
        paymentDetails: data.paymentDetails,
        createdAt: Date.now()
    } : null;

    // Check if user has voted on the legacy/default game
    const hasVotedOnLegacy = data?.slots?.some(slot => slot.userId === user?.uid) || false;

    // Unified list of events, filtered by user interests and deduplicated
    const displayedEvents = (() => {
        const list: GameEvent[] = [];

        // Add custom events first
        events.forEach(e => list.push(e));

        // Add legacy/default match ONLY if no custom match for volleyball exists on same day
        if (userInterests.includes('volleyball') && legacyEvent) {
            const legacyDate = formatInCentralTime(getMillis(legacyEvent.eventDate), 'yyyy-MM-dd');
            const hasCustomVolleyball = events.some(e =>
                e.sportId === 'volleyball' &&
                formatInCentralTime(getMillis(e.eventDate), 'yyyy-MM-dd') === legacyDate
            );

            if (!hasCustomVolleyball) {
                list.push(legacyEvent);
            }
        }

        // Filter out past events (older than 6 hours)
        const cutoff = Date.now() - (6 * 60 * 60 * 1000);
        return list
            .filter(e => {
                const gameTime = getMillis(e.eventDate);
                return gameTime > cutoff;
            })
            .sort((a, b) => getMillis(a.eventDate) - getMillis(b.eventDate));
    })();

    const toggleExpand = (id: string) => {
        setExpandedEventIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const onRefresh = async () => {
        setLoading(true);
        await votingService.initializeWeek();
        setLoading(false);
    };

    const handleShare = (event: GameEvent) => {
        const url = generateWhatsAppLink({
            sportName: event.sportName,
            location: event.location,
            eventDate: event.eventDate,
            slots: event.slots || [],
            isOpen: event.isOpen ?? true,
            maxSlots: event.maxSlots || 14,
            maxWaitlist: event.maxWaitlist || 4,
            votingOpensAt: event.votingOpensAt,
            paymentEnabled: isPaymentEnabled
        } as WeeklySlotData);
        if (Platform.OS === 'web') {
            window.open(url, '_blank');
        } else {
            Linking.openURL(url);
        }
    };

    const handleVote = async (event: GameEvent) => {
        if (!user) {
            // if (Alert?.alert) Alert.alert('Error', 'Please log in to vote.');
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

            if (event.id === 'default-match') {
                // Legacy system
                await votingService.legacyVote(user.uid, finalName, finalEmail);
            } else if (event.id) {
                // Multi-sport system
                await votingService.vote(event.id, user.uid, finalName, finalEmail);
            }

            // Show Success Toast
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } catch (error: any) {
            // if (Alert?.alert) Alert.alert('Vote Failed', error?.message || error);
        } finally {
            setVotingLoading(false);
        }
    };

    const handleLeave = async (eventId: string) => {
        if (!user) return;
        setVotingLoading(true);
        try {
            if (eventId === 'default-match') {
                await votingService.leaveGame(user.uid);
            } else {
                await votingService.removeVote(eventId, user.uid);
            }
            setShowLeaveConfirm(null);
            // if (Alert?.alert) Alert.alert('Success', 'You have left the match.');
        } catch (error: any) {
            const errorMsg = error?.message || 'Failed to leave match.';
            // if (Alert?.alert) Alert.alert('Error', errorMsg);
        } finally {
            setVotingLoading(false);
        }
    };


    const handleMarkPaid = async (eventId: string) => {
        if (!user || !eventId) return;
        try {
            await votingService.markAsPaid(eventId, user.uid);
            setShowPaymentModal(false);
            // if (Alert?.alert) Alert.alert("Success", "You have marked your slot as PAID.");
        } catch (error: any) {
            // if (Alert?.alert) Alert.alert("Error", error.message);
        }
    };

    // Master Switch: Is payment enabled globally?
    const isPaymentEnabled = data?.paymentEnabled ?? false;

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom', 'left', 'right']}>
            <Header />
            <View className="flex-1 items-center w-full">
                <ScrollView
                    className="w-full max-w-2xl px-4"
                    contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
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
                                className="bg-amber-500 px-4 py-2 rounded-xl self-start hover:bg-amber-400 active:bg-amber-600"
                            >
                                <Text className="text-black font-black text-xs">SET INTERESTS NOW</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Header Info */}
                    <View className="flex-row justify-between items-center mb-6 w-full">
                        <View className="flex-1 mr-2">
                            <ServerClock />
                        </View>
                        <TouchableOpacity
                            onPress={() => router.push('/profile')}
                            className="bg-white/10 px-3 py-1.5 rounded-full border border-white/20 shrink-0"
                        >
                            <Text className="text-white text-[10px] font-bold">EDIT INTERESTS</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Unified Vertical Feed */}
                    <View className="mb-6">
                        <Text className="text-white font-black text-xs uppercase tracking-[2px] mb-3 ml-1">
                            Matches for You
                        </Text>

                        {displayedEvents.length === 0 && !loading ? (
                            <View className="bg-surface rounded-3xl p-8 shadow-2xl border border-white/10 items-center">
                                <MaterialCommunityIcons
                                    name="calendar-search"
                                    size={64}
                                    color="#666"
                                    style={{ marginBottom: 16 }}
                                />
                                <Text className="text-white font-black text-lg mb-2">
                                    No Matches Found
                                </Text>
                                <Text className="text-white/60 text-sm text-center mb-4">
                                    {interestNames.length > 0
                                        ? `No ${interestNames.join(' or ')} matches scheduled yet.`
                                        : "No matches scheduled for your interests yet."}
                                </Text>
                            </View>
                        ) : (
                            displayedEvents.map((event) => {
                                const userSlot = event.slots?.find((s: SlotUser) => s.userId === user?.uid);
                                const hasVoted = !!userSlot;
                                const opensAt = getMillis(event.votingOpensAt);
                                const closesAt = getMillis(event.votingClosesAt);
                                const gameTime = getMillis(event.eventDate);
                                const hasStarted = now >= gameTime;
                                const isTimeOpen = now >= opensAt && (closesAt === 0 || now <= closesAt);
                                // Voting is only LIVE if time window is open AND game hasn't started yet
                                const isLive = (event.isOpen ?? true) && !hasStarted && (event.status === 'open' || (event.status === 'scheduled' && isTimeOpen));
                                const isYetToOpen = (event.isOpen ?? true) && !hasStarted && event.status === 'scheduled' && now < opensAt;
                                const hoursUntilGame = gameTime ? (gameTime - now) / (1000 * 60 * 60) : 0;
                                const canLeaveMatch = hoursUntilGame >= 12; // Must be at least 12 hours before game
                                const isExpanded = expandedEventIds.has(event.id || '');

                                // Payment logic per event
                                const effectivePaymentDetails = event.paymentDetails?.zelle || event.paymentDetails?.paypal
                                    ? event.paymentDetails
                                    : data?.paymentDetails;
                                const hasPaymentInfo = !!(effectivePaymentDetails?.zelle || effectivePaymentDetails?.paypal);
                                const effectiveFees = (event.fees ?? 0) > 0 ? event.fees : (data?.fees ?? 0);

                                return (
                                    <View key={event.id} className="bg-surface rounded-3xl p-6 shadow-2xl mb-6 border border-white/10 relative overflow-hidden">
                                        {/* Background Icon */}
                                        <View className="absolute -right-8 -bottom-8 opacity-5">
                                            <MaterialCommunityIcons name={event.sportIcon as any || 'soccer'} size={200} color="#00E5FF" />
                                        </View>

                                        {/* Header */}
                                        <View className="flex-row justify-between items-start mb-6 w-full">
                                            <View className="flex-1 mr-3">
                                                <View className="flex-row items-center mb-1">
                                                    <MaterialCommunityIcons name={event.sportIcon as any} size={20} color="#39FF14" style={{ marginRight: 6 }} />
                                                    <Text className="text-white font-black text-[10px] uppercase tracking-[1px] flex-1">
                                                        {event.id === 'default-match'
                                                            ? `${event.displayDay || 'Saturday'} Weekly ${event.sportName || 'Volleyball'}`
                                                            : event.sportName} Match
                                                    </Text>
                                                </View>
                                                <Text className="text-3xl font-black text-white italic tracking-tighter shrink-0">
                                                    {formatInCentralTime(gameTime, 'MMM do')}
                                                </Text>
                                            </View>
                                            <View className={`px-3 py-1.5 rounded-xl border shrink-0 ${event.isCancelled ? 'bg-[#EF44441A] border-red-500/30' : (isLive ? 'bg-[#00E5FF1A] border-primary/30' : (isYetToOpen ? 'bg-amber-500/10 border-amber-500/30' : 'bg-[#EF44441A] border-red-500/30'))}`}>
                                                <Text className={`${event.isCancelled ? 'text-red-500' : (isLive ? 'text-primary' : (isYetToOpen ? 'text-amber-500' : 'text-red-500'))} font-black text-[9px] sm:text-[10px] uppercase italic`}>
                                                    {event.isCancelled ? 'CANCELLED' : (isLive ? 'Voting Live' : (isYetToOpen && opensAt > 0 ? `OPENS ${formatInCentralTime(opensAt, 'EEE @ h:mm a').toUpperCase()}` : 'Voting Closed'))}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Cancellation Reason */}
                                        {event.isCancelled && (
                                            <View className="mb-6 bg-red-500/10 p-4 rounded-2xl border border-red-500/30">
                                                <View className="flex-row items-center mb-1">
                                                    <MaterialCommunityIcons name="alert-octagon" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                                                    <Text className="text-red-500 font-black text-[10px] uppercase tracking-wider">Match Cancelled</Text>
                                                </View>
                                                <Text className="text-white text-sm font-medium italic">
                                                    "{event.cancelReason || 'No reason provided by administrator.'}"
                                                </Text>
                                            </View>
                                        )}

                                        {/* Details */}
                                        <View className="space-y-3 mb-6">
                                            <View className="flex-row items-center">
                                                <MaterialCommunityIcons name="calendar-clock" size={16} color="#00E5FF" style={{ marginRight: 8 }} />
                                                <Text className="text-white text-sm font-medium">
                                                    {event.id === 'default-match' && !data?.isOverrideEnabled
                                                        ? `${formatInCentralTime(gameTime, 'EEEE, MMM do')}, 7:00 AM - 9:00 AM`
                                                        : formatInCentralTime(gameTime, 'EEEE, MMMM do, h:mm a')}
                                                </Text>
                                            </View>
                                            <View className="flex-row items-center">
                                                <MaterialCommunityIcons name="clock-outline" size={16} color="#39FF14" style={{ marginRight: 8 }} />
                                                <Text className="text-white/80 text-xs font-medium">
                                                    Voting: {formatInCentralTime(opensAt, 'MMM d, h:mm a')} - {formatInCentralTime(closesAt, 'MMM d, h:mm a')}
                                                </Text>
                                            </View>
                                            <View className="flex-row items-center">
                                                <MaterialCommunityIcons name="map-marker" size={16} color="#00E5FF" style={{ marginRight: 8 }} />
                                                <Text className="text-white text-sm font-medium">{event.location}</Text>
                                            </View>
                                            {isPaymentEnabled && (effectiveFees ?? 0) > 0 && (
                                                <View className="flex-row items-center">
                                                    <MaterialCommunityIcons name="currency-usd" size={16} color="#00E5FF" style={{ marginRight: 8 }} />
                                                    <Text className="text-white text-sm font-medium">{getCurrencySymbol(event.currency)}{effectiveFees} per player</Text>
                                                </View>
                                            )}
                                        </View>

                                        {/* Stats & Actions */}
                                        <View className="flex-row justify-between items-center pt-4 border-t border-white/10 mb-4">
                                            <View className="flex-row items-center">
                                                <MaterialCommunityIcons name="account-group" size={18} color="#39FF14" style={{ marginRight: 6 }} />
                                                <Text className="text-white/60 text-xs">
                                                    {event.slots?.length || 0} / {event.maxSlots || 14} Players
                                                </Text>
                                            </View>
                                            <TouchableOpacity onPress={() => handleShare(event)} className="bg-primary/10 px-4 py-2 rounded-xl border border-primary/20 hover:bg-primary/20 active:bg-primary/30">
                                                <View className="flex-row items-center">
                                                    <MaterialCommunityIcons name="share-variant" size={14} color="#00E5FF" style={{ marginRight: 4 }} />
                                                    <Text className="text-primary font-bold text-xs">SHARE</Text>
                                                </View>
                                            </TouchableOpacity>
                                        </View>

                                        {/* Join/Leave Button */}
                                        <View className="mb-4">
                                            {hasVoted ? (
                                                <View>
                                                    <TouchableOpacity
                                                        onPress={() => setShowLeaveConfirm(event.id || null)}
                                                        disabled={!canLeaveMatch || votingLoading}
                                                        className={`py-4 px-8 rounded-full items-center ${canLeaveMatch ? 'bg-red-500 hover:bg-red-400 active:bg-red-600' : 'bg-gray-500'}`}
                                                    >
                                                        <Text className="text-white font-black tracking-wide text-base sm:text-lg">
                                                            {canLeaveMatch ? 'LEAVE MATCH' : 'CANNOT LEAVE'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                    {!canLeaveMatch && (
                                                        <Text className="text-red-400 text-xs text-center mt-2">
                                                            Must leave at least 12 hours before game time
                                                        </Text>
                                                    )}
                                                </View>
                                            ) : (
                                                <TouchableOpacity
                                                    onPress={() => handleVote(event)}
                                                    disabled={!isLive || event.isCancelled || votingLoading}
                                                    className={`py-4 px-4 sm:px-8 rounded-full items-center ${isLive && !event.isCancelled ? 'bg-primary hover:bg-primary/90 active:bg-primary/80' : 'bg-gray-500'}`}
                                                >
                                                    <Text className="text-black font-black tracking-wide text-base sm:text-lg">
                                                        {event.isCancelled ? 'MATCH CANCELLED' : (isLive ? 'JOIN MATCH' : (isYetToOpen ? 'VOTING YET TO OPEN' : 'VOTING CLOSED'))}
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>

                                        {/* Payment CTA */}
                                        {hasVoted && isPaymentEnabled && (effectiveFees ?? 0) > 0 && !userSlot?.paid && hasPaymentInfo && (
                                            <View className="mb-4 bg-primary/10 p-4 rounded-xl border border-primary/20">
                                                <Text className="text-white font-bold text-center mb-4 text-sm">
                                                    Secure your slot by paying now!
                                                </Text>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setPaymentEvent(event);
                                                        setShowPaymentModal(true);
                                                    }}
                                                    className="bg-primary py-3 px-6 rounded-full items-center hover:bg-primary/90 active:bg-primary/80"
                                                >
                                                    <Text className="text-black font-black tracking-wide text-sm">PAY NOW</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}

                                        {/* View Squad Toggle */}
                                        <TouchableOpacity
                                            onPress={() => toggleExpand(event.id || '')}
                                            className="bg-white/5 py-3 rounded-xl border border-white/10 hover:bg-white/10 active:bg-white/20"
                                        >
                                            <View className="flex-row items-center justify-center">
                                                <MaterialCommunityIcons
                                                    name={isExpanded ? "chevron-up" : "chevron-down"}
                                                    size={20}
                                                    color="#00E5FF"
                                                    style={{ marginRight: 6 }}
                                                />
                                                <Text className="text-primary font-bold text-xs uppercase">
                                                    {isExpanded ? 'Hide Squad' : 'View Squad'}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>

                                        {/* Expandable Squad List */}
                                        {isExpanded && (
                                            <View className="mt-6 pt-6 border-t border-white/10">
                                                <SlotList
                                                    slots={event.slots || []}
                                                    maxSlots={event.maxSlots || 14}
                                                    maxWaitlist={event.maxWaitlist || 4}
                                                    currentUserId={user?.uid}
                                                />
                                            </View>
                                        )}
                                    </View>
                                );
                            })
                        )}
                    </View>

                    {/* Footer Section */}
                    <View className="mt-12 mb-16 border-t border-gray-100 pt-8 items-center">
                        <TouchableOpacity onPress={() => Linking.openURL('mailto:support@mygamevote.com?subject=MyGameVote%20Issue:%20Home%20Dashboard')} className="items-center">
                            <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-[2px] mb-1">
                                Support & Feedback
                            </Text>
                            <Text className="text-gray-500 font-medium text-xs underline">
                                support@mygamevote.com
                            </Text>
                        </TouchableOpacity>

                        <View className="mt-6 opacity-60">
                            <Text className="text-gray-600 text-[9px] font-bold tracking-[4px] uppercase text-center">
                                Developed by BRUTECHGYAN
                            </Text>
                        </View>
                    </View>
                </ScrollView>

                {/* PaymentModal */}
                {showPaymentModal && paymentEvent && (
                    <PaymentModal
                        visible={showPaymentModal}
                        onClose={() => {
                            setShowPaymentModal(false);
                            setPaymentEvent(null);
                        }}
                        paymentDetails={paymentEvent.paymentDetails || data?.paymentDetails}
                        amount={paymentEvent.fees ?? data?.fees}
                        currency={paymentEvent.currency || data?.currency}
                        onMarkPaid={async () => {
                            try {
                                await votingService.markAsPaid(paymentEvent.id!, user!.uid);
                                setShowPaymentModal(false);
                                setPaymentEvent(null);
                                if (Platform.OS === 'web') {
                                    window.alert('Success: Slot marked as paid! An admin will verify it shortly.');
                                } else {
                                    import('react-native').then(rn => rn.Alert.alert('Success', 'Slot marked as paid! An admin will verify it shortly.'));
                                }
                            } catch (err: any) {
                                if (Platform.OS === 'web') {
                                    window.alert('Error: ' + err.message);
                                } else {
                                    import('react-native').then(rn => rn.Alert.alert('Error', err.message));
                                }
                            }
                        }}
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
                    visible={!!showLeaveConfirm}
                    title="Leave Match?"
                    message="Are you sure you want to leave this match? Your slot will be given to someone else."
                    buttons={[
                        { text: 'Cancel', style: 'cancel', onPress: () => setShowLeaveConfirm(null) },
                        {
                            text: 'Leave',
                            style: 'destructive',
                            onPress: () => {
                                if (showLeaveConfirm) {
                                    handleLeave(showLeaveConfirm);
                                }
                            }
                        }
                    ]}
                    onDismiss={() => setShowLeaveConfirm(null)}
                />
            </View>
        </SafeAreaView>
    );
}
