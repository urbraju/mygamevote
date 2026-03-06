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
    isTeamSplittingEnabled?: boolean;
    teams?: { teamA: string[], teamB: string[] };
    participants?: { uid: string, firstName: string }[];
}

export default function LiveScoreBoard({
    teamAScore,
    teamBScore,
    canEdit,
    onUpdateScore,
    teamAName = 'Team Blue',
    teamBName = 'Team Red',
    isTeamSplittingEnabled = false,
    teams,
    participants = []
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

    // Custom ScoreControl component takes `color` and `minusColor` props 
    // to distinctively theme the plus/minus buttons based on the user's team affiliation.
    const ScoreControl = ({ onValueChange, value, color, minusColor }: { onValueChange: (delta: number) => void, value: number, color: string, minusColor: string }) => (
        <View className="flex-row items-center space-x-2">
            <TouchableOpacity
                onPress={() => onValueChange(-1)}
                disabled={value <= 0}
                style={{ backgroundColor: value <= 0 ? 'rgba(255,255,255,0.05)' : minusColor }}
                className={`w-8 h-8 rounded-full items-center justify-center border ${value <= 0 ? 'border-white/10 opacity-30' : 'border-white/20'}`}
            >
                <MaterialCommunityIcons name="minus" size={16} color={value <= 0 ? "#666" : "white"} />
            </TouchableOpacity>
            <TouchableOpacity
                onPress={() => onValueChange(1)}
                style={{ backgroundColor: color }}
                className="w-8 h-8 rounded-full items-center justify-center border border-white/20"
            >
                <MaterialCommunityIcons name="plus" size={16} color="white" />
            </TouchableOpacity>
        </View>
    );

    const getPlayerName = (uid: string) => {
        const p = participants.find(part => part.uid === uid);
        return p ? p.firstName : '...';
    };

    return (
        <View className="bg-white/5 rounded-3xl p-5 border border-white/10 mb-6 overflow-hidden">
            {/* Header */}
            <View className="flex-row items-center justify-center mb-6">
                <View className="bg-primary/20 px-3 py-1 rounded-full flex-row items-center border border-primary/30">
                    <MaterialCommunityIcons name="scoreboard" size={14} color="#00E5FF" style={{ marginRight: 6 }} />
                    <Text className="text-primary font-black text-[10px] uppercase tracking-widest">Live Match Score</Text>
                </View>
            </View>

            <View className="flex-row items-center justify-between mb-4">
                {/* Team A (Blue) */}
                <View className="flex-1 items-center">
                    <View className="bg-blue-500/10 px-3 py-1 rounded-full mb-3 border border-blue-500/20">
                        <Text className="text-blue-400 text-[10px] font-black uppercase tracking-widest" numberOfLines={1}>
                            {isTeamSplittingEnabled ? 'Team Blue' : teamAName}
                        </Text>
                    </View>
                    <Animated.Text style={[{ color: '#60A5FA', fontSize: 48, fontWeight: '900', fontStyle: 'italic', textShadowColor: 'rgba(96, 165, 250, 0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 }, animatedAStyle]}>
                        {teamAScore}
                    </Animated.Text>
                    {canEdit && (
                        <View className="mt-4">
                            <ScoreControl
                                value={teamAScore}
                                color="#3B82F6"
                                minusColor="#1E3A8A"
                                onValueChange={(delta) => onUpdateScore(Math.max(0, teamAScore + delta), teamBScore)}
                            />
                        </View>
                    )}
                </View>

                {/* VS Divider */}
                <View className="px-2 items-center">
                    <Text className="text-white/20 font-black text-xl italic">VS</Text>
                </View>

                {/* Team B (Red) */}
                <View className="flex-1 items-center">
                    <View className="bg-red-500/10 px-3 py-1 rounded-full mb-3 border border-red-500/20">
                        <Text className="text-red-400 text-[10px] font-black uppercase tracking-widest" numberOfLines={1}>
                            {isTeamSplittingEnabled ? 'Team Red' : teamBName}
                        </Text>
                    </View>
                    <Animated.Text style={[{ color: '#F87171', fontSize: 48, fontWeight: '900', fontStyle: 'italic', textShadowColor: 'rgba(248, 113, 113, 0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 }, animatedBStyle]}>
                        {teamBScore}
                    </Animated.Text>
                    {canEdit && (
                        <View className="mt-4">
                            <ScoreControl
                                value={teamBScore}
                                color="#EF4444"
                                minusColor="#7F1D1D"
                                onValueChange={(delta) => onUpdateScore(teamAScore, Math.max(0, teamBScore + delta))}
                            />
                        </View>
                    )}
                </View>
            </View>

            {canEdit && (
                <View className="mt-4 pt-4 border-t border-white/5 items-center flex-row justify-center">
                    <View className="bg-primary/10 px-2 py-1 rounded-md flex-row items-center">
                        <MaterialCommunityIcons name="shield-check" size={10} color="#00E5FF" style={{ marginRight: 4 }} />
                        <Text className="text-primary/60 text-[8px] font-black uppercase tracking-widest">
                            Scoring active for participants
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
}
