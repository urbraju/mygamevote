/**
 * Home Screen (Main Voting Interface)
 * 
 * This is the core screen where users view the game status, vote for a slot,
 * join the waitlist, and navigate to payment options. It subscribes to real-time
 * Firestore updates for the current week's slots.
 */
import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Linking, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomAlert } from '../../components/CustomAlert';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import VoteButton from '../../components/VoteButton';
import SlotList from '../../components/SlotList';
import PaymentModal from '../../components/PaymentModal';
import LiveScoreBoard from '../../components/LiveScoreBoard';
import { votingService, WeeklySlotData, SlotUser } from '../../services/votingService';
import { getNextGameDate, getVotingStartForDate, formatInCentralTime, getMillis, getWeekBucket, isVotingOpen, getScanningGameId, getVotingStartTime } from '../../utils/dateUtils';
import { timeService } from '../../services/timeService';
import { getCurrencySymbol } from '../../utils/currencyUtils';
import { adminService } from '../../services/adminService';
import { eventService, GameEvent } from '../../services/eventService';
import { authService } from '../../services/authService';
import { db } from '../../firebaseConfig';
import { doc, getDoc, onSnapshot, query, where, orderBy, collection } from 'firebase/firestore';
import { generateWhatsAppLink } from '../../utils/shareUtils';
import { format } from 'date-fns';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import ServerClock from '../../components/ServerClock';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { interestRequestService } from '../../services/interestRequestService';
import { sportsService } from '../../services/sportsService';

