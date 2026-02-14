import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { db, auth, firebaseConfig } from '../firebaseConfig';
import { doc, getDoc, collection, getDocs, limit, query } from 'firebase/firestore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface HealthStatus {
    label: string;
    status: 'pending' | 'ok' | 'error';
    message?: string;
    details?: string;
}

export default function SystemHealthCheck() {
    const [checks, setChecks] = useState<HealthStatus[]>([]);
    const [running, setRunning] = useState(false);

    const runChecks = async () => {
        setRunning(true);
        const results: HealthStatus[] = [];

        // 1. Project Config Check
        results.push({
            label: 'Firebase Project',
            status: 'ok',
            message: firebaseConfig.projectId
        });

        // 2. Auth State Check
        const user = auth.currentUser;
        results.push({
            label: 'Authentication',
            status: user ? 'ok' : 'error',
            message: user ? `Logged in as ${user.email}` : 'Not authenticated'
        });

        if (!user) {
            setChecks(results);
            setRunning(false);
            return;
        }

        // 3. Firestore Read: Users (Self)
        try {
            const userSnap = await getDoc(doc(db, 'users', user.uid));
            results.push({
                label: 'Firestore: User Profile',
                status: userSnap.exists() ? 'ok' : 'error',
                message: userSnap.exists() ? 'Profile Found' : 'Profile Missing',
                details: userSnap.exists() ? (userSnap.data().isAdmin ? 'Admin: Yes' : 'Admin: No') : undefined
            });
        } catch (e: any) {
            results.push({
                label: 'Firestore: User Profile',
                status: 'error',
                message: 'Read Denied',
                details: e.message
            });
        }

        // 4. Firestore Read: Settings
        try {
            await getDoc(doc(db, 'settings', 'general'));
            results.push({ label: 'Firestore: Settings', status: 'ok', message: 'Read Success' });
        } catch (e: any) {
            results.push({ label: 'Firestore: Settings', status: 'error', message: 'Read Denied', details: e.message });
        }

        // 5. Firestore Read: Events
        try {
            const q = query(collection(db, 'events'), limit(1));
            await getDocs(q);
            results.push({ label: 'Firestore: Events', status: 'ok', message: 'Read Success' });
        } catch (e: any) {
            results.push({ label: 'Firestore: Events', status: 'error', message: 'Read Denied', details: e.message });
        }

        // 6. Firestore Read: Public (Time Sync)
        try {
            await getDoc(doc(db, 'public', 'time_sync'));
            results.push({ label: 'Firestore: Public', status: 'ok', message: 'Read Success' });
        } catch (e: any) {
            results.push({ label: 'Firestore: Public', status: 'error', message: 'Read Denied', details: e.message });
        }

        setChecks(results);
        setRunning(false);
    };

    return (
        <View className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
            <View className="flex-row justify-between items-center mb-4">
                <View className="flex-row items-center">
                    <MaterialCommunityIcons name="heart-pulse" size={20} color="#EF4444" style={{ marginRight: 8 }} />
                    <Text className="text-lg font-bold text-gray-800">System Health Check</Text>
                </View>
                <TouchableOpacity
                    onPress={runChecks}
                    disabled={running}
                    className={`px-4 py-2 rounded-lg ${running ? 'bg-gray-100' : 'bg-primary/10 border border-primary/20'}`}
                >
                    {running ? <ActivityIndicator size="small" color="#00E5FF" /> : <Text className="text-primary font-bold">Run Tests</Text>}
                </TouchableOpacity>
            </View>

            {checks.length > 0 && (
                <View className="gap-y-3">
                    {checks.map((check, idx) => (
                        <View key={idx} className="flex-row items-start border-b border-gray-50 pb-2">
                            <MaterialCommunityIcons
                                name={check.status === 'ok' ? 'check-circle' : 'alert-circle'}
                                size={18}
                                color={check.status === 'ok' ? '#10B981' : '#EF4444'}
                                style={{ marginTop: 2, marginRight: 8 }}
                            />
                            <View className="flex-1">
                                <Text className="text-sm font-bold text-gray-700">{check.label}</Text>
                                <Text className={`text-xs ${check.status === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
                                    {check.message}
                                </Text>
                                {check.details && (
                                    <Text className="text-[10px] text-gray-400 font-mono mt-1">{check.details}</Text>
                                )}
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {!running && checks.length === 0 && (
                <Text className="text-xs text-gray-400 italic text-center py-2">
                    Click 'Run Tests' to verify Firebase connection and permissions.
                </Text>
            )}
        </View>
    );
}
