import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, subDays, startOfDay } from 'date-fns';
import { ActivityLog } from '../../services/activityLogService';
import { Stack, useRouter } from 'expo-router';

type TimeRange = 'recent' | 'today' | 'week' | 'all';
type ActivityLogWithId = ActivityLog & { id: string };

export default function MyActivityScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [logs, setLogs] = useState<ActivityLogWithId[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeRange, setTimeRange] = useState<TimeRange>('recent');

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        
        // Query only this user's logs
        let q = query(
            collection(db, 'activity_logs'),
            where('userId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let rawLogs: ActivityLogWithId[] = [];
            snapshot.forEach((doc) => {
                rawLogs.push({ id: doc.id, ...doc.data() } as any);
            });

            // Fallback client-side sort right away to avoid requiring a new composite index 
            // for (userId, serverTimestampMs DESC) which would error out immediately.
            rawLogs.sort((a, b) => b.serverTimestampMs - a.serverTimestampMs);

            // Apply Time Filter Client-Side for the same reason
            if (timeRange !== 'all') {
                const now = new Date();
                let startMs = 0;
                if (timeRange === 'today') {
                    startMs = startOfDay(now).getTime();
                } else if (timeRange === 'week') {
                    startMs = subDays(now, 7).getTime();
                }

                if (startMs > 0) {
                    rawLogs = rawLogs.filter(log => log.serverTimestampMs >= startMs);
                }
            }

            // Limit response for recent
            if (timeRange === 'recent') {
                rawLogs = rawLogs.slice(0, 50);
            }

            setLogs(rawLogs);
            setLoading(false);
            setError(null);
        }, (err) => {
            console.error("Error fetching personal activity logs:", err);
            setError(err.message);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, timeRange]);

    const renderActionBadge = (action: string) => {
        if (action === 'BUTTON_RENDERED_ACTIVE') {
            return (
                <View className="bg-blue-100 px-2 py-1 rounded border border-blue-300 flex-row items-center">
                    <MaterialCommunityIcons name="eye" size={12} color="#1E3A8A" style={{ marginRight: 4 }} />
                    <Text className="text-blue-900 text-[10px] font-black">ACTION VISIBLE</Text>
                </View>
            );
        } else if (action === 'BUTTON_CLICKED') {
            return (
                <View className="bg-blue-100 px-2 py-1 rounded border border-blue-300 flex-row items-center">
                    <MaterialCommunityIcons name="loading" size={12} color="#1E3A8A" style={{ marginRight: 4 }} />
                    <Text className="text-blue-900 text-[10px] font-black uppercase">Join Started (Spinning)</Text>
                </View>
            );
        } else if (action === 'BUTTON_CLICK_IGNORED') {
            return (
                <View className="bg-amber-100 px-2 py-1 rounded border border-amber-300 flex-row items-center">
                    <MaterialCommunityIcons name="gesture-tap-box" size={12} color="#78350F" style={{ marginRight: 4 }} />
                    <Text className="text-amber-900 text-[10px] font-black uppercase">Double Tap Ignored</Text>
                </View>
            );
        } else if (action === 'VOTE_SUCCESS') {
            return (
                <View className="bg-emerald-100 px-2 py-1 rounded border border-emerald-300 flex-row items-center">
                    <MaterialCommunityIcons name="check-decagram" size={12} color="#064E3B" style={{ marginRight: 4 }} />
                    <Text className="text-emerald-900 text-[10px] font-black uppercase">Slot Secured (Confirmed)</Text>
                </View>
            );
        } else if (action === 'VOTE_FAILED') {
            return (
                <View className="bg-red-100 px-2 py-1 rounded border border-red-300 flex-row items-center">
                    <MaterialCommunityIcons name="alert-circle" size={12} color="#7F1D1D" style={{ marginRight: 4 }} />
                    <Text className="text-red-900 text-[10px] font-black">VOTE FAILED</Text>
                </View>
            );
        }
        return (
            <View className="bg-gray-100 px-2 py-1 rounded border border-gray-300">
                <Text className="text-gray-900 text-[10px] font-black">{action}</Text>
            </View>
        );
    };

    const RangeButton = ({ type, label, icon }: { type: TimeRange, label: string, icon: any }) => (
        <TouchableOpacity 
            onPress={() => setTimeRange(type)}
            className={`flex-row items-center px-4 py-2 rounded-xl border-2 mb-2 mr-2 ${timeRange === type ? 'bg-[#00E5FF]/20 border-[#00E5FF]' : 'bg-surface border-white/10'}`}
        >
            <MaterialCommunityIcons name={icon} size={16} color={timeRange === type ? '#00E5FF' : '#9CA3AF'} style={{ marginRight: 6 }} />
            <Text className={`text-xs font-black tracking-wider uppercase ${timeRange === type ? 'text-white' : 'text-gray-400'}`}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    return (
        <View className="flex-1 bg-background">
            <Stack.Screen options={{
                headerTitle: "My Voting History",
                headerShown: true,
                headerStyle: { backgroundColor: '#000' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' }
            }} />

            <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Header Information */}
                <View className="bg-surface p-5 rounded-3xl border border-white/10 mb-6">
                    <View className="flex-row items-center mb-2">
                        <MaterialCommunityIcons name="shield-account" size={24} color="#00E5FF" style={{ marginRight: 8 }} />
                        <Text className="text-xl font-black text-white italic">Audit Trail</Text>
                    </View>
                    <Text className="text-sm text-gray-400 leading-5">
                        This is your personal secure activity log. It strictly records every interaction you have with the voting system for transparency.
                    </Text>
                </View>

                {/* Filters */}
                <View className="mb-6">
                    <Text className="text-white font-black text-[10px] uppercase tracking-[3px] mb-3">Time Range Filter</Text>
                    <View className="flex-row flex-wrap">
                        <RangeButton type="recent" label="Recent (50)" icon="clock-fast" />
                        <RangeButton type="today" label="Today" icon="calendar-today" />
                        <RangeButton type="week" label="This Week" icon="calendar-week" />
                        <RangeButton type="all" label="All Time" icon="database" />
                    </View>
                </View>

                {/* Error State */}
                {error && (
                    <View className="bg-red-500/20 p-4 rounded-2xl border border-red-500/50 mb-4 flex-row items-center">
                        <MaterialCommunityIcons name="alert" size={20} color="#EF4444" style={{ marginRight: 8 }} />
                        <Text className="text-red-400 font-bold flex-1">{error}</Text>
                    </View>
                )}

                {/* Loading State or Logs */}
                {loading ? (
                    <View className="py-10 items-center">
                        <ActivityIndicator size="large" color="#00E5FF" />
                        <Text className="text-gray-400 mt-4 font-bold italic">Fetching your records...</Text>
                    </View>
                ) : logs.length === 0 ? (
                    <View className="bg-surface p-8 rounded-3xl border border-white/10 items-center justify-center py-12">
                        <MaterialCommunityIcons name="text-box-search-outline" size={48} color="#4B5563" style={{ marginBottom: 12 }} />
                        <Text className="text-gray-400 text-center font-bold text-lg">No activity logs found.</Text>
                        <Text className="text-gray-500 text-center text-sm mt-2">When you participate in votes, your actions will appear here.</Text>
                    </View>
                ) : (
                    <View className="space-y-3 gap-3">
                        {logs.map(log => (
                            <View key={log.id} className="bg-surface p-4 rounded-2xl border border-white/5">
                                <View className="flex-row justify-between flex-wrap mb-2">
                                    <View className="flex-row items-center">
                                        <MaterialCommunityIcons name="clock-outline" size={14} color="#9CA3AF" style={{ marginRight: 4 }} />
                                        <Text className="text-gray-400 text-xs font-bold">
                                            {format(new Date(log.serverTimestampMs), 'MMM d, h:mm:ss a')}
                                        </Text>
                                    </View>
                                    {renderActionBadge(log.action)}
                                </View>
                                
                                <View className="bg-black/40 rounded-xl p-3 mt-1 border border-white/5">
                                    <View className="flex-row items-center mb-1">
                                        <Text className="text-gray-500 text-[10px] font-black uppercase tracking-widest w-16">EVENT ID</Text>
                                        <Text className="text-gray-300 text-xs font-mono">{log.eventId}</Text>
                                    </View>
                                    <View className="flex-row items-center mb-1">
                                        <Text className="text-gray-500 text-[10px] font-black uppercase tracking-widest w-16">SYNC</Text>
                                        <Text className="text-gray-300 text-xs">{log.differenceMs > 0 ? '+' : ''}{log.differenceMs}ms <Text className="text-gray-500 italic font-normal">(Device skew)</Text></Text>
                                    </View>
                                    {log.details && (
                                        <View className="flex-row items-start mt-1">
                                            <Text className="text-gray-500 text-[10px] font-black uppercase tracking-widest w-16 mt-0.5">DETAILS</Text>
                                            <Text className="text-gray-300 text-xs flex-1 italic">{log.details}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
