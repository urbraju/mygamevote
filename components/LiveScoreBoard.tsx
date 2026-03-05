import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming } from 'react-native-reanimated';

interface LiveScoreBoardProps {
    teamAScore: number;
    teamBScore: number;
    canEdit: boolean;
    onUpdateScore: (teamA: number, teamB: number) => void;
    teamAName?: string;
    teamBName?: string;
}

export default function LiveScoreBoard({
    teamAScore,
    teamBScore,
    canEdit,
    onUpdateScore,
    teamAName = 'Home',
    teamBName = 'Away'
}: LiveScoreBoardProps) {
    const scoreAScale = useSharedValue(1);
    const scoreBScale = useSharedValue(1);

    // Bounce animation when score changes
    useEffect(() => {
        scoreAScale.value = withSequence(withSpring(1.2), withSpring(1));
    }, [teamAScore]);

    useEffect(() => {
        scoreBScale.value = withSequence(withSpring(1.2), withSpring(1));
    }, [teamBScore]);

    const animatedAStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scoreAScale.value }]
    }));

    const animatedBStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scoreBScale.value }]
    }));

    const ScoreControl = ({ onValueChange, value }: { onValueChange: (delta: number) => void, value: number }) => (
        <View className="flex-row items-center space-x-2">
            <TouchableOpacity
                onPress={() => onValueChange(-1)}
                disabled={value <= 0}
                className={`w-8 h-8 rounded-full items-center justify-center border ${value <= 0 ? 'border-white/10 opacity-30' : 'border-red-500/50 bg-red-500/10'}`}
            >
                <MaterialCommunityIcons name="minus" size={16} color={value <= 0 ? "#666" : "#EF4444"} />
            </TouchableOpacity>
            <TouchableOpacity
                onPress={() => onValueChange(1)}
                className="w-8 h-8 rounded-full items-center justify-center border border-primary/50 bg-primary/10"
            >
                <MaterialCommunityIcons name="plus" size={16} color="#00E5FF" />
            </TouchableOpacity>
        </View>
    );

    return (
        <View className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-4 overflow-hidden">
            {/* Header */}
            <View className="flex-row items-center justify-center mb-4">
                <MaterialCommunityIcons name="scoreboard" size={16} color="#39FF14" style={{ marginRight: 6 }} />
                <Text className="text-white/60 font-black text-[10px] uppercase tracking-widest">Live Match Score</Text>
            </View>

            <View className="flex-row items-center justify-between">
                {/* Team A */}
                <View className="flex-1 items-center">
                    <Text className="text-white/80 text-[10px] font-bold uppercase mb-2 text-center" numberOfLines={1}>
                        {teamAName}
                    </Text>
                    <Animated.Text style={[{ color: 'white', fontSize: 42, fontWeight: '900', fontStyle: 'italic' }, animatedAStyle]}>
                        {teamAScore}
                    </Animated.Text>
                    {canEdit && (
                        <View className="mt-2">
                            <ScoreControl
                                value={teamAScore}
                                onValueChange={(delta) => onUpdateScore(Math.max(0, teamAScore + delta), teamBScore)}
                            />
                        </View>
                    )}
                </View>

                {/* Divider / VS */}
                <View className="px-4 items-center">
                    <View className="w-[1px] h-12 bg-white/10" />
                    <View className="bg-white/10 px-2 py-1 rounded-md my-1">
                        <Text className="text-primary font-black text-[10px]">VS</Text>
                    </View>
                    <View className="w-[1px] h-12 bg-white/10" />
                </View>

                {/* Team B */}
                <View className="flex-1 items-center">
                    <Text className="text-white/80 text-[10px] font-bold uppercase mb-2 text-center" numberOfLines={1}>
                        {teamBName}
                    </Text>
                    <Animated.Text style={[{ color: 'white', fontSize: 42, fontWeight: '900', fontStyle: 'italic' }, animatedBStyle]}>
                        {teamBScore}
                    </Animated.Text>
                    {canEdit && (
                        <View className="mt-2">
                            <ScoreControl
                                value={teamBScore}
                                onValueChange={(delta) => onUpdateScore(teamAScore, Math.max(0, teamBScore + delta))}
                            />
                        </View>
                    )}
                </View>
            </View>

            {canEdit && (
                <View className="mt-4 pt-3 border-t border-white/5 items-center flex-row justify-center">
                    <MaterialCommunityIcons name="shield-check" size={12} color="#39FF14" style={{ marginRight: 4 }} />
                    <Text className="text-white/40 text-[9px] font-medium uppercase tracking-tighter">
                        Scoring controls active for participants
                    </Text>
                </View>
            )}
        </View>
    );
}
