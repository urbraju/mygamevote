import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { collection, query, orderBy, limit, onSnapshot, where, Timestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ActivityLog } from '../../services/activityLogService';

type TimeRange = 'recent' | 'today' | 'week' | 'all';

export default function ActivityLogViewer() {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [timeRange, setTimeRange] = useState<TimeRange>('recent');

    useEffect(() => {
        setLoading(true);
        let q = query(
            collection(db, 'activity_logs'),
            orderBy('serverTimestampMs', 'desc')
        );

        // Apply Time Filter
        if (timeRange !== 'all') {
            const now = new Date();
            let startMs = 0;
            if (timeRange === 'recent') {
                // No extra filter, just limit
            } else if (timeRange === 'today') {
                startMs = startOfDay(now).getTime();
            } else if (timeRange === 'week') {
                startMs = subDays(now, 7).getTime();
            }

            if (startMs > 0) {
                q = query(q, where('serverTimestampMs', '>=', startMs));
            }
        }

        // Search Filter (Client-side initially for better UX without requiring complex composite indexes immediately)
        // If searchTerm is provided and timeRange is 'all', we might want server-side, 
        // but Firestore doesn't support case-insensitive search easily.
        // We will fetch 200 logs and filter in memory if searching, otherwise 100.
        const queryLimit = searchTerm ? 500 : 100;
        q = query(q, limit(queryLimit));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const rawLogs: ActivityLog[] = [];
            snapshot.forEach((doc) => {
                rawLogs.push({ id: doc.id, ...doc.data() } as any);
            });

            // Apply Search Filter Client-side (case-insensitive)
            let filtered = rawLogs;
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase().trim();
                filtered = rawLogs.filter(log => 
                    log.userEmail.toLowerCase().includes(term) || 
                    log.userName.toLowerCase().includes(term) ||
                    log.details?.toLowerCase().includes(term) ||
                    log.action.toLowerCase().includes(term)
                );
            }

            setLogs(filtered);
            setLoading(false);
            setError(null);
        }, (err) => {
            console.error("Error fetching activity logs:", err);
            // If it fails due to index, we show a helpful message
            if (err.message?.includes('index')) {
                setError("This filter requires a database index. Please contact developer.");
            } else {
                setError(err.message);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [timeRange, searchTerm]);

    const renderActionBadge = (action: string) => {
        if (action === 'BUTTON_RENDERED_ACTIVE') {
            return (
                <View className="bg-blue-100 px-2 py-1 rounded border border-blue-200 flex-row items-center">
                    <MaterialCommunityIcons name="eye" size={12} color="#1E40AF" style={{ marginRight: 4 }} />
                    <Text className="text-blue-800 text-[10px] font-bold">BUTTON VISIBLE</Text>
                </View>
            );
        } else if (action === 'BUTTON_CLICKED') {
            return (
                <View className="bg-green-100 px-2 py-1 rounded border border-green-200 flex-row items-center">
                    <MaterialCommunityIcons name="cursor-default-click" size={12} color="#166534" style={{ marginRight: 4 }} />
                    <Text className="text-green-800 text-[10px] font-bold">CLICKED</Text>
                </View>
            );
        } else if (action === 'BUTTON_CLICK_IGNORED') {
            return (
                <View className="bg-amber-100 px-2 py-1 rounded border border-amber-200 flex-row items-center">
                    <MaterialCommunityIcons name="gesture-tap-box" size={12} color="#92400E" style={{ marginRight: 4 }} />
                    <Text className="text-amber-800 text-[10px] font-bold">DOUBLE CLICK</Text>
                </View>
            );
        } else if (action === 'VOTE_SUCCESS') {
            return (
                <View className="bg-emerald-100 px-2 py-1 rounded border border-emerald-200 flex-row items-center">
                    <MaterialCommunityIcons name="check-circle" size={12} color="#047857" style={{ marginRight: 4 }} />
                    <Text className="text-emerald-800 text-[10px] font-bold">VOTE SUCCESS</Text>
                </View>
            );
        } else if (action === 'VOTE_FAILED') {
            return (
                <View className="bg-red-100 px-2 py-1 rounded border border-red-200 flex-row items-center">
                    <MaterialCommunityIcons name="alert-circle" size={12} color="#B91C1C" style={{ marginRight: 4 }} />
                    <Text className="text-red-800 text-[10px] font-bold">VOTE FAILED</Text>
                </View>
            );
        }
        return (
            <View className="bg-gray-100 px-2 py-1 rounded border border-gray-200">
                <Text className="text-gray-800 text-[10px] font-bold">{action}</Text>
            </View>
        );
    };

    const RangeButton = ({ type, label, icon }: { type: TimeRange, label: string, icon: any }) => (
        <TouchableOpacity 
            onPress={() => setTimeRange(type)}
            className={`flex-row items-center px-3 py-1.5 rounded-lg mr-2 mb-2 border ${timeRange === type ? 'bg-purple-600 border-purple-700' : 'bg-gray-100 border-gray-200'}`}
        >
            <MaterialCommunityIcons name={icon} size={14} color={timeRange === type ? 'white' : '#6B7280'} style={{ marginRight: 4 }} />
            <Text className={`text-[10px] font-bold ${timeRange === type ? 'text-white' : 'text-gray-600'}`}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <View className="bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-200">
            <View className="flex-row items-center mb-4">
                <View className="w-8 h-8 bg-purple-100 rounded-lg items-center justify-center mr-3">
                    <MaterialCommunityIcons name="history" size={20} color="#7E22CE" />
                </View>
                <View className="flex-1">
                    <Text className="text-lg font-bold text-gray-800">Activity Logs</Text>
                    <Text className="text-xs text-gray-500 italic">Audit trail for user behavior & voting triggers</Text>
                </View>
            </View>

            {/* Filters */}
            <View className="mb-4">
                <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 mb-3">
                    <MaterialCommunityIcons name="magnify" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
                    <TextInput 
                        placeholder="Search by name, email, or details..."
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                        className="flex-1 text-sm text-gray-800"
                        placeholderTextColor="#9CA3AF"
                    />
                    {searchTerm.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchTerm('')}>
                            <MaterialCommunityIcons name="close-circle" size={18} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}
                </View>

                <View className="flex-row flex-wrap">
                    <RangeButton type="recent" label="RECENT (100)" icon="clock-outline" />
                    <RangeButton type="today" label="TODAY" icon="calendar-today" />
                    <RangeButton type="week" label="THIS WEEK" icon="calendar-range" />
                    <RangeButton type="all" label="ALL TIME" icon="database-outline" />
                </View>
            </View>

            {error && (
                <View className="bg-red-50 p-3 rounded mb-4">
                    <Text className="text-red-600 text-xs text-center">{error}</Text>
                </View>
            )}

            {loading && logs.length === 0 ? (
                <ActivityIndicator size="small" color="#7E22CE" className="py-4" />
            ) : logs.length === 0 ? (
                <View className="py-6 items-center">
                    <MaterialCommunityIcons name="text-box-search-outline" size={32} color="#D1D5DB" className="mb-2" />
                    <Text className="text-gray-400 text-sm">No activity logs match your filters.</Text>
                </View>
            ) : (
                <View className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                    <View className="flex-row bg-gray-100 p-2 border-b border-gray-200">
                        <Text className="flex-[1.5] text-[10px] font-bold text-gray-500 uppercase">User</Text>
                        <Text className="flex-1 text-[10px] font-bold text-gray-500 uppercase text-center">Action</Text>
                        <Text className="flex-1 text-[10px] font-bold text-gray-500 uppercase text-right">Time</Text>
                    </View>
                    <ScrollView style={{ maxHeight: searchTerm ? 500 : 300 }} nestedScrollEnabled>
                        {logs.map((log: any, index) => (
                            <React.Fragment key={log.id}>
                                <View className={`flex-row p-3 items-center ${!log.details ? 'border-b border-gray-100' : ''} ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                    <View className="flex-[1.5]">
                                        <Text className="text-xs font-bold text-gray-800" numberOfLines={1}>{log.userName}</Text>
                                        <Text className="text-[10px] text-gray-500" numberOfLines={1}>{log.userEmail}</Text>
                                    </View>
                                    <View className="flex-1 items-center">
                                        {renderActionBadge(log.action)}
                                    </View>
                                    <View className="flex-1 items-end">
                                        <Text className="text-[10px] font-bold text-gray-700">
                                            {format(log.serverTimestampMs, 'MMM d, HH:mm:ss')}
                                        </Text>
                                        <Text className="text-[9px] text-gray-400">
                                            {log.differenceMs > 0 ? '+' : ''}{log.differenceMs}ms
                                        </Text>
                                    </View>
                                </View>
                                {log.details && (
                                    <View className={`px-4 pb-2 border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                        <View className="bg-yellow-50/50 p-2 rounded border border-yellow-100/50">
                                            <Text className="text-[10px] text-gray-600 italic">
                                                Info: {log.details}
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </React.Fragment>
                        ))}
                    </ScrollView>
                    {loading && (
                        <View className="bg-white/80 absolute inset-0 items-center justify-center">
                            <ActivityIndicator size="small" color="#7E22CE" />
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}
