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
import { collection, doc, getDoc, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove, runTransaction, serverTimestamp, Timestamp } from 'firebase/firestore';
import { getScanningGameId } from '../utils/dateUtils';

export interface SlotUser {
    userId: string;
    userName: string; // or email for now
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
    paymentEnabled: boolean;
    paymentDetails?: {
        zelle?: string;
        paypal?: string;
    };
    fees?: number;
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

        return onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                callback(docSnap.data() as WeeklySlotData);
            } else {
                // Doc doesn't exist yet, maybe init it?
                callback(null);
            }
        });
    },

    // Initialize the slot document for the week if it doesn't exist
    initializeWeek: async () => {
        const gameId = getScanningGameId();
        const docRef = doc(db, COLLECTION_NAME, gameId);

        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            // Calculate default voting open time
            // Re-importing inside function to avoid circular dep issues if any
            const { getVotingStartTime } = require('../utils/dateUtils');
            const votingStart = getVotingStartTime().getTime();

            await setDoc(docRef, {
                slots: [],
                isOpen: true,
                maxSlots: DEFAULT_MAX_SLOTS,
                maxWaitlist: DEFAULT_MAX_WAITLIST,
                votingOpensAt: votingStart,
                paymentEnabled: false,
                createdAt: Date.now()
            });
        }
    },

    // Vote for a slot
    vote: async (userId: string, userName: string) => {
        const gameId = getScanningGameId();
        const docRef = doc(db, COLLECTION_NAME, gameId);

        await runTransaction(db, async (transaction) => {
            const sfDoc = await transaction.get(docRef);
            if (!sfDoc.exists()) {
                throw "Document does not exist!";
            }

            const data = sfDoc.data() as WeeklySlotData;

            // Check Voting Time
            if (Date.now() < data.votingOpensAt) {
                throw "Voting is not open yet!";
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
                timestamp: serverTimestamp() as any, // Cast to any/number/Timestamp for now
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

        await runTransaction(db, async (transaction) => {
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

        await runTransaction(db, async (transaction) => {
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
    }
};
