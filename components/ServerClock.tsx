import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { formatInCentralTime } from '../utils/dateUtils';
import { timeService } from '../services/timeService';

const ServerClock = () => {
    const [currentTime, setCurrentTime] = useState<number>(Date.now());
    const [offset, setOffset] = useState<number>(timeService.getOffset());
    const [syncing, setSyncing] = useState(!timeService.isSynced());

    useEffect(() => {
        // Use global time service
        const unsubscribe = timeService.subscribe((newOffset) => {
            setOffset(newOffset);
            setSyncing(false);
        });

        // Trigger a sync if not already done
        if (!timeService.isSynced()) {
            timeService.sync();
        }

        const timer = setInterval(() => {
            setCurrentTime(Date.now());
        }, 100); // 100ms is enough for UI clock

        return () => {
            unsubscribe();
            clearInterval(timer);
        };
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
