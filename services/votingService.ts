/**
 * Voting Service
 * 
 * Manages the core voting logic for the game slots.
 * - Subscribes to real-time slot data from Firestore.
 * - Handles voting transactions (adding/removing users).
 * - Enforces rules: max slots, voting window, duplicate votes.
 * - Sticky Closure: Automatically closes at max slots, only re-opens if confirmed < maxSlots.
 * - Marks users as paid.
 * - Supports legacy "weekly_slots" and new "events" multi-sport logic.
 */
import { db, auth } from '../firebaseConfig';
import { collection, doc, getDoc, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove, runTransaction, serverTimestamp, Timestamp, Transaction, DocumentSnapshot } from 'firebase/firestore';
import { getScanningGameId, getVotingStartTime, getMillis, getVotingStartForDate, getNextGameDate } from '../utils/dateUtils';
import { GameEvent } from './eventService';

export interface SlotUser {
    userId: string;
    userName: string;
    userEmail: string; // Added email field
    timestamp: number | Timestamp;
    status: 'confirmed' | 'waitlist';
    paid?: boolean;
    paidVerified?: boolean; // NEW: Track if admin verified the payment
}

export interface WeeklySlotData {
    slots: SlotUser[];
    isOpen: boolean;
    maxSlots: number;
    maxWaitlist: number;
    votingOpensAt: number;
    votingClosesAt?: number;
    paymentEnabled: boolean;
    paymentDetails?: {
        zelle?: string;
        paypal?: string;
    };
    fees?: number;
    currency?: string;
    adminPhoneNumber?: string;
    shareTriggered?: boolean;
    nextGameDateOverride?: number; // Timestamp
    nextGameDetailsOverride?: string; // Text
    isOverrideEnabled?: boolean;
    isCustomVotingWindowEnabled?: boolean;
    isAdminPhoneEnabled?: boolean;
    isCustomSlotsEnabled?: boolean;
    sportName?: string;
    sportIcon?: string;
    location?: string;
    displayDay?: string; // e.g. "Saturday"
    displayTime?: string; // e.g. "7:00 AM"
    isCancelled?: boolean;
    cancelReason?: string;
}

const EVENTS_COLLECTION = 'events';
const LEGACY_COLLECTION = 'weekly_slots';
const DEFAULT_MAX_SLOTS = 14;
const DEFAULT_MAX_WAITLIST = 5;

