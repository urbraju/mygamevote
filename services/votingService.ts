/**
 * Voting Service
 * 
 * Manages the core voting logic for the game slots.
 * - Subscribes to real-time slot data from Firestore.
 * - Handles voting transactions (adding/removing users).
 * - Enforces rules: max slots, voting window, duplicate votes.
 * - Marks users as paid.
 */
import { db } from '../firebaseConfig';
import { collection, doc, getDoc, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove, runTransaction, serverTimestamp, Timestamp, Transaction, DocumentSnapshot } from 'firebase/firestore';
import { getScanningGameId, getVotingStartTime } from '../utils/dateUtils';

export interface SlotUser {
    userId: string;
    userName: string;
    userEmail: string; // Added email field
    timestamp: number | Timestamp;
    status: 'confirmed' | 'waitlist';
    paid?: boolean;
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
    adminPhoneNumber?: string;
    shareTriggered?: boolean;
}

const COLLECTION_NAME = 'weekly_slots';

// Default configuration
const DEFAULT_MAX_SLOTS = 14;
const DEFAULT_MAX_WAITLIST = 4;

export const votingService = {
    // Get real-time updates for the current week's slots
    subscribeToSlots: (callback: (data: WeeklySlotData | null) => void) => {
        const gameId = getScanningGameId();
        const docRef = doc(db, COLLECTION_NAME, gameId);

        return onSnapshot(docRef, (docSnap: DocumentSnapshot) => {
            if (docSnap.exists()) {
                callback(docSnap.data() as WeeklySlotData);
            } else {
                // Doc doesn't exist yet, maybe init it?
                callback(null);
            }
        });
    },

    // Initialize the slot document for the week if it doesn't exist or is partial
    initializeWeek: async () => {
        const gameId = getScanningGameId();
        const docRef = doc(db, COLLECTION_NAME, gameId);

        console.log('[VotingService] Initializing week for GameID:', gameId);

        // Use setDoc with merge: true to ensure defaults exist without overwriting slots
        await setDoc(docRef, {
            isOpen: true,
            maxSlots: DEFAULT_MAX_SLOTS,
            maxWaitlist: DEFAULT_MAX_WAITLIST,
            paymentEnabled: false,
            // Only set createdAt if it doesn't exist (though merge will overwrite if we pass it, so maybe skip for now or use logic)
            // better to just ensure key fields
        }, { merge: true });

        // Check if votingOpensAt exists, if not set it
        const docSnap = await getDoc(docRef);
        const data = docSnap.data();

        if (!data?.votingOpensAt) {
            const votingStart = getVotingStartTime().getTime();
            await setDoc(docRef, { votingOpensAt: votingStart }, { merge: true });
        }

        if (!data?.votingClosesAt) {
            // Default close time: 48 hours after open, or 48 hours from now if no open time
            const openTime = data?.votingOpensAt || getVotingStartTime().getTime();
            const closeTime = openTime + (48 * 60 * 60 * 1000);
            await setDoc(docRef, { votingClosesAt: closeTime }, { merge: true });
        }

        if (!data?.slots) {
            await setDoc(docRef, { slots: [] }, { merge: true });
        }
    },

    // Vote for a slot
    vote: async (userId: string, userName: string, userEmail: string) => {
        const gameId = getScanningGameId();
        const docRef = doc(db, COLLECTION_NAME, gameId);

        await runTransaction(db, async (transaction: Transaction) => {
            const sfDoc = await transaction.get(docRef);
            // ... (omitting unchanged checks for brevity in tool call, but need to be careful with replace)
            // Actually, I should use a smaller chunk for the signature, and another for the object creation to be safe.
            // Splitting into two calls or one big one. Let's do one big one but careful with context.
            if (!sfDoc.exists()) {
                throw "Document does not exist!";
            }

            const data = sfDoc.data() as WeeklySlotData;

            // Check Voting Time
            const now = Date.now();
            if (now < data.votingOpensAt) {
                throw "Voting is not open yet!";
            }

            if (data.votingClosesAt && now > data.votingClosesAt) {
                throw "Voting has ended!";
            }

            if (!data.isOpen) {
                throw "Voting is closed!";
            }

            // Check if user already voted
            if (data.slots.some(s => s.userId === userId)) {
                throw "You have already voted!";
            }

            const currentCount = data.slots.length;
            const maxTotal = data.maxSlots + data.maxWaitlist;

            if (currentCount >= maxTotal) {
                throw "Waitlist is full!";
            }

            const status = currentCount < data.maxSlots ? 'confirmed' : 'waitlist';

            const newSlot: SlotUser = {
                userId,
                userName,
                userEmail,
                timestamp: Date.now(),
                status,
                paid: false
            };

            transaction.update(docRef, {
                slots: arrayUnion(newSlot)
            });
        });
    },

    // Remove vote (Admin or Self?)
    removeVote: async (userId: string) => {
        const gameId = getScanningGameId();
        const docRef = doc(db, COLLECTION_NAME, gameId);

        await runTransaction(db, async (transaction: Transaction) => {
            const sfDoc = await transaction.get(docRef);
            if (!sfDoc.exists()) {
                throw "Document does not exist!";
            }

            const data = sfDoc.data() as WeeklySlotData;
            const slotToRemove = data.slots.find(s => s.userId === userId);

            if (!slotToRemove) {
                throw "User not found in slots";
            }

            // Remove the user
            const newSlots = data.slots.filter(s => s.userId !== userId);

            // Helper to get millis for sorting
            const getMillis = (ts: number | Timestamp) => {
                if (typeof ts === 'number') return ts;
                return ts ? ts.toMillis() : Date.now();
            };

            // Re-evaluate statuses and Sort
            newSlots.sort((a, b) => getMillis(a.timestamp) - getMillis(b.timestamp));

            const updatedSlots = newSlots.map((slot, index) => ({
                ...slot,
                status: index < data.maxSlots ? 'confirmed' : 'waitlist'
            }));

            transaction.update(docRef, { slots: updatedSlots });
        });
    },

    // Mark a user as paid
    markAsPaid: async (userId: string) => {
        const gameId = getScanningGameId();
        const docRef = doc(db, COLLECTION_NAME, gameId);

        await runTransaction(db, async (transaction: Transaction) => {
            const sfDoc = await transaction.get(docRef);
            if (!sfDoc.exists()) throw "Document does not exist!";

            const data = sfDoc.data() as WeeklySlotData;
            const slotIndex = data.slots.findIndex(s => s.userId === userId);
            if (slotIndex === -1) throw "User not found";

            // Create a new slots array with the updated user
            const newSlots = [...data.slots];
            newSlots[slotIndex] = { ...newSlots[slotIndex], paid: true };

            transaction.update(docRef, { slots: newSlots });
        });
    },

    // Remove ALL votes (Admin only)
    removeAllVotes: async () => {
        const gameId = getScanningGameId();
        const docRef = doc(db, COLLECTION_NAME, gameId);

        console.log('[VotingService] Removing ALL votes for GameID:', gameId);
        try {
            await updateDoc(docRef, {
                slots: []
            });
            console.log('[VotingService] Successfully cleared slots.');
        } catch (error) {
            console.error('[VotingService] Failed to clear slots:', error);
            throw error;
        }
    },

    // Mark that the WhatsApp share has been triggered (to prevent spam)
    markShareTriggered: async () => {
        const gameId = getScanningGameId();
        const slotRef = doc(db, COLLECTION_NAME, gameId);
        await updateDoc(slotRef, {
            shareTriggered: true
        });
    }
};
