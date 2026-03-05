import React from 'react';
import { View, Text } from 'react-native';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatInCentralTime, getMillis } from '../utils/dateUtils';

interface SlotUser {
    userId: string;
    userName: string;
    userEmail?: string;
    timestamp: number | Timestamp;
    status: 'confirmed' | 'waitlist';
    paid?: boolean;
}

interface SlotListProps {
    slots: SlotUser[];
    maxSlots: number;
    maxWaitlist: number;
    currentUserId?: string;
}


export default function SlotList({ slots = [], maxSlots, maxWaitlist, currentUserId }: SlotListProps) {
    const confirmedSlots = (slots || [])
        .filter(s => !s.status || s.status.toLowerCase() === 'confirmed')
        .sort((a, b) => getMillis(a.timestamp) - getMillis(b.timestamp));

    const waitlistSlots = (slots || [])
        .filter(s => s.status?.toLowerCase() === 'waitlist')
        .sort((a, b) => getMillis(a.timestamp) - getMillis(b.timestamp));

    const renderItem = ({ item, index, isWaitlist = false }: { item: SlotUser, index: number, isWaitlist?: boolean }) => {
        const isCurrentUser = item.userId === currentUserId;

        return (
            <View
                key={item.userId}
                className={`w-full flex-row items-center bg-surface p-4 mb-3 rounded-3xl border ${isCurrentUser ? 'border-primary shadow-lg shadow-primary/20' : 'border-white-10 shadow-sm'}`}
            >
                {/* Jersey Number Circle */}
                <View className={`w-10 h-10 ${isCurrentUser ? 'bg-primary' : 'bg-white-10'} rounded-2xl items-center justify-center mr-4 border ${isCurrentUser ? 'border-primary' : 'border-white-10'}`}>
                    <Text className={`${isCurrentUser ? 'text-black' : 'text-gray-400'} font-black text-xs`}>
                        {index + 1}
                    </Text>
                </View>

                <View className="flex-1">
                    <View className="flex-row items-center justify-between mb-1.5">
                        <Text className={`font-black uppercase italic text-sm tracking-tight ${isCurrentUser ? 'text-primary' : 'text-white'}`}>
                            {item.userName} {isCurrentUser ? '(You)' : ''}
                        </Text>
                        <View className={`px-2 py-0.5 rounded-lg ${isWaitlist ? 'bg-accent/10' : 'bg-primary/10'}`}>
                            <Text className={`text-[8px] font-black uppercase italic ${isWaitlist ? 'text-accent' : 'text-primary'}`}>
                                {isWaitlist ? 'Reserve' : 'Squad'}
                            </Text>
                        </View>
                    </View>

                    <View className="flex-row items-center">
                        <MaterialCommunityIcons name="timer-outline" size={10} color="#6B7280" style={{ marginRight: 4 }} />
                        <Text className="text-gray-400 text-[9px] font-bold uppercase tracking-widest">
                            {formatInCentralTime(getMillis(item.timestamp), 'MMM do, yyyy h:mm:ss.SSS a')}
                        </Text>
                        {item.paid && (
                            <View className="ml-3 flex-row items-center">
                                <MaterialCommunityIcons name="check-decagram" size={10} color="#39FF14" style={{ marginRight: 4 }} />
                                <Text className="text-accent text-[8px] font-black uppercase">Paid</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    const confirmedPercent = Math.min((confirmedSlots.length / maxSlots) * 100, 100);

    return (
        <View className="w-full">
            <View className="mb-10">
                <View className="flex-row items-end justify-between mb-4 px-1">
                    <View>
                        <Text className="text-2xl font-black text-white uppercase italic italic tracking-tighter">
                            Official <Text className="text-primary">Squad</Text>
                        </Text>
                        <Text className="text-gray-500 text-[10px] font-black uppercase tracking-[2px]">
                            Pro Roster Verification
                        </Text>
                    </View>
                    <View className="items-end">
                        <Text className="text-white font-black text-xs mb-1">
                            {confirmedSlots.length} / {maxSlots}
                        </Text>
                    </View>
                </View>

                {/* Performance Progress Bar */}
                <View className="w-full h-1.5 bg-white-10 rounded-full mb-6 overflow-hidden">
                    <View
                        className="h-full bg-primary"
                        style={{ width: `${confirmedPercent}%` }}
                    />
                </View>

                {confirmedSlots.length === 0 ? (
                    <View className="bg-surface p-8 rounded-3xl items-center border border-dashed border-white-10">
                        <MaterialCommunityIcons name="account-search-outline" size={32} color="#374151" style={{ marginBottom: 12 }} />
                        <Text className="text-gray-500 italic font-bold uppercase text-xs tracking-tight">Recruiting Players...</Text>
                    </View>
                ) : (
                    <View>
                        {confirmedSlots.map((item, index) => renderItem({ item, index }))}
                    </View>
                )}
            </View>

            {waitlistSlots.length > 0 && (
                <View className="mt-4 border-t border-white-10 pt-8 pb-10">
                    <View className="flex-row items-center justify-between mb-5 px-1">
                        <View className="flex-row items-center">
                            <MaterialCommunityIcons name="timer-sand" size={18} color="#6B7280" style={{ marginRight: 8 }} />
                            <Text className="text-sm font-black text-gray-400 uppercase tracking-[4px]">
                                Waitlist
                            </Text>
                        </View>
                        <View className="bg-white-10 px-3 py-1 rounded-xl">
                            <Text className="text-gray-500 font-black text-[10px] uppercase">
                                {waitlistSlots.length} / {maxWaitlist}
                            </Text>
                        </View>
                    </View>
                    <View>
                        {waitlistSlots.slice(0, 4).map((item, index) => renderItem({ item, index, isWaitlist: true }))}
                        {waitlistSlots.length > 4 && (
                            <View className="flex-row items-center justify-center mt-2 py-4 border border-dashed border-white-10 rounded-2xl">
                                <Text className="text-gray-500 text-[10px] font-black uppercase tracking-widest italic">
                                    + {waitlistSlots.length - 4} More in Reserve
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            )}
        </View>
    );
}
