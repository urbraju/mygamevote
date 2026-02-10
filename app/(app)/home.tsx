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
        // Initial check and subscription
        const unsubscribe = votingService.subscribeToSlots((slotData) => {
            setData(slotData);
            setLoading(false);
        });

        // Check voting window interval
        // Also run immediately
        const checkVoting = () => setCanVote(isVotingOpen());
        checkVoting();
        const interval = setInterval(checkVoting, 1000);

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, []);

    const onRefresh = async () => {
        setLoading(true);
        // Subscription handles updates, but we can re-fetch if needed or just wait
        // Here we just simulate a refresh for UI feel or re-check dates
        await votingService.initializeWeek();
        setLoading(false);
    };

    const handleVote = async () => {
        if (!user) return;
        setVotingLoading(true);
        try {
            // Ensure document exists first
            await votingService.initializeWeek();
            await votingService.vote(user.uid, user.email || 'Anonymous');
            Alert.alert('Success', 'Your vote has been recorded!');
        } catch (error: any) {
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
                        <View className="mt-3 bg-red-100 self-start px-3 py-1 rounded-full">
                            <Text className="text-red-700 font-bold text-xs uppercase">Voting Closed</Text>
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