export const votingService = {
    // --- MULTI-EVENT LOGIC (Phase 2) ---

    vote: async (eventId: string, userId: string, userName: string, userEmail: string) => {
        const docRef = doc(db, EVENTS_COLLECTION, eventId);
        console.log('[VotingService] Attempting vote for event:', eventId, 'user:', userEmail);

        try {
            await runTransaction(db, async (transaction: Transaction) => {
                const sfDoc = await transaction.get(docRef);
                if (!sfDoc.exists()) throw "Event does not exist!";

                const data = sfDoc.data() as GameEvent;
                const now = Date.now();

                const opensAt = getMillis(data.votingOpensAt);
                const closesAt = getMillis(data.votingClosesAt);
                const gameTime = getMillis(data.eventDate);
                const isTimeOpen = now >= opensAt && (closesAt === 0 || now <= closesAt);

                // Allow voting if explicitly 'open' OR if 'scheduled' but we are within the opens window
                // AND the game hasn't started yet. STRICTLY enforce isTimeOpen.
                const isLive = (data.isOpen ?? true) && now < gameTime && isTimeOpen && (data.status === 'open' || data.status === 'scheduled');

                if (!isLive) {
                    if (now >= gameTime) throw "This match has already started!";
                    if (now < opensAt) throw "Voting is not open yet!";
                    if (closesAt > 0 && now > closesAt) throw "Voting has ended!";
                    throw "Voting is currently closed!";
                }

                if (data.slots.some(s => s.userId === userId)) throw "You have already voted for this event!";

                const currentCount = data.slots.length;
                const maxTotal = data.maxSlots + data.maxWaitlist;
                if (currentCount >= maxTotal) throw "The waitlist for this event is full!";

                const status = currentCount < data.maxSlots ? 'confirmed' : 'waitlist';
                const newSlot: SlotUser = {
                    userId, userName, userEmail,
                    timestamp: Date.now(),
                    status, paid: false
                };

                const updatedSlots = [...data.slots, newSlot];
                const finalCount = updatedSlots.length;
                const isNowFull = finalCount >= (data.maxSlots + data.maxWaitlist);

                transaction.update(docRef, {
                    slots: updatedSlots,
                    participantIds: arrayUnion(userId),
                    status: isNowFull ? 'closed' : 'open',
                    isOpen: !isNowFull
                });
            });
            console.log('[VotingService] Vote successful!');
        } catch (error: any) {
            console.error('[VotingService] Vote TRANSACTION failed:', error.code || error.message, error);
            if (error.code === 'permission-denied') {
                console.error('[VotingService] DIAGNOSTIC: Check profile "isAdmin" status and update permissions for "events".');
            }
            throw error;
        }
    },

    // Remove vote from a specific event
    removeVote: async (eventId: string, userId: string) => {
        const docRef = doc(db, EVENTS_COLLECTION, eventId);

        await runTransaction(db, async (transaction: Transaction) => {
            const sfDoc = await transaction.get(docRef);
            if (!sfDoc.exists()) throw "Event does not exist!";

            const data = sfDoc.data() as GameEvent;
            const slotToRemove = data.slots.find(s => s.userId === userId);
            if (!slotToRemove) throw "User not found in this event's slots";

            const newSlots = data.slots.filter(s => s.userId !== userId);
            newSlots.sort((a, b) => getMillis(a.timestamp) - getMillis(b.timestamp));

            const updatedSlots = newSlots.map((slot, index) => ({
                ...slot,
                status: index < data.maxSlots ? 'confirmed' : 'waitlist' as 'confirmed' | 'waitlist'
            }));

            const confirmedCount = updatedSlots.filter(s => s.status === 'confirmed').length;
            const shouldReopen = confirmedCount < data.maxSlots;

            transaction.update(docRef, {
                slots: updatedSlots,
                participantIds: arrayRemove(userId),
                ...(shouldReopen ? { status: 'open', isOpen: true } : {})
            });
        });
    },

    // Mark a user as paid for a specific event
    markAsPaid: async (eventId: string, userId: string) => {
        const isLegacy = eventId === 'default-match';
        const docRef = isLegacy
            ? doc(db, LEGACY_COLLECTION, getScanningGameId())
            : doc(db, EVENTS_COLLECTION, eventId);

        await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(docRef);
            if (!snap.exists()) throw "Event not found";

            const data = snap.data() as any;
            const slots = data.slots || [];
            const idx = slots.findIndex((s: any) => s.userId === userId);
            if (idx === -1) throw "User not in event";

            const newSlots = [...slots];
            newSlots[idx] = { ...newSlots[idx], paid: true };
            transaction.update(docRef, { slots: newSlots });
        });
    },

    // Verify a user's payment (Admin Action)
    verifyPayment: async (containerId: string, userId: string, isLegacy: boolean = false) => {
        const docRef = doc(db, isLegacy ? 'weekly_slots' : 'events', containerId);
        await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(docRef);
            if (!snap.exists()) throw 'Match not found';

            const data = snap.data() as any;
            const slots = data.slots || [];
            const idx = slots.findIndex((s: any) => s.userId === userId);

            if (idx === -1) throw 'User not in match';

            const newSlots = [...slots];
            newSlots[idx] = { ...newSlots[idx], paidVerified: true };

            transaction.update(docRef, { slots: newSlots });
        });
    },


    updateEventStatus: async (eventId: string, status: GameEvent['status']) => {
        const docRef = doc(db, EVENTS_COLLECTION, eventId);
        await updateDoc(docRef, { status });
    },

    // --- LEGACY SINGLE-WEEK LOGIC (Backward Compatibility) ---

    subscribeToSlots: (callback: (data: WeeklySlotData | null) => void, orgId?: string | null) => {
        let gameId = getScanningGameId();
        if (orgId && orgId !== 'default') {
            gameId = `${orgId}_${gameId}`;
        }

        const docRef = doc(db, LEGACY_COLLECTION, gameId);
        console.log('[VotingService] Subscribing to legacy slots for:', gameId, 'org:', orgId);

        return onSnapshot(docRef, (docSnap: DocumentSnapshot) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as WeeklySlotData;
                callback(data);
            } else {
                console.log('[VotingService] Document missing for week:', gameId, '- Auto-initializing if possible...');
                // Optimization: ONLY attempt auto-init if we might have permission (Admin or OrgAdmin)
                // If it fails, the UI will just show the preview.
                votingService.initializeWeek(orgId).catch(err => {
                    if (err.code === 'permission-denied' || (err.message && err.message.includes('permission'))) {
                        // Expected for non-admins, ignore noise
                    } else {
                        console.error('[VotingService] Auto-init failed:', err);
                    }
                });
                callback(null);
            }
        }, (error: any) => {
            if (error.code === 'permission-denied') {
                // Silently drop expected warning during logout
            } else {
                console.error("[VotingService] Slot Subscription Error:", error);
            }
            callback(null);
        });
    },

    initializeWeek: async (orgId?: string | null) => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        let gameId = getScanningGameId();
        if (orgId && orgId !== 'default') {
            gameId = `${orgId}_${gameId}`;
        }

        const docRef = doc(db, LEGACY_COLLECTION, gameId);
        try {
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) {
                const votingStart = getVotingStartTime().getTime();

                // Fetch persistent defaults (ideally org-specific)
                let defaults: any = null;
                try {
                    const settingsPath = orgId && orgId !== 'default' ? `organizations/${orgId}/settings/weekly_match` : `settings/weekly_match`;
                    const snapDefaults = await getDoc(doc(db, settingsPath));
                    if (snapDefaults.exists()) {
                        defaults = snapDefaults.data();
                    }
                } catch (err) {
                    console.error('[VotingService] Failed to fetch defaults:', err);
                }

                // Standardized Labeling Logic: (Day) Weekly (Sport) Match
                const sportName = defaults?.sportName || 'Volleyball';
                const displayDay = defaults?.displayDay || 'Saturday';
                const label = `${displayDay} Weekly ${sportName} Match`;

                await setDoc(docRef, {
                    orgId: orgId || 'default', // Tag for multi-tenancy
                    isOpen: true,
                    maxSlots: defaults?.maxSlots ?? DEFAULT_MAX_SLOTS,
                    maxWaitlist: defaults?.maxWaitlist ?? DEFAULT_MAX_WAITLIST,
                    paymentEnabled: defaults?.paymentEnabled ?? false,
                    slots: [],
                    votingOpensAt: votingStart,
                    votingClosesAt: votingStart + (52 * 60 * 60 * 1000) + (59 * 60 * 1000), // Thursday 11:59 PM
                    fees: defaults?.fees ?? 0,
                    paymentDetails: defaults?.paymentDetails ?? {},
                    currency: defaults?.currency ?? 'USD',
                    sportName: sportName,
                    sportIcon: defaults?.sportIcon ?? 'volleyball',
                    location: defaults?.location ?? 'TBD (Setup Required)',
                    adminPhoneNumber: defaults?.adminPhoneNumber ?? '',
                    isAdminPhoneEnabled: defaults?.isAdminPhoneEnabled ?? false,
                    isCustomSlotsEnabled: defaults?.isCustomSlotsEnabled ?? false,
                    displayDay: displayDay,
                    displayTime: defaults?.displayTime ?? '7:00 AM',
                    label: label // Store the calculated label for UI consistency
                });
            }
        } catch (error) {
            console.error('[VotingService] initializeWeek failed:', error);
        }
    },

    legacyRemoveVote: async (userId: string) => {
        const gameId = getScanningGameId();
        const docRef = doc(db, LEGACY_COLLECTION, gameId);
        await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(docRef);
            if (!snap.exists()) throw "Doc missing";
            const data = snap.data() as WeeklySlotData;
            const newSlots = data.slots.filter(s => s.userId !== userId);
            newSlots.sort((a, b) => getMillis(a.timestamp) - getMillis(b.timestamp));
            const updatedSlots = newSlots.map((slot, index) => ({
                ...slot,
                status: index < data.maxSlots ? 'confirmed' : 'waitlist'
            }));
            transaction.update(docRef, { slots: updatedSlots });
        });
    },

    markShareTriggered: async (orgId?: string | null, eventId?: string | null) => {
        let docRef;
        if (!eventId || eventId === 'legacy') {
            let gameId = getScanningGameId();
            if (orgId && orgId !== 'default') {
                gameId = `${orgId}_${gameId}`;
            }
            docRef = doc(db, LEGACY_COLLECTION, gameId);
        } else {
            docRef = doc(db, EVENTS_COLLECTION, eventId);
        }
        await updateDoc(docRef, { shareTriggered: true });
    },

    deleteWeek: async () => {
        const gameId = getScanningGameId();
        const docRef = doc(db, LEGACY_COLLECTION, gameId);
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(docRef);
    },

    removeAllVotes: async (eventId?: string) => {
        if (!eventId || eventId === 'legacy') {
            const gameId = getScanningGameId();
            const docRef = doc(db, LEGACY_COLLECTION, gameId);
            await updateDoc(docRef, { slots: [] });
        } else {
            const docRef = doc(db, EVENTS_COLLECTION, eventId);
            await updateDoc(docRef, { slots: [], participantIds: [] });
        }
    },

    // Compatibility wrapper for admin.tsx call handleRemoveUser
    removeVoteLegacy: async (userId: string) => {
        return votingService.legacyRemoveVote(userId);
    },

    legacyVote: async (userId: string, userName: string, userEmail: string) => {
        const gameId = getScanningGameId();
        const docRef = doc(db, LEGACY_COLLECTION, gameId);
        console.log('[VotingService] Attempting legacy vote for:', gameId, 'user:', userEmail);

        try {
            await runTransaction(db, async (transaction: Transaction) => {
                const sfDoc = await transaction.get(docRef);
                if (!sfDoc.exists()) throw "Game Slot Missing!";

                const data = sfDoc.data() as WeeklySlotData;
                const now = Date.now();

                const opensAt = getMillis(data.votingOpensAt);
                const closesAt = getMillis(data.votingClosesAt);
                const gameDate = getNextGameDate().getTime(); // Best estimate for legacy
                const isTimeOpen = now >= opensAt && (closesAt === 0 || now <= closesAt);

                // Always check time window for legacy, unless admin explicitly toggled it open
                // STRICTLY enforce isTimeOpen.
                const isLive = (data.isOpen ?? true) && isTimeOpen && now < gameDate;

                if (!isLive) {
                    if (now >= gameDate) throw "The game for this week has already started!";
                    if (now < opensAt) throw "Voting is not open yet!";
                    if (closesAt > 0 && now > closesAt) throw "Voting has ended!";
                    throw "Voting is currently closed!";
                }

                if (data.slots.some(s => s.userId === userId)) throw "You have already voted!";

                const currentCount = data.slots.length;
                const maxTotal = data.maxSlots + data.maxWaitlist;
                if (currentCount >= maxTotal) throw "The waitlist is full!";

                const status = currentCount < data.maxSlots ? 'confirmed' : 'waitlist';
                const newSlot: SlotUser = {
                    userId, userName, userEmail,
                    timestamp: Date.now(),
                    status, paid: false
                };

                const updatedSlots = [...data.slots, newSlot];
                const finalCount = updatedSlots.length;
                const isNowFull = finalCount >= (data.maxSlots + data.maxWaitlist);

                transaction.update(docRef, {
                    slots: updatedSlots,
                    isOpen: !isNowFull
                });
            });
            console.log('[VotingService] Legacy Vote successful!');
        } catch (error: any) {
            const errorMsg = typeof error === 'string' ? error : (error.message || 'Unknown error');
            console.error('[VotingService] Legacy Vote failed:', errorMsg);
            throw error;
        }
    },

    leaveGame: async (userId: string) => {
        const gameId = getScanningGameId();
        const docRef = doc(db, LEGACY_COLLECTION, gameId);
        console.log('[VotingService] Attempting to leave game:', gameId, 'user:', userId);

        try {
            await runTransaction(db, async (transaction: Transaction) => {
                const sfDoc = await transaction.get(docRef);
                if (!sfDoc.exists()) throw "Game not found!";

                const data = sfDoc.data() as WeeklySlotData;
                const userSlot = data.slots.find(s => s.userId === userId);

                if (!userSlot) throw "You haven't voted for this game!";

                // Remove user from slots
                const updatedSlots = data.slots.filter(s => s.userId !== userId);

                // Recalculate statuses for remaining slots
                const recalculatedSlots = updatedSlots.map((slot, index) => ({
                    ...slot,
                    status: (index < data.maxSlots ? 'confirmed' : 'waitlist') as 'confirmed' | 'waitlist'
                }));

                const confirmedCount = recalculatedSlots.filter(s => s.status === 'confirmed').length;
                const shouldReopen = confirmedCount < data.maxSlots;

                transaction.update(docRef, {
                    slots: recalculatedSlots,
                    ...(shouldReopen ? { isOpen: true } : {})
                });
            });
            console.log('[VotingService] Successfully left game!');
        } catch (error: any) {
            const errorMsg = typeof error === 'string' ? error : (error.message || 'Unknown error');
            console.error('[VotingService] Leave game failed:', errorMsg);
            throw error;
        }
    }
};
