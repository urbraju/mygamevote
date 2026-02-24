import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Platform, Switch } from 'react-native';
import { db } from '../../firebaseConfig';
import { adminService } from '../../services/adminService';
import { votingService, WeeklySlotData } from '../../services/votingService';
import { sportsService, Sport } from '../../services/sportsService';
import { eventService, GameEvent } from '../../services/eventService';
import { formatInCentralTime, getVotingStartForDate, getScanningGameId } from '../../utils/dateUtils';
import { getCurrencySymbol } from '../../utils/currencyUtils';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// --- DateSelector Component ---
export const DateSelector = ({ dateStr, onChange }: { dateStr: string, onChange: (val: string) => void }) => {
    const d = dateStr ? new Date(dateStr) : new Date();

    const update = (newDate: Date) => {
        onChange(newDate.toISOString());
    };

    const adjust = (field: 'month' | 'day' | 'hour' | 'minute', amount: number) => {
        const nd = new Date(d);
        if (field === 'month') nd.setMonth(nd.getMonth() + amount);
        if (field === 'day') nd.setDate(nd.getDate() + amount);
        if (field === 'hour') nd.setHours(nd.getHours() + amount);
        if (field === 'minute') nd.setMinutes(nd.getMinutes() + amount);
        update(nd);
    };

    const setField = (field: 'month' | 'day' | 'hour' | 'minute', value: string) => {
        const num = parseInt(value);
        if (isNaN(num)) return;

        const nd = new Date(d);
        if (field === 'month') nd.setMonth(num - 1); // 1-12 input to 0-11
        if (field === 'day') nd.setDate(num);
        if (field === 'hour') nd.setHours(num);
        if (field === 'minute') nd.setMinutes(num);
        update(nd);
    };

    return (
        <View className="gap-y-2">
            <View className="flex-row justify-between">
                <View className="items-center">
                    <Text className="text-xs text-gray-500">Month</Text>
                    <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded">
                        <TouchableOpacity onPress={() => adjust('month', -1)} className="p-2 bg-gray-200"><Text>-</Text></TouchableOpacity>
                        <Text className="w-16 text-center text-xs text-black">{d.toLocaleString('default', { month: 'short' })} ({d.getMonth() + 1})</Text>
                        <TouchableOpacity onPress={() => adjust('month', 1)} className="p-2 bg-gray-200"><Text>+</Text></TouchableOpacity>
                    </View>
                </View>
                <View className="items-center">
                    <Text className="text-xs text-gray-500">Day</Text>
                    <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded">
                        <TouchableOpacity onPress={() => adjust('day', -1)} className="p-2 bg-gray-200"><Text>-</Text></TouchableOpacity>
                        <TextInput
                            className="w-12 text-center p-1 bg-white text-black"
                            value={d.getDate().toString()}
                            keyboardType="numeric"
                            onChangeText={(v) => setField('day', v)}
                            maxLength={2}
                        />
                        <TouchableOpacity onPress={() => adjust('day', 1)} className="p-2 bg-gray-200"><Text>+</Text></TouchableOpacity>
                    </View>
                </View>
            </View>
            <View className="flex-row justify-between">
                <View className="items-center">
                    <Text className="text-xs text-gray-500">Hour (0-23)</Text>
                    <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded">
                        <TouchableOpacity onPress={() => adjust('hour', -1)} className="p-2 bg-gray-200"><Text>-</Text></TouchableOpacity>
                        <TextInput
                            className="w-12 text-center p-1 bg-white text-black"
                            value={d.getHours().toString()}
                            keyboardType="numeric"
                            onChangeText={(v) => setField('hour', v)}
                            maxLength={2}
                        />
                        <TouchableOpacity onPress={() => adjust('hour', 1)} className="p-2 bg-gray-200"><Text>+</Text></TouchableOpacity>
                    </View>
                </View>
                <View className="items-center">
                    <Text className="text-xs text-gray-500">Minute</Text>
                    <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded">
                        <TouchableOpacity onPress={() => adjust('minute', -5)} className="p-2 bg-gray-200"><Text>--</Text></TouchableOpacity>
                        <TextInput
                            className="w-12 text-center p-1 bg-white text-black"
                            value={d.getMinutes().toString()}
                            keyboardType="numeric"
                            onChangeText={(v) => setField('minute', v)}
                            maxLength={2}
                        />
                        <TouchableOpacity onPress={() => adjust('minute', 5)} className="p-2 bg-gray-200"><Text>++</Text></TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
};

// --- ManageSportsSection Component ---
export const ManageSportsSection = ({
    sports,
    featured,
    onRefresh,
    loading,
    expanded,
    onToggle,
    activeOrgId
}: {
    sports: Sport[],
    featured: string[],
    onRefresh: () => void,
    loading: boolean,
    expanded: boolean,
    onToggle: () => void,
    activeOrgId: string | null
}) => {
    const [newSportName, setNewSportName] = useState('');
    const [newSportIcon, setNewSportIcon] = useState('volleyball');
    const [isSaving, setIsSaving] = useState(false);

    const handleAddSport = async () => {
        if (!newSportName.trim()) return;
        setIsSaving(true);
        try {
            await sportsService.addSport(newSportName.trim(), newSportIcon, activeOrgId);
            setNewSportName('');
            onRefresh();
            Alert.alert("Success", "Sport added");
        } catch (err: any) {
            Alert.alert("Error", err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const toggleFeatured = async (id: string) => {
        try {
            const isFeatured = featured.includes(id);
            const newFeatured = isFeatured
                ? featured.filter(f => f !== id)
                : [...featured, id];
            await sportsService.updateFeaturedSportIds(newFeatured);
            onRefresh();
        } catch (err: any) {
            Alert.alert("Error", err.message);
        }
    };

    const handleDeleteSport = async (id: string, name: string) => {
        const confirmDelete = async () => {
            try {
                await sportsService.deleteSport(id);
                onRefresh();
            } catch (err: any) {
                Alert.alert("Error", err.message);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm(`Delete ${name}?`)) confirmDelete();
        } else {
            Alert.alert("Delete Sport?", `Remove ${name} permanently?`, [
                { text: "Cancel" },
                { text: "DELETE", style: "destructive", onPress: confirmDelete }
            ]);
        }
    };

    return (
        <View
            className="bg-white p-4 rounded-lg mb-4 border border-gray-200"
            style={Platform.OS === 'web' ? { boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' } as any : {}}
        >
            <TouchableOpacity
                className="flex-row justify-between items-center"
                onPress={onToggle}
            >
                <View className="flex-row items-center flex-1 mr-2">
                    <MaterialCommunityIcons name="trophy-outline" size={20} color="#6B7280" style={{ marginRight: 8 }} />
                    <Text className="text-lg font-bold text-gray-800 flex-shrink" numberOfLines={1} adjustsFontSizeToFit>Manage Sports</Text>
                </View>
                <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={24} color="#6B7280" />
            </TouchableOpacity>

            {expanded && (
                <View className="mt-4 border-t border-gray-100 pt-4">
                    <View className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4">
                        <Text className="text-xs font-bold text-gray-400 mb-2 uppercase">Add New Sport</Text>
                        <View className="flex-row gap-2">
                            <TextInput
                                className="flex-1 bg-white border border-gray-200 rounded p-2 text-black"
                                placeholder="Sport Name"
                                value={newSportName}
                                onChangeText={setNewSportName}
                            />
                            <TextInput
                                className="w-24 bg-white border border-gray-200 rounded p-2 text-black"
                                placeholder="icon-name"
                                value={newSportIcon}
                                onChangeText={setNewSportIcon}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity
                                onPress={handleAddSport}
                                disabled={isSaving}
                                className="bg-blue-600 px-4 rounded justify-center"
                            >
                                {isSaving ? <ActivityIndicator size="small" color="white" /> : <Text className="text-white font-bold">ADD</Text>}
                            </TouchableOpacity>
                        </View>
                        <Text className="text-[8px] text-gray-400 mt-1">Use MaterialCommunityIcons names (e.g. basketball, soccer, tennis)</Text>
                    </View>

                    {loading ? <ActivityIndicator /> : (
                        <View className="gap-y-2">
                            {sports.map(sport => (
                                <View key={sport.id} className="flex-row items-center justify-between p-2 border-b border-gray-50">
                                    <View className="flex-row items-center gap-2">
                                        <MaterialCommunityIcons name={sport.icon as any || 'help'} size={18} color="#666" />
                                        <Text className="font-medium text-gray-700">{sport.name}</Text>
                                        {featured.includes(sport.id) && (
                                            <View className="bg-amber-100 px-1.5 py-0.5 rounded">
                                                <Text className="text-[8px] font-bold text-amber-700">FEATURED</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View className="flex-row gap-4">
                                        <TouchableOpacity onPress={() => toggleFeatured(sport.id)}>
                                            <MaterialCommunityIcons
                                                name={featured.includes(sport.id) ? "star" : "star-outline"}
                                                size={20}
                                                color={featured.includes(sport.id) ? "#F59E0B" : "#D1D5DB"}
                                            />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleDeleteSport(sport.id, sport.name)}>
                                            <MaterialCommunityIcons name="trash-can-outline" size={20} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            )}
        </View>
    );
};

// --- Poll Management Section Component (formerly ManageEventsSection) ---
export const ManageEventsSection = ({
    legacyMatchData,
    paymentZelle,
    paymentPaypal,
    currency,
    expanded,
    onToggle,
    activeOrgId
}: {
    legacyMatchData: WeeklySlotData | null,
    paymentZelle: string,
    paymentPaypal: string,
    currency: string,
    expanded: boolean,
    onToggle: () => void,
    activeOrgId: string | null
}) => {
    const [eventsList, setEventsList] = useState<GameEvent[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(false);
    const [creatingEvent, setCreatingEvent] = useState(false);
    const [isFormVisible, setIsFormVisible] = useState(false); // Toggle the creator form

    // Form state
    const [selectedSportId, setSelectedSportId] = useState('');
    const [selectedSportName, setSelectedSportName] = useState('');
    const [selectedSportIcon, setSelectedSportIcon] = useState('');
    const [gameDate, setGameDate] = useState(new Date(Date.now() + 86400000).toISOString());
    const [vOpensAt, setVOpensAt] = useState(getVotingStartForDate(new Date(Date.now() + 86400000)).toISOString());
    const [vClosesAt, setVClosesAt] = useState(new Date(Date.now() + 172800000).toISOString());
    const [eMaxSlots, setEMaxSlots] = useState('14');
    const [eMaxWaitlist, setEMaxWaitlist] = useState('4');
    const [eLocation, setELocation] = useState('Beach at Craig Ranch');
    const [eFees, setEFees] = useState('0');
    const [eZelle, setEZelle] = useState(paymentZelle || '');
    const [ePaypal, setEPaypal] = useState(paymentPaypal || '');
    const [editingEventId, setEditingEventId] = useState<string | null>(null);

    const [sportsList, setSportsList] = useState<Sport[]>([]);

    const fetchInitialData = async () => {
        setLoadingEvents(true);
        try {
            const [events, sports] = await Promise.all([
                eventService.getAllUpcomingEvents(activeOrgId),
                sportsService.getAllSports(activeOrgId)
            ]);
            setEventsList(events);
            setSportsList(sports);
        } catch (err) {
            console.error("Failed to fetch events data", err);
        } finally {
            setLoadingEvents(false);
        }
    };

    useEffect(() => {
        if (expanded) fetchInitialData();
    }, [expanded]);

    const resetForm = () => {
        setEditingEventId(null);
        setSelectedSportId('');
        setSelectedSportName('');
        setSelectedSportIcon('');
        setEMaxSlots('14');
        setEMaxWaitlist('4');
        setELocation('Beach at Craig Ranch');
        setEFees('0');
        setEZelle(paymentZelle || '');
        setEPaypal(paymentPaypal || '');
        setIsFormVisible(false);
    };

    const handleCreateEvent = async () => {
        if (!selectedSportId) {
            Alert.alert("Error", "Please select a sport");
            return;
        }

        const doCreate = async () => {
            setCreatingEvent(true);
            try {
                const eventPayload: any = {
                    orgId: activeOrgId || 'default',
                    sportId: selectedSportId,
                    sportName: selectedSportName,
                    sportIcon: selectedSportIcon,
                    eventDate: new Date(gameDate).getTime(),
                    votingOpensAt: new Date(vOpensAt).getTime(),
                    votingClosesAt: new Date(vClosesAt).getTime(),
                    maxSlots: parseInt(eMaxSlots) || 14,
                    maxWaitlist: parseInt(eMaxWaitlist) || 4,
                    isOpen: true,
                    status: 'scheduled',
                    location: eLocation,
                    fees: parseFloat(eFees) || 0,
                    participantIds: [],
                    paymentDetails: {
                        zelle: eZelle,
                        paypal: ePaypal
                    },
                    currency: currency
                };

                if (editingEventId) {
                    const { doc, updateDoc } = await import('firebase/firestore');
                    await updateDoc(doc(db, 'events', editingEventId), eventPayload);
                    Alert.alert("Success", "Poll Updated!");
                } else {
                    await eventService.createEvent(eventPayload);
                    Alert.alert("Success", "Poll Created!");
                }

                resetForm();
                fetchInitialData();
            } catch (err: any) {
                Alert.alert("Error", err.message);
            } finally {
                setCreatingEvent(false);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm(editingEventId ? "Update this poll?" : "Create this new poll?")) doCreate();
        } else {
            Alert.alert(
                editingEventId ? "Update Poll?" : "Create Poll?",
                editingEventId ? "Save changes?" : "Confirm creation?",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: editingEventId ? "UPDATE" : "CREATE", onPress: doCreate }
                ]
            );
        }
    };

    const handleEdit = (event: GameEvent) => {
        setEditingEventId(event.id || null);
        setSelectedSportId(event.sportId);
        setSelectedSportName(event.sportName);
        setSelectedSportIcon(event.sportIcon || 'soccer');
        setGameDate(new Date(event.eventDate).toISOString());
        setVOpensAt(new Date(event.votingOpensAt).toISOString());
        setVClosesAt(new Date(event.votingClosesAt).toISOString());
        setEMaxSlots(event.maxSlots.toString());
        setEMaxWaitlist(event.maxWaitlist.toString());
        setELocation(event.location);
        setEFees(event.fees?.toString() || '0');
        setEZelle(event.paymentDetails?.zelle || '');
        setEPaypal(event.paymentDetails?.paypal || '');
        setIsFormVisible(true);
    };

    const handleToggleCancel = async (event: GameEvent) => {
        const isCancelling = !event.isCancelled;
        const doToggle = async (reason?: string) => {
            try {
                await eventService.cancelEvent(event.id!, isCancelling, reason);
                fetchInitialData();
            } catch (err: any) {
                Alert.alert("Error", err.message);
            }
        };

        if (isCancelling) {
            if (Platform.OS === 'web') {
                const reason = window.prompt("Reason for cancellation (optional):", "Weather conditions");
                if (reason !== null) doToggle(reason);
            } else {
                Alert.prompt("Cancel Poll", "Enter a reason (optional):", [
                    { text: "Abort", style: "cancel" },
                    { text: "Cancel Poll", style: "destructive", onPress: (text?: string) => doToggle(text) }
                ]);
            }
        } else {
            if (Platform.OS === 'web') {
                if (window.confirm("Restore this poll?")) doToggle();
            } else {
                Alert.alert("Restore Poll", "Make this match active again?", [
                    { text: "No", style: "cancel" },
                    { text: "Yes", onPress: () => doToggle() }
                ]);
            }
        }
    };

    const handleDelete = async (eventId: string) => {
        const doDelete = async () => {
            try {
                await eventService.deleteEvent(eventId);
                Alert.alert("Success", "Poll Deleted permanently.");
                fetchInitialData();
            } catch (err: any) {
                Alert.alert("Error", err.message);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm("Permanently delete this poll? This cannot be undone.")) doDelete();
        } else {
            Alert.alert("Delete Poll?", "Are you sure you want to permanently delete this poll?", [
                { text: "Cancel", style: "cancel" },
                { text: "DELETE", style: "destructive", onPress: doDelete }
            ]);
        }
    };

    return (
        <View
            className="bg-white p-4 rounded-lg mb-4 border border-gray-200"
            style={Platform.OS === 'web' ? { boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' } as any : {}}
        >
            <TouchableOpacity className="flex-row justify-between items-center" onPress={onToggle}>
                <View className="flex-row items-center flex-1 mr-2">
                    <MaterialCommunityIcons name="calendar-check" size={20} color="#6B7280" style={{ marginRight: 8 }} />
                    <Text className="text-lg font-bold text-gray-800 flex-shrink" numberOfLines={1} adjustsFontSizeToFit>Poll Management</Text>
                </View>
                <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={24} color="#6B7280" />
            </TouchableOpacity>

            {expanded && (
                <View className="mt-4 border-t border-gray-100 pt-4">

                    {/* Active Polls List */}
                    <View className="mb-6">
                        <View className="flex-row justify-between items-center mb-3">
                            <Text className="text-sm font-bold text-gray-800 uppercase tracking-wide">Active Polls</Text>
                            {!isFormVisible && (
                                <TouchableOpacity onPress={() => setIsFormVisible(true)} className="bg-primary/20 px-3 py-1.5 rounded-full border border-primary/50 flex-row items-center">
                                    <MaterialCommunityIcons name="plus" size={14} color="#008080" style={{ marginRight: 2 }} />
                                    <Text className="text-xs font-bold text-teal-700">New Poll</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {loadingEvents ? <ActivityIndicator className="my-4" /> : (
                            <View className="gap-y-3">
                                {/* 1. DEFAULT MATCH (LEGACY) */}
                                {legacyMatchData && (
                                    <View className="bg-blue-50 border border-blue-200 p-3 rounded-xl shadow-sm mb-1">
                                        <View className="flex-row items-center justify-between mb-2">
                                            <View className="flex-row items-center gap-2">
                                                <MaterialCommunityIcons name={legacyMatchData.sportIcon as any || 'volleyball'} size={20} color="#2563eb" />
                                                <Text className="font-bold text-gray-800">
                                                    {legacyMatchData.displayDay || 'Saturday'} Weekly {legacyMatchData.sportName || 'Sport'} Match
                                                </Text>
                                                <View className="bg-blue-600/10 px-2 py-0.5 rounded ml-1">
                                                    <Text className="text-blue-600 text-[8px] font-black uppercase tracking-wider">RECURRING</Text>
                                                </View>
                                            </View>
                                            <View className={`px-2 py-0.5 rounded-full ${legacyMatchData.isCancelled ? 'bg-red-100' : (legacyMatchData.isOpen ? 'bg-green-100' : 'bg-gray-200')}`}>
                                                <Text className={`text-[10px] font-bold ${legacyMatchData.isCancelled ? 'text-red-700' : (legacyMatchData.isOpen ? 'text-green-700' : 'text-gray-600 uppercase')}`}>
                                                    {legacyMatchData.isCancelled ? 'CANCELLED' : (legacyMatchData.isOpen ? 'LIVE' : 'SCHEDULED')}
                                                </Text>
                                            </View>
                                        </View>
                                        <View className="flex-row items-center mb-1">
                                            <MaterialCommunityIcons name="calendar-clock" size={12} color="#4B5563" style={{ marginRight: 4 }} />
                                            <Text className="text-xs text-gray-600">Every {legacyMatchData.displayDay || 'Saturday'} @ {legacyMatchData.displayTime || '7:00 AM'}</Text>
                                        </View>
                                        {legacyMatchData.isCancelled && (
                                            <View className="mt-2 bg-red-50 p-2 rounded border border-red-100">
                                                <Text className="text-red-700 text-xs font-bold italic">
                                                    Reason: {legacyMatchData.cancelReason || 'No reason provided.'}
                                                </Text>
                                            </View>
                                        )}
                                        <Text className="text-[10px] text-blue-600/70 italic mt-2 text-right">Settings synchronized with Regular Match Setup section below</Text>
                                    </View>
                                )}

                                {/* 2. CUSTOM EVENTS */}
                                {eventsList.length === 0 && !legacyMatchData ? (
                                    <View className="bg-gray-50 p-4 rounded-lg items-center border border-gray-200 border-dashed">
                                        <Text className="text-gray-500 italic text-xs">No upcoming polls. Create one below.</Text>
                                    </View>
                                ) : (
                                    eventsList.map(event => (
                                        <View key={event.id} className={`p-4 rounded-lg border mb-3 ${event.isCancelled ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200 shadow-sm'}`}>
                                            <View className="flex-row justify-between items-start mb-2">
                                                <View className="flex-1">
                                                    <View className="flex-row items-center mb-1">
                                                        <MaterialCommunityIcons name={event.sportIcon as any} size={16} color={event.isCancelled ? "#EF4444" : "#10B981"} style={{ marginRight: 6 }} />
                                                        <Text className={`font-bold text-[14px] ${event.isCancelled ? 'text-red-700' : 'text-gray-800'}`}>{event.sportName} Match</Text>
                                                        {event.isCancelled && <Text className="text-red-600 text-[10px] font-black italic ml-2">(CANCELLED)</Text>}
                                                    </View>
                                                    <Text className="text-gray-600 text-xs mb-1">📅 Game: {formatInCentralTime(event.eventDate, 'MMM do, h:mm a')}</Text>
                                                    <Text className="text-gray-500 text-[10px]">📍 {event.location} • {event.slots?.length || 0}/{event.maxSlots} Players</Text>
                                                </View>

                                                <View className="flex-row gap-x-2">
                                                    <TouchableOpacity onPress={() => handleEdit(event)} className="bg-blue-50 p-2 rounded-full border border-blue-200">
                                                        <MaterialCommunityIcons name="pencil" size={14} color="#3B82F6" />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity onPress={() => handleToggleCancel(event)} className={`${event.isCancelled ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'} p-2 rounded-full border`}>
                                                        <MaterialCommunityIcons name={event.isCancelled ? "restore" : "cancel"} size={14} color={event.isCancelled ? "#10B981" : "#F97316"} />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity onPress={() => handleDelete(event.id!)} className="bg-red-50 p-2 rounded-full border border-red-200">
                                                        <MaterialCommunityIcons name="trash-can" size={14} color="#EF4444" />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                            <View className="bg-gray-50 p-2 rounded mt-1 border border-gray-100 flex-row justify-between">
                                                <Text className="text-[10px] text-gray-500 font-bold">Opens: {formatInCentralTime(event.votingOpensAt, 'MMM d, ha')}</Text>
                                                <Text className="text-[10px] text-gray-500 font-bold">Closes: {formatInCentralTime(event.votingClosesAt, 'MMM d, ha')}</Text>
                                            </View>
                                        </View>
                                    ))
                                )}
                            </View>
                        )}
                    </View>

                    {/* Poll Creator/Editor Form */}
                    {isFormVisible && (
                        <View className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm relative">
                            <View className="flex-row justify-between items-center mb-4 pb-2 border-b border-gray-200">
                                <Text className="text-md font-bold text-gray-800">{editingEventId ? `Editing Poll: ${selectedSportName}` : 'Create New Poll'}</Text>
                                <TouchableOpacity onPress={resetForm} className="bg-gray-200 rounded-full p-1">
                                    <MaterialCommunityIcons name="close" size={16} color="#4B5563" />
                                </TouchableOpacity>
                            </View>

                            {/* Form Input Container */}
                            <View className="space-y-4">

                                {/* Sport Selector (Only shown if creating new to prevent accidental type change) */}
                                {!editingEventId && (
                                    <View>
                                        <Text className="text-xs font-bold text-gray-600 mb-1">Select Sport / Interest</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2 max-h-12">
                                            <View className="flex-row gap-2 pb-2">
                                                {sportsList.map(sport => (
                                                    <TouchableOpacity
                                                        key={sport.id}
                                                        onPress={() => {
                                                            setSelectedSportId(sport.id);
                                                            setSelectedSportName(sport.name);
                                                            setSelectedSportIcon(sport.icon || 'soccer');
                                                        }}
                                                        className={`px-3 py-1.5 rounded-full border flex-row items-center ${selectedSportId === sport.id ? 'bg-blue-600 border-blue-600 shadow-sm' : 'bg-white border-gray-300'}`}
                                                    >
                                                        <MaterialCommunityIcons name={sport.icon as any || 'help'} size={14} color={selectedSportId === sport.id ? 'white' : '#666'} style={{ marginRight: 4 }} />
                                                        <Text className={`text-xs ${selectedSportId === sport.id ? 'text-white font-bold' : 'text-gray-700'}`}>{sport.name}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        </ScrollView>
                                    </View>
                                )}

                                {/* Location */}
                                <View>
                                    <Text className="text-xs font-bold text-gray-600 mb-1">Location</Text>
                                    <TextInput
                                        className="bg-white border border-gray-200 shadow-sm rounded p-3 text-black"
                                        value={eLocation}
                                        onChangeText={setELocation}
                                        placeholder="e.g. Center Court, Beach, etc."
                                    />
                                </View>

                                {/* Timeline Grid */}
                                <View className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                    <Text className="text-sm font-bold text-blue-600 mb-3 border-b border-gray-100 pb-1">Game Time (When they play)</Text>
                                    <DateSelector dateStr={gameDate} onChange={setGameDate} />
                                </View>

                                <View className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                    <Text className="text-sm font-bold text-green-600 mb-3 border-b border-gray-100 pb-1">Voting Opens (When they can join)</Text>
                                    <DateSelector dateStr={vOpensAt} onChange={setVOpensAt} />
                                </View>

                                <View className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                    <Text className="text-sm font-bold text-red-600 mb-3 border-b border-gray-100 pb-1">Voting Closes</Text>
                                    <DateSelector dateStr={vClosesAt} onChange={setVClosesAt} />
                                </View>

                                {/* Capacity & Fees */}
                                <View className="flex-row gap-2">
                                    <View className="flex-1">
                                        <Text className="text-xs font-bold text-gray-600 mb-1">Max Slots</Text>
                                        <TextInput
                                            className="bg-white border border-gray-200 rounded shadow-sm p-3 text-black text-center"
                                            value={eMaxSlots}
                                            onChangeText={setEMaxSlots}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-xs font-bold text-gray-600 mb-1">Waitlist</Text>
                                        <TextInput
                                            className="bg-white border border-gray-200 rounded shadow-sm p-3 text-black text-center"
                                            value={eMaxWaitlist}
                                            onChangeText={setEMaxWaitlist}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-xs font-bold text-gray-600 mb-1">Fees</Text>
                                        <TextInput
                                            className="bg-white border border-gray-200 rounded shadow-sm p-3 text-black text-center"
                                            value={eFees}
                                            onChangeText={setEFees}
                                            keyboardType="decimal-pad"
                                        />
                                    </View>
                                </View>

                                {/* Submit Button */}
                                <TouchableOpacity
                                    onPress={handleCreateEvent}
                                    disabled={creatingEvent}
                                    className={`mt-4 p-4 rounded-xl items-center shadow-sm ${editingEventId ? 'bg-blue-600' : 'bg-green-600'}`}
                                >
                                    {creatingEvent ? <ActivityIndicator color="white" /> : (
                                        <Text className="text-white font-black uppercase text-sm tracking-wide">{editingEventId ? 'Save Poll Changes' : 'Publish New Poll'}</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            )
            }
        </View >
    );
};

// --- FinancialDashboard Component ---
export const FinancialDashboard = ({
    opMatchData,
    activeMatchId,
    isLegacy,
    showFinancials,
    fees,
    setShowFinancials
}: {
    opMatchData: any,
    activeMatchId: string,
    isLegacy: boolean,
    showFinancials: boolean,
    fees: string,
    setShowFinancials: (show: boolean) => void
}) => {
    const [verifyingPayment, setVerifyingPayment] = useState<string | null>(null);

    const handleVerify = async (userId: string) => {
        setVerifyingPayment(userId);
        try {
            const containerId = isLegacy ? getScanningGameId() : activeMatchId;
            await votingService.verifyPayment(containerId, userId, isLegacy);
            if (Platform.OS === 'web') window.alert("Payment verified!");
            else Alert.alert("Success", "Payment verified!");
        } catch (err: any) {
            console.error("Failed to verify payment", err);
            if (Platform.OS === 'web') window.alert(`Error: ${err.message}`);
            else Alert.alert("Error", err.message);
        } finally {
            setVerifyingPayment(null);
        }
    };

    const slots = opMatchData?.slots || [];
    const matchFees = opMatchData?.fees !== undefined ? parseFloat(opMatchData.fees.toString()) : (parseFloat(fees) || 0);
    const matchCurrency = opMatchData?.currency || (isLegacy ? 'USD' : ''); // Try match level currency, fallback to global if legacy
    const totalExpected = slots.length * matchFees;
    const totalPaid = slots.filter((s: any) => s.paid).length * matchFees;
    const totalVerified = slots.filter((s: any) => s.paidVerified).length * matchFees;
    const symbol = getCurrencySymbol(matchCurrency || 'USD');

    return (
        <View
            className="bg-white p-4 rounded-lg mb-4 border border-gray-200"
            style={Platform.OS === 'web' ? { boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' } as any : {}}
        >
            <TouchableOpacity
                className="flex-row justify-between items-center"
                onPress={() => setShowFinancials(!showFinancials)}
            >
                <View className="flex-row items-center flex-1 mr-2">
                    <MaterialCommunityIcons name="finance" size={20} color="#6B7280" style={{ marginRight: 8 }} />
                    <Text className="text-lg font-bold text-gray-800 flex-shrink" numberOfLines={1} adjustsFontSizeToFit>Financial Tracking</Text>
                </View>
                <MaterialCommunityIcons name={showFinancials ? 'chevron-up' : 'chevron-down'} size={24} color="#6B7280" />
            </TouchableOpacity>

            {showFinancials && (
                <View className="mt-4 border-t border-gray-100 pt-4">
                    <View className="flex-row justify-between items-center mb-4">
                        <View className="flex-row items-center">
                            <MaterialCommunityIcons name="cash-register" size={20} color="#22C55E" style={{ marginRight: 8 }} />
                            <Text className="text-base font-bold text-gray-700">Earnings Summary</Text>
                        </View>
                        <View className="bg-green-100 px-3 py-1 rounded-full">
                            <Text className="text-green-700 font-bold text-xs">{symbol}{totalVerified.toFixed(2)} Verified</Text>
                        </View>
                    </View>

                    <View className="flex-row gap-2 mb-6">
                        <View className="flex-1 bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <Text className="text-[10px] font-bold text-gray-400 uppercase mb-1">Expected</Text>
                            <Text className="text-lg font-bold text-gray-800">{symbol}{totalExpected.toFixed(2)}</Text>
                        </View>
                        <View className="flex-1 bg-blue-50 p-3 rounded-xl border border-blue-100">
                            <Text className="text-[10px] font-bold text-blue-400 uppercase mb-1">Paid (Self)</Text>
                            <Text className="text-lg font-bold text-blue-800">{symbol}{totalPaid.toFixed(2)}</Text>
                        </View>
                        <View className="flex-1 bg-green-50 p-3 rounded-xl border border-green-100">
                            <Text className="text-[10px] font-bold text-green-400 uppercase mb-1">Verified</Text>
                            <Text className="text-lg font-bold text-green-800">{symbol}{totalVerified.toFixed(2)}</Text>
                        </View>
                    </View>

                    <Text className="font-bold text-gray-700 mb-3 ml-1">Payment Verification</Text>
                    {slots.length === 0 ? (
                        <Text className="text-center py-4 text-gray-400 italic">No players joined yet</Text>
                    ) : (
                        <View className="gap-y-2">
                            {slots.map((player: any) => (
                                <View key={player.userId} className="flex-row items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <View>
                                        <Text className="font-bold text-gray-800">{player.userName}</Text>
                                        <View className="flex-row gap-2 items-center">
                                            <View className={`w-2 h-2 rounded-full ${player.paid ? 'bg-blue-500' : 'bg-gray-300'}`} />
                                            <Text className="text-[10px] text-gray-500">{player.paid ? 'Paid Self-Reported' : 'Unpaid'}</Text>
                                        </View>
                                    </View>

                                    {player.paidVerified ? (
                                        <View className="flex-row items-center gap-1 bg-green-100 px-3 py-1.5 rounded-lg">
                                            <MaterialCommunityIcons name="check-decagram" size={14} color="#166534" />
                                            <Text className="text-xs font-bold text-green-700 uppercase">Verified</Text>
                                        </View>
                                    ) : (
                                        <TouchableOpacity
                                            onPress={() => handleVerify(player.userId)}
                                            disabled={verifyingPayment === player.userId}
                                            className={`px-4 py-2 rounded-lg flex-row items-center gap-2 ${player.paid ? 'bg-green-600' : 'bg-gray-200'}`}
                                        >
                                            {verifyingPayment === player.userId ? <ActivityIndicator size="small" color="white" /> : (
                                                <>
                                                    <MaterialCommunityIcons name="shield-check" size={14} color={player.paid ? 'white' : '#666'} />
                                                    <Text className={`text-xs font-bold ${player.paid ? 'text-white' : 'text-gray-600'}`}>VERIFY</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            )}
        </View>
    );
};