export default function HomeScreen() {
    const { user, activeOrgId, isAdmin, isOrgAdmin, loading: authLoading, sportsInterests: authInterests } = useAuth();

    const router = useRouter();
    const [data, setData] = useState<WeeklySlotData | null>(null);
    const [loading, setLoading] = useState(true);
    const [votingLoading, setVotingLoading] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentEvent, setPaymentEvent] = useState<GameEvent | null>(null);
    const [showToast, setShowToast] = useState(false);

    const [hasPendingRequest, setHasPendingRequest] = useState(false);
    const [events, setEvents] = useState<GameEvent[]>([]);
    const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(new Set());
    const [showInterestAlert, setShowInterestAlert] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState<string | null>(null); // Stores ID of event to leave
    const [now, setNow] = useState(timeService.getNow());

    // Derived week bucket for dependency tracking
    const weekBucket = useMemo(() => getWeekBucket(now), [now]);

    // Simplified: use authInterests from context directly
    const [interestNames, setInterestNames] = useState<string[]>([]);

    useEffect(() => {
        const deriveNames = async () => {
            try {
                const allSports = await sportsService.getAllSports();
                const names = authInterests.map((id: string) => {
                    const sport = allSports.find((s: any) => s.id === id);
                    return sport ? sport.name : id;
                });
                setInterestNames(names);
            } catch (err) {
                console.error("Failed to fetch sports for naming", err);
            }
        };
        if (authInterests.length > 0) deriveNames();
        else setInterestNames([]);
    }, [authInterests]);

    useEffect(() => {
        if (!user) return;

        const fetchPendingStatus = async () => {
            try {
                const pendingReq = await interestRequestService.getPendingRequestForUser(user.uid, activeOrgId);
                setHasPendingRequest(!!pendingReq);
            } catch (err) {
                console.error("Failed to check pending interests", err);
            }
        };
        fetchPendingStatus();
    }, [user, activeOrgId, authInterests]);

    useEffect(() => {
        // Subscribe to legacy slots as a secondary source/fallback
        // Depend on weekBucket so we auto-transition documents at Sunday midnight
        const unsubscribe = votingService.subscribeToSlots((slotData) => {
            setData(slotData);
        }, activeOrgId);
        return unsubscribe;
    }, [activeOrgId, weekBucket]);

    useEffect(() => {
        if (authLoading || !user) return;

        if (authInterests.length === 0) {
            setEvents([]);
            setLoading(false);
            return;
        }

        const unsubscribe = eventService.subscribeToEvents(authInterests, (items) => {
            setEvents(items);
            setLoading(false);
        }, activeOrgId);

        return () => {
            unsubscribe();
        };
    }, [authInterests, user, activeOrgId, authLoading]);

    // Create a virtual event for the legacy/default match
    // NEW: If data is null (document missing), we still show a virtual preview
    const legacyEvent: GameEvent | null = useMemo(() => {
        // We always show the volleyball match if no data is present OR if data exists
        if (!authInterests.includes('volleyball')) return null;

        const baseEventDate = (data?.isOverrideEnabled && data?.nextGameDateOverride) ? data.nextGameDateOverride : getNextGameDate(now).getTime();
        const baseVotingOpensAt = data?.votingOpensAt || getVotingStartForDate(getNextGameDate(now)).getTime();

        return {
            id: 'default-match',
            sportId: 'volleyball',
            sportName: (data?.isOverrideEnabled && data?.nextGameDetailsOverride) ? `${data.sportName || 'Volleyball'} (${data.nextGameDetailsOverride})` : (data?.sportName || 'Volleyball'),
            sportIcon: data?.sportIcon || 'volleyball',
            eventDate: baseEventDate,
            votingOpensAt: baseVotingOpensAt,
            votingClosesAt: data?.votingClosesAt || (baseVotingOpensAt + (52 * 60 * 60 * 1000) + (59 * 60 * 1000)),
            maxSlots: data?.maxSlots || 14,
            maxWaitlist: data?.maxWaitlist || 8,
            isOpen: data?.isOpen ?? true, // Master toggle should default to true for legacy match
            status: 'scheduled', // Always scheduled, activation is handled by time window
            location: data?.location || 'The Beach at Craig Ranch',
            isCancelled: data?.isCancelled || false,
            cancelReason: data?.cancelReason || '',
            slots: data?.slots || [],
            participantIds: data?.slots?.map(s => s.userId) || [],
            fees: data?.fees,
            currency: data?.currency,
            paymentDetails: data?.paymentDetails,
            createdAt: Date.now()
        };
    }, [data, authInterests, weekBucket]);

    // Check if user has voted on the legacy/default game
    const hasVotedOnLegacy = data?.slots?.some(slot => slot.userId === user?.uid) || false;

    // Unified list of events, filtered by user interests and deduplicated
    const displayedEvents = useMemo(() => {
        if (authLoading) return [];

        const list: GameEvent[] = [];

        // Add custom events first
        events.forEach(e => list.push(e));

        // Add legacy/default match ONLY if no custom match for volleyball exists on same day
        if (authInterests.includes('volleyball') && legacyEvent) {
            const legacyDate = formatInCentralTime(getMillis(legacyEvent.eventDate), 'yyyy-MM-dd');
            const hasCustomVolleyball = events.some(e =>
                e.sportId === 'volleyball' &&
                formatInCentralTime(getMillis(e.eventDate), 'yyyy-MM-dd') === legacyDate
            );

            if (!hasCustomVolleyball && legacyEvent) {
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
    }, [events, legacyEvent, authInterests, authLoading]);

    const nextOpeningRef = React.useRef<number | null>(null);
    const timerModeRef = React.useRef<'normal' | 'fast' | 'hyper'>('normal');

    // Timer to force re-renders for voting window activation
    useEffect(() => {
        // Sync on mount
        timeService.sync();

        let timeoutId: any;
        let rafId: any;

        const update = () => {
            const currentTime = timeService.getNow();
            setNow(currentTime);

            const nextOpen = nextOpeningRef.current;
            let nextInterval = 1000; // Default: 1 second

            if (nextOpen) {
                const diff = nextOpen - currentTime;

                if (diff <= 0) {
                    // Just opened, reset to normal
                    timerModeRef.current = 'normal';
                    nextInterval = 1000;
                } else if (diff < 1000) {
                    // HYPER MODE: < 1s remaining, check ~60 times per second
                    if (timerModeRef.current !== 'hyper') {
                        console.log('[HyperPolling] Entering HYPER MODE (60fps)');
                        timerModeRef.current = 'hyper';
                    }
                    rafId = requestAnimationFrame(update);
                    return;
                } else if (diff < 10000) {
                    // FAST MODE: < 10s remaining, check every 100ms
                    if (timerModeRef.current !== 'fast') {
                        console.log('[HyperPolling] Entering FAST MODE (100ms)');
                        timerModeRef.current = 'fast';
                    }
                    nextInterval = 100;
                } else {
                    timerModeRef.current = 'normal';
                }
            }

            timeoutId = setTimeout(update, nextInterval);
        };

        update();
        return () => {
            clearTimeout(timeoutId);
            if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(rafId);
        };
    }, []);

    // Keep nextOpeningRef in sync with events
    useEffect(() => {
        const futureOpenings = displayedEvents
            .map(e => getMillis(e.votingOpensAt))
            .filter(t => t > now)
            .sort((a, b) => a - b);

        nextOpeningRef.current = futureOpenings[0] || null;
    }, [displayedEvents]);

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
        if (authInterests.length === 0) {
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
            setTimeout(() => {
                setVotingLoading(false);
            }, 750);
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
            setTimeout(() => {
                setVotingLoading(false);
            }, 750);
        }
    };

    const handleUpdateScore = async (eventId: string, teamAScore: number, teamBScore: number) => {
        if (!user) return;
        try {
            await eventService.updateEventScore(eventId, teamAScore, teamBScore, user.uid);
        } catch (error: any) {
            console.error('[Home] Failed to update score:', error);
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

    const Container = Platform.OS === 'web' ? View : SafeAreaView;
    const containerProps = Platform.OS === 'web' ? { className: "flex-1 bg-background" } : { className: "flex-1 bg-background", edges: ['top', 'bottom', 'left', 'right'] as const };

    return (
        <Container {...containerProps}>
            <Header />
            <View
                className="flex-1 items-center w-full"
                style={{ minHeight: 0 }}
            >
                <ScrollView
                    className="w-full max-w-2xl px-4"
                    contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#00E5FF" />
                    }
                >
                    {/* Status Alert Banners logic */}
                    {!authLoading && hasPendingRequest && (
                        <View className="bg-primary/10 border border-primary/30 rounded-2xl p-4 mb-6">
                            <View className="flex-row items-center mb-2">
                                <MaterialCommunityIcons name="clock-outline" size={24} color="#00E5FF" style={{ marginRight: 8 }} />
                                <Text className="text-primary font-black text-sm">Interests Pending Approval</Text>
                            </View>
                            <Text className="text-white text-sm leading-5">
                                Your sports interests request is currently waiting for an admin to approve it. Check back later!
                            </Text>
                        </View>
                    )}

                    {!authLoading && !isAdmin && !isOrgAdmin && authInterests.length === 0 && !hasPendingRequest && (
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
                                role="button"
                                accessibilityLabel="SET INTERESTS NOW"
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
                            role="button"
                            accessibilityLabel="EDIT INTERESTS"
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
                                const isLive = (event.isOpen ?? true) && !hasStarted && isTimeOpen && (event.status === 'open' || event.status === 'scheduled');
                                const isYetToOpen = (event.isOpen ?? true) && !hasStarted && event.status === 'scheduled' && now < opensAt;

                                // DEBUG: Log transition when clock hits scheduled time
                                if (isYetToOpen && (opensAt - now) < 5000 && (opensAt - now) > 0) {
                                    console.log(`[VotingDebug] Event "${event.sportName}" opens in ${((opensAt - now) / 1000).toFixed(1)}s. Now: ${formatInCentralTime(now, 'HH:mm:ss.SSS')}, Opens: ${formatInCentralTime(opensAt, 'HH:mm:ss.SSS')}`);
                                } else if (isLive && (now - opensAt) < 2000) {
                                    console.log(`[VotingDebug] Event "${event.sportName}" IS NOW LIVE! Opened at: ${formatInCentralTime(opensAt, 'HH:mm:ss.SSS')}, Current Time: ${formatInCentralTime(now, 'HH:mm:ss.SSS')}`);
                                }

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

                                        {/* Live Scoreboard Integration */}
                                        {(() => {
                                            const isWithinTimeWindow = now >= (gameTime - (60 * 60 * 1000)) && now < (gameTime + (4 * 60 * 60 * 1000));
                                            const showScoreboard = event.isLiveScoreEnabled === true ||
                                                (event.isLiveScoreEnabled !== false && (isWithinTimeWindow || !!event.liveScore));

                                            if (!showScoreboard) return null;

                                            return (
                                                <LiveScoreBoard
                                                    teamAScore={event.liveScore?.teamAScore || 0}
                                                    teamBScore={event.liveScore?.teamBScore || 0}
                                                    canEdit={!!(event.participantIds?.includes(user?.uid || ''))}
                                                    onUpdateScore={(a, b) => handleUpdateScore(event.id!, a, b)}
                                                    teamAName={event.isTeamSplittingEnabled ? "Team Blue" : "Home"}
                                                    teamBName={event.isTeamSplittingEnabled ? "Team Red" : "Away"}
                                                    isTeamSplittingEnabled={event.isTeamSplittingEnabled}
                                                    teams={event.teams}
                                                    participants={event.slots?.map((s: any) => ({
                                                        uid: s.userId,
                                                        firstName: s.userName.split(' ')[0]
                                                    }))}
                                                />
                                            );
                                        })()}

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
                                                    {userSlot?.status === 'waitlist' && (
                                                        <View className="flex-row items-center justify-center mb-3 bg-amber-500/10 p-2 rounded-xl border border-amber-500/30">
                                                            <MaterialCommunityIcons name="clock-alert-outline" size={16} color="#F59E0B" style={{ marginRight: 6 }} />
                                                            <Text className="text-amber-500 font-bold text-xs uppercase tracking-wider">You are on the waitlist</Text>
                                                        </View>
                                                    )}
                                                    {userSlot?.status === 'confirmed' && (
                                                        <View className="flex-row items-center justify-center mb-3 bg-green-500/10 p-2 rounded-xl border border-green-500/30">
                                                            <MaterialCommunityIcons name="check-circle-outline" size={16} color="#39FF14" style={{ marginRight: 6 }} />
                                                            <Text className="text-primary font-bold text-xs uppercase tracking-wider">You are confirmed for this match</Text>
                                                        </View>
                                                    )}
                                                    <TouchableOpacity
                                                        onPress={() => setShowLeaveConfirm(event.id || null)}
                                                        disabled={!canLeaveMatch || votingLoading}
                                                        className={`py-4 px-8 rounded-full items-center ${canLeaveMatch ? 'bg-red-500 hover:bg-red-400 active:bg-red-600' : 'bg-gray-500'}`}
                                                    >
                                                        <Text className="text-white font-black tracking-wide text-base sm:text-lg">
                                                            {!canLeaveMatch ? 'CANNOT LEAVE' : (userSlot?.status === 'waitlist' ? 'LEAVE WAITLIST' : 'LEAVE MATCH')}
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
                                                    disabled={!isLive || event.isCancelled || votingLoading || (event.slots?.length || 0) >= ((event.maxSlots || 14) + (event.maxWaitlist || 5))}
                                                    className={`py-4 px-4 sm:px-8 rounded-full items-center ${isLive && !event.isCancelled && (event.slots?.length || 0) < ((event.maxSlots || 14) + (event.maxWaitlist || 5)) ? 'bg-primary hover:bg-primary/90 active:bg-primary/80' : 'bg-gray-500'}`}
                                                >
                                                    <Text className="text-black font-black tracking-wide text-base sm:text-lg">
                                                        {event.isCancelled
                                                            ? 'MATCH CANCELLED'
                                                            : (isLive
                                                                ? ((event.slots?.length || 0) >= ((event.maxSlots || 14) + (event.maxWaitlist || 5))
                                                                    ? 'SLOTS FULL'
                                                                    : ((event.slots?.length || 0) >= (event.maxSlots || 14) ? 'JOIN WAITLIST' : 'JOIN MATCH'))
                                                                : (isYetToOpen ? 'VOTING YET TO OPEN' : 'VOTING CLOSED'))}
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>

                                        {/* Payment CTA */}
                                        {hasVoted && userSlot?.status === 'confirmed' && isPaymentEnabled && (effectiveFees ?? 0) > 0 && !userSlot?.paid && hasPaymentInfo && (
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
                                                    maxWaitlist={event.maxWaitlist || 5}
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
        </Container>
    );
}
