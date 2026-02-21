import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { formatInCentralTime } from '../utils/dateUtils';

const ServerClock = () => {
    const [currentTime, setCurrentTime] = useState<number>(Date.now());
    const [offset, setOffset] = useState<number>(0);
    const [syncing, setSyncing] = useState(true);

    useEffect(() => {
        const syncTime = async () => {
            try {
                // 1. Write serverTimestamp to a PUBLIC temporary path to avoid permission issues
                const syncRef = doc(db, 'public', 'time_sync');
                await setDoc(syncRef, { lastSync: serverTimestamp() }, { merge: true });

                // 2. Read it back
                const snap = await getDoc(syncRef);
                if (snap.exists()) {
                    const data = snap.data();
                    const serverTs = data?.lastSync as Timestamp;

                    if (serverTs) {
                        const serverMillis = serverTs.toMillis();
                        const localMillis = Date.now();

                        // offset = server - local
                        const newOffset = serverMillis - localMillis;
                        setOffset(newOffset);
                        setSyncing(false);
                        console.log('[ServerClock] Time synced. Offset:', newOffset, 'ms');
                    } else {
                        console.log('[ServerClock] No server timestamp yet (latency compensation?)');
                    }
                }
            } catch (err) {
                console.warn('[ServerClock] Sync failed, falling back to local time:', err);
                setOffset(0); // Fallback to local time
                setSyncing(false);
            }
        };

        syncTime();

        const timer = setInterval(() => {
            setCurrentTime(Date.now());
        }, 33); // High frequency for smooth ms

        return () => clearInterval(timer);
    }, []);

    const displayTime = currentTime + offset;

    return (
        <View className="bg-slate-900 shadow-xl px-4 py-2.5 rounded-2xl border border-cyan-500/50 flex-row items-center gap-3">
            <View className={`w-2.5 h-2.5 rounded-full ${syncing ? 'bg-amber-500 animate-pulse' : 'bg-green-500 shadow-[0_0_12px_#34d399]'}`} />
            <View>
                <Text className="text-cyan-400 font-mono font-black tracking-widest text-sm">
                    {formatInCentralTime(displayTime, 'HH:mm:ss.SSS')}
                </Text>
                <Text className="text-slate-500 text-[8px] font-black uppercase tracking-[2px]">Server Time (CST)</Text>
            </View>
        </View>
    );
};

export default ServerClock;
