import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Share, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { eventService } from '../../services/eventService';
import { votingService } from '../../services/votingService';
import { UserProfile } from '../../services/adminService';

interface TeamManagerProps {
    eventId: string;
    participants: UserProfile[];
    isSplittingEnabled: boolean;
    isLiveScoreEnabled?: boolean | null;
    teams?: { teamA: string[], teamB: string[] };
    sportId: string;
    sportName: string;
    isLegacy?: boolean;
    orgId?: string | null;
    onUpdate: () => void;
}

export default function TeamManager({
    eventId,
    participants,
    isSplittingEnabled,
    isLiveScoreEnabled = null,
    teams,
    sportId,
    sportName,
    isLegacy = false,
    orgId = null,
    onUpdate
}: TeamManagerProps) {
    const [loading, setLoading] = useState(false);

    const toggleSplitting = async () => {
        setLoading(true);
        try {
            if (isLegacy) {
                await votingService.legacyToggleTeamSplitting(!isSplittingEnabled, orgId);
            } else {
                await eventService.toggleTeamSplitting(eventId, !isSplittingEnabled);
            }
            onUpdate();
        } catch (error) {
            console.error('Toggle error:', error);
            Alert.alert('Error', 'Failed to update team splitting status.');
        } finally {
            setLoading(false);
        }
    };

    const toggleLiveScore = async () => {
        setLoading(true);
        try {
            // Cycle: null (Auto) -> true (On) -> false (Off) -> null
            let next: boolean | null = null;
            if (isLiveScoreEnabled === null) next = true;
            else if (isLiveScoreEnabled === true) next = false;
            else next = null;

            if (isLegacy) {
                await votingService.legacyToggleLiveScore(next, orgId);
            } else {
                await eventService.toggleLiveScore(eventId, next);
            }
            onUpdate();
        } catch (error) {
            console.error('Score toggle error:', error);
            Alert.alert('Error', 'Failed to update live score status.');
        } finally {
            setLoading(false);
        }
    };

    const getScoreToggleLabel = () => {
        if (isLiveScoreEnabled === null) return 'AUTO';
        return isLiveScoreEnabled ? 'ALWAYS ON' : 'ALWAYS OFF';
    };

    const runSnakeSplit = async () => {
        if (participants.length < 2) {
            Alert.alert('Not Enough Players', 'Need at least 2 participants to form teams.');
            return;
        }

        setLoading(true);
        try {
            // 1. Sort participants by skill level for this sport
            const sorted = [...participants].sort((a, b) => {
                const skillA = a.skills?.[sportId] || 3;
                const skillB = b.skills?.[sportId] || 3;
                return skillB - skillA; // High to low
            });

            const teamA: string[] = [];
            const teamB: string[] = [];

            // 2. Snake Draft logic
            // P1 -> A, P2 -> B
            // P3 -> B, P4 -> A
            // P5 -> A, P6 -> B
            sorted.forEach((p, index) => {
                const round = Math.floor(index / 2);
                const isEvenRound = round % 2 === 0;

                if (isEvenRound) {
                    if (index % 2 === 0) teamA.push(p.uid);
                    else teamB.push(p.uid);
                } else {
                    if (index % 2 === 0) teamB.push(p.uid);
                    else teamA.push(p.uid);
                }
            });

            if (isLegacy) {
                await votingService.legacyUpdateTeams(teamA, teamB, orgId);
            } else {
                await eventService.updateTeams(eventId, teamA, teamB);
            }
            onUpdate();
            Alert.alert('Success', 'Teams have been balanced and formed!');
        } catch (error) {
            console.error('Split error:', error);
            Alert.alert('Error', 'Failed to form teams.');
        } finally {
            setLoading(false);
        }
    };

    const shareTeams = async () => {
        if (!teams) return;

        const getPlayerName = (uid: string) => {
            const p = participants.find(part => part.uid === uid);
            return p ? `${p.firstName} ${p.lastName}`.trim() : 'Unknown';
        };

        const teamAList = teams.teamA.map((uid, i) => `${i + 1}. ${getPlayerName(uid)}`).join('\n');
        const teamBList = teams.teamB.map((uid, i) => `${i + 1}. ${getPlayerName(uid)}`).join('\n');

        const message = `⚽ *GAME SLOT: TEAM ASSIGNMENTS* ⚽\n\n` +
            `📍 *Sport:* ${sportName}\n` +
            `--------------------------\n\n` +
            `🔵 *TEAM BLUE*\n${teamAList}\n\n` +
            `🔴 *TEAM RED*\n${teamBList}\n\n` +
            `See you on the field! 🚀`;

        try {
            await Share.share({
                message,
                title: 'Team Assignments'
            });
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    return (
        <View className="bg-surface rounded-3xl p-5 border border-white/5 mb-6">
            <View className="flex-row items-center justify-between mb-6">
                <View className="flex-row items-center">
                    <MaterialCommunityIcons name="account-group" size={24} color="#00E5FF" />
                    <Text className="text-white font-black ml-3 text-lg uppercase italic">Team Formation</Text>
                </View>
                <TouchableOpacity
                    onPress={toggleSplitting}
                    disabled={loading}
                    className={`px-4 py-2 rounded-full border ${isSplittingEnabled ? 'bg-primary/10 border-primary' : 'bg-gray-800 border-gray-700'}`}
                >
                    <Text className={`font-bold text-xs ${isSplittingEnabled ? 'text-primary' : 'text-gray-500'}`}>
                        {isSplittingEnabled ? 'ENABLED' : 'DISABLED'}
                    </Text>
                </TouchableOpacity>
            </View>

            <View className="flex-row items-center justify-between mb-6 pt-4 border-t border-white/5">
                <View className="flex-row items-center">
                    <MaterialCommunityIcons name="scoreboard-outline" size={24} color="#39FF14" />
                    <Text className="text-white font-black ml-3 text-lg uppercase italic">Live Scoreboard</Text>
                </View>
                <TouchableOpacity
                    onPress={toggleLiveScore}
                    disabled={loading}
                    className={`px-4 py-2 rounded-full border ${isLiveScoreEnabled !== null ? 'bg-primary/10 border-primary' : 'bg-gray-800 border-gray-700'}`}
                >
                    <Text className={`font-bold text-xs ${isLiveScoreEnabled !== null ? 'text-primary' : 'text-gray-500'}`}>
                        {getScoreToggleLabel()}
                    </Text>
                </TouchableOpacity>
            </View>

            {isSplittingEnabled && (
                <View>
                    <View className="flex-row gap-3 mb-6">
                        <TouchableOpacity
                            onPress={runSnakeSplit}
                            disabled={loading}
                            className="flex-1 bg-primary py-4 rounded-2xl items-center flex-row justify-center"
                        >
                            {loading ? (
                                <ActivityIndicator color="#000" size="small" />
                            ) : (
                                <>
                                    <MaterialCommunityIcons name="auto-fix" size={20} color="#000" />
                                    <Text className="text-black font-black uppercase ml-2 text-xs">Form Teams</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {teams && (
                            <TouchableOpacity
                                onPress={shareTeams}
                                className="flex-1 bg-white/5 border border-white/10 py-4 rounded-2xl items-center flex-row justify-center"
                            >
                                <MaterialCommunityIcons name="whatsapp" size={20} color="#25D366" />
                                <Text className="text-white font-black uppercase ml-2 text-xs">Share</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {teams ? (
                        <View className="flex-row justify-between">
                            <View className="w-[48%] bg-blue-500/10 p-4 rounded-2xl border border-blue-500/30">
                                <Text className="text-blue-400 font-black text-[10px] uppercase tracking-widest mb-3">Team Blue</Text>
                                {teams.teamA.map(uid => (
                                    <Text key={uid} className="text-white/80 text-xs mb-1 font-bold" numberOfLines={1}>
                                        • {participants.find(p => p.uid === uid)?.firstName || 'Player'}
                                    </Text>
                                ))}
                            </View>

                            <View className="w-[48%] bg-red-500/10 p-4 rounded-2xl border border-red-500/30">
                                <Text className="text-red-400 font-black text-[10px] uppercase tracking-widest mb-3">Team Red</Text>
                                {teams.teamB.map(uid => (
                                    <Text key={uid} className="text-white/80 text-xs mb-1 font-bold" numberOfLines={1}>
                                        • {participants.find(p => p.uid === uid)?.firstName || 'Player'}
                                    </Text>
                                ))}
                            </View>
                        </View>
                    ) : (
                        <View className="p-8 items-center bg-black/20 rounded-2xl border border-dashed border-white/10">
                            <MaterialCommunityIcons name="transit-connection-variant" size={40} color="#374151" />
                            <Text className="text-gray-500 text-center mt-3 text-xs italic">
                                Teams not formed yet. Click "Form Teams" to split {participants.length} players.
                            </Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}
