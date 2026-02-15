/**
 * Admin Dashboard
 * 
 * Provides administrative controls for the game slots. Allows admins to:
 * - Configure game settings (Max slots, Waitlist limit, Voting time).
 * - Enable/Disable payments and set payment details.
 * - Manage players (Remove users, which auto-promotes waitlisted users).
 */
import React, { useEffect, useState } from 'react';
import { View, Text, Switch, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, Linking, ActivityIndicator } from 'react-native';
import { db } from '../../firebaseConfig';
import { adminService } from '../../services/adminService';
import { authService } from '../../services/authService';
import { votingService, WeeklySlotData, SlotUser } from '../../services/votingService';
import { sportsService, Sport } from '../../services/sportsService';
import { eventService, GameEvent } from '../../services/eventService';
import { useAuth } from '../../context/AuthContext';
import { Stack, useRouter } from 'expo-router';
import { getScanningGameId, getVotingStartTime, getCentralTime, formatInCentralTime, getNextGameDate, getVotingStartForDate, getMillis } from '../../utils/dateUtils';
import { generateWhatsAppLink } from '../../utils/shareUtils';
import { format } from 'date-fns';
import { Timestamp, doc, onSnapshot } from 'firebase/firestore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SystemHealthCheck from '../../components/SystemHealthCheck';

