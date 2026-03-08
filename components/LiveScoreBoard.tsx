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
    sportName?: string;
    currentSet?: number;
    sets?: { teamAScore: number; teamBScore: number; winner?: 'A' | 'B' }[];
    matchWinner?: 'A' | 'B' | null;
    onRecordSet?: () => void;
    onFinalizeMatch?: () => void;
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
    participants = [],
    sportName = 'Volleyball',
    currentSet = 1,
    sets = [],
    matchWinner = null,
    onRecordSet,
    onFinalizeMatch
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
        <View className="flex-row items-center gap-x-4 sm:gap-x-6">
            <TouchableOpacity
                onPress={() => onValueChange(-1)}
                disabled={value <= 0}
                style={{ backgroundColor: value <= 0 ? 'rgba(255,255,255,0.05)' : minusColor }}
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full items-center justify-center border ${value <= 0 ? 'border-white/10 opacity-40' : 'border-white/30 shadow-lg'}`}
                activeOpacity={0.7}
            >
                <MaterialCommunityIcons name="minus" size={26} color={value <= 0 ? "#888" : "white"} />
            </TouchableOpacity>
            <TouchableOpacity
                onPress={() => onValueChange(1)}
                style={{ backgroundColor: color }}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full items-center justify-center border border-white/30 shadow-lg"
                activeOpacity={0.7}
            >
                <MaterialCommunityIcons name="plus" size={26} color="white" />
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
            <View className="flex-row items-center justify-center mb-4">
                <View className="bg-primary/20 px-4 py-1.5 rounded-full flex-row items-center border border-primary/30 shadow-lg">
                    <MaterialCommunityIcons name="scoreboard" size={14} color="#00E5FF" style={{ marginRight: 6 }} />
                    <Text className="text-primary font-black text-[12px] uppercase tracking-widest">Live Match • SET {currentSet}</Text>
                </View>
            </View>

            {/* Set History Row - Visible to everyone if sets exist */}
            {sets && sets.length > 0 && (
                <View className="flex-row flex-wrap justify-center gap-2 mb-6">
                    {sets.map((set, idx) => (
                        <View key={`set-${idx}`} className={`px-3 py-1.5 rounded-lg border ${set.winner === 'A' ? 'bg-blue-500/10 border-blue-500/20' : (set.winner === 'B' ? 'bg-red-500/10 border-red-500/20' : 'bg-white/5 border-white/10')}`}>
                            <Text className={`text-[10px] font-black tracking-widest ${set.winner === 'A' ? 'text-blue-400' : (set.winner === 'B' ? 'text-red-400' : 'text-gray-400')}`}>
                                SET {idx + 1}: {set.teamAScore}-{set.teamBScore}
                            </Text>
                        </View>
                    ))}
                </View>
            )}

            {(() => {
                const isVolleyball = sportName?.toLowerCase() === 'volleyball';
                const teamAWinsSet = isVolleyball && teamAScore >= 21 && (teamAScore - teamBScore >= 2);
                const teamBWinsSet = isVolleyball && teamBScore >= 21 && (teamBScore - teamAScore >= 2);
                const isMatchOver = matchWinner !== null && matchWinner !== undefined;

                return (
                    <>
                        <View className="flex-row items-center justify-between mb-4">
                            {/* Team A (Blue) */}
                            <View className="flex-1 items-center">
                                <View className={`bg-blue-500/10 px-3 py-1 rounded-full mb-3 border ${teamAWinsSet ? 'border-yellow-400/50' : 'border-blue-500/20'}`}>
                                    <Text className="text-blue-400 text-[10px] font-black uppercase tracking-widest" numberOfLines={1}>
                                        {isTeamSplittingEnabled ? 'Team Blue' : teamAName}
                                    </Text>
                                </View>
                                <Animated.Text style={[{ color: '#60A5FA', fontSize: 48, fontWeight: '900', fontStyle: 'italic', textShadowColor: 'rgba(96, 165, 250, 0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 }, animatedAStyle]}>
                                    {teamAScore}
                                </Animated.Text>
                                {canEdit && !isMatchOver && !teamAWinsSet && !teamBWinsSet && (
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
                                <View className={`bg-red-500/10 px-3 py-1 rounded-full mb-3 border ${teamBWinsSet ? 'border-yellow-400/50' : 'border-red-500/20'}`}>
                                    <Text className="text-red-400 text-[10px] font-black uppercase tracking-widest" numberOfLines={1}>
                                        {isTeamSplittingEnabled ? 'Team Red' : teamBName}
                                    </Text>
                                </View>
                                <Animated.Text style={[{ color: '#F87171', fontSize: 48, fontWeight: '900', fontStyle: 'italic', textShadowColor: 'rgba(248, 113, 113, 0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 }, animatedBStyle]}>
                                    {teamBScore}
                                </Animated.Text>
                                {canEdit && !isMatchOver && !teamAWinsSet && !teamBWinsSet && (
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

                        {/* Admin Action: Finish Set */}
                        {canEdit && !isMatchOver && (teamAWinsSet || teamBWinsSet) && onRecordSet && (
                            <View className="items-center mt-4">
                                <TouchableOpacity
                                    onPress={onRecordSet}
                                    className="bg-yellow-400 px-8 py-3 rounded-full flex-row items-center border border-yellow-500 shadow-xl"
                                    activeOpacity={0.8}
                                >
                                    <MaterialCommunityIcons name="content-save-check" size={20} color="#000" style={{ marginRight: 8 }} />
                                    <Text className="text-black font-black uppercase tracking-widest text-sm">Finish Set</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Overall Match Winner Banner (Replaces Single Set Winner Banner) */}
                        {isMatchOver && matchWinner && (
                            <View className="items-center mt-2 mb-2">
                                <View className="bg-yellow-400 px-6 py-2 rounded-full flex-row items-center shadow-lg border border-yellow-500">
                                    <MaterialCommunityIcons name="trophy" size={18} color="#000" style={{ marginRight: 8 }} />
                                    <Text className="text-black text-[12px] font-black uppercase tracking-widest">
                                        {matchWinner === 'A'
                                            ? (isTeamSplittingEnabled || teamAName.toUpperCase() === 'HOME' ? 'BLUE TEAM' : teamAName.toUpperCase())
                                            : (isTeamSplittingEnabled || teamBName.toUpperCase() === 'AWAY' ? 'RED TEAM' : teamBName.toUpperCase())} WON THE MATCH!
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Admin Action: Finalize Entire Game Block */}
                        {canEdit && !isMatchOver && sets && sets.length > 0 && onFinalizeMatch && (
                            <View className="items-center mt-6 pt-6 border-t border-white/10 w-full">
                                <TouchableOpacity
                                    onPress={onFinalizeMatch}
                                    className="bg-red-500/20 px-6 py-2.5 rounded-xl flex-row items-center border border-red-500/30"
                                    activeOpacity={0.7}
                                >
                                    <MaterialCommunityIcons name="flag-checkered" size={16} color="#FCA5A5" style={{ marginRight: 8 }} />
                                    <Text className="text-red-300 font-bold uppercase tracking-wider text-xs">End & Finalize Match</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </>
                );
            })()}

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
        </View >
    );
}
