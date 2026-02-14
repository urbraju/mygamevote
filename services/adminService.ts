/**
 * Admin Service
 * 
 * Provides backend operations for administrative tasks.
 * - Updates global game configuration (max slots, payment toggle, fees).
 * - Manages waitlist limits and voting schedules.
 * - (Future) Advanced player management.
 */
import { db, functions } from '../firebaseConfig';
import { doc, updateDoc, collection, query, orderBy, getDocs, setDoc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
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
    isApproved?: boolean;
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
        isOpen?: boolean;
        nextGameDateOverride?: number | null;
        nextGameDetailsOverride?: string | null;
        isOverrideEnabled?: boolean;
        isCustomVotingWindowEnabled?: boolean;
        isAdminPhoneEnabled?: boolean;
        isCustomSlotsEnabled?: boolean;
        fees?: number;
        paymentDetails?: {
            zelle?: string;
            paypal?: string;
        };
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

    // Toggle "Require Admin Approval" for new users
    toggleApprovalRequirement: async (isRequired: boolean) => {
        // Storing in a dedicated settings doc
        await setDoc(doc(db, 'settings', 'general'), {
            requireApproval: isRequired
        }, { merge: true });
    },

    // Get global settings
    getGlobalSettings: async () => {
        const docRef = doc(db, 'settings', 'general');
        const snap = await getDoc(docRef);
        return snap.exists() ? snap.data() : { requireApproval: false };
    },

    // Delete User Completely (Auth + Firestore) via Cloud Function
    deleteUserCompletely: async (uid: string) => {
        const deleteAuthUser = httpsCallable(functions, 'deleteAuthUser');
        await deleteAuthUser({ uid });
    }
};
