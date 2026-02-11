/**
 * Admin Service
 * 
 * Provides backend operations for administrative tasks.
 * - Updates global game configuration (max slots, payment toggle, fees).
 * - Manages waitlist limits and voting schedules.
 * - (Future) Advanced player management.
 */
import { db } from '../firebaseConfig';
import { doc, updateDoc, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { getScanningGameId } from '../utils/dateUtils';
import { WeeklySlotData } from './votingService';

const COLLECTION_NAME = 'weekly_slots';
const USERS_COLLECTION = 'users';

export interface UserProfile {
    uid: string;
    email: string;
    isAdmin: boolean;
    createdAt: number;
    firstName?: string;
    lastName?: string;
}

export const adminService = {
    // Fetch all registered users
    getAllUsers: async (): Promise<UserProfile[]> => {
        try {
            const q = query(collection(db, USERS_COLLECTION), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map((doc) => doc.data() as UserProfile);
        } catch (error) {
            console.error("Error fetching users:", error);
            return [];
        }
    },

    // Set Admin Status
    setAdminStatus: async (userId: string, isAdmin: boolean) => {
        const docRef = doc(db, USERS_COLLECTION, userId);
        await updateDoc(docRef, { isAdmin });
    },
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

    // Bulk Update Configuration
    updateGlobalConfig: async (config: {
        maxSlots?: number;
        maxWaitlist?: number;
        paymentEnabled?: boolean;
        votingOpensAt?: number;
        isOpen?: boolean;
    }) => {
        const gameId = getScanningGameId();
        const docRef = doc(db, COLLECTION_NAME, gameId);
        await updateDoc(docRef, config);
    },

    // Set Voting Open Time
    setVotingOpensAt: async (timestamp: number) => {
        const gameId = getScanningGameId();
        const docRef = doc(db, COLLECTION_NAME, gameId);
        await updateDoc(docRef, { votingOpensAt: timestamp });
    },
};
