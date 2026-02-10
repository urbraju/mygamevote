/**
 * SlotList Component
 * 
 * Renders the list of users who have voted. It separates users into:
 * 1. Confirmed Squad (First N users, based on maxSlots)
 * 2. Waitlist (Users after the limit)
 * Displays payment status and timestamps.
 */
import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

interface SlotUser {
    userId: string;
    userName: string;
    timestamp: number | Timestamp;
    status: 'confirmed' | 'waitlist';
    paid?: boolean;
}

interface SlotListProps {
    slots: SlotUser[];
    maxSlots: number;
}

const getMillis = (ts: number | Timestamp) => {
    if (typeof ts === 'number') return ts;
    return ts ? ts.toMillis() : Date.now(); // Fallback if null (pending write)
};

export default function SlotList({ slots, maxSlots }: SlotListProps) {
    const confirmedSlots = slots.filter(s => s.status === 'confirmed').sort((a, b) => getMillis(a.timestamp) - getMillis(b.timestamp));
    const waitlistSlots = slots.filter(s => s.status === 'waitlist').sort((a, b) => getMillis(a.timestamp) - getMillis(b.timestamp));

    const renderItem = ({ item, index }: { item: SlotUser, index: number }) => (
        <View className="flex-row justify-between items-center bg-surface p-4 mb-3 rounded-xl shadow-sm border border-gray-100">
            <View className="flex-row items-center flex-1">
                <View className="w-8 h-8 bg-primary/10 rounded-full items-center justify-center mr-3">
                    <Text className="text-primary font-bold text-xs">{index + 1}</Text>
                </View>
                <View className="flex-1">
                    <Text className="font-bold text-gray-800 text-base">{item.userName}</Text>
                    <Text className="text-gray-400 text-[10px] font-medium uppercase tracking-wide">
                        {format(getMillis(item.timestamp), 'h:mm a')}
                    </Text>
                </View>
                {item.paid && (
                    <View className="bg-green-100 px-2 py-1 rounded-md border border-green-200 ml-2">
                        <Text className="text-green-700 text-[10px] font-extrabold tracking-wider">PAID</Text>
                    </View>
                )}
            </View>
        </View>
    );

    return (
        <View className="flex-1 w-full mt-4">
            <View className="mb-6">
                <View className="flex-row items-center justify-between mb-4 px-1">
                    <Text className="text-xl font-extrabold text-gray-800 uppercase tracking-tight">
                        Squad List
                    </Text>
                    <View className="bg-primary/10 px-3 py-1 rounded-full">
                        <Text className="text-primary font-bold text-xs">
                            {confirmedSlots.length} / {maxSlots}
                        </Text>
                    </View>
                </View>

                {confirmedSlots.length === 0 ? (
                    <View className="bg-white p-8 rounded-xl items-center border border-dashed border-gray-300">
                        <Text className="text-gray-400 italic font-medium">Be the first to join!</Text>
                    </View>
                ) : (
                    confirmedSlots.map((item, index) => renderItem({ item, index }))
                )}
            </View>

            {waitlistSlots.length > 0 && (
                <View className="mt-2 border-t border-gray-200 pt-6">
                    <Text className="text-lg font-extrabold text-gray-400 mb-4 uppercase tracking-wider px-1">
                        Waitlist ({waitlistSlots.length})
                    </Text>
                    {waitlistSlots.map((item, index) => (
                        <View key={item.userId} className="flex-row justify-between items-center bg-gray-50 p-4 mb-2 rounded-xl opacity-70">
                            <View className="flex-row items-center">
                                <Text className="font-bold text-gray-400 mr-4 text-sm">#{index + 1}</Text>
                                <Text className="font-semibold text-gray-600">{item.userName}</Text>
                            </View>
                            <Text className="text-gray-400 text-xs">
                                {format(getMillis(item.timestamp), 'h:mm a')}
                            </Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}
