/**
 * Admin Dashboard
 * 
 * Provides administrative controls for the game slots. Allows admins to:
 * - Configure game settings (Max slots, Waitlist limit, Voting time).
 * - Enable/Disable payments and set payment details.
 * - Manage players (Remove users, which auto-promotes waitlisted users).
 */
import React, { useEffect, useState } from 'react';
import { View, Text, Switch, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { adminService } from '../../services/adminService';
import { votingService, WeeklySlotData } from '../../services/votingService';
import { useAuth } from '../../context/AuthContext';
import { Stack, useRouter } from 'expo-router';

export default function AdminScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [data, setData] = useState<WeeklySlotData | null>(null);
    const [maxSlots, setMaxSlots] = useState('14');
    const [maxWaitlist, setMaxWaitlist] = useState('4');
    const [votingOpenDate, setVotingOpenDate] = useState('');
    const [fees, setFees] = useState('0');
    const [paymentEnabled, setPaymentEnabled] = useState(false);

    useEffect(() => {
        const unsubscribe = votingService.subscribeToSlots((slotData) => {
            if (slotData) {
                setData(slotData);
                setMaxSlots(slotData.maxSlots.toString());
                setMaxWaitlist(slotData.maxWaitlist?.toString() || '4');
                setPaymentEnabled(slotData.paymentEnabled);

                if (slotData.votingOpensAt) {
                    setVotingOpenDate(new Date(slotData.votingOpensAt).toISOString());
                }
            }
        });
        return unsubscribe;
    }, []);

    const handleSaveConfig = async () => {
        try {
            await adminService.setMaxSlots(parseInt(maxSlots));
            await adminService.setMaxWaitlist(parseInt(maxWaitlist));
            await adminService.setPaymentEnabled(paymentEnabled);

            // Try to parse the date string
            const date = new Date(votingOpenDate);
            if (!isNaN(date.getTime())) {
                await adminService.setVotingOpensAt(date.getTime());
            }

            Alert.alert('Success', 'Configuration updated!');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const handleRemoveUser = async (userId: string) => {
        try {
            await votingService.removeVote(userId);
            Alert.alert('Success', 'User removed from list.');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1 bg-gray-100"
        >
            <Stack.Screen options={{ title: "Admin Dashboard" }} />
            <ScrollView className="p-4">

                <View className="bg-white p-4 rounded-lg shadow-sm mb-4">
                    <Text className="text-xl font-bold mb-4 text-gray-800">Game Configuration</Text>

                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-gray-700 font-medium">Enable Payments</Text>
                        <Switch
                            value={paymentEnabled}
                            onValueChange={setPaymentEnabled}
                        />
                    </View>

                    <View className="mb-4">
                        <Text className="text-gray-700 font-medium mb-1">Max Slots</Text>
                        <TextInput
                            className="border border-gray-300 rounded p-2 bg-gray-50"
                            keyboardType="numeric"
                            value={maxSlots}
                            onChangeText={setMaxSlots}
                        />
                    </View>

                    <View className="mb-4">
                        <Text className="text-gray-700 font-medium mb-1">Max Waitlist</Text>
                        <TextInput
                            className="border border-gray-300 rounded p-2 bg-gray-50"
                            keyboardType="numeric"
                            value={maxWaitlist}
                            onChangeText={setMaxWaitlist}
                        />
                    </View>

                    <View className="mb-4">
                        <Text className="text-gray-700 font-medium mb-1">Voting Opens At (ISO String)</Text>
                        <Text className="text-xs text-gray-500 mb-1">Format: YYYY-MM-DDTHH:mm:ss.sssZ</Text>
                        <TextInput
                            className="border border-gray-300 rounded p-2 bg-gray-50"
                            value={votingOpenDate}
                            onChangeText={setVotingOpenDate}
                            placeholder="202X-XX-XXT19:00:00.000Z"
                        />
                    </View>

                    <TouchableOpacity
                        className="bg-blue-600 p-3 rounded items-center"
                        onPress={handleSaveConfig}
                    >
                        <Text className="text-white font-bold">Save Changes</Text>
                    </TouchableOpacity>
                </View>

                <View className="bg-white p-4 rounded-lg shadow-sm mb-4">
                    <Text className="text-xl font-bold mb-4 text-gray-800">Manage Players</Text>
                    {data?.slots.map((slot) => (
                        <View key={slot.userId} className="flex-row justify-between items-center py-3 border-b border-gray-100">
                            <View>
                                <Text className="font-semibold">{slot.userName}</Text>
                                <Text className={`text-xs ${slot.status === 'confirmed' ? 'text-green-600' : 'text-red-500'}`}>
                                    {slot.status.toUpperCase()}
                                </Text>
                            </View>
                            <TouchableOpacity
                                className="bg-red-100 px-3 py-1 rounded"
                                onPress={() => Alert.alert(
                                    "Remove User?",
                                    `Are you sure you want to remove ${slot.userName}?`,
                                    [
                                        { text: "Cancel", style: "cancel" },
                                        { text: "Remove", style: "destructive", onPress: () => handleRemoveUser(slot.userId) }
                                    ]
                                )}
                            >
                                <Text className="text-red-600 font-bold text-xs">Remove</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                    {(!data || data.slots.length === 0) && (
                        <Text className="text-gray-400 italic">No players to manage yet.</Text>
                    )}
                </View>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}
