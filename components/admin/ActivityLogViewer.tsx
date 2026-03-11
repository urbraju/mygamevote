import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { collection, query, orderBy, limit, onSnapshot, getDocs, startAfter, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ActivityLog } from '../../services/activityLogService';

export default function ActivityLogViewer() {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Query the most recent 100 activity logs
        const q = query(
            collection(db, 'activity_logs'),
            orderBy('serverTimestampMs', 'desc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newLogs: ActivityLog[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                newLogs.push({
                    id: doc.id,
                    ...data
                } as unknown as ActivityLog);
            });
            setLogs(newLogs);
            setLoading(false);
            setError(null);
        }, (err) => {
            console.error("Error fetching activity logs:", err);
            setError(err.message);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

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

    return (
        <View className="bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-200">
            <View className="flex-row items-center mb-4">
                <View className="w-8 h-8 bg-purple-100 rounded-lg items-center justify-center mr-3">
                    <MaterialCommunityIcons name="history" size={20} color="#7E22CE" />
                </View>
                <View className="flex-1">
                    <Text className="text-lg font-bold text-gray-800">Activity Logs</Text>
                    <Text className="text-xs text-gray-500">Real-time button interaction and UI rendering audit trail</Text>
                </View>
            </View>

            {error && (
                <View className="bg-red-50 p-3 rounded mb-4">
                    <Text className="text-red-600 text-xs text-center">{error}</Text>
                </View>
            )}

            {loading ? (
                <ActivityIndicator size="small" color="#7E22CE" className="py-4" />
            ) : logs.length === 0 ? (
                <View className="py-6 items-center">
                    <MaterialCommunityIcons name="text-box-search-outline" size={32} color="#D1D5DB" className="mb-2" />
                    <Text className="text-gray-400 text-sm">No recent activity logs found.</Text>
                </View>
            ) : (
                <View className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                    <View className="flex-row bg-gray-100 p-2 border-b border-gray-200">
                        <Text className="flex-[1.5] text-[10px] font-bold text-gray-500 uppercase">User</Text>
                        <Text className="flex-1 text-[10px] font-bold text-gray-500 uppercase text-center">Action</Text>
                        <Text className="flex-1 text-[10px] font-bold text-gray-500 uppercase text-right">Time</Text>
                    </View>
                    <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled>
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
                                            {format(log.serverTimestampMs, 'HH:mm:ss.SSS')}
                                        </Text>
                                        <Text className="text-[9px] text-gray-400">
                                            Diff: {log.differenceMs > 0 ? '+' : ''}{log.differenceMs}ms
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
                </View>
            )}
        </View>
    );
}
