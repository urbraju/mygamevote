/**
 * Admin Dashboard
 * 
 * Provides administrative controls for the game slots. Allows admins to:
 * - Configure game settings (Max slots, Waitlist limit, Voting time).
 * - Enable/Disable payments and set payment details.
 * - Manage players (Remove users, which auto-promotes waitlisted users).
 */
import React, { useEffect, useState } from 'react';
import { View, Text, Switch, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { adminService } from '../../services/adminService';
import { authService } from '../../services/authService';
import { votingService, WeeklySlotData } from '../../services/votingService';
import { useAuth } from '../../context/AuthContext';
import { Stack, useRouter } from 'expo-router';
import { getScanningGameId } from '../../utils/dateUtils';
import { generateWhatsAppLink } from '../../utils/shareUtils';

export default function AdminScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [data, setData] = useState<WeeklySlotData | null>(null);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [maxSlots, setMaxSlots] = useState('14');
    const [maxWaitlist, setMaxWaitlist] = useState('4');
    const [votingOpenDate, setVotingOpenDate] = useState('');
    const [votingCloseDate, setVotingCloseDate] = useState('');
    const [fees, setFees] = useState('0');
    const [adminPhoneNumber, setAdminPhoneNumber] = useState(''); // New State

    // Helper Component for Date Selection (Simplified for React Native compatibility)
    // Using simple increment/decrement or text input would be safer than HTML <select> which breaks native
    const DateSelector = ({ dateStr, onChange }: { dateStr: string, onChange: (val: string) => void }) => {
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

        return (
            <View className="gap-y-2">
                <View className="flex-row justify-between">
                    <View className="items-center">
                        <Text className="text-xs text-gray-500">Month</Text>
                        <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded">
                            <TouchableOpacity onPress={() => adjust('month', -1)} className="p-2 bg-gray-200"><Text>-</Text></TouchableOpacity>
                            <Text className="w-12 text-center">{d.toLocaleString('default', { month: 'short' })}</Text>
                            <TouchableOpacity onPress={() => adjust('month', 1)} className="p-2 bg-gray-200"><Text>+</Text></TouchableOpacity>
                        </View>
                    </View>
                    <View className="items-center">
                        <Text className="text-xs text-gray-500">Day</Text>
                        <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded">
                            <TouchableOpacity onPress={() => adjust('day', -1)} className="p-2 bg-gray-200"><Text>-</Text></TouchableOpacity>
                            <Text className="w-12 text-center">{d.getDate()}</Text>
                            <TouchableOpacity onPress={() => adjust('day', 1)} className="p-2 bg-gray-200"><Text>+</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
                <View className="flex-row justify-between">
                    <View className="items-center">
                        <Text className="text-xs text-gray-500">Hour</Text>
                        <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded">
                            <TouchableOpacity onPress={() => adjust('hour', -1)} className="p-2 bg-gray-200"><Text>-</Text></TouchableOpacity>
                            <Text className="w-12 text-center">{d.getHours().toString().padStart(2, '0')}</Text>
                            <TouchableOpacity onPress={() => adjust('hour', 1)} className="p-2 bg-gray-200"><Text>+</Text></TouchableOpacity>
                        </View>
                    </View>
                    <View className="items-center">
                        <Text className="text-xs text-gray-500">Minute</Text>
                        <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded">
                            <TouchableOpacity onPress={() => adjust('minute', -15)} className="p-2 bg-gray-200"><Text>-</Text></TouchableOpacity>
                            <Text className="w-12 text-center">{d.getMinutes().toString().padStart(2, '0')}</Text>
                            <TouchableOpacity onPress={() => adjust('minute', 15)} className="p-2 bg-gray-200"><Text>+</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        );
    };
    const [paymentEnabled, setPaymentEnabled] = useState(false);
    const [isOpen, setIsOpen] = useState(true);

    // Add User State
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserFirstName, setNewUserFirstName] = useState('');
    const [newUserLastName, setNewUserLastName] = useState('');
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        // Ensure the week is initialized
        votingService.initializeWeek().catch(console.error);

        // Subscribe to current slots
        const unsubscribe = votingService.subscribeToSlots((slotData) => {
            if (slotData) {
                setData(slotData);
                setMaxSlots(slotData.maxSlots.toString());
                setMaxWaitlist(slotData.maxWaitlist?.toString() || '4');
                setPaymentEnabled(slotData.paymentEnabled);
                setIsOpen(slotData.isOpen);
                setAdminPhoneNumber(slotData.adminPhoneNumber || ''); // Load Phone

                if (slotData.votingOpensAt) {
                    setVotingOpenDate(new Date(slotData.votingOpensAt).toISOString());
                }
                if (slotData.votingClosesAt) {
                    setVotingCloseDate(new Date(slotData.votingClosesAt).toISOString());
                }
            }
        });

        // Fetch all users
        fetchUsers();

        return unsubscribe;
        return unsubscribe;
    }, []);

    // Monitoring Effect for Auto-Share Prompt
    useEffect(() => {
        if (!data || !data.slots) return;

        // Check if conditions met
        const isFull = data.slots.length >= data.maxSlots;

        // Check time (15 mins after opening)
        let timeUp = false;
        if (data.votingOpensAt) {
            const fifteenMins = 15 * 60 * 1000;
            if (Date.now() > data.votingOpensAt + fifteenMins) {
                timeUp = true;
            }
        }

        // Only trigger if NOT already triggered and conditions met
        if ((isFull || timeUp) && !data.shareTriggered) {
            const reason = isFull ? "Slots are full!" : "15 minutes have passed!";

            // Prevent loop by marking immediately or showing prompt
            // We'll show prompt. Logic to prevent multiple alerts is handled by !data.shareTriggered
            // But React might re-render, so we need to be careful.
            // The alert is blocking in Native, but non-blocking in Web.

            if (Platform.OS === 'web') {
                // Use a small timeout to let UI render
                setTimeout(() => {
                    // Check again inside timeout to be safe
                    if (window.confirm(`📢 ${reason}\n\nDo you want to send the WhatsApp list to Admin now?`)) {
                        const url = generateWhatsAppLink(data);
                        window.open(url, '_blank');
                        votingService.markShareTriggered();
                    } else {
                        // If they say no, mark it anyway so we don't annoy them
                        if (window.confirm("Mark as checked so this doesn't pop up again?")) {
                            votingService.markShareTriggered();
                        }
                    }
                }, 1000);
            } else {
                Alert.alert(
                    "📢 Auto-Share Prompt",
                    `${reason}\n\nSend WhatsApp list to Admin?`,
                    [
                        { text: "No (Don't ask again)", onPress: () => votingService.markShareTriggered() },
                        { text: "No (Ask later)", style: "cancel" },
                        {
                            text: "Yes, Send",
                            onPress: () => {
                                const url = generateWhatsAppLink(data);
                                Linking.openURL(url);
                                votingService.markShareTriggered();
                            }
                        }
                    ]
                );
            }
        }
    }, [data]); // Depend on data updates

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
            Alert.alert('Success', 'User role updated!');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const handleSaveConfig = async () => {
        try {
            const config: any = {
                maxSlots: parseInt(maxSlots),
                maxWaitlist: parseInt(maxWaitlist),
                paymentEnabled: paymentEnabled,
                isOpen: isOpen,
                adminPhoneNumber: adminPhoneNumber // Save Phone
            };

            // Try to parse the date strings
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

            // Ensure document exists before updating
            await votingService.initializeWeek();
            await adminService.updateGlobalConfig(config);
            Alert.alert('Success', 'Configuration updated!');
        } catch (error: any) {
            console.error('Save Config Error:', error);
            Alert.alert('Error', error.message);
        }
    };

    const handleRemoveUser = async (userId: string) => {
        try {
            await votingService.removeVote(userId);
            Alert.alert('Success', 'User removed from list.');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const handleAddUser = async () => {
        // Trim inputs to remove accidental whitespace
        const email = newUserEmail.trim();
        const first = newUserFirstName.trim();
        const last = newUserLastName.trim();
        const password = newUserPassword.trim();

        if (!email || !password || !first || !last) {
            Alert.alert('Error', 'All fields are required');
            return;
        }
        setIsCreatingUser(true);
        setSuccessMsg(''); // Clear previous
        try {
            await authService.adminCreateUser(email, password, first, last);
            setSuccessMsg(`User ${first} created successfully!`);

            // Reset form
            setNewUserEmail('');
            setNewUserPassword('');
            setNewUserFirstName('');
            setNewUserLastName('');

            // Fetch immediately and again after a short delay to ensure consistency
            fetchUsers();
            setTimeout(fetchUsers, 1000);
        } catch (error: any) {
            let msg = error.message;
            if (msg.includes('email-already-in-use')) {
                msg = "This email is already taken. If they are not in the list, ask them to log in once to fix their account.";
            } else if (msg.includes('invalid-email')) {
                msg = "Invalid email address. Please check for typos.";
            }
            Alert.alert('Error', msg);
        } finally {
            setIsCreatingUser(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1 bg-gray-100"
        >
            <Stack.Screen options={{ title: "Admin Dashboard v1.2" }} />
            <ScrollView className="p-4">
                {/* ... (Registered Members section skipped for this replace block) ... */}
                {/* ... (Back button and Debug section skipped for this replace block) ... */}

                <TouchableOpacity
                    onPress={() => router.back()}
                    className="flex-row items-center mb-4 p-2"
                >
                    <Text className="text-blue-600 font-bold text-lg">← Back to Home</Text>
                </TouchableOpacity>

                {/* DEBUG SECTION */}
                <View className="mb-4 bg-gray-200 p-2 rounded">
                    <Text className="text-xs text-gray-600 font-mono">
                        Debug: GameID: {getScanningGameId()}
                    </Text>
                    <Text className="text-xs text-gray-600 font-mono">
                        DB Time: {data?.votingOpensAt ? new Date(data.votingOpensAt).toLocaleString() : 'N/A (Doc Missing?)'}
                    </Text>
                    <TouchableOpacity
                        onPress={async () => {
                            await votingService.initializeWeek();
                            Alert.alert('Initialized', 'Forced game document initialization.');
                        }}
                        className="mt-2 bg-gray-400 p-1 rounded self-start"
                    >
                        <Text className="text-[10px] text-white">FORCE INIT DOC</Text>
                    </TouchableOpacity>
                </View>

                <View className="bg-white p-4 rounded-lg shadow-sm mb-4">
                    <Text className="text-xl font-bold mb-4 text-gray-800">Game Configuration</Text>

                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-gray-700 font-medium">Enable Payments</Text>
                        <Switch
                            value={paymentEnabled}
                            onValueChange={setPaymentEnabled}
                        />
                    </View>

                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-gray-700 font-medium">Voting Open (Status Override)</Text>
                        <Switch
                            value={isOpen}
                            onValueChange={setIsOpen}
                            trackColor={{ false: "#D1D5DB", true: "#10B981" }}
                        />
                    </View>

                    <View className="mb-4">
                        <Text className="text-gray-700 font-medium mb-1">Max Slots</Text>
                        <TextInput
                            className="border border-gray-300 rounded p-2 bg-gray-50"
                            keyboardType="numeric"
                            value={maxSlots}
                            onChangeText={setMaxSlots}
                        />
                    </View>

                    <View className="mb-4">
                        <Text className="text-gray-700 font-medium mb-1">Max Waitlist</Text>
                        <TextInput
                            className="border border-gray-300 rounded p-2 bg-gray-50"
                            keyboardType="numeric"
                            value={maxWaitlist}
                            onChangeText={setMaxWaitlist}
                        />
                    </View>

                    <View className="mb-4">
                        <Text className="text-gray-700 font-medium mb-1">Admin WhatsApp Number</Text>
                        <TextInput
                            className="border border-gray-300 rounded p-2 bg-gray-50"
                            placeholder="e.g. 15551234567 (Country Code + Number)"
                            keyboardType="phone-pad"
                            value={adminPhoneNumber}
                            onChangeText={setAdminPhoneNumber}
                        />
                        <Text className="text-[10px] text-gray-400">Enter full number with country code, no spaces.</Text>
                    </View>

                    <View className="mb-6">
                        <Text className="text-gray-700 font-bold mb-3">Voting Opens At</Text>
                        <DateSelector dateStr={votingOpenDate} onChange={setVotingOpenDate} />
                        <Text className="text-[10px] text-gray-400 mt-2">Start: {votingOpenDate ? new Date(votingOpenDate).toLocaleString() : 'Not Set'}</Text>
                    </View>

                    <View className="mb-6">
                        <Text className="text-gray-700 font-bold mb-3">Voting Closes At</Text>
                        <DateSelector dateStr={votingCloseDate} onChange={setVotingCloseDate} />
                        <Text className="text-[10px] text-gray-400 mt-2">End: {votingCloseDate ? new Date(votingCloseDate).toLocaleString() : 'Not Set'}</Text>
                    </View>

                    <TouchableOpacity
                        className="bg-blue-600 p-3 rounded items-center"
                        onPress={handleSaveConfig}
                    >
                        <Text className="text-white font-bold">Save Changes</Text>
                    </TouchableOpacity>
                </View>

                <View className="bg-white p-4 rounded-lg shadow-sm mb-4">
                    <Text className="text-xl font-bold mb-4 text-gray-800">Manually Add User</Text>
                    <View className="gap-y-3">
                        <View className="flex-row gap-x-2">
                            <TextInput
                                className="flex-1 bg-gray-50 p-2 rounded border border-gray-200"
                                placeholder="First Name"
                                value={newUserFirstName}
                                onChangeText={setNewUserFirstName}
                            />
                            <TextInput
                                className="flex-1 bg-gray-50 p-2 rounded border border-gray-200"
                                placeholder="Last Name"
                                value={newUserLastName}
                                onChangeText={setNewUserLastName}
                            />
                        </View>
                        <TextInput
                            className="bg-gray-50 p-2 rounded border border-gray-200"
                            placeholder="Email"
                            value={newUserEmail}
                            onChangeText={setNewUserEmail}
                            autoCapitalize="none"
                        />
                        <TextInput
                            className="bg-gray-50 p-2 rounded border border-gray-200"
                            placeholder="Password"
                            value={newUserPassword}
                            onChangeText={setNewUserPassword}
                        />
                        <TouchableOpacity
                            onPress={handleAddUser}
                            disabled={isCreatingUser}
                            className={`p-3 rounded-lg items-center ${isCreatingUser ? 'bg-gray-400' : 'bg-green-600'}`}
                        >
                            <Text className="text-white font-bold">
                                {isCreatingUser ? 'Creating...' : 'Create User'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View className="bg-white p-4 rounded-lg shadow-sm mb-4">
                    <View className="flex-col mb-4">
                        <View className="flex-row justify-between items-center mb-2">
                            <Text className="text-xl font-bold text-gray-800">Manage Players</Text>
                            {data?.slots && data.slots.length > 0 && (
                                <View className="flex-row gap-2">
                                    <TouchableOpacity
                                        className="bg-green-500 px-3 py-1 rounded flex-row items-center"
                                        onPress={() => {
                                            if (data) {
                                                const url = generateWhatsAppLink(data);
                                                console.log("WhatsApp URL:", url);
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
                                            if (data) {
                                                // Re-generate message WITHOUT the URL encoding for clipboard
                                                const rawMessage = decodeURIComponent(generateWhatsAppLink(data).split('text=')[1]);
                                                if (Platform.OS === 'web') {
                                                    await navigator.clipboard.writeText(rawMessage);
                                                    alert("Message copied to clipboard!");
                                                } else {
                                                    // Native clipboard would require expo-clipboard, guarding for now
                                                    Alert.alert("Info", "Clipboard Copy is web-only for now.");
                                                }
                                            }
                                        }}
                                    >
                                        <Text className="text-white text-xs font-bold">📋 Copy</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => {
                                            console.log('CLEAR ALL pressed');
                                            if (Platform.OS === 'web') {
                                                if (window.confirm("This will remove EVERYONE from the list. This cannot be undone.")) {
                                                    votingService.removeAllVotes()
                                                        .then(() => alert("All players removed."))
                                                        .catch(e => alert(e.message));
                                                }
                                            } else {
                                                Alert.alert(
                                                    "Clear All Players?",
                                                    "This will remove EVERYONE from the list. This cannot be undone.",
                                                    [
                                                        { text: "Cancel", style: "cancel" },
                                                        {
                                                            text: "CLEAR ALL",
                                                            style: "destructive",
                                                            onPress: async () => {
                                                                try {
                                                                    await votingService.removeAllVotes();
                                                                    Alert.alert("Cleared", "All players removed.");
                                                                } catch (e: any) {
                                                                    Alert.alert("Error", e.message);
                                                                }
                                                            }
                                                        }
                                                    ]
                                                );
                                            }
                                        }}
                                        className="bg-red-600 px-3 py-1 rounded"
                                    >
                                        <Text className="text-white text-xs font-bold">CLEAR ALL</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>
                    {data?.slots?.map((slot) => (
                        <View key={slot.userId} className="flex-row justify-between items-center py-3 border-b border-gray-100">
                            <View>
                                <Text className="font-semibold">{slot.userName}</Text>
                                {slot.userEmail && slot.userEmail !== slot.userName && (
                                    <Text className="text-xs text-gray-500">{slot.userEmail}</Text>
                                )}
                                <Text className={`text-xs ${slot.status === 'confirmed' ? 'text-green-600' : 'text-red-500'}`}>
                                    {slot.status.toUpperCase()}
                                </Text>
                            </View>
                            <TouchableOpacity
                                className="bg-red-100 px-3 py-1 rounded"
                                onPress={() => Alert.alert(
                                    "Remove User?",
                                    `Are you sure you want to remove ${slot.userName}?`,
                                    [
                                        { text: "Cancel", style: "cancel" },
                                        { text: "Remove", style: "destructive", onPress: () => handleRemoveUser(slot.userId) }
                                    ]
                                )}
                            >
                                <Text className="text-red-600 font-bold text-xs">Remove</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                    {(!data || !data.slots || data.slots.length === 0) && (
                        <Text className="text-gray-400 italic">No players to manage yet.</Text>
                    )}
                </View>

                <View className="bg-white p-4 rounded-lg shadow-sm mb-8">
                    <View className="flex-col mb-4">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-xl font-bold text-gray-800">Registered Members</Text>
                            <TouchableOpacity onPress={fetchUsers} className="bg-gray-100 px-3 py-1 rounded">
                                <Text className="text-xs text-blue-600 font-bold">Refresh List</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                            className="bg-red-600 p-3 rounded-lg items-center shadow-sm"
                            onPress={() => {
                                if (Platform.OS === 'web') {
                                    if (window.confirm("DANGER: This will delete ALL non-admin user profiles? They will lose access.")) {
                                        authService.deleteNonAdminUsers()
                                            .then(() => {
                                                alert("All non-admin users deleted.");
                                                fetchUsers();
                                            })
                                            .catch(e => alert(e.message));
                                    }
                                } else {
                                    Alert.alert(
                                        "Delete Non-Admins?",
                                        "This will delete ALL non-admin user profiles. This cannot be undone.",
                                        [
                                            { text: "Cancel", style: "cancel" },
                                            {
                                                text: "DELETE ALL",
                                                style: "destructive",
                                                onPress: async () => {
                                                    try {
                                                        await authService.deleteNonAdminUsers();
                                                        Alert.alert("Success", "All non-admin users deleted.");
                                                        fetchUsers();
                                                    } catch (e: any) {
                                                        Alert.alert("Error", e.message);
                                                    }
                                                }
                                            }
                                        ]
                                    );
                                }
                            }}
                        >
                            <Text className="text-white font-bold text-sm uppercase">⚠ DELETE ALL NON-ADMIN USERS</Text>
                        </TouchableOpacity>
                    </View>
                    {allUsers.map((u) => (
                        <View key={u.uid} className="flex-row justify-between items-center py-3 border-b border-gray-100">
                            <View className="flex-1">
                                <Text className="font-semibold" numberOfLines={1}>{u.displayName || u.email}</Text>
                                <Text className="text-xs text-gray-500">{u.email}</Text>
                                <Text className="text-[10px] text-gray-400">{u.isAdmin ? 'ADMIN' : 'PLAYER'}</Text>
                            </View>
                            <View className="flex-row items-center">
                                <TouchableOpacity
                                    className={`px-2 py-1 rounded mr-2 ${u.isAdmin ? 'bg-orange-100' : 'bg-blue-100'}`}
                                    onPress={() => handleToggleAdmin(u.uid, u.isAdmin)}
                                >
                                    <Text className={`font-bold text-[10px] ${u.isAdmin ? 'text-orange-600' : 'text-blue-600'}`}>
                                        {u.isAdmin ? 'Demote' : 'Promote'}
                                    </Text>
                                </TouchableOpacity>
                                {!u.isAdmin && (
                                    <TouchableOpacity
                                        className="bg-red-100 px-2 py-1 rounded"
                                        onPress={() => {
                                            if (Platform.OS === 'web') {
                                                if (window.confirm(`Delete user ${u.email}?`)) {
                                                    authService.deleteUser(u.uid).then(fetchUsers);
                                                }
                                            } else {
                                                Alert.alert("Delete User?", `Delete ${u.email}?`, [
                                                    { text: "Cancel" },
                                                    { text: "Delete", style: 'destructive', onPress: () => authService.deleteUser(u.uid).then(fetchUsers) }
                                                ]);
                                            }
                                        }}
                                    >
                                        <Text className="text-red-600 font-bold text-[10px]">X</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    ))}
                    {allUsers.length === 0 && (
                        <Text className="text-gray-400 italic">No registered members found.</Text>
                    )}
                </View>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}
