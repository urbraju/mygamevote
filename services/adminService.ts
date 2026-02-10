/**
 * Admin Service
 * 
 * Provides backend operations for administrative tasks.
 * - Updates global game configuration (max slots, payment toggle, fees).
 * - Manages waitlist limits and voting schedules.
 * - (Future) Advanced player management.
 */
import { db } from '../firebaseConfig';
import { doc, updateDoc, arrayRemove, getDoc } from 'firebase/firestore';
import { getScanningGameId } from '../utils/dateUtils';
import { WeeklySlotData } from './votingService';

const COLLECTION_NAME = 'weekly_slots';

export const adminService = {
    // Toggle Payment Status
    setPaymentEnabled: async (enabled: boolean) => {
        const gameId = getScanningGameId();
        const docRef = doc(db, COLLECTION_NAME, gameId);
        await updateDoc(docRef, { paymentEnabled: enabled });
    },

    // Update Max Slots
    setMaxSlots: async (count: number) => {
        const gameId = getScanningGameId();
        const docRef = doc(db, COLLECTION_NAME, gameId);
        await updateDoc(docRef, { maxSlots: count });
    },

    // Update Payment Details/Fees
    updatePaymentConfig: async (fees: number, details: any) => {
        const gameId = getScanningGameId();
        const docRef = doc(db, COLLECTION_NAME, gameId);
        await updateDoc(docRef, {
            fees,
            paymentDetails: details
        });
    },

    // Update Max Waitlist
    setMaxWaitlist: async (count: number) => {
        const gameId = getScanningGameId();
        const docRef = doc(db, COLLECTION_NAME, gameId);
        await updateDoc(docRef, { maxWaitlist: count });
    },

    // Set Voting Open Time
    setVotingOpensAt: async (timestamp: number) => {
        const gameId = getScanningGameId();
        const docRef = doc(db, COLLECTION_NAME, gameId);
        await updateDoc(docRef, { votingOpensAt: timestamp });
    },

    // Remove a user from the slot list
    removeUser: async (userId: string) => {
        // This is a bit complex because we need to remove from array AND re-calculate statuses.
        // Reuse logic from votingService.removeVote or duplicate it here safely.
        // For now, let's just use the same logic but exposing it as an admin action
        // We can actually just call the transaction.
        // To avoid circular refs or duplication, let's implement the transaction here too 
        // or move the common logic to a shared helper? 
        // For simplicity, let's implement a direct update for now, but really we need the transaction stability.

        // actually votingService.removeVote does exactly what we want (removes user, rebalances list).
        // We can just call that or import it?
        // Better to keep votingService focused on User actions? 
        // `removeVote` in votingService was "Admin or Self". 
        // Let's rely on votingService.removeVote for now.
    }
};
