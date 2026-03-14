import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Share, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { eventService } from '../../services/eventService';
import { votingService, SlotUser } from '../../services/votingService';
import { UserProfile } from '../../services/adminService';
import { teamService } from '../../services/teamService';

interface TeamManagerProps {
    eventId: string;
    participants: (UserProfile | SlotUser)[];
    isSplittingEnabled: boolean | null;
    isLiveScoreEnabled?: boolean | null;
    teams?: { teamA: string[], teamB: string[] };
    sportId: string;
    sportName: string;
    location?: string;
    isLegacy?: boolean;
    orgId?: string | null;
    maxSlots?: number;
    onUpdate: () => void;
}

export default function TeamManager({
    eventId,
    participants,
    isSplittingEnabled = null,
    isLiveScoreEnabled = null,
    teams,
    sportId,
    sportName,
    location,
    isLegacy = false,
    orgId = null,
    maxSlots = 14,
    onUpdate
}: TeamManagerProps) {
    const [loading, setLoading] = useState(false);
    const [isSharing, setIsSharing] = useState(false);

    // Manual Swap State
    const [selectedPlayerUid, setSelectedPlayerUid] = useState<string | null>(null);
    const [selectedTeam, setSelectedTeam] = useState<'A' | 'B' | null>(null);
    const [hasUnsavedModifications, setHasUnsavedModifications] = useState(false);
    const [modifiedTeams, setModifiedTeams] = useState<{ teamA: string[], teamB: string[] } | null>(null);

    // Use modified teams if they exist, otherwise use props
    const activeTeams = modifiedTeams || teams;

    const toggleSplitting = async () => {
        setLoading(true);
        try {
            let next: boolean | null;
            if (isSplittingEnabled === null) next = true;
            else if (isSplittingEnabled === true) next = false;
            else next = null;

            if (isLegacy) {
                await votingService.legacyToggleTeamSplitting(next, orgId);
            } else {
                await eventService.toggleTeamSplitting(eventId, next);
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
            let next: boolean | null;
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

    const getSplittingToggleLabel = () => {
        if (isSplittingEnabled === null) return 'AUTO';
        return isSplittingEnabled ? 'ALWAYS ON' : 'ALWAYS OFF';
    };

    const runSnakeSplit = async (shuffleEqualSkill: boolean = false) => {
        if (participants.length < 2) {
            Alert.alert('Not Enough Players', 'Need at least 2 participants to form teams.');
            return;
        }

        setLoading(true);
        try {
            // Re-map SlotUsers to look like UserProfiles for teamService
            // The teamService expects {uid, skills, ...}
            const mappedParticipants = participants.map(p => {
                if ('userId' in p) { // It's a SlotUser
                    return { uid: p.userId, firstName: p.userName, skills: {} } as any;
                }
                return p; // It's a UserProfile
            });

            const { teamA, teamB } = teamService.runSnakeSplit(mappedParticipants, sportId, shuffleEqualSkill);

            // We update state locally first in case they want to adjust, but actually we should just save immediately
            // to preserve the original 1-click behavior, and then they can tweak it manually.
            if (isLegacy) {
                await votingService.legacyUpdateTeams(teamA, teamB, orgId);
            } else {
                await eventService.updateTeams(eventId, teamA, teamB);
            }
            // Clear local modifications
            setModifiedTeams(null);
            setHasUnsavedModifications(false);
            setSelectedPlayerUid(null);

            onUpdate();
            Alert.alert('Success', 'Teams have been formed!');
        } catch (error) {
            console.error('Split error:', error);
            Alert.alert('Error', 'Failed to form teams.');
        } finally {
            setLoading(false);
        }
    };

    const handlePlayerTap = (uid: string, team: 'A' | 'B') => {
        if (!activeTeams) return;

        if (selectedPlayerUid === null) {
            // Select first player
            setSelectedPlayerUid(uid);
            setSelectedTeam(team);
        } else if (selectedPlayerUid === uid) {
            // Deselect if tapping same player
            setSelectedPlayerUid(null);
            setSelectedTeam(null);
        } else if (selectedTeam !== team) {
            // Swap players across teams
            const newTeamA = [...activeTeams.teamA];
            const newTeamB = [...activeTeams.teamB];

            if (selectedTeam === 'A') {
                const idxA = newTeamA.indexOf(selectedPlayerUid);
                const idxB = newTeamB.indexOf(uid);
                newTeamA[idxA] = uid;
                newTeamB[idxB] = selectedPlayerUid;
            } else {
                const idxB = newTeamB.indexOf(selectedPlayerUid);
                const idxA = newTeamA.indexOf(uid);
                newTeamB[idxB] = uid;
                newTeamA[idxA] = selectedPlayerUid;
            }

            setModifiedTeams({ teamA: newTeamA, teamB: newTeamB });
            setHasUnsavedModifications(true);
            setSelectedPlayerUid(null);
            setSelectedTeam(null);
        } else {
            // Selected a different player on the same team (just change selection)
            setSelectedPlayerUid(uid);
            setSelectedTeam(team);
        }
    };

    const saveManualAdjustments = async () => {
        if (!modifiedTeams) return;
        setLoading(true);
        try {
            if (isLegacy) {
                await votingService.legacyUpdateTeams(modifiedTeams.teamA, modifiedTeams.teamB, orgId);
            } else {
                await eventService.updateTeams(eventId, modifiedTeams.teamA, modifiedTeams.teamB);
            }
            setHasUnsavedModifications(false);
            onUpdate();
            Alert.alert('Success', 'Manual team adjustments saved!');
        } catch (error) {
            console.error('Save manual teams error:', error);
            Alert.alert('Error', 'Failed to save team adjustments.');
        } finally {
            setLoading(false);
        }
    };

    const shareTeams = async () => {
        if (!activeTeams || isSharing) return;
        setIsSharing(true);

        const getPlayerName = (uid: string) => {
            const p = participants.find(part => {
                if ('userId' in part) return part.userId === uid;
                return part.uid === uid;
            });
            if (!p) return 'Unknown';
            if ('userName' in p) return p.userName;
            return `${p.firstName} ${p.lastName}`.trim();
        };

        const teamAList = activeTeams.teamA.map((uid, i) => `${i + 1}. ${getPlayerName(uid)}`).join('\n');
        const teamBList = activeTeams.teamB.map((uid, i) => `${i + 1}. ${getPlayerName(uid)}`).join('\n');

        const message = `⚽ *GAME : TEAM ASSIGNMENTS* ⚽\n\n` +
            `📍 *Sport:* ${sportName}\n` +
            (location ? `📍 *Location:* ${location}\n` : '') +
            `--------------------------\n\n` +
            `🔵 *TEAM BLUE*\n${teamAList}\n\n` +
            `🔴 *TEAM RED*\n${teamBList}\n\n` +
            `See you on the field! 🚀`;

        try {
            // WebKit throws an AbortError if the native Share dialog is canceled or unsupported.
            // A fallback to window.open(wa.me) guarantees Web users can always export the list.
            if (Platform.OS === 'web') {
                const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
                window.open(url, '_blank');
            } else {
                await Share.share({
                    message,
                    title: 'Team Assignments'
                });
            }
        } catch (error) {
            console.error('Share error:', error);
        } finally {
            // Small delay to prevent double-tap issues
            setTimeout(() => {
                setIsSharing(false);
            }, 500);
        }
    };

    // Fallback UI Name resolution for legacy participants who might only exist as Guest slots
    // rather than fully-registered UserProfiles in the active organization directory.
    const getPlayerNameUI = (uid: string) => {
        const p = participants.find(part => {
            if ('userId' in part) return part.userId === uid;
            return part.uid === uid;
        });
        if (!p) return 'Player';

        // Check for UserProfile fields first, then SlotUser fields
        if ('firstName' in p && p.firstName) return p.firstName;
        if ('userName' in p && p.userName) return p.userName.split(' ')[0] || 'Player';
        
        return 'Player';
    };

    // Self-Healing Roster Logic for Admin Manager:
    // 1. Filter out UIDs that are no longer in the confirmed list (avoid "Player" holes)
    // 2. Find confirmed players who are NOT in any team yet (waitlist promotions)
    // 3. Fill the gaps in Team A and Team B to maintain full roster
    const confirmedUids = participants
        .filter(p => !('status' in p && p.status === 'waitlist'))
        .map(p => ('userId' in p ? p.userId : p.uid));

    let healedA = [...(activeTeams?.teamA || [])].filter(uid => confirmedUids.includes(uid));
    let healedB = [...(activeTeams?.teamB || [])].filter(uid => confirmedUids.includes(uid));

    const assignedUids = [...healedA, ...healedB];
    const unassignedUids = confirmedUids.filter(uid => !assignedUids.includes(uid));

    // Distribute unassigned players into gaps to maintain intended team sizes
    // Target size is half of max slots (e.g. 7 for 14)
    const targetSize = Math.ceil(maxSlots / 2);

    unassignedUids.forEach(uid => {
        if (healedA.length < targetSize) {
            healedA.push(uid);
        } else if (healedB.length < targetSize) {
            healedB.push(uid);
        }
    });

    const filteredTeams = activeTeams ? { teamA: healedA, teamB: healedB } : null;

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
                    className={`px-4 py-2 rounded-full border ${isSplittingEnabled !== null ? 'bg-primary/10 border-primary' : 'bg-gray-800 border-gray-700'}`}
                >
                    <Text className={`font-bold text-xs ${isSplittingEnabled !== null ? 'text-primary' : 'text-gray-500'}`}>
                        {getSplittingToggleLabel()}
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
                    <View className="flex-row gap-2 mb-6 flex-wrap">
                        <TouchableOpacity
                            onPress={() => runSnakeSplit(false)}
                            disabled={loading || hasUnsavedModifications}
                            className={`flex-1 min-w-[120px] py-4 rounded-2xl flex-row justify-center items-center ${hasUnsavedModifications ? 'bg-gray-600' : 'bg-primary hover:bg-primary/90'}`}
                        >
                            {loading && !hasUnsavedModifications ? (
                                <ActivityIndicator color="#000" size="small" />
                            ) : (
                                <>
                                    <MaterialCommunityIcons name="auto-fix" size={18} color={hasUnsavedModifications ? "#444" : "#000"} />
                                    <Text className={`font-black uppercase ml-2 text-xs ${hasUnsavedModifications ? 'text-gray-400' : 'text-black'}`}>Draft</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => runSnakeSplit(true)}
                            disabled={loading || hasUnsavedModifications}
                            className={`flex-1 min-w-[120px] py-4 rounded-2xl flex-row justify-center items-center border ${hasUnsavedModifications ? 'bg-gray-800 border-gray-700' : 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20'}`}
                        >
                            <MaterialCommunityIcons name="shuffle-variant" size={18} color={hasUnsavedModifications ? "#555" : "#F59E0B"} />
                            <Text className={`font-black uppercase ml-2 text-xs ${hasUnsavedModifications ? 'text-gray-500' : 'text-amber-500'}`}>Shuffle</Text>
                        </TouchableOpacity>

                        {activeTeams && (
                            <TouchableOpacity
                                onPress={shareTeams}
                                disabled={isSharing || hasUnsavedModifications}
                                className={`w-full mt-2 py-4 rounded-2xl items-center flex-row justify-center border ${hasUnsavedModifications ? 'bg-gray-800 border-gray-700' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                            >
                                <MaterialCommunityIcons name="whatsapp" size={18} color={hasUnsavedModifications ? "#555" : "#25D366"} />
                                <Text className={`font-black uppercase ml-2 text-xs ${hasUnsavedModifications ? 'text-gray-500' : 'text-white'}`}>Share to WhatsApp</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {hasUnsavedModifications && (
                        <View className="mb-6 p-4 bg-orange-500/10 rounded-xl border border-orange-500/30 flex-row items-center justify-between">
                            <View className="flex-row items-center flex-1 mr-4">
                                <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#F97316" />
                                <Text className="text-orange-400 font-bold text-xs ml-2">Unsaved manual adjustments</Text>
                            </View>
                            <View className="flex-row gap-2">
                                <TouchableOpacity onPress={() => { setModifiedTeams(null); setHasUnsavedModifications(false); setSelectedPlayerUid(null); }} className="px-3 py-2 rounded-lg bg-gray-800">
                                    <Text className="text-gray-400 font-bold text-[10px] uppercase">Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={saveManualAdjustments} className="px-3 py-2 rounded-lg bg-orange-500 flex-row items-center">
                                    {loading ? <ActivityIndicator size="small" color="#000" /> : <Text className="text-black font-black text-[10px] uppercase">Save</Text>}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {filteredTeams ? (
                        <View>
                            <Text className="text-gray-500 text-center text-[10px] font-bold uppercase mb-4 tracking-wider">Tap a player on each team to swap</Text>
                            <View className="flex-row justify-between">
                                <View className="w-[48%] bg-blue-500/10 p-4 rounded-2xl border border-blue-500/30">
                                    <Text className="text-blue-400 font-black text-[10px] uppercase tracking-widest mb-3 text-center border-b border-blue-500/20 pb-2">Team Blue</Text>
                                    {filteredTeams.teamA.map(uid => (
                                        <TouchableOpacity
                                            key={uid}
                                            onPress={() => handlePlayerTap(uid, 'A')}
                                            className={`py-2 px-3 mb-2 rounded-lg ${selectedPlayerUid === uid ? 'bg-blue-500 border border-blue-400' : 'bg-black/20 hover:bg-white/5'}`}
                                        >
                                            <Text className={`text-xs font-bold ${selectedPlayerUid === uid ? 'text-white' : 'text-white/80'}`} numberOfLines={1}>
                                                {getPlayerNameUI(uid)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <View className="w-[48%] bg-red-500/10 p-4 rounded-2xl border border-red-500/30">
                                    <Text className="text-red-400 font-black text-[10px] uppercase tracking-widest mb-3 text-center border-b border-red-500/20 pb-2">Team Red</Text>
                                    {filteredTeams.teamB.map(uid => (
                                        <TouchableOpacity
                                            key={uid}
                                            onPress={() => handlePlayerTap(uid, 'B')}
                                            className={`py-2 px-3 mb-2 rounded-lg ${selectedPlayerUid === uid ? 'bg-red-500 border border-red-400' : 'bg-black/20 hover:bg-white/5'}`}
                                        >
                                            <Text className={`text-xs font-bold ${selectedPlayerUid === uid ? 'text-white' : 'text-white/80'}`} numberOfLines={1}>
                                                {getPlayerNameUI(uid)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>
                    ) : (
                        <View className="p-8 items-center bg-black/20 rounded-2xl border border-dashed border-white/10">
                            <MaterialCommunityIcons name="transit-connection-variant" size={40} color="#374151" />
                            <Text className="text-gray-500 text-center mt-3 text-xs italic">
                                Teams not formed yet. Click "Draft" to split {participants.length} players.
                            </Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}
