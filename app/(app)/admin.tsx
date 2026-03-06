/**
 * Admin Dashboard
 * 
 *
 * Provides administrative controls for the game slots. Allows admins to:
 * - Configure game settings (Max slots, Waitlist limit, Voting time).
 * - Enable/Disable payments and set payment details.
 * - Manage players (Remove users, which auto-promotes waitlisted users).
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Switch, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../firebaseConfig';
import { StatusBanner } from '../../components/StatusBanner';
import { adminService } from '../../services/adminService';
import { authService } from '../../services/authService';
import { organizationService } from '../../services/organizationService';
import { interestRequestService, InterestRequest } from '../../services/interestRequestService';
import { votingService, WeeklySlotData, SlotUser } from '../../services/votingService';
import { sportsService, Sport } from '../../services/sportsService';
import { eventService, GameEvent } from '../../services/eventService';
import { useAuth } from '../../context/AuthContext';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { DateSelector, ManageSportsSection, ManageEventsSection, FinancialDashboard } from '../../components/admin/AdminComponents';
import TeamManager from '../../components/admin/TeamManager';
import { getScanningGameId, getVotingStartTime, getCentralTime, formatInCentralTime, getNextGameDate, getVotingStartForDate, getMillis } from '../../utils/dateUtils';
import { generateWhatsAppLink } from '../../utils/shareUtils';
import { format } from 'date-fns';
import { Timestamp, doc, onSnapshot } from 'firebase/firestore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SystemHealthCheck from '../../components/SystemHealthCheck';

export default function AdminScreen() {
    const { user, activeOrgId, isOrgAdmin, isAdmin, loading, multiTenancyEnabled, organizations, refreshAuthContext } = useAuth();
    const router = useRouter();

    // Use isOrgAdmin as the primary check for admin features
    const canManage = isOrgAdmin || isAdmin;
    const isCurrentUserSuper = ['urbraju@gmail.com', 'brutechgyan@gmail.com', 'support@mygamevote.com'].includes(user?.email?.toLowerCase() || '');

    useEffect(() => {
        console.log('[AdminScreen] Mount - canManage:', canManage, 'loading:', loading, 'user:', user?.email);
        if (!loading && !canManage) {
            console.log('[AdminScreen] Access Denied - Redirecting home');
            router.replace('/home');
        }
    }, [canManage, loading, router]);

    const [matchData, setMatchData] = useState<WeeklySlotData | null>(null);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [maxSlots, setMaxSlots] = useState('14');
    const [maxWaitlist, setMaxWaitlist] = useState('4');
    const [votingOpenDate, setVotingOpenDate] = useState('');
    const [votingCloseDate, setVotingCloseDate] = useState('');
    const [fees, setFees] = useState('0');
    // Next Game Overrides
    const [isOverrideEnabled, setIsOverrideEnabled] = useState(false);
    const [isCustomVotingWindowEnabled, setIsCustomVotingWindowEnabled] = useState(false);
    const [nextGameDateOverride, setNextGameDateOverride] = useState('');
    const [nextGameDetailsOverride, setNextGameDetailsOverride] = useState('');
    const [sportNameOverride, setSportNameOverride] = useState('');
    const [locationOverride, setLocationOverride] = useState('');
    const [sportIconOverride, setSportIconOverride] = useState('');

    // Inline Member Interest Editing
    const [editingInterestsUser, setEditingInterestsUser] = useState<string | null>(null);
    const [editingInterestsList, setEditingInterestsList] = useState<string[]>([]);
    const [editingSkillsMap, setEditingSkillsMap] = useState<{ [key: string]: number }>({});
    const [isSavingInterests, setIsSavingInterests] = useState(false);
    const [matchDay, setMatchDay] = useState('Saturday');
    const [matchTime, setMatchTime] = useState('7:00 AM');
    const [isCancelled, setIsCancelled] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [requireApproval, setRequireApproval] = useState(false);
    const [adminPhoneNumber, setAdminPhoneNumber] = useState('');
    const [isAdminPhoneEnabled, setIsAdminPhoneEnabled] = useState(false);
    const [isCustomSlotsEnabled, setIsCustomSlotsEnabled] = useState(false);

    // Global Sports State (for ManageSports and Manual User Add)
    const [globalSports, setGlobalSports] = useState<Sport[]>([]);
    const [globalFeaturedIds, setGlobalFeaturedIds] = useState<string[]>([]);
    const [loadingSports, setLoadingSports] = useState(false);

    // Navigation State
    const [activeTab, setActiveTab] = useState<'ops' | 'setup' | 'group' | 'users' | 'system'>('ops');

    // Promoted Operations State
    const [activeMatchId, setActiveMatchId] = useState<string>('legacy');
    const [isLegacy, setIsLegacy] = useState(true);
    const [opMatchData, setOpMatchData] = useState<any>(null);
    const [upcomingEvents, setUpcomingEvents] = useState<GameEvent[]>([]);
    const [isVerifying, setIsVerifying] = useState(false);

    // Section Toggles
    const [showSports, setShowSports] = useState(false);
    const [showEvents, setShowEvents] = useState(false);
    const [showGameConfig, setShowGameConfig] = useState(false);
    const [showUserManagement, setShowUserManagement] = useState(false);
    const [showOrgSettings, setShowOrgSettings] = useState(false); // New section
    const [adminStatus, setAdminStatus] = useState<{ message: string; type: 'success' | 'info' | 'error' | 'warning' } | null>(null);
    const [pendingCount, setPendingCount] = useState(0);
    const [approvedCount, setApprovedCount] = useState(0);
    const [currentOrg, setCurrentOrg] = useState<any>(null);

    // New Interest Requests State
    const [interestRequests, setInterestRequests] = useState<InterestRequest[]>([]);
    const [showInterestRequests, setShowInterestRequests] = useState(true);

    const fetchGlobalSports = useCallback(async () => {
        if (!activeOrgId) return;
        setLoadingSports(true);
        try {
            const [list, featured] = await Promise.all([
                sportsService.getAllSports(activeOrgId),
                sportsService.getFeaturedSportIds()
            ]);
            setGlobalSports(list);
            setGlobalFeaturedIds(featured);
        } catch (err) {
            console.error("Failed to fetch global sports", err);
        } finally {
            setLoadingSports(false);
        }
    }, [activeOrgId]);

    useEffect(() => {
        fetchGlobalSports();
    }, [fetchGlobalSports]);

    // DateSelector removed (moved to components/admin/AdminComponents.tsx)
    const [paymentEnabled, setPaymentEnabled] = useState(false);
    const [paymentZelle, setPaymentZelle] = useState('');
    const [paymentPaypal, setPaymentPaypal] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [isOpen, setIsOpen] = useState(true);

    // User Management Sub-sections
    const [showAddUser, setShowAddUser] = useState(false);
    const [showCurrentPlayers, setShowCurrentPlayers] = useState(false); // Collapsed by default
    const [showAllUsers, setShowAllUsers] = useState(false);
    const [showMatchInfo, setShowMatchInfo] = useState(false); // Collapsed by default
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
    const [showGlobalSettings, setShowGlobalSettings] = useState(false);
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [initialLoading, setInitialLoading] = useState(true); // Renamed to avoid conflict with useAuth loading
    const [hasPromptedShare, setHasPromptedShare] = useState(false);

    const fetchAllUsers = useCallback(async () => {
        try {
            const users = await adminService.getAllUsers(activeOrgId);

            // Fetch FRESH org data directly to ensure we have the latest members/pending lists
            // especially after a manual approval action.
            const activeOrg = await organizationService.getOrganization(activeOrgId);

            if (activeOrg) {
                const members = users.filter((u: any) => activeOrg.members?.includes(u.uid));
                const pending = users.filter((u: any) => (activeOrg.pendingMembers || []).includes(u.uid));

                setApprovedCount(members.length);
                setPendingCount(pending.length);
                setAllUsers(users.filter((u: any) => activeOrg.members?.includes(u.uid) || (activeOrg.pendingMembers || []).includes(u.uid)));
            }

            // Also fetch pending interest requests
            if (activeOrgId) {
                const requests = await interestRequestService.getPendingRequestsForOrg(activeOrgId);
                setInterestRequests(requests);
            }
        } catch (error) {
            console.error('Failed to fetch users or requests', error);
        }
    }, [activeOrgId]);

    const fetchMatchData = useCallback(() => {
        return votingService.subscribeToSlots((slotData) => {
            if (slotData) {
                setMatchData(slotData);
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
                setMatchDay(slotData.displayDay || 'Saturday');
                setMatchTime(slotData.displayTime || '7:00 AM');
                setIsCancelled(slotData.isCancelled || false);
                setCancelReason(slotData.cancelReason || '');
            }
            setInitialLoading(false);
        }, activeOrgId);
    }, [activeOrgId]);

    const fetchGlobalSettings = useCallback(async () => {
        try {
            const settings = await adminService.getGlobalSettings(activeOrgId);
            setRequireApproval(settings.requireApproval || false);
        } catch (error) {
            console.error("Failed to fetch global settings", error);
        }
    }, [activeOrgId]);

    const fetchUpcomingEvents = useCallback(async () => {
        try {
            const events = await eventService.getAllUpcomingEvents(activeOrgId);
            setUpcomingEvents(events);
        } catch (err) {
            console.error("Failed to fetch events for selector", err);
        }
    }, [activeOrgId]);

    const loadAdminData = useCallback(() => {
        if (!activeOrgId) return;
        fetchGlobalSettings();
        fetchUpcomingEvents();
        fetchAllUsers();
        fetchGlobalSports();
    }, [activeOrgId, fetchGlobalSettings, fetchUpcomingEvents, fetchAllUsers, fetchGlobalSports]);

    useFocusEffect(
        useCallback(() => {
            // Re-fetch data whenever screen is focused
            if (activeOrgId) {
                // We DON'T call fetchMatchData() here because it's a subscription 
                // handled in useEffect. Re-calling it here would leak listeners.
                loadAdminData();
            }

            // Note: We used to reset activeTab here, but it caused navigation issues
            // during rapid re-renders. Tabs should persist while on this screen.
        }, [activeOrgId, loadAdminData])
    );

    useEffect(() => {
        if (!activeOrgId) return;

        votingService.initializeWeek(activeOrgId).catch(console.error);

        // Subscriptions should live for the life of the component mount
        const unsubscribeSlots = fetchMatchData();

        const orgRef = doc(db, 'organizations', activeOrgId);
        const unsubscribeOrg = onSnapshot(orgRef, (snap) => {
            if (snap.exists()) {
                setCurrentOrg({ id: snap.id, ...snap.data() });
            }
        }, (error: any) => {
            if (error.code !== 'permission-denied') {
                console.error('[Admin] Org subscription error:', error);
            }
        });

        return () => {
            unsubscribeSlots();
            unsubscribeOrg();
        };
    }, [activeOrgId, fetchMatchData]);

    // Subscribe to selected operational match
    useEffect(() => {
        let unsubscribe: any;
        setOpMatchData(null); // Clear previous data while loading new match
        if (activeMatchId === 'legacy') {
            setIsLegacy(true);
            unsubscribe = votingService.subscribeToSlots((slotData) => {
                setOpMatchData(slotData);
            }, activeOrgId);
        } else if (activeOrgId) {
            setIsLegacy(false);
            const eventRef = doc(db, 'events', activeMatchId);
            unsubscribe = onSnapshot(eventRef, (docSnap) => {
                if (docSnap.exists()) {
                    setOpMatchData(docSnap.data());
                }
            }, (error: any) => {
                if (error.code === 'permission-denied') {
                    // Silently drop expected warning during logout
                } else {
                    console.error('[Admin] OpMatch subscription error:', error);
                }
            });
        }
        return () => unsubscribe && unsubscribe();
    }, [activeMatchId, activeOrgId]);

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
                        votingService.markShareTriggered(activeOrgId, activeMatchId); // Note: needs eventId support if custom
                    } else {
                        // If they say no, mark it anyway so we don't annoy them
                        if (window.confirm("Mark as checked so this doesn't pop up again?")) {
                            votingService.markShareTriggered(activeOrgId, activeMatchId);
                        }
                    }
                }, 1000);
            } else {
                // Native implementation...
                Alert.alert(
                    "📢 Auto-Share Prompt",
                    `${reason}\n\nSend WhatsApp list to Admin?`,
                    [
                        { text: "No (Don't ask again)", onPress: () => votingService.markShareTriggered(activeOrgId, activeMatchId) },
                        { text: "No (Ask later)", style: "cancel" },
                        {
                            text: "Yes, Send",
                            onPress: () => {
                                const url = generateWhatsAppLink(opMatchData);
                                Linking.openURL(url);
                                votingService.markShareTriggered(activeOrgId, activeMatchId);
                            }
                        }
                    ]
                );
            }
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [opMatchData?.slots?.length, opMatchData?.maxSlots, opMatchData?.votingOpensAt, opMatchData?.shareTriggered, activeOrgId, activeMatchId, hasPromptedShare]); // Specific dependencies to avoid re-running on every object ref change

    const handleToggleAdmin = async (userId: string, currentAdminStatus: boolean) => {
        if (!activeOrgId) return;
        try {
            await adminService.setAdminStatus(userId, !currentAdminStatus, activeOrgId);
            await refreshAuthContext(); // Force global context update for UI badges
            fetchAllUsers();
            if (Platform.OS === 'web') {
                window.alert('Success: Organization role updated!');
            } else {
                Alert.alert('Success', 'Organization role updated!');
            }
        } catch (error: any) {
            if (Platform.OS === 'web') {
                window.alert(`Error: ${error.message}`);
            } else {
                Alert.alert('Error', error.message);
            }
        }
    };

    const handleToggleGlobalAdmin = async (userId: string, currentStatus: boolean) => {
        const actionStr = currentStatus ? 'revoke Super Admin from' : 'make Super Admin for';
        const performToggle = async () => {
            try {
                await adminService.toggleGlobalAdmin(userId, !currentStatus);
                await refreshAuthContext();
                fetchAllUsers();
                if (Platform.OS === 'web') {
                    window.alert('Success: Global role updated!');
                } else {
                    Alert.alert('Success', 'Global role updated!');
                }
            } catch (error: any) {
                if (Platform.OS === 'web') {
                    window.alert(`Error: ${error.message}`);
                } else {
                    Alert.alert('Error', error.message);
                }
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm(`Are you sure you want to ${actionStr} this user?`)) performToggle();
        } else {
            Alert.alert("Confirm", `Are you sure you want to ${actionStr} this user?`, [
                { text: "Cancel", style: "cancel" },
                { text: "Yes", onPress: performToggle }
            ]);
        }
    };

    const handleSaveGeneralConfig = async () => {
        try {
            await adminService.toggleApprovalRequirement(requireApproval, activeOrgId);
            Alert.alert('Success', 'Settings updated');
        } catch (err) {
            Alert.alert('Error', 'Failed to update settings');
        }
    };

    const handleSaveDefaultConfig = async () => {
        try {
            const config = {
                maxSlots: parseInt(maxSlots),
                maxWaitlist: parseInt(maxWaitlist),
                fees: parseFloat(fees),
                adminPhoneNumber,
                isAdminPhoneEnabled,
                isCustomSlotsEnabled,
                sportName: sportNameOverride,
                sportIcon: sportIconOverride,
                location: locationOverride,
                displayDay: matchDay,
                displayTime: matchTime
            };
            await adminService.saveWeeklyMatchDefaults(config, activeOrgId);
            Alert.alert('Success', 'Match defaults saved');
        } catch (err) {
            Alert.alert('Error', 'Failed to save defaults');
        }
    };

    const executeSaveConfig = async () => {
        try {
            const parsedSlots = parseInt(maxSlots);
            const parsedWaitlist = parseInt(maxWaitlist);

            if (isCustomSlotsEnabled) {
                if (isNaN(parsedSlots) || parsedSlots < 1) {
                    if (Platform.OS === 'web') window.alert("Warning: Max slots must be at least 1.");
                    else Alert.alert("Invalid input", "Max slots must be at least 1.");
                    return;
                }
            }

            const config: any = {
                maxSlots: isCustomSlotsEnabled ? parsedSlots : 14,
                maxWaitlist: isCustomSlotsEnabled ? (isNaN(parsedWaitlist) ? 4 : parsedWaitlist) : 4,
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
            if (isOverrideEnabled) {
                config.nextGameDateOverride = nextGameDateOverride ? new Date(nextGameDateOverride).getTime() : null;
                config.nextGameDetailsOverride = nextGameDetailsOverride || null;
                config.isOverrideEnabled = true;
            } else {
                config.nextGameDateOverride = null;
                config.nextGameDetailsOverride = null;
                config.isOverrideEnabled = false;
            }

            config.sportName = sportNameOverride || 'Sport';
            config.sportIcon = sportIconOverride || 'soccer';
            config.location = locationOverride || 'Sport Venue';
            config.displayDay = matchDay || 'Saturday';
            config.displayTime = matchTime || '7:00 AM';
            config.isCancelled = isCancelled;
            config.cancelReason = cancelReason;

            console.log('[AdminScreen] handleSaveConfig. Final config.location:', config.location);

            // Ensure document exists before updating (Subscription handles this, removed redundant await to fix offline errors)
            await adminService.updateGlobalConfig(config, activeOrgId);

            // ALSO save to persistent defaults so future weeks inherit these settings
            await adminService.saveWeeklyMatchDefaults(config, activeOrgId);

            setAdminStatus({ message: "Settings saved successfully!", type: 'success' });
            setTimeout(() => setAdminStatus(null), 3000);
        } catch (error: any) {
            console.error('Save Config Error:', error);
            setAdminStatus({ message: error.message, type: 'error' });
        }
    };

    const handleSaveConfig = () => {
        if (Platform.OS === 'web') {
            if (window.confirm("Save these configuration changes? This affects the current week and global defaults.")) {
                executeSaveConfig();
            }
        } else {
            Alert.alert(
                "Save Configuration?",
                "This will update the current match and global defaults for future weeks.",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "SAVE", onPress: executeSaveConfig }
                ]
            );
        }
    };

    // Inline Member Interest Editing Handlers
    const handleEditInterests = (uid: string, currentInterests: string[] = []) => {
        if (editingInterestsUser === uid) {
            setEditingInterestsUser(null);
        } else {
            const targetUser = allUsers.find((u: any) => u.uid === uid);
            setEditingInterestsUser(uid);
            setEditingInterestsList(currentInterests);
            setEditingSkillsMap(targetUser?.skills || {});
        }
    };

    const handleSaveInterests = async (uid: string) => {
        setIsSavingInterests(true);
        try {
            const { updateDoc } = require('firebase/firestore');
            await updateDoc(doc(db, 'users', uid), {
                sportsInterests: editingInterestsList,
                skills: editingSkillsMap
            });

            await fetchAllUsers();

            setEditingInterestsUser(null);
            if (Platform.OS === 'web') window.alert("Interests updated successfully!");
            else Alert.alert("Success", "User interests updated.");
        } catch (err: any) {
            console.error("Failed to update interests:", err);
            if (Platform.OS === 'web') window.alert("Error: " + err.message);
            else Alert.alert("Error", err.message);
        } finally {
            setIsSavingInterests(false);
        }
    };

    const toggleEditingInterest = (sportName: string) => {
        if (editingInterestsList.includes(sportName)) {
            setEditingInterestsList(prev => prev.filter(s => s !== sportName));
            const nextSkills = { ...editingSkillsMap };
            delete nextSkills[sportName];
            setEditingSkillsMap(nextSkills);
        } else {
            setEditingInterestsList(prev => [...prev, sportName]);
            if (!editingSkillsMap[sportName]) {
                setEditingSkillsMap(prev => ({ ...prev, [sportName]: 3 }));
            }
        }
    };

    const updateSkillLevel = (sportId: string, level: number) => {
        setEditingSkillsMap(prev => ({ ...prev, [sportId]: level }));
    };

    const handleRemoveUser = async (userId: string) => {
        try {
            if (isLegacy) {
                await votingService.removeVoteLegacy(userId);
            } else {
                await votingService.removeVote(activeMatchId, userId);
            }
            setAdminStatus({ message: 'User removed from list.', type: 'success' });
            setTimeout(() => setAdminStatus(null), 3000);
        } catch (error: any) {
            setAdminStatus({ message: error.message, type: 'error' });
        }
    };

    const handleAddUser = async () => {
        // Trim inputs to remove accidental whitespace
        const email = newUserEmail.trim();
        const first = newUserFirstName.trim();
        const last = newUserLastName.trim();
        const password = newUserPassword.trim();

        if (!email || !password || !first || !last) {
            setAdminStatus({ message: 'All fields are required', type: 'error' });
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
            fetchAllUsers();
            setTimeout(fetchAllUsers, 1000);
        } catch (error: any) {
            let msg = error.message;
            if (msg.includes('email-already-in-use')) {
                msg = "Email exists! If they are 'deleted', they must LOG IN to restore their account. Do not create new user.";
            } else if (msg.includes('invalid-email')) {
                msg = "Invalid email address. Please check for typos.";
            }
            setAdminStatus({ message: msg, type: 'error' });
        } finally {
            setIsCreatingUser(false);
        }
    };

    const handleDeleteUser = async (userId: string, userName: string) => {
        const performDelete = async () => {
            try {
                // Use adminService.deleteUserCompletely (Full Auth + Firestore removal via Cloud Function)
                // Pass activeOrgId to allow Org Admins to delete their own members
                await adminService.deleteUserCompletely(userId, activeOrgId);

                await refreshAuthContext();
                fetchAllUsers();

                // Show explicit success
                setAdminStatus({ message: "User Deleted Completely", type: 'success' });
                setTimeout(() => setAdminStatus(null), 3000);
            } catch (error: any) {
                console.error("Delete user error:", error);
                setAdminStatus({ message: error.message, type: 'error' });
                if (Platform.OS === 'web') alert(`Error: ${error.message}`);
                else Alert.alert('Delete Failed', error.message);
            }
        };

        if (Platform.OS === 'web') {
            // Web confirm is synchronous, so we can just call it
            if (window.confirm(`Are you sure you want to delete ${userName}? This will remove their Firebase Auth and Firestore profile completely.`)) {
                await performDelete(); // Await it here
            }
        } else {
            // Native alert is asynchronous via callbacks
            Alert.alert("Delete User?", `Are you sure you want to delete ${userName}?\n\nThis removes their Firebase Auth and Firestore data.`, [
                { text: "Cancel" },
                { text: "Delete", style: "destructive", onPress: () => performDelete() }
            ]);
        }
    };

    const handleDeleteAllNonAdmins = async () => {
        const superEmails = ['urbraju@gmail.com', 'brutechgyan@gmail.com'];
        const activeOrg = currentOrg || (organizations || []).find(o => o.id === activeOrgId);

        const usersToDelete = allUsers.filter(u => {
            const isSuper = superEmails.includes(u.email?.toLowerCase());
            const isGlobalAdmin = u.isAdmin === true;
            const isOrgAdmin = activeOrg?.admins?.includes(u.uid);
            return !isSuper && !isGlobalAdmin && !isOrgAdmin;
        });

        if (usersToDelete.length === 0) {
            const msg = "No non-admin users found to delete.";
            if (Platform.OS === 'web') window.alert(msg);
            else Alert.alert("Cleanup", msg);
            return;
        }

        const confirmMsg = `⚠️ CRITICAL: BULK DELETION\n\nAre you sure you want to permanently delete ALL ${usersToDelete.length} non-admin users?\n\nThis will remove their Firebase Auth accounts and Firestore profiles. This action is IRREVERSIBLE.`;

        const performBulkDelete = async () => {
            setIsCreatingUser(true);
            let successCount = 0;
            let failCount = 0;

            for (const u of usersToDelete) {
                try {
                    await adminService.deleteUserCompletely(u.uid, activeOrgId);
                    successCount++;
                } catch (err) {
                    console.error(`Failed to delete ${u.email}:`, err);
                    failCount++;
                }
            }

            fetchAllUsers();
            setIsCreatingUser(false);
            const resultMsg = `Cleanup Complete: ${successCount} deleted, ${failCount} failed.`;
            setAdminStatus({ message: resultMsg, type: successCount > 0 ? 'success' : 'info' });
            setTimeout(() => setAdminStatus(null), 3000);
        };

        if (Platform.OS === 'web') {
            if (window.confirm(confirmMsg)) performBulkDelete();
        } else {
            Alert.alert("Cleanup Users", confirmMsg, [
                { text: "Cancel" },
                { text: "Delete All", style: "destructive", onPress: performBulkDelete }
            ]);
        }
    };

    const handleApproveMember = async (userId: string, userName: string) => {
        try {
            await organizationService.approveMember(activeOrgId, userId);

            // Re-fetch users to immediately remove them from the pending UI state
            await fetchAllUsers();

            const successText = `Success: ${userName || 'User'} has been approved.`;
            setAdminStatus({ message: successText, type: 'success' });
            setTimeout(() => setAdminStatus(null), 3000);
        } catch (err: any) {
            if (Platform.OS === 'web') window.alert(`Error: ${err.message}`);
            else Alert.alert('Error', err.message);
        }
    };

    const handleApproveAllPending = async () => {
        const activeOrg = currentOrg || (organizations || []).find(o => o.id === activeOrgId);
        if (!activeOrg || !activeOrg.pendingMembers || activeOrg.pendingMembers.length === 0) {
            if (Platform.OS === 'web') window.alert("No pending users to approve.");
            else Alert.alert("No Pending Users", "There are no pending users to approve.");
            return;
        }

        const performApproval = async () => {
            setIsCreatingUser(true);
            let successCount = 0;
            let failCount = 0;
            for (const uid of activeOrg.pendingMembers!) {
                try {
                    await organizationService.approveMember(activeOrgId, uid);
                    successCount++;
                } catch (err) {
                    console.error(`Failed to approve ${uid}:`, err);
                    failCount++;
                }
            }
            if (refreshAuthContext) await refreshAuthContext();
            fetchAllUsers();
            setIsCreatingUser(false);
            const resultMsg = `Approval Complete: ${successCount} approved, ${failCount} failed.`;
            setAdminStatus({ message: resultMsg, type: successCount > 0 ? 'success' : 'error' });
            setTimeout(() => setAdminStatus(null), 3000);
        };

        if (Platform.OS === 'web') {
            if (window.confirm(`Are you sure you want to approve all ${activeOrg.pendingMembers.length} pending users?`)) performApproval();
        } else {
            Alert.alert("Approve All?", `Are you sure you want to approve all ${activeOrg.pendingMembers.length} pending users?`, [
                { text: "Cancel", style: "cancel" },
                { text: "Approve All", style: "default", onPress: performApproval }
            ]);
        }
    };

    // Interest Request Handlers
    const handleApproveInterestRequest = async (request: InterestRequest) => {
        if (!request.id) return;
        try {
            await interestRequestService.approveRequest(request.id, request.userId, request.requestedInterests);
            await fetchAllUsers(); // Refreshes both users and requests
            setAdminStatus({ message: `Approved interests for ${request.userName}`, type: 'success' });
            setTimeout(() => setAdminStatus(null), 3000);
        } catch (error: any) {
            if (Platform.OS === 'web') window.alert(`Error: ${error.message}`);
            else Alert.alert('Error', error.message);
        }
    };

    const handleRejectInterestRequest = async (request: InterestRequest) => {
        if (!request.id) return;
        try {
            await interestRequestService.rejectRequest(request.id);
            await fetchAllUsers(); // Refreshes list
            setAdminStatus({ message: `Rejected interests for ${request.userName}`, type: 'success' });
            setTimeout(() => setAdminStatus(null), 3000);
        } catch (error: any) {
            if (Platform.OS === 'web') window.alert(`Error: ${error.message}`);
            else Alert.alert('Error', error.message);
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

    // ManageSportsSection removed (moved to components/admin/AdminComponents.tsx)
    // ManageEventsSection removed (moved to components/admin/AdminComponents.tsx)
    // FinancialDashboard removed (moved to components/admin/AdminComponents.tsx)

    return (
        <SafeAreaView className="flex-1 bg-background shadow-xs" edges={['top', 'bottom', 'left', 'right']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1"
            >
                <Stack.Screen options={{
                    headerStyle: { backgroundColor: '#ffffff' },
                    headerTintColor: '#1f2937',
                    headerTitle: "Admin Dashboard",
                    headerTitleStyle: { fontWeight: 'bold' }
                }} />
                <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40, alignItems: 'center' }}>
                    <View className="w-full max-w-5xl p-4">
                        <StatusBanner
                            message={adminStatus?.message || null}
                            type={adminStatus?.type || 'info'}
                            className="mb-4"
                            onDismiss={() => setAdminStatus(null)}
                        />
                        <View className="mb-6">
                            <Text className="text-2xl font-black text-gray-800 uppercase tracking-tighter italic">
                                Admin <Text className="text-blue-600">Dashboard</Text>
                            </Text>
                            <Text className="text-xs text-gray-500 font-medium">Internal System Controls & Management</Text>
                        </View>
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

                        {/* --- TAB NAVIGATION --- */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                            <View className="flex-row bg-white rounded-xl shadow-sm p-1 border border-gray-200 min-w-[100%]">
                                {[
                                    { id: 'ops', label: 'Operations', icon: 'flash' },
                                    { id: 'setup', label: 'Setup', icon: 'wrench' },
                                    { id: 'group', label: 'Group', icon: 'office-building' },
                                    { id: 'users', label: 'Users', icon: 'account-group' },
                                    { id: 'system', label: 'System', icon: 'shield-check' }
                                ].map((tab) => (
                                    <TouchableOpacity
                                        key={tab.id}
                                        onPress={() => setActiveTab(tab.id as any)}
                                        className={`flex-1 flex-row items-center justify-center px-4 py-2.5 rounded-lg ${activeTab === tab.id ? 'bg-blue-600' : ''}`}
                                        role="button"
                                        accessibilityLabel={tab.label}
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
                        </ScrollView>

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
                                <FinancialDashboard
                                    opMatchData={opMatchData}
                                    activeMatchId={activeMatchId}
                                    isLegacy={isLegacy}
                                    showFinancials={showFinancials}
                                    fees={fees}
                                    setShowFinancials={setShowFinancials}
                                />

                                {/* 1. CURRENT WEEK PLAYERS */}
                                <View className="bg-white p-4 rounded-lg shadow-sm mb-4 border border-gray-200">
                                    <TouchableOpacity
                                        className="flex-row justify-between items-center"
                                        onPress={() => setShowCurrentPlayers(!showCurrentPlayers)}
                                    >
                                        <View className="flex-row items-center flex-1 mr-2">
                                            <MaterialCommunityIcons name="account-group" size={20} color="#6B7280" style={{ marginRight: 8 }} />
                                            <Text className="text-lg font-bold text-gray-800 flex-shrink" numberOfLines={1} adjustsFontSizeToFit>Match Management / Current Slot List</Text>
                                        </View>
                                        <MaterialCommunityIcons name={showCurrentPlayers ? 'chevron-up' : 'chevron-down'} size={24} color="#6B7280" />
                                    </TouchableOpacity>

                                    {showCurrentPlayers && (
                                        <View className="mt-4 border-t border-gray-100 pt-4">
                                            {/* --- TEAM FORMATION TOOL --- */}
                                            {opMatchData && (
                                                <TeamManager
                                                    eventId={activeMatchId}
                                                    participants={allUsers.filter(u => opMatchData.slots?.some((s: any) => s.userId === u.uid && s.status === 'confirmed'))}
                                                    isSplittingEnabled={opMatchData.isTeamSplittingEnabled || false}
                                                    isLiveScoreEnabled={opMatchData.isLiveScoreEnabled}
                                                    teams={opMatchData.teams}
                                                    sportId={opMatchData.sportId || 'volleyball'} // Fallback if not specified
                                                    sportName={opMatchData.sportName || 'Game'}
                                                    isLegacy={isLegacy}
                                                    orgId={activeOrgId}
                                                    onUpdate={fetchUpcomingEvents}
                                                />
                                            )}

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
                                            {opMatchData?.slots && opMatchData.slots.length > 0 ? (
                                                [...opMatchData.slots]
                                                    .sort((a: any, b: any) => getMillis(a.timestamp) - getMillis(b.timestamp))
                                                    .map((slot: any) => (
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
                                                    ))
                                            ) : (
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
                                    expanded={showSports}
                                    onToggle={() => setShowSports(!showSports)}
                                    activeOrgId={activeOrgId}
                                />
                                <ManageEventsSection
                                    legacyMatchData={matchData}
                                    paymentZelle={paymentZelle}
                                    paymentPaypal={paymentPaypal}
                                    currency={currency}
                                    expanded={showEvents}
                                    onToggle={() => setShowEvents(!showEvents)}
                                    activeOrgId={activeOrgId}
                                />


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


                                            {/* Voting Toggles */}
                                            <View className="mb-6 pt-4 border-t border-gray-200">
                                                <View className="flex-row items-center justify-between mb-2">
                                                    <Text className="text-lg font-bold text-gray-800">Voting Open</Text>
                                                    <Switch value={isOpen} onValueChange={setIsOpen} />
                                                </View>
                                                <Text className="text-xs text-gray-500 ml-1 mb-3">Controls whether users can vote for games. Turn off to close voting temporarily</Text>
                                            </View>

                                            {/* Weekly Match Display Config */}
                                            <View className="mb-6 pt-4 border-t border-gray-200">
                                                {matchData?.location === 'TBD (Setup Required)' && (
                                                    <View className="bg-amber-50 p-4 rounded-2xl border border-amber-200 mb-6">
                                                        <View className="flex-row items-center mb-2">
                                                            <MaterialCommunityIcons name="star-circle" size={24} color="#D97706" style={{ marginRight: 8 }} />
                                                            <Text className="text-amber-800 font-black text-sm uppercase tracking-wider">Setup Your Weekly Match</Text>
                                                        </View>
                                                        <Text className="text-amber-700 text-xs mb-4 leading-5">
                                                            Configure your group's recurring weekly game below. Once set up, this will automatically appear for your members every week.
                                                        </Text>
                                                    </View>
                                                )}
                                                <View className="flex-row items-center justify-between mb-2">
                                                    <Text className="text-lg font-bold text-gray-800">
                                                        {matchDay} Weekly {sportNameOverride} Match Setup
                                                    </Text>
                                                    <TouchableOpacity onPress={() => setShowMatchInfo(!showMatchInfo)}>
                                                        <MaterialCommunityIcons
                                                            name={showMatchInfo ? "chevron-up" : "chevron-down"}
                                                            size={24}
                                                            color="#666"
                                                        />
                                                    </TouchableOpacity>
                                                </View>
                                                <Text className="text-xs text-gray-500 ml-1 mb-3">Customize the display name, location, and icon for the recurring weekly {matchDay} game</Text>
                                                {showMatchInfo && (
                                                    <View className="gap-y-3">
                                                        <View>
                                                            <Text className="text-[10px] text-gray-400 ml-1 uppercase">Match Label (e.g. {sportNameOverride} Match)</Text>
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
                                                        <View className="flex-row gap-2">
                                                            <View className="flex-1">
                                                                <Text className="text-[10px] text-gray-400 ml-1 uppercase">Match Day (e.g. {matchDay})</Text>
                                                                <TextInput
                                                                    className="border border-gray-300 rounded p-2 bg-gray-50"
                                                                    placeholder={matchDay}
                                                                    value={matchDay}
                                                                    onChangeText={setMatchDay}
                                                                />
                                                            </View>
                                                            <View className="flex-1">
                                                                <Text className="text-[10px] text-gray-400 ml-1 uppercase">Match Time (e.g. 7:00 AM)</Text>
                                                                <TextInput
                                                                    className="border border-gray-300 rounded p-2 bg-gray-50"
                                                                    placeholder="7:00 AM"
                                                                    value={matchTime}
                                                                    onChangeText={setMatchTime}
                                                                />
                                                            </View>
                                                        </View>
                                                    </View>
                                                )}
                                            </View>

                                            {/* Slot Overrides */}
                                            <View className="mb-6 pt-4 border-t border-gray-200">
                                                <View className="flex-row items-center justify-between mb-2">
                                                    <Text className="text-lg font-bold text-gray-800">Custom Slots</Text>
                                                    <Switch value={isCustomSlotsEnabled} onValueChange={setIsCustomSlotsEnabled} />
                                                </View>
                                                <Text className="text-xs text-gray-500 ml-1 mb-3">Override default slot limits (14 confirmed, 4 waitlist) for the weekly game</Text>
                                                {isCustomSlotsEnabled && (
                                                    <View className="flex-row gap-2">
                                                        <View className="flex-1">
                                                            <Text className="text-[10px] text-gray-400 ml-1">MAX SLOTS</Text>
                                                            <TextInput
                                                                className="border border-gray-300 rounded p-2 bg-gray-50 text-center"
                                                                placeholder="Max Slots"
                                                                value={maxSlots}
                                                                onChangeText={(text) => setMaxSlots(text.replace(/[^0-9]/g, ''))}
                                                                onEndEditing={() => {
                                                                    const val = parseInt(maxSlots, 10);
                                                                    if (isNaN(val) || val < 1) setMaxSlots('1');
                                                                }}
                                                                keyboardType="numeric"
                                                            />
                                                        </View>
                                                        <View className="flex-1">
                                                            <Text className="text-[10px] text-gray-400 ml-1">WAITLIST</Text>
                                                            <TextInput
                                                                className="border border-gray-300 rounded p-2 bg-gray-50 text-center"
                                                                placeholder="Waitlist"
                                                                value={maxWaitlist}
                                                                onChangeText={(text) => setMaxWaitlist(text.replace(/[^0-9]/g, ''))}
                                                                onEndEditing={() => {
                                                                    const val = parseInt(maxWaitlist, 10);
                                                                    if (isNaN(val) || val < 0) setMaxWaitlist('0');
                                                                }}
                                                                keyboardType="numeric"
                                                            />
                                                        </View>
                                                    </View>
                                                )}
                                            </View>

                                            {/* Voting Schedule Overrides */}
                                            <View className="mb-6 pt-4 border-t border-gray-200">
                                                <View className="flex-row items-center justify-between mb-2">
                                                    <Text className="text-lg font-bold text-gray-800">Custom Voting Window</Text>
                                                    <Switch value={isCustomVotingWindowEnabled} onValueChange={setIsCustomVotingWindowEnabled} />
                                                </View>
                                                <Text className="text-xs text-gray-500 ml-1 mb-3">Set custom dates for when voting opens and closes (defaults based on your Match Day)</Text>
                                                {isCustomVotingWindowEnabled && (
                                                    <View className="gap-y-4">
                                                        <View>
                                                            <Text className="text-[10px] text-gray-400 ml-1 mb-1 uppercase">Voting Opens At</Text>
                                                            <DateSelector dateStr={votingOpenDate} onChange={setVotingOpenDate} minDate={new Date()} />
                                                        </View>
                                                        <View>
                                                            <Text className="text-[10px] text-gray-400 ml-1 mb-1 uppercase">Voting Closes At</Text>
                                                            <DateSelector dateStr={votingCloseDate} onChange={setVotingCloseDate} minDate={new Date(votingOpenDate || new Date())} />
                                                        </View>
                                                    </View>
                                                )}
                                                {!isCustomVotingWindowEnabled && (
                                                    <Text className="text-xs text-gray-400 italic">Following default schedule for {matchDay}.</Text>
                                                )}
                                            </View>

                                            {/* Next Match Override */}
                                            <View className="mb-6 pt-4 border-t border-gray-200">
                                                <View className="flex-row items-center justify-between mb-2">
                                                    <Text className="text-lg font-bold text-gray-800">Next Match Override</Text>
                                                    <Switch value={isOverrideEnabled} onValueChange={setIsOverrideEnabled} />
                                                </View>
                                                <Text className="text-xs text-gray-500 ml-1 mb-3">Manually set a specific time and details for the very next game (e.g. for holiday specials or time changes)</Text>
                                                {isOverrideEnabled && (
                                                    <View className="gap-y-4">
                                                        <View>
                                                            <Text className="text-[10px] text-gray-400 ml-1 mb-1 uppercase">Specific Game Time</Text>
                                                            <DateSelector dateStr={nextGameDateOverride} onChange={setNextGameDateOverride} minDate={new Date()} />
                                                        </View>
                                                        <View>
                                                            <Text className="text-[10px] text-gray-400 ml-1 mb-1 uppercase">Additional Info (e.g. Special Event)</Text>
                                                            <TextInput
                                                                className="border border-gray-300 rounded p-2 bg-gray-50"
                                                                placeholder="Holiday Special, etc."
                                                                value={nextGameDetailsOverride}
                                                                onChangeText={setNextGameDetailsOverride}
                                                            />
                                                        </View>
                                                    </View>
                                                )}
                                                {!isOverrideEnabled && (
                                                    <Text className="text-xs text-gray-400 italic">Following default {matchDay} {matchTime} schedule.</Text>
                                                )}
                                            </View>

                                            {/* Cancel Match Override */}
                                            <View className="mb-6 pt-4 border-t border-gray-200">
                                                <View className="flex-row items-center justify-between mb-2">
                                                    <View className="flex-1 pr-4">
                                                        <Text className="text-lg font-bold text-gray-800">Cancel Weekly Match</Text>
                                                        <Text className="text-xs text-red-500 font-bold uppercase">This Week Only</Text>
                                                    </View>
                                                    <Switch value={isCancelled} onValueChange={setIsCancelled} trackColor={{ true: '#EF4444' }} />
                                                </View>
                                                <Text className="text-xs text-gray-500 ml-1 mb-3">Temporarily disable voting and show a cancellation notice for the recurring weekly game.</Text>
                                                {isCancelled && (
                                                    <View>
                                                        <Text className="text-[10px] text-gray-400 ml-1 mb-1 uppercase">Reason for Cancellation</Text>
                                                        <TextInput
                                                            className="border border-red-200 rounded p-2 bg-red-50 text-red-900"
                                                            placeholder="e.g. Weather conditions, Holiday, etc."
                                                            value={cancelReason}
                                                            onChangeText={setCancelReason}
                                                        />
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    )}
                                </View>
                            </>
                        )}

                        {/* --- GROUP TAB --- */}
                        {activeTab === 'group' && (
                            <>
                                {/* ORGANIZATION SETTINGS */}
                                <View className="bg-gray-800 p-4 rounded-xl shadow-sm mb-4 border border-gray-700 mx-1">
                                    <TouchableOpacity
                                        className="flex-row items-center"
                                        onPress={() => router.push('/admin/org-settings')}
                                    >
                                        <View className="w-10 h-10 bg-primary/20 rounded-lg items-center justify-center mr-3">
                                            <MaterialCommunityIcons name="office-building" size={24} color="#00E5FF" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-white font-bold">Organization Settings</Text>
                                            <Text className="text-gray-400 text-xs">Manage your group name, members, and invite codes</Text>
                                        </View>
                                        <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
                                    </TouchableOpacity>
                                </View>

                                {/* FEATURE CONTROLS */}
                                <View className="bg-gray-800 p-4 rounded-xl shadow-sm mb-4 border border-gray-700 mx-1">
                                    <Text className="text-gray-400 text-[10px] font-black uppercase tracking-[2px] mb-3 ml-1">Architectural Controls</Text>
                                    <View className="flex-row items-center justify-between">
                                        <View className="flex-1 pr-4">
                                            <Text className="text-white font-bold">Multi-Tenancy (Public Groups)</Text>
                                            <Text className="text-gray-400 text-xs">Allow users to create and join multiple groups. Disabling this hides the organization switcher.</Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={async () => {
                                                try {
                                                    const newStatus = !multiTenancyEnabled;
                                                    await adminService.updateSystemConfig({ multiTenancyEnabled: newStatus });
                                                    Alert.alert("System Updated", `Multi-tenancy is now ${newStatus ? 'ENABLED' : 'DISABLED'}`);
                                                } catch (e) {
                                                    Alert.alert("Error", "Failed to update system config");
                                                }
                                            }}
                                            className={`w-12 h-6 rounded-full p-1 ${multiTenancyEnabled ? 'bg-primary' : 'bg-gray-600'}`}
                                        >
                                            <View className={`w-4 h-4 rounded-full bg-white transform ${multiTenancyEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </>
                        )}

                        {/* --- USERS TAB --- */}
                        {activeTab === 'users' && (
                            <>
                                {/* 0. USER CONTROL (Grouped Global Settings) */}
                                <View className="bg-white p-4 rounded-lg shadow-sm mb-4 border border-gray-200">
                                    <TouchableOpacity
                                        className="flex-row justify-between items-center mb-2"
                                        onPress={() => setShowGlobalSettings(!showGlobalSettings)}
                                    >
                                        <View className="flex-row items-center flex-1 mr-2">
                                            <MaterialCommunityIcons name="earth" size={20} color="#6B7280" style={{ marginRight: 8 }} />
                                            <Text className="text-[10px] font-black text-gray-400 uppercase tracking-[2px]">Global User Controls</Text>
                                        </View>
                                        <MaterialCommunityIcons name={showGlobalSettings ? 'chevron-up' : 'chevron-down'} size={24} color="#6B7280" />
                                    </TouchableOpacity>

                                    {showGlobalSettings && (
                                        <View className="mt-4 border-t border-gray-100 pt-4">
                                            {/* Require Approval */}
                                            <View className="flex-row items-center justify-between mb-6">
                                                <View className="flex-1 pr-4">
                                                    <Text className="text-base font-bold text-gray-800">Require Approval</Text>
                                                    <Text className="text-xs text-gray-500">Approve new members manually</Text>
                                                </View>
                                                <Switch
                                                    value={requireApproval}
                                                    onValueChange={async (val) => {
                                                        setRequireApproval(val);
                                                        try {
                                                            await adminService.toggleApprovalRequirement(val, activeOrgId);
                                                        } catch (err) {
                                                            Alert.alert("Error", "Failed to update approval requirement");
                                                        }
                                                    }}
                                                />
                                            </View>

                                            {/* Admin Contact */}
                                            <View className="mb-6 pt-4 border-t border-gray-100">
                                                <View className="flex-row items-center justify-between mb-2">
                                                    <Text className="text-base font-bold text-gray-800">Admin Contact</Text>
                                                    <Switch
                                                        value={isAdminPhoneEnabled}
                                                        onValueChange={setIsAdminPhoneEnabled}
                                                    />
                                                </View>
                                                <Text className="text-xs text-gray-500 mb-2">Enable WhatsApp help button for users</Text>
                                                {isAdminPhoneEnabled && (
                                                    <TextInput
                                                        className="border border-gray-300 rounded p-2 bg-gray-50"
                                                        placeholder="WhatsApp Phone (+1 123 456 7890)"
                                                        value={adminPhoneNumber}
                                                        onChangeText={setAdminPhoneNumber}
                                                    />
                                                )}
                                            </View>

                                            {/* Payment Settings */}
                                            <View className="mb-6 pt-4 border-t border-gray-100">
                                                <View className="flex-row items-center justify-between mb-4">
                                                    <Text className="text-base font-bold text-gray-800">Payment Settings</Text>
                                                    <Switch value={paymentEnabled} onValueChange={setPaymentEnabled} />
                                                </View>
                                                {paymentEnabled && (
                                                    <View className="gap-y-3">
                                                        <View className="flex-row gap-2">
                                                            <View className="flex-[2]">
                                                                <Text className="text-[10px] text-gray-400 ml-1">FEES</Text>
                                                                <TextInput className="border border-gray-300 rounded p-2 bg-gray-50" placeholder="0" value={fees} onChangeText={setFees} keyboardType="numeric" />
                                                            </View>
                                                            <View className="flex-1">
                                                                <Text className="text-[10px] text-gray-400 ml-1">CURRENCY</Text>
                                                                <TextInput
                                                                    className="border border-gray-300 rounded p-2 bg-gray-50"
                                                                    value={currency}
                                                                    onChangeText={(v) => setCurrency(v.toUpperCase().slice(0, 3))}
                                                                    maxLength={3}
                                                                />
                                                            </View>
                                                        </View>
                                                        <View>
                                                            <Text className="text-[10px] text-gray-400 ml-1">ZELLE</Text>
                                                            <TextInput className="border border-gray-300 rounded p-2 bg-gray-50" placeholder="Email or Mobile" value={paymentZelle} onChangeText={setPaymentZelle} />
                                                        </View>
                                                        <View>
                                                            <Text className="text-[10px] text-gray-400 ml-1">PAYPAL</Text>
                                                            <TextInput className="border border-gray-300 rounded p-2 bg-gray-50" placeholder="@Username" value={paymentPaypal} onChangeText={setPaymentPaypal} />
                                                        </View>
                                                    </View>
                                                )}
                                            </View>

                                            <TouchableOpacity
                                                className="bg-blue-600 p-3 rounded-lg items-center shadow-sm flex-row justify-center mt-2"
                                                onPress={handleSaveConfig}
                                            >
                                                <MaterialCommunityIcons name="content-save" size={18} color="white" style={{ marginRight: 8 }} />
                                                <Text className="text-white font-bold text-sm uppercase">Save Global Settings</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>

                                {/* 0.5 PENDING INTEREST REQUESTS */}
                                {interestRequests.length > 0 && (
                                    <View className="bg-amber-50 p-4 rounded-lg shadow-sm mb-4 border border-amber-200">
                                        <TouchableOpacity
                                            className="flex-row justify-between items-center"
                                            onPress={() => setShowInterestRequests(!showInterestRequests)}
                                        >
                                            <View className="flex-row items-center flex-1 pr-2">
                                                <MaterialCommunityIcons name="human-handsup" size={20} color="#D97706" style={{ marginRight: 8 }} />
                                                <Text className="text-lg font-bold text-amber-900 flex-shrink" numberOfLines={1}>Pending Interests</Text>
                                                <View className="ml-2 bg-amber-500 rounded-full w-6 h-6 items-center justify-center">
                                                    <Text className="text-white text-xs font-bold">{interestRequests.length}</Text>
                                                </View>
                                            </View>
                                            <MaterialCommunityIcons name={showInterestRequests ? 'chevron-up' : 'chevron-down'} size={24} color="#D97706" />
                                        </TouchableOpacity>

                                        {showInterestRequests && (
                                            <View className="mt-4 border-t border-amber-200/50 pt-4">
                                                {interestRequests.map(req => (
                                                    <View key={req.id} className="bg-white p-3 rounded-xl shadow-sm mb-3 border border-amber-100 flex-col gap-2">
                                                        <View className="flex-row justify-between items-start">
                                                            <View className="flex-1">
                                                                <Text className="font-bold text-gray-800 text-base">{req.userName}</Text>
                                                                <Text className="text-xs text-gray-500">{req.userEmail}</Text>
                                                            </View>
                                                            <Text className="text-[10px] text-gray-400">
                                                                {new Date(req.createdAt).toLocaleDateString()}
                                                            </Text>
                                                        </View>

                                                        <View className="bg-gray-50 p-2 rounded border border-gray-100">
                                                            <Text className="text-[10px] text-gray-400 font-bold uppercase mb-1">Requested Interests & Skills</Text>
                                                            <View className="flex-col gap-2">
                                                                {req.requestedInterests.length > 0 ? req.requestedInterests.map(interestId => {
                                                                    const sport = globalSports.find(s => s.id === interestId);
                                                                    const skill = req.requestedSkills?.[interestId] || 3;
                                                                    return (
                                                                        <View key={interestId} className="flex-row items-center justify-between">
                                                                            <View className="bg-blue-100 px-2 py-1 rounded-full flex-row items-center">
                                                                                <MaterialCommunityIcons name={sport?.icon as any || 'star'} size={12} color="#1E40AF" style={{ marginRight: 4 }} />
                                                                                <Text className="text-blue-800 text-[10px] font-bold">{sport?.name || interestId}</Text>
                                                                            </View>
                                                                            <View className="flex-row">
                                                                                {[1, 2, 3, 4, 5].map(star => (
                                                                                    <MaterialCommunityIcons
                                                                                        key={star}
                                                                                        name={star <= skill ? "star" : "star-outline"}
                                                                                        size={12}
                                                                                        color={star <= skill ? "#FACC15" : "#D1D5DB"}
                                                                                    />
                                                                                ))}
                                                                            </View>
                                                                        </View>
                                                                    );
                                                                }) : <Text className="text-xs text-gray-500 italic">None selected</Text>}
                                                            </View>
                                                        </View>

                                                        <View className="flex-row justify-end gap-2 mt-1">
                                                            <TouchableOpacity
                                                                className="bg-red-50 border border-red-200 px-4 py-2 rounded-lg flex-1 items-center"
                                                                onPress={() => {
                                                                    if (Platform.OS === 'web') {
                                                                        if (window.confirm(`Reject interest update for ${req.userName}?`)) handleRejectInterestRequest(req);
                                                                    } else {
                                                                        Alert.alert("Reject?", `Reject interest update for ${req.userName}?`, [
                                                                            { text: "Cancel" },
                                                                            { text: "Reject", style: "destructive", onPress: () => handleRejectInterestRequest(req) }
                                                                        ]);
                                                                    }
                                                                }}
                                                            >
                                                                <Text className="text-red-700 font-bold text-xs">REJECT</Text>
                                                            </TouchableOpacity>
                                                            <TouchableOpacity
                                                                className="bg-green-600 px-4 py-2 rounded-lg flex-1 items-center shadow-sm"
                                                                onPress={() => handleApproveInterestRequest(req)}
                                                            >
                                                                <Text className="text-white font-bold text-xs uppercase tracking-wider">APPROVE</Text>
                                                            </TouchableOpacity>
                                                        </View>
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                )}

                                {/* 1. REGISTERED MEMBERS */}
                                <View className="bg-white p-4 rounded-lg shadow-sm mb-4 border border-gray-200">
                                    <TouchableOpacity
                                        className="flex-row justify-between items-center"
                                        onPress={() => {
                                            const nextState = !showAllUsers;
                                            setShowAllUsers(nextState);
                                            if (nextState) fetchAllUsers();
                                        }}
                                    >
                                        <View className="flex-row items-center flex-1 pr-2">
                                            <View className="flex-row items-center flex-1">
                                                <MaterialCommunityIcons name="card-account-details" size={20} color="#6B7280" style={{ marginRight: 8 }} />
                                                <Text className="text-lg font-bold text-gray-800 flex-shrink" numberOfLines={1}>Registered Members / User Search</Text>
                                            </View>

                                            {/* Approve All Button */}
                                            {organizations.find(o => o.id === activeOrgId)?.pendingMembers?.length ? (
                                                <TouchableOpacity
                                                    className="bg-green-600 px-3 py-1.5 rounded-full flex-row items-center shadow-sm active:opacity-80 mr-2"
                                                    onPress={handleApproveAllPending}
                                                    style={{ elevation: 2 }}
                                                >
                                                    <MaterialCommunityIcons name="check-all" size={16} color="#FFFFFF" />
                                                    <Text className="text-[11px] font-black text-white ml-1.5 uppercase tracking-wider">Approve All</Text>
                                                </TouchableOpacity>
                                            ) : null}
                                        </View>
                                        <MaterialCommunityIcons name={showAllUsers ? 'chevron-up' : 'chevron-down'} size={24} color="#6B7280" />
                                    </TouchableOpacity>

                                    {showAllUsers && (
                                        <View className="mt-4 border-t border-gray-100 pt-4">
                                            {/* Users List Rendering */}
                                            {allUsers
                                                .filter(u => {
                                                    const isUserInListSuper = ['urbraju@gmail.com', 'brutechgyan@gmail.com'].includes(u.email?.toLowerCase() || '');
                                                    if (isUserInListSuper) return isCurrentUserSuper;
                                                    return true;
                                                })
                                                .map((u) => {
                                                    const activeOrg = organizations.find(o => o.id === activeOrgId);
                                                    const isApprovedMember = activeOrg?.members?.includes(u.uid);
                                                    const isPendingMember = (activeOrg?.pendingMembers || []).includes(u.uid);
                                                    const isOrgAdm = activeOrg?.admins?.includes(u.uid) || u.isAdmin; // Global admin still counts

                                                    const isHardcodedSuper = ['urbraju@gmail.com', 'brutechgyan@gmail.com'].includes(u.email?.toLowerCase() || '');

                                                    return (
                                                        <View key={u.uid} className={`border-b border-gray-100 ${isPendingMember ? 'bg-amber-50' : ''} ${isHardcodedSuper ? 'bg-amber-50/30' : ''}`}>
                                                            <View className="flex-row justify-between items-center py-3">
                                                                <View className="flex-1 mr-2">
                                                                    <View className="flex-row items-center flex-wrap">
                                                                        <Text className="font-semibold text-sm">
                                                                            {u.firstName || u.displayName} {u.lastName}
                                                                        </Text>
                                                                        {isHardcodedSuper && (
                                                                            <View className="ml-2 bg-amber-100 px-1.5 py-0.5 rounded">
                                                                                <Text className="text-amber-600 text-[8px] font-black uppercase">SYSTEM</Text>
                                                                            </View>
                                                                        )}
                                                                        {u.isAdmin && (
                                                                            <View className="ml-1 bg-purple-100 px-1.5 py-0.5 rounded">
                                                                                <Text className="text-purple-600 text-[8px] font-black uppercase">GLOBAL</Text>
                                                                            </View>
                                                                        )}
                                                                        {isPendingMember && <Text className="ml-2 text-[10px] text-amber-700 font-bold bg-amber-100 px-1 rounded">PENDING</Text>}
                                                                        {isOrgAdm && !u.isAdmin && <Text className="ml-2 text-[10px] text-blue-700 font-bold bg-blue-100 px-1 rounded">ADMIN</Text>}
                                                                    </View>
                                                                    <Text className="text-[10px] text-gray-500">{u.email}</Text>
                                                                </View>

                                                                <View className="flex-row items-center gap-1.5 flex-wrap mt-1">
                                                                    {isPendingMember && (
                                                                        <TouchableOpacity
                                                                            className="bg-green-600 px-2 py-1 rounded shadow-sm"
                                                                            onPress={async () => {
                                                                                try {
                                                                                    await organizationService.approveMember(activeOrgId, u.uid);
                                                                                    if (refreshAuthContext) await refreshAuthContext();
                                                                                    await fetchAllUsers();
                                                                                } catch (err: any) {
                                                                                    console.error('Failed to approve member:', err);
                                                                                    if (Platform.OS === 'web') window.alert(err.message);
                                                                                    else Alert.alert('Error', err.message);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <Text className="text-white text-[9px] font-black uppercase">OK</Text>
                                                                        </TouchableOpacity>
                                                                    )}

                                                                    {isCurrentUserSuper && (
                                                                        <TouchableOpacity
                                                                            className={`px-2 py-1 rounded border shadow-sm ${u.isAdmin ? 'bg-purple-600 border-purple-700' : 'bg-gray-50 border-gray-200'} ${(isHardcodedSuper && u.isAdmin) ? 'opacity-50' : ''}`}
                                                                            onPress={() => handleToggleGlobalAdmin(u.uid, !!u.isAdmin)}
                                                                            disabled={isHardcodedSuper && u.isAdmin}
                                                                        >
                                                                            <Text className={`font-black text-[9px] uppercase ${u.isAdmin ? 'text-white' : 'text-gray-500'}`}>
                                                                                Super
                                                                            </Text>
                                                                        </TouchableOpacity>
                                                                    )}

                                                                    <TouchableOpacity
                                                                        className={`px-2 py-1 rounded border shadow-sm ${isOrgAdm ? 'bg-blue-600 border-blue-700' : 'bg-gray-50 border-gray-200'} ${(isHardcodedSuper && isOrgAdm) ? 'opacity-50' : ''}`}
                                                                        onPress={() => handleToggleAdmin(u.uid, isOrgAdm)}
                                                                        disabled={isHardcodedSuper && isOrgAdm}
                                                                    >
                                                                        <Text className={`font-black text-[9px] uppercase ${isOrgAdm ? 'text-white' : 'text-gray-500'}`}>
                                                                            Admin
                                                                        </Text>
                                                                    </TouchableOpacity>

                                                                    <TouchableOpacity
                                                                        className={`px-2 py-1 rounded border shadow-sm ${editingInterestsUser === u.uid ? 'bg-primary border-primary' : 'bg-gray-50 border-gray-200'}`}
                                                                        onPress={() => handleEditInterests(u.uid, u.sportsInterests || [])}
                                                                    >
                                                                        <Text className={`font-black text-[9px] uppercase ${editingInterestsUser === u.uid ? 'text-black' : 'text-gray-500'}`}>
                                                                            Interests
                                                                        </Text>
                                                                    </TouchableOpacity>

                                                                    <TouchableOpacity
                                                                        className="p-1.5 rounded border border-gray-100 bg-white shadow-sm"
                                                                        onPress={() => {
                                                                            if (Platform.OS === 'web') {
                                                                                if (window.confirm(`Send password reset email to ${u.email}?`)) {
                                                                                    authService.resetPassword(u.email);
                                                                                    setAdminStatus({ message: `Reset email sent to ${u.email}`, type: 'success' });
                                                                                    setTimeout(() => setAdminStatus(null), 3000);
                                                                                }
                                                                            } else {
                                                                                Alert.alert("Reset Password?", `Send password reset email to ${u.email}?`, [
                                                                                    { text: "Cancel" },
                                                                                    {
                                                                                        text: "Send Email", onPress: async () => {
                                                                                            await authService.resetPassword(u.email);
                                                                                            setAdminStatus({ message: `Reset email sent to ${u.email}`, type: 'success' });
                                                                                            setTimeout(() => setAdminStatus(null), 3000);
                                                                                        }
                                                                                    }
                                                                                ]);
                                                                            }
                                                                        }}
                                                                    >
                                                                        <MaterialCommunityIcons name="key-variant" size={16} color="#4B5563" />
                                                                    </TouchableOpacity>

                                                                    <TouchableOpacity
                                                                        className={`p-1.5 rounded border border-gray-100 bg-white shadow-sm ${isHardcodedSuper ? 'opacity-30' : ''}`}
                                                                        onPress={() => handleDeleteUser(u.uid, u.displayName || u.email)}
                                                                        disabled={isHardcodedSuper}
                                                                    >
                                                                        <MaterialCommunityIcons name="trash-can-outline" size={16} color={isHardcodedSuper ? "#999" : "#DC2626"} />
                                                                    </TouchableOpacity>
                                                                </View>
                                                            </View>

                                                            {/* Inline Editor for Interests */}
                                                            {editingInterestsUser === u.uid && (
                                                                <View className="bg-white p-3 mb-3 ml-2 mr-2 rounded-lg border border-gray-200 shadow-sm">
                                                                    <Text className="text-sm font-bold text-gray-800 mb-2">Edit {u.firstName || 'User'}'s Interests</Text>
                                                                    <View className="flex-row flex-wrap gap-2 mb-4 mt-2">
                                                                        {globalSports.map(sport => {
                                                                            const isSelected = editingInterestsList.includes(sport.id) || editingInterestsList.includes(sport.name);
                                                                            return (
                                                                                <TouchableOpacity
                                                                                    key={sport.id}
                                                                                    onPress={() => toggleEditingInterest(sport.id)}
                                                                                    className={`flex-row items-center px-2.5 py-1.5 rounded-full border ${isSelected ? 'bg-primary/20 border-primary' : 'bg-gray-50 border-gray-300'}`}
                                                                                >
                                                                                    <MaterialCommunityIcons
                                                                                        name={sport.icon as any}
                                                                                        size={14}
                                                                                        color={isSelected ? '#000' : '#6B7280'}
                                                                                        style={{ marginRight: 4 }}
                                                                                    />
                                                                                    <Text className={`text-[11px] font-bold ${isSelected ? 'text-black' : 'text-gray-600'}`}>
                                                                                        {sport.name}
                                                                                    </Text>
                                                                                </TouchableOpacity>
                                                                            );
                                                                        })}
                                                                    </View>

                                                                    {editingInterestsList.length > 0 && (
                                                                        <View className="mt-4 pt-4 border-t border-gray-100">
                                                                            <Text className="text-[11px] font-black text-gray-400 mb-4 uppercase tracking-widest italic">Calibrate Player Skills</Text>
                                                                            {globalSports
                                                                                .filter(sport => editingInterestsList.includes(sport.id))
                                                                                .map(sport => (
                                                                                    <View key={sport.id} className="flex-row items-center justify-between mb-4 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                                                                                        <View className="flex-row items-center">
                                                                                            <MaterialCommunityIcons name={sport.icon as any} size={16} color="#4B5563" style={{ marginRight: 8 }} />
                                                                                            <Text className="text-xs font-bold text-gray-700">{sport.name}</Text>
                                                                                        </View>
                                                                                        <View className="flex-row">
                                                                                            {[1, 2, 3, 4, 5].map((star) => (
                                                                                                <TouchableOpacity
                                                                                                    key={star}
                                                                                                    onPress={() => updateSkillLevel(sport.id, star)}
                                                                                                    className="px-1"
                                                                                                >
                                                                                                    <MaterialCommunityIcons
                                                                                                        name={star <= (editingSkillsMap[sport.id] || 3) ? "star" : "star-outline"}
                                                                                                        size={20}
                                                                                                        color={star <= (editingSkillsMap[sport.id] || 3) ? "#FACC15" : "#D1D5DB"}
                                                                                                    />
                                                                                                </TouchableOpacity>
                                                                                            ))}
                                                                                        </View>
                                                                                    </View>
                                                                                ))}
                                                                        </View>
                                                                    )}
                                                                    <View className="flex-row justify-end gap-x-3 mt-1 pt-3 border-t border-gray-100">
                                                                        <TouchableOpacity
                                                                            onPress={() => setEditingInterestsUser(null)}
                                                                            className="px-4 py-2 rounded-lg bg-gray-100"
                                                                        >
                                                                            <Text className="text-gray-700 text-xs font-bold uppercase tracking-wide">Cancel</Text>
                                                                        </TouchableOpacity>
                                                                        <TouchableOpacity
                                                                            onPress={() => handleSaveInterests(u.uid)}
                                                                            disabled={isSavingInterests}
                                                                            className={`px-4 py-2 rounded-lg ${isSavingInterests ? 'bg-primary/50' : 'bg-primary'}`}
                                                                        >
                                                                            <Text className="text-black text-xs font-black uppercase tracking-wide">{isSavingInterests ? 'Saving...' : 'Save Interests'}</Text>
                                                                        </TouchableOpacity>
                                                                    </View>
                                                                </View>
                                                            )}
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
                                        <View className="flex-row items-center flex-1 mr-2">
                                            <MaterialCommunityIcons name="account-plus" size={20} color="#6B7280" style={{ marginRight: 8 }} />
                                            <Text className="text-lg font-bold text-gray-800 flex-shrink" numberOfLines={1} adjustsFontSizeToFit>Manually Add User</Text>
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

                                {/* 3. DANGER ZONE (SUPER ADMIN ONLY) */}
                                {isCurrentUserSuper && (
                                    <View className="bg-red-50 p-4 rounded-lg shadow-sm mb-4 border border-red-200">
                                        <View className="flex-row items-center mb-3">
                                            <MaterialCommunityIcons name="alert" size={20} color="#DC2626" style={{ marginRight: 8 }} />
                                            <Text className="text-lg font-bold text-red-800 flex-shrink">Danger Zone</Text>
                                        </View>
                                        <Text className="text-sm text-red-700 mb-4">
                                            Permanently delete all non-admin users from Firebase Auth and Firestore. This action is irreversible.
                                        </Text>
                                        <TouchableOpacity
                                            className="bg-red-600 p-3 rounded-lg items-center shadow-sm flex-row justify-center"
                                            onPress={handleDeleteAllNonAdmins}
                                            style={{ elevation: 2 }}
                                        >
                                            <MaterialCommunityIcons name="account-remove" size={18} color="#FFFFFF" />
                                            <Text className="text-sm font-black text-white ml-2 uppercase tracking-wider">Cleanup Non-Admin Users</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </>
                        )}

                        {/* --- SYSTEM TAB --- */}
                        {activeTab === 'system' && (
                            <>
                                <SystemHealthCheck />

                                {/* Debug Info */}
                                <View className="bg-white p-4 rounded-lg shadow-sm mb-4 border border-gray-200">
                                    <TouchableOpacity onPress={() => setShowDebugInfo(!showDebugInfo)} className="flex-row justify-between items-center mb-2">
                                        <View className="flex-row items-center">
                                            <MaterialCommunityIcons name="bug" size={20} color="#6B7280" style={{ marginRight: 8 }} />
                                            <Text className="text-lg font-bold text-gray-800">Debug Info</Text>
                                        </View>
                                        <MaterialCommunityIcons name={showDebugInfo ? 'chevron-up' : 'chevron-down'} size={24} color="#6B7280" />
                                    </TouchableOpacity>
                                    <Text className="text-xs text-gray-500 ml-1">View technical details and run low-level synchronization tools</Text>
                                    {showDebugInfo && (
                                        <View className="mt-4 border-t border-gray-100 pt-4">
                                            <Text className="text-xs text-gray-600 font-mono mb-1">
                                                GameID: {getScanningGameId()}
                                            </Text>
                                            <Text className="text-xs text-gray-600 font-mono mb-4">
                                                DB Time: {matchData?.votingOpensAt ? new Date(matchData.votingOpensAt).toLocaleString() : 'N/A (Doc Missing?)'}
                                            </Text>
                                            <View className="flex-row">
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
                                                    <Text className="text-xs text-white font-bold uppercase">Force Re-Initialize</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}
                                </View>

                                {/* Maintenance */}
                                <View className="bg-white p-4 rounded-lg shadow-sm mb-4 border border-gray-200">
                                    <TouchableOpacity onPress={() => setShowMaintenance(!showMaintenance)} className="flex-row justify-between items-center mb-2">
                                        <View className="flex-row items-center">
                                            <MaterialCommunityIcons name="tools" size={20} color="#6B7280" style={{ marginRight: 8 }} />
                                            <Text className="text-lg font-bold text-gray-800">Maintenance</Text>
                                        </View>
                                        <MaterialCommunityIcons name={showMaintenance ? 'chevron-up' : 'chevron-down'} size={24} color="#6B7280" />
                                    </TouchableOpacity>
                                    <Text className="text-xs text-gray-500 ml-1">Critical system actions for resetting state or clearing stale data</Text>
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

                        {/* Support Footer */}
                        <View className="mt-8 mb-12 items-center">
                            <TouchableOpacity onPress={() => Linking.openURL('mailto:support@mygamevote.com?subject=MyGameVote%20Issue:%20Admin%20Dashboard')} className="items-center">
                                <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-[2px] mb-1">
                                    Support & Feedback
                                </Text>
                                <Text className="text-gray-500 font-medium text-xs underline">
                                    support@mygamevote.com
                                </Text>
                            </TouchableOpacity>

                            <View className="mt-6 opacity-60">
                                <Text className="text-gray-600 text-[9px] font-bold tracking-[4px] uppercase text-center">
                                    Developed by BRUTECHGYAN
                                </Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView >
    );
}