export default function AdminScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [legacyMatchData, setLegacyMatchData] = useState<WeeklySlotData | null>(null);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [maxSlots, setMaxSlots] = useState('14');
    const [maxWaitlist, setMaxWaitlist] = useState('4');
    const [votingOpenDate, setVotingOpenDate] = useState('');
    const [votingCloseDate, setVotingCloseDate] = useState('');
    const [fees, setFees] = useState('0');
    const [adminPhoneNumber, setAdminPhoneNumber] = useState('');
    const [isAdminPhoneEnabled, setIsAdminPhoneEnabled] = useState(false);
    const [isCustomSlotsEnabled, setIsCustomSlotsEnabled] = useState(false);
    // Next Game Overrides
    const [isOverrideEnabled, setIsOverrideEnabled] = useState(false);
    const [isCustomVotingWindowEnabled, setIsCustomVotingWindowEnabled] = useState(false);
    const [nextGameDateOverride, setNextGameDateOverride] = useState('');
    const [nextGameDetailsOverride, setNextGameDetailsOverride] = useState('');
    const [sportNameOverride, setSportNameOverride] = useState('');
    const [sportIconOverride, setSportIconOverride] = useState('');
    const [locationOverride, setLocationOverride] = useState('');

    // Approval Settings
    const [requireApproval, setRequireApproval] = useState(false);

    // Navigation State
    const [activeTab, setActiveTab] = useState<'ops' | 'setup' | 'users' | 'system'>('ops');

    // Promoted Operations State
    const [activeMatchId, setActiveMatchId] = useState<string>('legacy');
    const [isLegacy, setIsLegacy] = useState(true);
    const [opMatchData, setOpMatchData] = useState<any>(null);
    const [upcomingEvents, setUpcomingEvents] = useState<GameEvent[]>([]);
    const [isVerifying, setIsVerifying] = useState(false);


    // Section Toggles
    const [showGameConfig, setShowGameConfig] = useState(false);
    const [showUserManagement, setShowUserManagement] = useState(false);

    // Global Sports State (for ManageSports and Manual User Add)
    const [globalSports, setGlobalSports] = useState<Sport[]>([]);
    const [globalFeaturedIds, setGlobalFeaturedIds] = useState<string[]>([]);
    const [loadingSports, setLoadingSports] = useState(false);

    const fetchGlobalSports = async () => {
        setLoadingSports(true);
        try {
            const [list, featured] = await Promise.all([
                sportsService.getAllSports(),
                sportsService.getFeaturedSportIds()
            ]);
            setGlobalSports(list);
            setGlobalFeaturedIds(featured);
        } catch (err) {
            console.error("Failed to fetch global sports", err);
        } finally {
            setLoadingSports(false);
        }
    };

    useEffect(() => {
        fetchGlobalSports();
    }, []);

    // Helper Component for Date Selection (Simplified for React Native compatibility)
    const DateSelector = ({ dateStr, onChange }: { dateStr: string, onChange: (val: string) => void }) => {
        // ... (component code remains same, omitted for brevity if possible, but replace tool needs context)
        const d = dateStr ? new Date(dateStr) : new Date();

        const update = (newDate: Date) => {
            onChange(newDate.toISOString());
        };

        // ... (rest of DateSelector logic)
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
                {/* ... UI for Date Selector ... */}
                <View className="flex-row justify-between">
                    <View className="items-center">
                        <Text className="text-xs text-gray-500">Month</Text>
                        <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded">
                            <TouchableOpacity onPress={() => adjust('month', -1)} className="p-2 bg-gray-200"><Text>-</Text></TouchableOpacity>
                            <Text className="w-16 text-center text-xs">{d.toLocaleString('default', { month: 'short' })} ({d.getMonth() + 1})</Text>
                            <TouchableOpacity onPress={() => adjust('month', 1)} className="p-2 bg-gray-200"><Text>+</Text></TouchableOpacity>
                        </View>
                    </View>
                    <View className="items-center">
                        <Text className="text-xs text-gray-500">Day</Text>
                        <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded">
                            <TouchableOpacity onPress={() => adjust('day', -1)} className="p-2 bg-gray-200"><Text>-</Text></TouchableOpacity>
                            <TextInput
                                className="w-12 text-center p-1 bg-white"
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
                                className="w-12 text-center p-1 bg-white"
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
                            {/* Finer control: +/- 1 minute buttons */}
                            <TouchableOpacity onPress={() => adjust('minute', -1)} className="p-2 bg-gray-200"><Text>-</Text></TouchableOpacity>
                            <TextInput
                                className="w-12 text-center p-1 bg-white"
                                value={d.getMinutes().toString().padStart(2, '0')}
                                keyboardType="numeric"
                                onChangeText={(v) => setField('minute', v)}
                                maxLength={2}
                            />
                            <TouchableOpacity onPress={() => adjust('minute', 1)} className="p-2 bg-gray-200"><Text>+</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        );
    };
    const [paymentEnabled, setPaymentEnabled] = useState(false);
    const [paymentZelle, setPaymentZelle] = useState('');
    const [paymentPaypal, setPaymentPaypal] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [isOpen, setIsOpen] = useState(true);

    // User Management Sub-sections
    const [showAddUser, setShowAddUser] = useState(false);
    const [showCurrentPlayers, setShowCurrentPlayers] = useState(false); // Collapsed by default
    const [showAllUsers, setShowAllUsers] = useState(false);
    const [showMaintenance, setShowMaintenance] = useState(false);
    const [showDebugInfo, setShowDebugInfo] = useState(false);
    const [showFinancials, setShowFinancials] = useState(false); // NEW: Manage Financials Section
    const [verifyingPayment, setVerifyingPayment] = useState<string | null>(null); // Track which user is being verified

    // Add User State
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserFirstName, setNewUserFirstName] = useState('');
    const [newUserLastName, setNewUserLastName] = useState('');
    const [newUserPhone, setNewUserPhone] = useState('');
    const [newUserInterests, setNewUserInterests] = useState('');
    const [selectedSports, setSelectedSports] = useState<string[]>([]);
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(true);
    const [hasPromptedShare, setHasPromptedShare] = useState(false);

    useEffect(() => {
        // Ensure the week is initialized
        votingService.initializeWeek().catch(console.error);

        // Fetch Global Settings
        adminService.getGlobalSettings().then(settings => {
            setRequireApproval(settings.requireApproval || false);
        });

        // Subscribe to current slots
        const unsubscribe = votingService.subscribeToSlots((slotData) => {
            if (slotData) {
                setLegacyMatchData(slotData);
                setMaxSlots(slotData.maxSlots.toString());
                setMaxWaitlist(slotData.maxWaitlist?.toString() || '4');
                setPaymentEnabled(slotData.paymentEnabled);
                setPaymentZelle(slotData.paymentDetails?.zelle || '');
                setPaymentPaypal(slotData.paymentDetails?.paypal || '');
                setFees(slotData.fees ? slotData.fees.toString() : '0');
                setCurrency(slotData.currency || 'USD');
                setIsOpen(slotData.isOpen !== undefined ? slotData.isOpen : true);
                setAdminPhoneNumber(slotData.adminPhoneNumber || '');
                setIsAdminPhoneEnabled(slotData.isAdminPhoneEnabled || false);
                setIsCustomSlotsEnabled(slotData.isCustomSlotsEnabled || false);

                if (slotData.votingOpensAt) {
                    setVotingOpenDate(new Date(slotData.votingOpensAt).toISOString());
                }
                if (slotData.votingClosesAt) {
                    setVotingCloseDate(new Date(slotData.votingClosesAt).toISOString());
                }
                if (slotData.nextGameDateOverride) {
                    setNextGameDateOverride(new Date(slotData.nextGameDateOverride).toISOString());
                } else {
                    setNextGameDateOverride('');
                }
                setNextGameDetailsOverride(slotData.nextGameDetailsOverride || '');
                setIsOverrideEnabled(slotData.isOverrideEnabled || false);
                setIsCustomVotingWindowEnabled(slotData.isCustomVotingWindowEnabled || false);
                setSportNameOverride(slotData.sportName || 'Volleyball');
                setSportIconOverride(slotData.sportIcon || 'volleyball');
                setLocationOverride(slotData.location || 'Beach at Craig Ranch');
            }
            setLoading(false);
        });

        // Fetch all users
        fetchUsers();

        return unsubscribe;
    }, []);

    // Fetch selection data for Operations
    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const events = await eventService.getAllUpcomingEvents();
                setUpcomingEvents(events);
            } catch (err) {
                console.error("Failed to fetch events for selector", err);
            }
        };
        fetchEvents();
    }, [activeTab]); // Refresh when switching to Ops

    // Subscribe to selected operational match
    useEffect(() => {
        let unsubscribe: any;
        setOpMatchData(null); // Clear previous data while loading new match
        if (activeMatchId === 'legacy') {
            setIsLegacy(true);
            unsubscribe = votingService.subscribeToSlots((slotData) => {
                setOpMatchData(slotData);
            });
        } else {
            setIsLegacy(false);
            const eventRef = doc(db, 'events', activeMatchId);
            unsubscribe = onSnapshot(eventRef, (docSnap) => {
                if (docSnap.exists()) {
                    setOpMatchData(docSnap.data());
                }
            });
        }
        return () => unsubscribe && unsubscribe();
    }, [activeMatchId]);

    // Monitoring Effect for Auto-Share Prompt
    useEffect(() => {
        if (!opMatchData || !opMatchData.slots) return;

        // Check if conditions met
        const isFull = opMatchData.slots.length >= opMatchData.maxSlots;

        // Check time (15 mins after opening)
        let timeUp = false;
        if (opMatchData.votingOpensAt) {
            const fifteenMins = 15 * 60 * 1000;
            if (Date.now() > opMatchData.votingOpensAt + fifteenMins) {
                timeUp = true;
            }
        }

        let timeoutId: NodeJS.Timeout;

        // Only trigger if NOT already triggered and conditions met
        if ((isFull || timeUp) && !opMatchData.shareTriggered && !hasPromptedShare) {
            setHasPromptedShare(true);
            const reason = isFull ? "Slots are full!" : "15 minutes have passed!";

            if (Platform.OS === 'web') {
                // Use a small timeout to let UI render
                timeoutId = setTimeout(() => {
                    // Check again inside timeout to be safe
                    if (window.confirm(`📢 ${reason}\n\nDo you want to send the WhatsApp list to Admin now?`)) {
                        const url = generateWhatsAppLink(opMatchData);
                        window.open(url, '_blank');
                        votingService.markShareTriggered(); // Note: needs eventId support if custom
                    } else {
                        // If they say no, mark it anyway so we don't annoy them
                        if (window.confirm("Mark as checked so this doesn't pop up again?")) {
                            votingService.markShareTriggered();
                        }
                    }
                }, 1000);
            } else {
                // Native implementation...
                Alert.alert(
                    "📢 Auto-Share Prompt",
                    `${reason}\n\nSend WhatsApp list to Admin?`,
                    [
                        { text: "No (Don't ask again)", onPress: () => votingService.markShareTriggered() },
                        { text: "No (Ask later)", style: "cancel" },
                        {
                            text: "Yes, Send",
                            onPress: () => {
                                const url = generateWhatsAppLink(opMatchData);
                                Linking.openURL(url);
                                votingService.markShareTriggered();
                            }
                        }
                    ]
                );
            }
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [opMatchData?.slots?.length, opMatchData?.maxSlots, opMatchData?.votingOpensAt, opMatchData?.shareTriggered]); // Specific dependencies to avoid re-running on every object ref change

    const fetchUsers = async () => {
        try {
            const users = await adminService.getAllUsers();
            setAllUsers(users);
        } catch (error) {
            console.error('Failed to fetch users', error);
        }
    };

    const handleToggleAdmin = async (userId: string, currentAdminStatus: boolean) => {
        try {
            await adminService.setAdminStatus(userId, !currentAdminStatus);
            fetchUsers();
            if (Platform.OS === 'web') {
                window.alert('Success: User role updated!');
            } else {
                Alert.alert('Success', 'User role updated!');
            }
        } catch (error: any) {
            if (Platform.OS === 'web') {
                window.alert(`Error: ${error.message}`);
            } else {
                Alert.alert('Error', error.message);
            }
        }
    };

    const handleSaveConfig = async () => {
        try {
            const config: any = {
                maxSlots: isCustomSlotsEnabled ? (parseInt(maxSlots) || 14) : 14,
                maxWaitlist: isCustomSlotsEnabled ? (parseInt(maxWaitlist) || 4) : 4,
                paymentEnabled: paymentEnabled,
                fees: parseFloat(fees) || 0,
                paymentDetails: {
                    zelle: paymentZelle,
                    paypal: paymentPaypal
                },
                currency: currency,
                isOpen: isOpen,
                adminPhoneNumber: adminPhoneNumber, // Save Phone
                isAdminPhoneEnabled: isAdminPhoneEnabled, // Save Phone Toggle
                isCustomSlotsEnabled: isCustomSlotsEnabled // Save Slots Toggle
            };

            // Voting Schedule
            config.isCustomVotingWindowEnabled = isCustomVotingWindowEnabled;

            if (isCustomVotingWindowEnabled) {
                // Use manually selected dates
                const openDate = votingOpenDate ? new Date(votingOpenDate) : new Date();
                const closeDate = votingCloseDate ? new Date(votingCloseDate) : new Date(openDate.getTime() + 48 * 60 * 60 * 1000);

                if (!isNaN(openDate.getTime())) {
                    openDate.setSeconds(0); openDate.setMilliseconds(0);
                    config.votingOpensAt = openDate.getTime();
                }

                if (!isNaN(closeDate.getTime())) {
                    closeDate.setSeconds(0); closeDate.setMilliseconds(0);
                    config.votingClosesAt = closeDate.getTime();
                }
            } else {
                // Revert to Default Schedule (Tuesday 7 PM)
                // Use getVotingStartTime helper to find the correct Tuesday for "this week" (or next game cycle)
                const defaultStart = getVotingStartTime();
                const defaultEnd = new Date(defaultStart.getTime() + (48 * 60 * 60 * 1000)); // +48h

                config.votingOpensAt = defaultStart.getTime();
                config.votingClosesAt = defaultEnd.getTime();
            }

            // Next Game Overrides
            if (nextGameDateOverride) {
                const overrideDate = new Date(nextGameDateOverride);
                if (!isNaN(overrideDate.getTime())) {
                    config.nextGameDateOverride = overrideDate.getTime();
                }
            } else {
                config.nextGameDateOverride = null; // Clear if empty
            }

            if (nextGameDetailsOverride.trim()) {
                config.nextGameDetailsOverride = nextGameDetailsOverride.trim();
            } else {
                config.nextGameDetailsOverride = null; // Clear if empty
            }

            config.isOverrideEnabled = isOverrideEnabled;

            config.sportName = sportNameOverride || 'Volleyball';
            config.sportIcon = sportIconOverride || 'volleyball';
            config.location = locationOverride || 'Volleyball Court';

            // Ensure document exists before updating (Subscription handles this, removed redundant await to fix offline errors)
            await adminService.updateGlobalConfig(config);

            // Save Global Settings (Approval)
            await adminService.toggleApprovalRequirement(requireApproval);

            if (Platform.OS === 'web') {
                window.alert('Success: Configuration updated!');
            } else {
                Alert.alert('Success', 'Configuration updated!');
            }
        } catch (error: any) {
            console.error('Save Config Error:', error);
            if (Platform.OS === 'web') {
                window.alert(`Error: ${error.message}`);
            } else {
                Alert.alert('Error', error.message);
            }
        }
    };

    const handleRemoveUser = async (userId: string) => {
        try {
            if (isLegacy) {
                await votingService.removeVoteLegacy(userId);
            } else {
                await votingService.removeVote(activeMatchId, userId);
            }
            if (Platform.OS === 'web') {
                window.alert('Success: User removed from list.');
            } else {
                Alert.alert('Success', 'User removed from list.');
            }
        } catch (error: any) {
            if (Platform.OS === 'web') {
                window.alert(`Error: ${error.message}`);
            } else {
                Alert.alert('Error', error.message);
            }
        }
    };

    const handleAddUser = async () => {
        // Trim inputs to remove accidental whitespace
        const email = newUserEmail.trim();
        const first = newUserFirstName.trim();
        const last = newUserLastName.trim();
        const password = newUserPassword.trim();

        if (!email || !password || !first || !last) {
            if (Platform.OS === 'web') {
                window.alert('Error: All fields are required');
            } else {
                Alert.alert('Error', 'All fields are required');
            }
            return;
        }
        setIsCreatingUser(true);
        setSuccessMsg(''); // Clear previous
        try {
            // Updated to use selectedSports array from checkboxes
            await authService.adminCreateUser(email, password, first, last, newUserPhone.trim(), selectedSports);
            setSuccessMsg(`User ${first} created successfully!`);

            // Reset form
            setNewUserEmail('');
            setNewUserPassword('');
            setNewUserFirstName('');
            setNewUserLastName('');
            setNewUserPhone('');
            setNewUserInterests('');

            // Fetch immediately and again after a short delay to ensure consistency
            fetchUsers();
            setTimeout(fetchUsers, 1000);
        } catch (error: any) {
            let msg = error.message;
            if (msg.includes('email-already-in-use')) {
                msg = "Email exists! If they are 'deleted', they must LOG IN to restore their account. Do not create new user.";
            } else if (msg.includes('invalid-email')) {
                msg = "Invalid email address. Please check for typos.";
            }
            if (Platform.OS === 'web') {
                window.alert(`Error: ${msg}`);
            } else {
                Alert.alert('Error', msg);
            }
        } finally {
            setIsCreatingUser(false);
        }
    };

    const handleDeleteUser = async (userId: string, userName: string) => {
        const performDelete = async () => {
            try {
                await authService.deleteUser(userId);
                fetchUsers(); // Refresh list
                if (Platform.OS === 'web') window.alert("User Deleted");
                else Alert.alert("Success", "User Deleted");
            } catch (error: any) {
                console.error("Delete user error:", error);
                if (Platform.OS === 'web') window.alert("Error deleting user: " + error.message);
                else Alert.alert("Error", error.message);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm(`Are you sure you want to delete ${userName}? This will remove their Firestore profile.`)) {
                performDelete();
            }
        } else {
            Alert.alert("Delete User?", `Are you sure you want to delete ${userName}?`, [
                { text: "Cancel" },
                { text: "Delete", style: "destructive", onPress: performDelete }
            ]);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#0000ff" />
                <Text className="mt-4 text-gray-500">Loading Configuration...</Text>
            </View>
        );
    }

    // --- NEW: Manage Sports Section Component ---
    const ManageSportsSection = ({ sports, featured, onRefresh, loading }: { sports: Sport[], featured: string[], onRefresh: () => void, loading: boolean }) => {
        const [showSports, setShowSports] = useState(false);
        const [newSportName, setNewSportName] = useState('');
        const [newSportIcon, setNewSportIcon] = useState('');
        const [savingFeatured, setSavingFeatured] = useState(false);

        const handleAddSport = async () => {
            if (!newSportName.trim() || !newSportIcon.trim()) {
                if (Platform.OS === 'web') window.alert("Name and Icon are required!");
                else Alert.alert("Error", "Name and Icon are required!");
                return;
            }
            try {
                await sportsService.addSport(newSportName.trim(), newSportIcon.trim());
                setNewSportName('');
                setNewSportIcon('');
                onRefresh(); // Refresh parent state
                if (Platform.OS === 'web') window.alert("Sport Added!");
                else Alert.alert("Success", "Sport Added!");
            } catch (err: any) {
                if (Platform.OS === 'web') window.alert("Error: " + err.message);
                else Alert.alert("Error", err.message);
            }
        };

        const toggleFeatured = async (id: string) => {
            let nextFeatured = [...featured];
            if (nextFeatured.includes(id)) {
                nextFeatured = nextFeatured.filter(fid => fid !== id);
            } else {
                if (nextFeatured.length >= 6) {
                    if (Platform.OS === 'web') window.alert("Maximum 6 featured sports allowed!");
                    else Alert.alert("Limit Reached", "Maximum 6 featured sports allowed!");
                    return;
                }
                nextFeatured.push(id);
            }

            setSavingFeatured(true);
            try {
                await sportsService.updateFeaturedSportIds(nextFeatured);
                onRefresh();
            } catch (err) {
                console.error("Failed to update featured", err);
            } finally {
                setSavingFeatured(false);
            }
        };

        const handleDeleteSport = async (id: string, name: string) => {
            const confirmDelete = async () => {
                try {
                    await sportsService.deleteSport(id);
                    // Remove from featured if it was there
                    if (featured.includes(id)) {
                        await sportsService.updateFeaturedSportIds(featured.filter(fid => fid !== id));
                    }
                    onRefresh();
                } catch (err: any) {
                    console.error("Delete failed", err);
                }
            };

            if (Platform.OS === 'web') {
                if (window.confirm(`Delete ${name}?`)) confirmDelete();
            } else {
                Alert.alert("Delete Sport", `Delete ${name}?`, [
                    { text: "Cancel" },
                    { text: "Delete", style: 'destructive', onPress: confirmDelete }
                ]);
            }
        };

        return (
            <View className="bg-white p-4 rounded-lg shadow-sm mb-4 border border-gray-200">
                <TouchableOpacity
                    className="flex-row justify-between items-center"
                    onPress={() => setShowSports(!showSports)}
                >
                    <View className="flex-row items-center">
                        <MaterialCommunityIcons name="trophy-outline" size={20} color="#6B7280" style={{ marginRight: 8 }} />
                        <Text className="text-lg font-bold text-gray-800">Manage Sports</Text>
                    </View>
                    <MaterialCommunityIcons name={showSports ? 'chevron-up' : 'chevron-down'} size={24} color="#6B7280" />
                </TouchableOpacity>

                {showSports && (
                    <View className="mt-4 border-t border-gray-100 pt-4">
                        {/* ADd New Sport */}
                        <View className="mb-6 bg-gray-50 p-3 rounded border border-gray-200">
                            <Text className="font-bold text-gray-700 mb-2">Add New Sport</Text>
                            <TextInput
                                className="bg-white border border-gray-300 rounded p-2 mb-2"
                                placeholder="Sport Name (e.g. Basketball)"
                                value={newSportName}
                                onChangeText={setNewSportName}
                            />
                            <TextInput
                                className="bg-white border border-gray-300 rounded p-2 mb-2"
                                placeholder="Icon Name (MaterialCommunityIcons, e.g. basketball)"
                                value={newSportIcon}
                                onChangeText={setNewSportIcon}
                                autoCapitalize="none"
                            />
                            <Text className="text-[10px] text-gray-400 mb-2">Find icons at: icons.expo.fyi (use MaterialCommunityIcons)</Text>
                            <TouchableOpacity
                                onPress={handleAddSport}
                                className="bg-green-600 p-2 rounded items-center"
                            >
                                <Text className="text-white font-bold">Add Sport</Text>
                            </TouchableOpacity>
                        </View>

                        {/* List */}
                        <View className="flex-row justify-between items-center mb-2">
                            <Text className="font-bold text-gray-700">Existing Sports</Text>
                            <Text className="text-xs text-gray-500">{featured.length}/6 Featured</Text>
                        </View>
                        {loading ? <ActivityIndicator /> : (
                            <View className="gap-y-2">
                                {sports.map(sport => {
                                    const isFeatured = featured.includes(sport.id);
                                    return (
                                        <View key={sport.id} className="flex-row items-center justify-between bg-white border border-gray-100 p-2 rounded">
                                            <TouchableOpacity
                                                className="flex-row items-center gap-2 flex-1"
                                                onPress={() => toggleFeatured(sport.id)}
                                            >
                                                <MaterialCommunityIcons
                                                    name={isFeatured ? "star" : "star-outline"}
                                                    size={20}
                                                    color={isFeatured ? "#F59E0B" : "#D1D5DB"}
                                                />
                                                <MaterialCommunityIcons name={sport.icon as any || 'help'} size={20} color="#333" />
                                                <Text className={`font-medium ${isFeatured ? 'text-amber-700' : 'text-gray-800'}`}>
                                                    {sport.name}
                                                </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => handleDeleteSport(sport.id, sport.name)}>
                                                <MaterialCommunityIcons name="trash-can" size={20} color="red" />
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })}
                                {sports.length === 0 && <Text className="text-gray-400 italic">No sports found.</Text>}
                            </View>
                        )}

                        {savingFeatured && (
                            <View className="mt-2 items-center">
                                <Text className="text-[10px] text-amber-600">Updating Featured List...</Text>
                            </View>
                        )}
                    </View>
                )}
            </View>
        );
    };

    // --- NEW: Manage Events (Polls) Section ---
    const ManageEventsSection = () => {
        const [showEvents, setShowEvents] = useState(false);
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
        const [editingEventId, setEditingEventId] = useState<string | null>(null);

        const [sportsList, setSportsList] = useState<Sport[]>([]);

        const fetchInitialData = async () => {
            setLoadingEvents(true);
            try {
                const [events, sports] = await Promise.all([
                    eventService.getAllUpcomingEvents(),
                    sportsService.getAllSports()
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
            if (showEvents) {
                fetchInitialData();
            }
        }, [showEvents]);

        const handleCreateEvent = async () => {
            if (!selectedSportId) {
                Alert.alert("Error", "Please select a sport");
                return;
            }

            const doCreate = async () => {
                setCreatingEvent(true);
                try {
                    const eventPayload: any = {
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
                            zelle: paymentZelle,
                            paypal: paymentPaypal
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
            <View className="bg-white p-4 rounded-lg shadow-sm mb-4 border border-gray-200">
                <TouchableOpacity
                    className="flex-row justify-between items-center"
                    onPress={() => setShowEvents(!showEvents)}
                >
                    <View className="flex-row items-center">
                        <MaterialCommunityIcons name="calendar-multiselect" size={20} color="#6B7280" style={{ marginRight: 8 }} />
                        <Text className="text-lg font-bold text-gray-800">Event Management</Text>
                    </View>
                    <MaterialCommunityIcons name={showEvents ? 'chevron-up' : 'chevron-down'} size={24} color="#6B7280" />
                </TouchableOpacity>

                {showEvents && (
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
                                className="bg-white border border-gray-200 rounded-lg p-3 mb-2"
                                placeholder="Location (e.g. Craig Ranch)"
                                value={eLocation}
                                onChangeText={setELocation}
                            />
                            <View className="flex-row gap-2 mb-4">
                                <View className="flex-1">
                                    <Text className="text-[10px] text-gray-400 ml-1">MAX SLOTS</Text>
                                    <TextInput
                                        className="bg-white border border-gray-200 rounded-lg p-3"
                                        keyboardType="numeric"
                                        value={eMaxSlots}
                                        onChangeText={setEMaxSlots}
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-[10px] text-gray-400 ml-1">MAX WAITLIST</Text>
                                    <TextInput
                                        className="bg-white border border-gray-200 rounded-lg p-3"
                                        keyboardType="numeric"
                                        value={eMaxWaitlist}
                                        onChangeText={setEMaxWaitlist}
                                    />
                                </View>
                            </View>

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
                                            <View className={`px-2 py-0.5 rounded-full ${legacyMatchData.isOpen ? 'bg-green-100' : 'bg-gray-200'}`}>
                                                <Text className={`text-[10px] font-bold ${legacyMatchData.isOpen ? 'text-green-700' : 'text-gray-600 uppercase'}`}>{legacyMatchData.isOpen ? 'LIVE' : 'SCHEDULED'}</Text>
                                            </View>
                                        </View>
                                        <Text className="text-xs text-gray-600 mb-1">
                                            <MaterialCommunityIcons name="calendar-clock" size={12} /> Every {formatInCentralTime(getNextGameDate().getTime(), 'EEEE @ h:mm a')}
                                        </Text>
                                        <Text className="text-xs text-blue-600 italic">Manage this in the 'Game Configuration' section above.</Text>
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
                                                onPress={() => votingService.updateEventStatus(event.id!, event.status === 'open' ? 'closed' : 'open')}
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

    // --- NEW: Financial Tracking Dashboard ---
    const FinancialDashboard = () => {
        const [verifyingPayment, setVerifyingPayment] = useState<string | null>(null); // Track which user is being verified

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
        const totalExpected = slots.length * matchFees;
        const totalPaid = slots.filter((s: any) => s.paid).length * matchFees;
        const totalVerified = slots.filter((s: any) => s.paidVerified).length * matchFees;

        if (!showFinancials) return null;

        return (
            <View className="bg-white p-4 rounded-lg shadow-sm mb-4 border border-gray-200">
                <TouchableOpacity
                    className="flex-row justify-between items-center"
                    onPress={() => setShowFinancials(!showFinancials)}
                >
                    <View className="flex-row items-center">
                        <MaterialCommunityIcons name="finance" size={20} color="#6B7280" style={{ marginRight: 8 }} />
                        <Text className="text-lg font-bold text-gray-800">Financial Tracking</Text>
                    </View>
                    <MaterialCommunityIcons name={showFinancials ? 'chevron-up' : 'chevron-down'} size={24} color="#6B7280" />
                </TouchableOpacity>

                {showFinancials && (
                    <View className="mt-4 border-t border-gray-100 pt-4">
                        <View className="bg-gray-50 p-4 rounded-xl mb-6 flex-row justify-between border border-gray-100">
                            <View className="items-center flex-1">
                                <Text className="text-[10px] text-gray-500 uppercase font-black">Expected</Text>
                                <Text className="text-lg font-bold text-gray-800">${totalExpected}</Text>
                            </View>
                            <View className="items-center flex-1 border-x border-gray-200">
                                <Text className="text-[10px] text-gray-500 uppercase font-black">Marked Paid</Text>
                                <Text className="text-lg font-bold text-blue-600">${totalPaid}</Text>
                            </View>
                            <View className="items-center flex-1">
                                <Text className="text-[10px] text-gray-500 uppercase font-black">Verified</Text>
                                <Text className="text-lg font-bold text-green-600">${totalVerified}</Text>
                            </View>
                        </View>

                        <Text className="text-xs font-bold text-gray-500 mb-2 uppercase">Participant Payments</Text>
                        {slots.length === 0 ? (
                            <Text className="text-gray-400 italic text-center py-4">No participants yet</Text>
                        ) : (
                            slots.map((slot: any) => (
                                <View key={slot.userId} className="flex-row justify-between items-center py-3 border-b border-gray-50">
                                    <View className="flex-1">
                                        <Text className="font-bold text-gray-800">{slot.userName}</Text>
                                        <Text className="text-[10px] text-gray-500 capitalize">{slot.status}</Text>
                                    </View>

                                    <View className="flex-row items-center gap-x-2">
                                        {slot.paid ? (
                                            <View className={`px-2 py-1 rounded ${slot.paidVerified ? 'bg-green-100' : 'bg-blue-100'}`}>
                                                <Text className={`text-[10px] font-bold ${slot.paidVerified ? 'text-green-700' : 'text-blue-700'}`}>
                                                    {slot.paidVerified ? 'VERIFIED' : 'PAID (PENDING)'}
                                                </Text>
                                            </View>
                                        ) : (
                                            <View className="px-2 py-1 rounded bg-gray-100">
                                                <Text className="text-[10px] font-bold text-gray-500 uppercase">UNPAID</Text>
                                            </View>
                                        )}

                                        {slot.paid && !slot.paidVerified && (
                                            <TouchableOpacity
                                                onPress={() => handleVerify(slot.userId)}
                                                disabled={verifyingPayment === slot.userId}
                                                className="bg-green-600 px-3 py-1.5 rounded-lg"
                                            >
                                                {verifyingPayment === slot.userId ? (
                                                    <ActivityIndicator size="small" color="white" />
                                                ) : (
                                                    <Text className="text-white text-[10px] font-bold uppercase">Verify</Text>
                                                )}
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                )}
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1 bg-gray-100"
        >
            <Stack.Screen options={{
                headerStyle: { backgroundColor: '#ffffff' },
                headerTintColor: '#1f2937',
                headerTitle: "Admin Dashboard",
                headerTitleStyle: { fontWeight: 'bold' }
            }} />
            <ScrollView className="p-4" contentContainerStyle={{ paddingBottom: 40 }}>
                <View className="flex-row justify-between items-center mb-6">
                    <TouchableOpacity
                        onPress={() => router.replace('/home')}
                        className="bg-blue-600 px-4 py-2 rounded-lg shadow-sm"
                    >
                        <Text className="text-white font-bold uppercase text-xs tracking-wider">HOME</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={async () => {
                            try {
                                await authService.logout();
                                router.replace('/login');
                            } catch (error) {
                                console.error('Logout failed', error);
                            }
                        }}
                        className="bg-red-600 px-4 py-2 rounded-lg shadow-sm"
                    >
                        <Text className="text-white font-bold uppercase text-xs tracking-wider">SignOut</Text>
                    </TouchableOpacity>
                </View>

                <FinancialDashboard />

                {/* --- TAB NAVIGATION --- */}
                <View className="flex-row bg-white rounded-xl shadow-sm mb-4 p-1 border border-gray-200">
                    {[
                        { id: 'ops', label: 'Operations', icon: 'flash' },
                        { id: 'setup', label: 'Setup', icon: 'cog' },
                        { id: 'users', label: 'Users', icon: 'account-group' },
                        { id: 'system', label: 'System', icon: 'shield-check' }
                    ].map((tab) => (
                        <TouchableOpacity
                            key={tab.id}
                            onPress={() => setActiveTab(tab.id as any)}
                            className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg ${activeTab === tab.id ? 'bg-blue-600' : ''}`}
                        >
                            <MaterialCommunityIcons
                                name={tab.icon as any}
                                size={16}
                                color={activeTab === tab.id ? 'white' : '#6B7280'}
                            />
                            <Text className={`ml-1.5 text-[11px] font-bold ${activeTab === tab.id ? 'text-white' : 'text-gray-500'}`}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* --- MATCH SELECTOR (Global for Ops) --- */}
                {activeTab === 'ops' && (
                    <View className="mb-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200 mx-1">
                        <Text className="text-[10px] font-black text-gray-500 mb-3 uppercase tracking-[2px]">Select Active Match</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                            <TouchableOpacity
                                onPress={() => setActiveMatchId('legacy')}
                                className={`px-4 py-2 rounded-full border ${activeMatchId === 'legacy' ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'}`}
                            >
                                <Text className={`text-xs font-bold ${activeMatchId === 'legacy' ? 'text-white' : 'text-gray-600'}`}>EVERY SATURDAY</Text>
                            </TouchableOpacity>
                            {upcomingEvents.map(event => (
                                <TouchableOpacity
                                    key={event.id}
                                    onPress={() => setActiveMatchId(event.id!)}
                                    className={`px-4 py-2 rounded-full border ${activeMatchId === event.id ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'}`}
                                >
                                    <Text className={`text-xs font-bold ${activeMatchId === event.id ? 'text-white' : 'text-gray-600'}`}>
                                        {event.sportName} ({new Date(getMillis(event.eventDate)).toLocaleDateString()})
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* --- OPERATIONS TAB --- */}
                {activeTab === 'ops' && (
                    <>
                        {/* 0. FINANCIAL DASHBOARD (Moved inside Ops) */}
                        <FinancialDashboard />

                        {/* 1. CURRENT WEEK PLAYERS */}
                        <View className="bg-white p-4 rounded-lg shadow-sm mb-4 border border-gray-200">
                            <TouchableOpacity
                                className="flex-row justify-between items-center"
                                onPress={() => setShowCurrentPlayers(!showCurrentPlayers)}
                            >
                                <View className="flex-row items-center">
                                    <MaterialCommunityIcons name="account-group" size={20} color="#6B7280" style={{ marginRight: 8 }} />
                                    <Text className="text-lg font-bold text-gray-800">Current Week Players</Text>
                                </View>
                                <MaterialCommunityIcons name={showCurrentPlayers ? 'chevron-up' : 'chevron-down'} size={24} color="#6B7280" />
                            </TouchableOpacity>

                            {showCurrentPlayers && (
                                <View className="mt-4 border-t border-gray-100 pt-4">
                                    <View className="flex-col mb-4">
                                        {opMatchData?.slots && opMatchData.slots.length > 0 && (
                                            <View className="flex-row gap-2 justify-end mb-2">
                                                <TouchableOpacity
                                                    className="bg-green-500 px-3 py-1 rounded flex-row items-center"
                                                    onPress={() => {
                                                        if (opMatchData) {
                                                            const url = generateWhatsAppLink(opMatchData);
                                                            if (Platform.OS === 'web') {
                                                                window.open(url, '_blank');
                                                            } else {
                                                                Linking.openURL(url).catch(err => Alert.alert("Error", "Could not open WhatsApp"));
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <Text className="text-white text-xs font-bold mr-1">💬 Share</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    className="bg-gray-500 px-3 py-1 rounded flex-row items-center"
                                                    onPress={async () => {
                                                        if (opMatchData) {
                                                            const rawMessage = decodeURIComponent(generateWhatsAppLink(opMatchData).split('text=')[1]);
                                                            if (Platform.OS === 'web') {
                                                                await navigator.clipboard.writeText(rawMessage);
                                                                window.alert("Message copied to clipboard!");
                                                            } else {
                                                                Alert.alert("Info", "Clipboard Copy is web-only for now.");
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <Text className="text-white text-xs font-bold">📋 Copy</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        const doClear = async () => {
                                                            try {
                                                                await votingService.removeAllVotes(activeMatchId);
                                                                if (Platform.OS === 'web') window.alert("Cleared: All players removed.");
                                                                else Alert.alert("Cleared", "All players removed.");
                                                            } catch (e: any) {
                                                                if (Platform.OS === 'web') window.alert(`Error: ${e.message}`);
                                                                else Alert.alert("Error", e.message);
                                                            }
                                                        };

                                                        if (Platform.OS === 'web') {
                                                            if (window.confirm("This will remove EVERYONE from the list. This cannot be undone.")) doClear();
                                                        } else {
                                                            Alert.alert("Clear All?", "Remove EVERYONE? Cannot be undone.", [
                                                                { text: "Cancel", style: "cancel" },
                                                                { text: "CLEAR ALL", style: "destructive", onPress: doClear }
                                                            ]);
                                                        }
                                                    }}
                                                    className="bg-red-600 px-3 py-1 rounded"
                                                >
                                                    <Text className="text-white text-xs font-bold">CLEAR ALL</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>

                                    {/* Player Slots List */}
                                    {opMatchData?.slots?.map((slot: any) => (
                                        <View key={slot.userId} className="flex-row justify-between items-center py-3 border-b border-gray-100 last:border-0">
                                            <View>
                                                <Text className="font-semibold">{slot.userName}</Text>
                                                {slot.userEmail && slot.userEmail !== slot.userName && (
                                                    <Text className="text-xs text-gray-500">{slot.userEmail}</Text>
                                                )}
                                                <Text className={`text-xs ${slot.status === 'confirmed' ? 'text-green-600' : 'text-red-500'}`}>
                                                    {slot.status.toUpperCase()} • {format(getMillis(slot.timestamp), 'h:mm:ss.SSS a')}
                                                </Text>
                                            </View>
                                            <TouchableOpacity
                                                className="bg-red-100 px-3 py-1 rounded"
                                                onPress={() => {
                                                    const doRemove = () => handleRemoveUser(slot.userId);
                                                    if (Platform.OS === 'web') {
                                                        if (window.confirm(`Remove ${slot.userName}?`)) doRemove();
                                                    } else {
                                                        Alert.alert("Remove?", `Remove ${slot.userName}?`, [
                                                            { text: "Cancel" },
                                                            { text: "Remove", style: "destructive", onPress: doRemove }
                                                        ]);
                                                    }
                                                }}
                                            >
                                                <Text className="text-red-600 font-bold text-xs">Remove</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                    {(!opMatchData || !opMatchData.slots || opMatchData.slots.length === 0) && (
                                        <Text className="text-gray-400 italic text-center py-4">No players to manage yet.</Text>
                                    )}
                                </View>
                            )}
                        </View>
                    </>
                )}

                {/* --- SETUP TAB --- */}
                {activeTab === 'setup' && (
                    <>




                        <ManageSportsSection
                            sports={globalSports}
                            featured={globalFeaturedIds}
                            onRefresh={fetchGlobalSports}
                            loading={loadingSports}
                        />
                        <ManageEventsSection />

                        <View className="bg-white p-4 rounded-lg shadow-sm mb-4 border border-gray-200">
                            <TouchableOpacity
                                className="flex-row justify-between items-center"
                                onPress={() => setShowGameConfig(!showGameConfig)}
                            >
                                <View className="flex-row items-center">
                                    <MaterialCommunityIcons name="cog" size={20} color="#6B7280" style={{ marginRight: 8 }} />
                                    <Text className="text-lg font-bold text-gray-800">Game Configuration</Text>
                                </View>
                                <MaterialCommunityIcons name={showGameConfig ? 'chevron-up' : 'chevron-down'} size={24} color="#6B7280" />
                            </TouchableOpacity>

                            {showGameConfig && (
                                <View className="mt-4 border-t border-gray-100 pt-4">
                                    <TouchableOpacity
                                        className="bg-blue-600 p-3 rounded-lg items-center shadow-sm mb-6 flex-row justify-center"
                                        onPress={handleSaveConfig}
                                    >
                                        <MaterialCommunityIcons name="content-save" size={20} color="white" style={{ marginRight: 8 }} />
                                        <Text className="text-white font-bold text-lg uppercase tracking-wider">Save Changes</Text>
                                    </TouchableOpacity>

                                    <View className="mb-6 border-b border-gray-200 pb-4">
                                        <View className="flex-row items-center justify-between mb-4">
                                            <Text className="text-lg font-bold text-gray-800">Admin Contact</Text>
                                            <Switch
                                                value={isAdminPhoneEnabled}
                                                onValueChange={setIsAdminPhoneEnabled}
                                            />
                                        </View>
                                        {isAdminPhoneEnabled && (
                                            <TextInput
                                                className="border border-gray-300 rounded p-2 bg-gray-50 mb-2"
                                                placeholder="WhatsApp Phone (+1 123 456 7890)"
                                                value={adminPhoneNumber}
                                                onChangeText={setAdminPhoneNumber}
                                            />
                                        )}
                                    </View>

                                    {/* ... rest of config sections correctly wrapped in the refactor ... */}
                                    <View className="mb-6 pt-4 border-t border-gray-200">
                                        <View className="flex-row items-center justify-between mb-4">
                                            <Text className="text-lg font-bold text-gray-800">Payment Settings</Text>
                                            <Switch value={paymentEnabled} onValueChange={setPaymentEnabled} />
                                        </View>
                                        {paymentEnabled && (
                                            <View className="gap-y-2">
                                                <View className="flex-row gap-2">
                                                    <View className="flex-[2]">
                                                        <Text className="text-[10px] text-gray-400 ml-1">FEES</Text>
                                                        <TextInput className="border border-gray-300 rounded p-2 bg-gray-50" placeholder="Fees" value={fees} onChangeText={setFees} keyboardType="numeric" />
                                                    </View>
                                                    <View className="flex-1">
                                                        <Text className="text-[10px] text-gray-400 ml-1">CURRENCY</Text>
                                                        <TextInput className="border border-gray-300 rounded p-2 bg-gray-50" placeholder="USD" value={currency} onChangeText={setCurrency} />
                                                    </View>
                                                </View>
                                                <View>
                                                    <Text className="text-[10px] text-gray-400 ml-1">ZELLE (EMAIL OR MOBILE)</Text>
                                                    <TextInput className="border border-gray-300 rounded p-2 bg-gray-50" placeholder="Email or +1 123 456 7890" value={paymentZelle} onChangeText={setPaymentZelle} />
                                                </View>
                                                <View>
                                                    <Text className="text-[10px] text-gray-400 ml-1">PAYPAL</Text>
                                                    <TextInput className="border border-gray-300 rounded p-2 bg-gray-50" placeholder="PayPal Email or @Username" value={paymentPaypal} onChangeText={setPaymentPaypal} />
                                                </View>
                                            </View>
                                        )}
                                    </View>

                                    {/* Voting Toggles */}
                                    <View className="mb-6 pt-4 border-t border-gray-200">
                                        <View className="flex-row items-center justify-between mb-2">
                                            <Text className="text-lg font-bold text-gray-800">Voting Open</Text>
                                            <Switch value={isOpen} onValueChange={setIsOpen} />
                                        </View>
                                        <View className="flex-row items-center justify-between mb-2">
                                            <Text className="text-lg font-bold text-gray-800">Require Approval</Text>
                                            <Switch value={requireApproval} onValueChange={setRequireApproval} />
                                        </View>
                                    </View>

                                    {/* Weekly Match Display Config */}
                                    <View className="mb-6 pt-4 border-t border-gray-200">
                                        <Text className="text-lg font-bold text-gray-800 mb-4">Every Saturday Match Info</Text>
                                        <View className="gap-y-3">
                                            <View>
                                                <Text className="text-[10px] text-gray-400 ml-1 uppercase">Match Label (e.g. Volleyball Match)</Text>
                                                <TextInput
                                                    className="border border-gray-300 rounded p-2 bg-gray-50"
                                                    placeholder="Sport Name"
                                                    value={sportNameOverride}
                                                    onChangeText={setSportNameOverride}
                                                />
                                            </View>
                                            <View>
                                                <Text className="text-[10px] text-gray-400 ml-1 uppercase">Location</Text>
                                                <TextInput
                                                    className="border border-gray-300 rounded p-2 bg-gray-50"
                                                    placeholder="Beach at Craig Ranch"
                                                    value={locationOverride}
                                                    onChangeText={setLocationOverride}
                                                />
                                            </View>
                                            <View>
                                                <Text className="text-[10px] text-gray-400 ml-1 uppercase">Icon Name (MaterialCommunityIcons)</Text>
                                                <TextInput
                                                    className="border border-gray-300 rounded p-2 bg-gray-50"
                                                    placeholder="volleyball"
                                                    value={sportIconOverride}
                                                    onChangeText={setSportIconOverride}
                                                    autoCapitalize="none"
                                                />
                                            </View>
                                        </View>
                                    </View>

                                    {/* Slot Overrides */}
                                    <View className="mb-6 pt-4 border-t border-gray-200">
                                        <View className="flex-row items-center justify-between mb-4">
                                            <Text className="text-lg font-bold text-gray-800">Custom Slots</Text>
                                            <Switch value={isCustomSlotsEnabled} onValueChange={setIsCustomSlotsEnabled} />
                                        </View>
                                        {isCustomSlotsEnabled && (
                                            <View className="flex-row gap-2">
                                                <TextInput className="flex-1 border border-gray-300 rounded p-2 bg-gray-50" placeholder="Max Slots" value={maxSlots} onChangeText={setMaxSlots} keyboardType="numeric" />
                                                <TextInput className="flex-1 border border-gray-300 rounded p-2 bg-gray-50" placeholder="Waitlist" value={maxWaitlist} onChangeText={setMaxWaitlist} keyboardType="numeric" />
                                            </View>
                                        )}
                                    </View>
                                </View>
                            )}
                        </View>
                    </>
                )}

                {/* --- USERS TAB --- */}
                {activeTab === 'users' && (
                    <>
                        {/* 1. REGISTERED MEMBERS */}
                        <View className="bg-white p-4 rounded-lg shadow-sm mb-4 border border-gray-200">
                            <TouchableOpacity
                                className="flex-row justify-between items-center"
                                onPress={() => {
                                    const nextState = !showAllUsers;
                                    setShowAllUsers(nextState);
                                    if (nextState) fetchUsers();
                                }}
                            >
                                <View className="flex-row items-center">
                                    <MaterialCommunityIcons name="card-account-details" size={20} color="#6B7280" style={{ marginRight: 8 }} />
                                    <Text className="text-lg font-bold text-gray-800">Registered Members</Text>
                                </View>
                                <MaterialCommunityIcons name={showAllUsers ? 'chevron-up' : 'chevron-down'} size={24} color="#6B7280" />
                            </TouchableOpacity>

                            {showAllUsers && (
                                <View className="mt-4 border-t border-gray-100 pt-4">
                                    {/* Users List Rendering */}
                                    {allUsers.map((u) => {
                                        const isApproved = u.isApproved !== false;
                                        return (
                                            <View key={u.uid} className={`flex-row justify-between items-center py-3 border-b border-gray-100 ${!isApproved ? 'bg-amber-50' : ''}`}>
                                                <View className="flex-1 mr-2">
                                                    <View className="flex-row items-center flex-wrap">
                                                        <Text className="font-semibold">{u.displayName || u.email}</Text>
                                                        {!isApproved && <Text className="ml-2 text-[10px] text-amber-700 font-bold bg-amber-100 px-1 rounded">PENDING</Text>}
                                                    </View>
                                                    <Text className="text-xs text-gray-500">{u.email}</Text>
                                                </View>
                                                <View className="flex-row items-center gap-x-2">
                                                    {!isApproved && (
                                                        <TouchableOpacity className="bg-green-600 px-2 py-1 rounded" onPress={() => authService.setApprovalStatus(u.uid, true).then(fetchUsers)}>
                                                            <Text className="text-white text-[10px] font-bold">Approve</Text>
                                                        </TouchableOpacity>
                                                    )}
                                                    <TouchableOpacity
                                                        className="bg-gray-100 p-1 rounded"
                                                        onPress={async () => {
                                                            try {
                                                                await authService.resetPassword(u.email);
                                                                if (Platform.OS === 'web') window.alert(`Password reset email sent to ${u.email}`);
                                                                else Alert.alert("Success", `Password reset email sent to ${u.email}`);
                                                            } catch (error: any) {
                                                                if (Platform.OS === 'web') window.alert("Error: " + error.message);
                                                                else Alert.alert("Error", error.message);
                                                            }
                                                        }}
                                                    >
                                                        <MaterialCommunityIcons name="key-variant" size={16} color="#6B7280" />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity className={`px-2 py-1 rounded ${u.isAdmin ? 'bg-orange-100' : 'bg-blue-100'}`} onPress={() => handleToggleAdmin(u.uid, u.isAdmin)}>
                                                        <Text className={`font-bold text-[10px] ${u.isAdmin ? 'text-orange-600' : 'text-blue-600'}`}>
                                                            {u.isAdmin ? 'Demote' : 'Promote'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        className="bg-red-50 p-1 rounded"
                                                        onPress={() => handleDeleteUser(u.uid, u.displayName || u.email)}
                                                    >
                                                        <MaterialCommunityIcons name="trash-can-outline" size={16} color="#DC2626" />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </View>

                        {/* 2. MANUALLY ADD USER */}
                        <View className="bg-white p-4 rounded-lg shadow-sm mb-4 border border-gray-200">
                            <TouchableOpacity
                                className="flex-row justify-between items-center"
                                onPress={() => setShowAddUser(!showAddUser)}
                            >
                                <View className="flex-row items-center">
                                    <MaterialCommunityIcons name="account-plus" size={20} color="#6B7280" style={{ marginRight: 8 }} />
                                    <Text className="text-lg font-bold text-gray-800">Manually Add User</Text>
                                </View>
                                <MaterialCommunityIcons name={showAddUser ? 'chevron-up' : 'chevron-down'} size={24} color="#6B7280" />
                            </TouchableOpacity>

                            {showAddUser && (
                                <View className="mt-4 border-t border-gray-100 pt-4">
                                    <View className="gap-y-3">
                                        <View className="flex-row gap-x-2">
                                            <TextInput className="flex-1 bg-gray-50 p-2 rounded border border-gray-200 text-sm" placeholder="First Name" value={newUserFirstName} onChangeText={setNewUserFirstName} />
                                            <TextInput className="flex-1 bg-gray-50 p-2 rounded border border-gray-200 text-sm" placeholder="Last Name" value={newUserLastName} onChangeText={setNewUserLastName} />
                                        </View>
                                        <TextInput className="bg-gray-50 p-2 rounded border border-gray-200 text-sm" placeholder="Email" value={newUserEmail} onChangeText={setNewUserEmail} autoCapitalize="none" />
                                        <TextInput className="bg-gray-50 p-2 rounded border border-gray-200 text-sm" placeholder="Password" value={newUserPassword} onChangeText={setNewUserPassword} />
                                        <TextInput className="bg-gray-50 p-2 rounded border border-gray-200 text-sm" placeholder="Phone (e.g. +1 123 456 7890)" value={newUserPhone} onChangeText={setNewUserPhone} keyboardType="phone-pad" />

                                        <View className="mt-2">
                                            <Text className="text-xs font-bold text-gray-700 mb-2">Sports Interests</Text>
                                            <View className="flex-row flex-wrap gap-2">
                                                {globalSports.map(sport => {
                                                    const isSelected = selectedSports.includes(sport.name);
                                                    return (
                                                        <TouchableOpacity
                                                            key={sport.id}
                                                            onPress={() => {
                                                                if (isSelected) {
                                                                    setSelectedSports(selectedSports.filter(s => s !== sport.name));
                                                                } else {
                                                                    setSelectedSports([...selectedSports, sport.name]);
                                                                }
                                                            }}
                                                            className={`flex-row items-center px-3 py-1.5 rounded-full border ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-gray-50 border-gray-200'}`}
                                                        >
                                                            <MaterialCommunityIcons
                                                                name={sport.icon as any}
                                                                size={14}
                                                                color={isSelected ? 'white' : '#6B7280'}
                                                                style={{ marginRight: 4 }}
                                                            />
                                                            <Text className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-gray-700'}`}>
                                                                {sport.name}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                            {globalSports.length === 0 && <Text className="text-[10px] text-gray-400 italic">No sports available to select.</Text>}
                                        </View>

                                        <TouchableOpacity
                                            onPress={handleAddUser}
                                            disabled={isCreatingUser}
                                            className={`p-3 rounded-lg items-center ${isCreatingUser ? 'bg-gray-400' : 'bg-green-600'}`}
                                        >
                                            <Text className="text-white font-bold">{isCreatingUser ? 'Creating...' : 'Create User'}</Text>
                                        </TouchableOpacity>
                                        {successMsg ? <Text className="text-green-600 text-xs text-center font-bold">{successMsg}</Text> : null}
                                    </View>
                                </View>
                            )}
                        </View>
                    </>
                )}

                {/* --- SYSTEM TAB --- */}
                {activeTab === 'system' && (
                    <>
                        <SystemHealthCheck />

                        <View className="bg-white p-4 rounded-lg shadow-sm mb-4 border border-gray-200">
                            <TouchableOpacity onPress={() => setShowDebugInfo(!showDebugInfo)} className="flex-row justify-between items-center">
                                <View className="flex-row items-center">
                                    <MaterialCommunityIcons name="bug" size={20} color="#6B7280" style={{ marginRight: 8 }} />
                                    <Text className="text-lg font-bold text-gray-800">Debug Info</Text>
                                </View>
                                <MaterialCommunityIcons name={showDebugInfo ? 'chevron-up' : 'chevron-down'} size={24} color="#6B7280" />
                            </TouchableOpacity>
                            {showDebugInfo && (
                                <View className="mt-4 border-t border-gray-100 pt-4">
                                    <Text className="text-xs text-gray-600 font-mono mb-1">
                                        GameID: {getScanningGameId()}
                                    </Text>
                                    <Text className="text-xs text-gray-600 font-mono mb-4">
                                        DB Time: {legacyMatchData?.votingOpensAt ? new Date(legacyMatchData.votingOpensAt).toLocaleString() : 'N/A (Doc Missing?)'}
                                    </Text>
                                    <View className="flex-row gap-2">
                                        <TouchableOpacity
                                            onPress={async () => {
                                                await votingService.initializeWeek();
                                                if (Platform.OS === 'web') {
                                                    window.alert('Initialized: Forced game document initialization.');
                                                } else {
                                                    Alert.alert('Initialized', 'Forced game document initialization.');
                                                }
                                            }}
                                            className="bg-gray-500 px-3 py-2 rounded flex-1 items-center"
                                        >
                                            <Text className="text-xs text-white font-bold">RE-INIT</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={async () => {
                                                if (Platform.OS === 'web') {
                                                    if (window.confirm("DANGER: Delete current week document? This resets everything for this week.")) {
                                                        await votingService.deleteWeek();
                                                        window.alert("Deleted. Go to Home to see auto-init.");
                                                    }
                                                } else {
                                                    Alert.alert("Delete Week?", "This resets everything for this week.", [
                                                        { text: "Cancel" },
                                                        { text: "Delete", style: "destructive", onPress: async () => await votingService.deleteWeek() }
                                                    ]);
                                                }
                                            }}
                                            className="bg-red-100 border border-red-200 px-3 py-2 rounded flex-1 items-center"
                                        >
                                            <Text className="text-xs text-red-800 font-bold">DELETE WEEK</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </View>

                        <View className="bg-white p-4 rounded-lg shadow-sm mb-4 border border-gray-200">
                            <TouchableOpacity onPress={() => setShowMaintenance(!showMaintenance)} className="flex-row justify-between items-center">
                                <View className="flex-row items-center">
                                    <MaterialCommunityIcons name="tools" size={20} color="#6B7280" style={{ marginRight: 8 }} />
                                    <Text className="text-lg font-bold text-gray-800">Maintenance</Text>
                                </View>
                                <MaterialCommunityIcons name={showMaintenance ? 'chevron-up' : 'chevron-down'} size={24} color="#6B7280" />
                            </TouchableOpacity>
                            {showMaintenance && (
                                <View className="mt-4 border-t border-gray-100 pt-4">
                                    <TouchableOpacity className="bg-red-100 p-3 rounded items-center" onPress={() => votingService.deleteWeek()}>
                                        <Text className="text-red-800 font-bold">DELETE CURRENT WEEK</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </>
                )}




            </ScrollView>
        </KeyboardAvoidingView >
    );
}
