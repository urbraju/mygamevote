/**
 * Home Screen (Main Voting Interface)
 * 
 * This is the core screen where users view the game status, vote for a slot,
 * join the waitlist, and navigate to payment options. It subscribes to real-time
 * Firestore updates for the current week's slots.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert, RefreshControl, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import VoteButton from '../../components/VoteButton';
import SlotList from '../../components/SlotList';
import PaymentModal from '../../components/PaymentModal';
import { votingService, WeeklySlotData } from '../../services/votingService';
import { db } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { getNextGameDate, isVotingOpen } from '../../utils/dateUtils';
import { format } from 'date-fns';

export default function HomeScreen() {
    const { user } = useAuth();
    const [data, setData] = useState<WeeklySlotData | null>(null);
    const [loading, setLoading] = useState(true);
    const [votingLoading, setVotingLoading] = useState(false);
    const [canVote, setCanVote] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    useEffect(() => {
        const unsubscribe = votingService.subscribeToSlots((slotData) => {
            setData(slotData);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        const checkVoting = () => {
            if (!data) return;

            const now = Date.now();
            const startTime = data.votingOpensAt || 0;
            const endTime = data.votingClosesAt || (startTime + 48 * 60 * 60 * 1000); // Default to 48h if missing

            const open = now >= startTime && now < endTime && data.isOpen;

            if (canVote !== open) {
                console.log('[HomeScreen] Voting window update:', open ? 'OPEN' : 'CLOSED');
                setCanVote(open);
            }
        };

        const interval = setInterval(checkVoting, 1000);
        checkVoting();

        return () => clearInterval(interval);
    }, [data, canVote]);

    const onRefresh = async () => {
        setLoading(true);
        // Subscription handles updates, but we can re-fetch if needed or just wait
        // Here we just simulate a refresh for UI feel or re-check dates
        await votingService.initializeWeek();
        setLoading(false);
    };

    const handleVote = async () => {
        console.log('[HomeScreen] handleVote called');
        if (!user) {
            console.error('[HomeScreen] User is null in handleVote');
            Alert.alert('Error', 'You must be logged in to vote.');
            return;
        }
        setVotingLoading(true);
        try {
            console.log('[HomeScreen] Initializing week...');
            // Ensure document exists first
            // Ensure document exists first
            await votingService.initializeWeek();
            console.log('[HomeScreen] Calling votingService.vote...');

            let displayName = user.displayName;
            if (!displayName) {
                // Fallback: Fetch from Firestore if Auth profile is empty
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        displayName = userDoc.data().displayName;
                    }
                } catch (e) {
                    console.log('Failed to fetch fallback name', e);
                }
            }

            await votingService.vote(user.uid, displayName || user.email || 'Anonymous', user.email || '');
            console.log('[HomeScreen] Vote success!');
            Alert.alert('Success', 'Your vote has been recorded!');
        } catch (error: any) {
            console.error('[HomeScreen] Vote Failed:', error);
            Alert.alert('Vote Failed', error?.message || error);
        } finally {
            setVotingLoading(false);
        }
    };

    const handleMarkPaid = async () => {
        if (!user) return;
        try {
            await votingService.markAsPaid(user.uid);
            setShowPaymentModal(false);
            Alert.alert("Success", "You have marked your slot as PAID.");
        } catch (error: any) {
            Alert.alert("Error", error.message);
        }
    };

    // Determine if user has voted
    const userSlot = data?.slots.find(s => s.userId === user?.uid);
    const hasVoted = !!userSlot;
    const gameDate = getNextGameDate();

    return (
        <View className="flex-1 bg-background">
            <Header />
            <ScrollView
                className="flex-1 px-4 pt-4"
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#2563EB" />
                }
            >
                {/* Game Info Card */}
                <View className="bg-surface rounded-2xl p-6 shadow-sm mb-6 border-l-4 border-primary">
                    <Text className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">
                        Next Game
                    </Text>
                    <Text className="text-3xl font-extrabold text-gray-900">
                        {gameDate ? format(gameDate, 'EEEE, MMM do') : 'Loading...'}
                    </Text>
                    <Text className="text-secondary font-semibold mt-1">
                        7:00 PM - 9:00 PM • Field 1
                    </Text>

                    {!canVote && (
                        <View className="mt-3">
                            <View className="bg-red-100 self-start px-3 py-1 rounded-full mb-2">
                                <Text className="text-red-700 font-bold text-xs uppercase">Voting Closed</Text>
                            </View>
                            <Text className="text-gray-500 text-xs font-bold">
                                Reason: {!data?.isOpen ? 'Admin Disabled' : (Date.now() < (data?.votingOpensAt || 0) ? 'Not Yet Open' : (Date.now() > (data?.votingClosesAt || 0) ? 'Voting Ended' : 'Unknown'))}
                            </Text>
                            <Text className="text-gray-500 text-xs">
                                Opens: {data?.votingOpensAt ? format(new Date(data.votingOpensAt), 'MMM d, h:mm a') : 'TBD'}
                            </Text>
                            <Text className="text-gray-500 text-xs">
                                Closes: {data?.votingClosesAt ? format(new Date(data.votingClosesAt), 'MMM d, h:mm a') : 'TBD'}
                            </Text>
                            {/* Debug Info for User Verification */}
                            <Text className="text-[10px] text-gray-400 mt-1">
                                (Now: {format(new Date(), 'h:mm a')} | Override: {String(data?.isOpen)})
                            </Text>
                            <Text className="text-[10px] text-gray-400">
                                GameID: {require('../../utils/dateUtils').getScanningGameId()}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Voting Section */}
                <View className="mb-8 items-center">
                    <VoteButton
                        onVote={handleVote}
                        loading={votingLoading}
                        disabled={!canVote || (hasVoted && !userSlot?.paid)}
                        hasVoted={hasVoted}
                        isOpen={canVote}
                    />
                </View>

                {/* Payment Action */}
                {hasVoted && data?.paymentEnabled && !userSlot?.paid && (
                    <View className="mb-6 bg-accent/10 p-4 rounded-xl border border-accent/20">
                        <Text className="text-accent-dark font-bold text-center mb-2">
                            Secure your slot by paying now!
                        </Text>
                        <TouchableOpacity
                            onPress={() => setShowPaymentModal(true)}
                            className="bg-accent py-3 px-6 rounded-lg shadow-sm items-center self-center w-full"
                        >
                            <Text className="text-white font-bold tracking-wide">PAY NOW</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Slots List */}
                <View className="flex-1 pb-10">
                    <SlotList slots={data?.slots || []} maxSlots={data?.maxSlots || 14} />
                </View>

            </ScrollView>

            {data?.paymentDetails && (
                <PaymentModal
                    visible={showPaymentModal}
                    onClose={() => setShowPaymentModal(false)}
                    paymentDetails={data.paymentDetails}
                    onMarkPaid={handleMarkPaid}
                    amount={data.fees || 0}
                />
            )}
        </View>
    );
}
