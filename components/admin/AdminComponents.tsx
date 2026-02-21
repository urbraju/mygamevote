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

// --- ManageEventsSection Component ---
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

    const handleCreateEvent = async () => {
        if (!selectedSportId) {
            Alert.alert("Error", "Please select a sport");
            return;
        }

        const doCreate = async () => {
            setCreatingEvent(true);
            try {
                // Diagnostic logging
                console.log('[ManageEventsSection] handleCreateEvent. editingEventId:', editingEventId);
                console.log('[ManageEventsSection] Saving event with location:', eLocation);

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
                    Alert.alert("Success", "Match Updated!");
                } else {
                    await eventService.createEvent(eventPayload);
                    Alert.alert("Success", "Match Scheduled!");
                }

                setEditingEventId(null);
                fetchInitialData();
            } catch (err: any) {
                Alert.alert("Error", err.message);
            } finally {
                setCreatingEvent(false);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm(editingEventId ? "Update this match?" : "Schedule this new match?")) doCreate();
        } else {
            Alert.alert(
                editingEventId ? "Update Match?" : "Schedule Match?",
                editingEventId ? "Save changes to this match?" : "Confirm scheduling this match?",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: editingEventId ? "UPDATE" : "SCHEDULE", onPress: doCreate }
                ]
            );
        }
    };

    const handleEdit = (event: GameEvent) => {
        setEditingEventId(event.id || null);
        setSelectedSportId(event.sportId);
        setSelectedSportName(event.sportName);
        setSelectedSportIcon(event.sportIcon);
        setGameDate(new Date(event.eventDate).toISOString());
        setVOpensAt(new Date(event.votingOpensAt).toISOString());
        setVClosesAt(new Date(event.votingClosesAt).toISOString());
        setEMaxSlots(event.maxSlots.toString());
        setEMaxWaitlist(event.maxWaitlist.toString());
        setELocation(event.location);
        setEFees(event.fees?.toString() || '0');
        setEZelle(event.paymentDetails?.zelle || '');
        setEPaypal(event.paymentDetails?.paypal || '');
    };

    const handleDelete = async (eventId: string) => {
        const doDelete = async () => {
            try {
                await eventService.deleteEvent(eventId);
                Alert.alert("Success", "Match Deleted");
                fetchInitialData();
            } catch (err: any) {
                Alert.alert("Error", err.message);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm("DANGER: Delete this match? This cannot be undone.")) doDelete();
        } else {
            Alert.alert("Delete Match?", "This cannot be undone.", [
                { text: "Cancel" },
                { text: "DELETE", style: "destructive", onPress: doDelete }
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
                    <MaterialCommunityIcons name="calendar-multiselect" size={20} color="#6B7280" style={{ marginRight: 8 }} />
                    <Text className="text-lg font-bold text-gray-800 flex-shrink" numberOfLines={1} adjustsFontSizeToFit>Custom Events</Text>
                </View>
                <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={24} color="#6B7280" />
            </TouchableOpacity>

            {expanded && (
                <View className="mt-4 border-t border-gray-100 pt-4">
                    <View className="mb-6 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="font-bold text-blue-800 text-center flex-1">{editingEventId ? "Edit Match" : "Schedule New Match"}</Text>
                            {editingEventId && (
                                <TouchableOpacity onPress={() => setEditingEventId(null)} className="p-1">
                                    <MaterialCommunityIcons name="close-circle" size={20} color="#6B7280" />
                                </TouchableOpacity>
                            )}
                        </View>

                        <Text className="text-xs font-bold text-gray-500 mb-1">SELECT SPORT</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 mb-4">
                            {sportsList.map(sport => (
                                <TouchableOpacity
                                    key={sport.id}
                                    onPress={() => {
                                        setSelectedSportId(sport.id);
                                        setSelectedSportName(sport.name);
                                        setSelectedSportIcon(sport.icon);
                                    }}
                                    className={`px-4 py-2 rounded-full border ${selectedSportId === sport.id ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'} flex-row items-center gap-2`}
                                >
                                    <MaterialCommunityIcons name={sport.icon as any || 'help'} size={16} color={selectedSportId === sport.id ? 'white' : '#666'} />
                                    <Text className={selectedSportId === sport.id ? 'text-white font-bold' : 'text-gray-600'}>{sport.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text className="text-xs font-bold text-gray-500 mb-1">GAME DATE</Text>
                        <DateSelector dateStr={gameDate} onChange={setGameDate} />

                        <View className="h-4" />
                        <Text className="text-xs font-bold text-gray-500 mb-1">VOTING OPENS</Text>
                        <DateSelector dateStr={vOpensAt} onChange={setVOpensAt} />

                        <View className="h-4" />
                        <Text className="text-xs font-bold text-gray-500 mb-1">LOCATION & LIMITS</Text>
                        <TextInput
                            className="bg-white border border-gray-200 rounded-lg p-3 mb-2 text-black"
                            placeholder="Location (e.g. Craig Ranch)"
                            value={eLocation}
                            onChangeText={setELocation}
                        />
                        <View className="flex-row gap-2 mb-4">
                            <View className="flex-1">
                                <Text className="text-[10px] text-gray-400 ml-1">MAX SLOTS</Text>
                                <TextInput
                                    className="bg-white border border-gray-200 rounded-lg p-3 text-black"
                                    keyboardType="numeric"
                                    value={eMaxSlots}
                                    onChangeText={setEMaxSlots}
                                />
                            </View>
                            <View className="flex-1">
                                <Text className="text-[10px] text-gray-400 ml-1">MAX WAITLIST</Text>
                                <TextInput
                                    className="bg-white border border-gray-200 rounded-lg p-3 text-black"
                                    keyboardType="numeric"
                                    value={eMaxWaitlist}
                                    onChangeText={setEMaxWaitlist}
                                />
                            </View>
                        </View>

                        <Text className="text-xs font-bold text-gray-500 mb-1 uppercase">Payment Details (Optional Overrides)</Text>
                        <TextInput
                            className="bg-white border border-gray-200 rounded-lg p-3 mb-2 text-black"
                            placeholder={`Zelle (default: ${paymentZelle})`}
                            value={eZelle}
                            onChangeText={setEZelle}
                        />
                        <TextInput
                            className="bg-white border border-gray-200 rounded-lg p-3 mb-4 text-black"
                            placeholder={`PayPal (default: ${paymentPaypal})`}
                            value={ePaypal}
                            onChangeText={setEPaypal}
                        />

                        <TouchableOpacity
                            onPress={handleCreateEvent}
                            disabled={creatingEvent}
                            className={`bg-blue-600 p-4 rounded-xl items-center shadow-lg ${creatingEvent ? 'opacity-50' : ''}`}
                        >
                            {creatingEvent ? <ActivityIndicator color="white" /> : (
                                <Text className="text-white font-bold text-lg">{editingEventId ? "UPDATE MATCH" : "SCHEDULE MATCH"}</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Existing Events List */}
                    <Text className="font-bold text-gray-700 mb-2">Upcoming Matches</Text>
                    {loadingEvents ? <ActivityIndicator /> : (
                        <View className="gap-y-3">
                            {/* 1. DEFAULT MATCH (LEGACY) */}
                            {legacyMatchData && (
                                <View className="bg-blue-50 border border-blue-200 p-3 rounded-xl mb-3 shadow-sm">
                                    <View className="flex-row items-center justify-between mb-2">
                                        <View className="flex-row items-center gap-2">
                                            <MaterialCommunityIcons name={legacyMatchData.sportIcon as any || 'volleyball'} size={20} color="#2563eb" />
                                            <Text className="font-bold text-gray-800">{legacyMatchData.sportName} (Default Match)</Text>
                                        </View>
                                        <View className={`px-2 py-0.5 rounded-full ${legacyMatchData.isCancelled ? 'bg-red-100' : (legacyMatchData.isOpen ? 'bg-green-100' : 'bg-gray-200')}`}>
                                            <Text className={`text-[10px] font-bold ${legacyMatchData.isCancelled ? 'text-red-700' : (legacyMatchData.isOpen ? 'text-green-700' : 'text-gray-600 uppercase')}`}>
                                                {legacyMatchData.isCancelled ? 'CANCELLED' : (legacyMatchData.isOpen ? 'LIVE' : 'SCHEDULED')}
                                            </Text>
                                        </View>
                                    </View>
                                    {legacyMatchData.isCancelled && (
                                        <View className="mb-2 bg-red-50 p-2 rounded border border-red-100">
                                            <Text className="text-red-700 text-xs font-bold italic">
                                                Reason: {legacyMatchData.cancelReason || 'No reason provided.'}
                                            </Text>
                                        </View>
                                    )}
                                    <Text className="text-xs text-gray-600 mb-1">
                                        <MaterialCommunityIcons name="calendar-clock" size={12} /> Every {legacyMatchData.displayDay || 'Saturday'} @ {legacyMatchData.displayTime || '7:00 AM'}
                                    </Text>
                                    <Text className="text-xs text-blue-600 italic">Manage this in the 'Game Configuration' section below.</Text>
                                </View>
                            )}

                            {/* 2. CUSTOM EVENTS */}
                            {eventsList.map(event => (
                                <View key={event.id} className="bg-gray-50 border border-gray-100 p-3 rounded-xl">
                                    <View className="flex-row items-center justify-between mb-2">
                                        <View className="flex-row items-center gap-2">
                                            <MaterialCommunityIcons name={event.sportIcon as any || 'help'} size={20} color="#2563eb" />
                                            <Text className="font-bold text-gray-800">{event.sportName}</Text>
                                        </View>
                                        <View className={`px-2 py-0.5 rounded-full ${event.status === 'open' ? 'bg-green-100' : 'bg-gray-200'}`}>
                                            <Text className={`text-[10px] font-bold ${event.status === 'open' ? 'text-green-700' : 'text-gray-600 uppercase'}`}>{event.status}</Text>
                                        </View>
                                    </View>
                                    <Text className="text-xs text-gray-600 mb-1">
                                        <MaterialCommunityIcons name="clock-outline" size={12} /> {formatInCentralTime(event.eventDate, 'eee, MMM do, h:mm a')}
                                    </Text>
                                    <Text className="text-xs text-gray-600 mb-2">
                                        <MaterialCommunityIcons name="map-marker-outline" size={12} /> {event.location}
                                    </Text>

                                    <View className="flex-row gap-2 mt-2 pt-2 border-t border-gray-200">
                                        <TouchableOpacity
                                            onPress={() => handleEdit(event)}
                                            className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg flex-1 items-center flex-row justify-center gap-1"
                                        >
                                            <MaterialCommunityIcons name="pencil" size={14} color="#6B7280" />
                                            <Text className="text-xs font-bold text-gray-600">EDIT</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => handleDelete(event.id!)}
                                            className="bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg flex-1 items-center flex-row justify-center gap-1"
                                        >
                                            <MaterialCommunityIcons name="trash-can" size={14} color="#EF4444" />
                                            <Text className="text-xs font-bold text-red-600">CANCEL</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={async () => {
                                                try {
                                                    const nextStatus = event.status === 'open' ? 'closed' : 'open';
                                                    await votingService.updateEventStatus(event.id!, nextStatus);
                                                    Alert.alert("Success", `Voting is now ${nextStatus.toUpperCase()}!`);
                                                } catch (err: any) {
                                                    Alert.alert("Error", err.message);
                                                }
                                            }}
                                            className={`px-4 py-1.5 rounded-lg flex-[1.5] items-center ${event.status === 'open' ? 'bg-amber-100 border border-amber-200' : 'bg-blue-100 border border-blue-200'}`}
                                        >
                                            <Text className={`text-xs font-bold ${event.status === 'open' ? 'text-amber-800' : 'text-blue-800'}`}>
                                                {event.status === 'open' ? 'CLOSE VOTING' : 'OPEN VOTING'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                            {eventsList.length === 0 && !legacyMatchData && <Text className="text-gray-400 italic text-center py-4">No matches scheduled.</Text>}
                        </View>
                    )}
                </View>
            )}
        </View>
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
