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
    userEmail?: string; // Optional for backward compatibility
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
        <View key={item.userId} className="w-[49%] flex-row items-center bg-surface p-2 mb-2 rounded-lg shadow-sm border border-gray-100">
            <View className="w-6 h-6 bg-primary/10 rounded-full items-center justify-center mr-2">
                <Text className="text-primary font-bold text-[10px]">{index + 1}</Text>
            </View>
            <View className="flex-1">
                <Text className="font-bold text-gray-800 text-xs" numberOfLines={1}>{item.userName}</Text>
                {item.userEmail && item.userEmail !== item.userName && (
                    <Text className="text-gray-500 text-[9px]" numberOfLines={1}>{item.userEmail}</Text>
                )}
                <Text className="text-gray-400 text-[8px] font-medium uppercase tracking-wide">
                    {format(getMillis(item.timestamp), 'h:mm:ss.SSS a')}
                </Text>
            </View>
            {item.paid && (
                <View className="bg-green-100 px-1 py-0.5 rounded ml-1">
                    <Text className="text-green-700 text-[8px] font-extrabold">PAID</Text>
                </View>
            )}
        </View>
    );

    return (
        <View className="flex-1 w-full mt-4">
            <View className="mb-6">
                <View className="flex-row items-center justify-between mb-2 px-1">
                    <Text className="text-lg font-extrabold text-gray-800 uppercase tracking-tight">
                        Squad List
                    </Text>
                    <View className="bg-primary/10 px-2 py-1 rounded-full">
                        <Text className="text-primary font-bold text-xs">
                            {confirmedSlots.length} / {maxSlots}
                        </Text>
                    </View>
                </View>

                {confirmedSlots.length === 0 ? (
                    <View className="bg-white p-4 rounded-xl items-center border border-dashed border-gray-300">
                        <Text className="text-gray-400 italic font-medium text-sm">Be the first to join!</Text>
                    </View>
                ) : (
                    <View className="flex-row flex-wrap justify-between">
                        {confirmedSlots.map((item, index) => renderItem({ item, index }))}
                    </View>
                )}
            </View>

            {waitlistSlots.length > 0 && (
                <View className="mt-2 border-t border-gray-200 pt-4">
                    <Text className="text-sm font-extrabold text-gray-400 mb-2 uppercase tracking-wider px-1">
                        Waitlist ({waitlistSlots.length})
                    </Text>
                    <View className="flex-row flex-wrap justify-between">
                        {waitlistSlots.map((item, index) => (
                            <View key={item.userId} className="w-[49%] flex-row items-center bg-gray-50 p-2 mb-2 rounded-lg opacity-70">
                                <Text className="font-bold text-gray-400 mr-2 text-xs">#{index + 1}</Text>
                                <View className="flex-1">
                                    <Text className="font-semibold text-gray-600 text-xs" numberOfLines={1}>{item.userName}</Text>
                                    {item.userEmail && item.userEmail !== item.userName && (
                                        <Text className="text-gray-400 text-[9px]" numberOfLines={1}>{item.userEmail}</Text>
                                    )}
                                    <Text className="text-gray-400 text-[8px]">
                                        {format(getMillis(item.timestamp), 'h:mm:ss.SSS a')}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            )}
        </View>
    );
}
