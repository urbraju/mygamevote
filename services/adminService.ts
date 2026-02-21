/**
 * Admin Service (Multi-Tenant)
 */
import { db, functions } from '../firebaseConfig';
import { doc, updateDoc, collection, query, orderBy, getDocs, setDoc, getDoc, where, QueryConstraint } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getScanningGameId } from '../utils/dateUtils';

const LEGACY_SLOTS = 'weekly_slots';
const USERS_COLLECTION = 'users';

export interface UserProfile {
    uid: string;
    email: string;
    isAdmin: boolean;
    createdAt: number;
    firstName?: string;
    lastName?: string;
    isApproved?: boolean;
    orgIds?: string[];
}

export const adminService = {
    // Fetch all registered users for a specific organization
    getAllUsers: async (orgId?: string | null): Promise<UserProfile[]> => {
        try {
            console.log('[AdminService] Fetching users for org:', orgId);
            const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

            if (orgId && orgId !== 'default') {
                constraints.unshift(where('orgIds', 'array-contains', orgId));
            }

            const q = query(collection(db, USERS_COLLECTION), ...constraints);
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map((doc) => doc.data() as UserProfile);
        } catch (error) {
            console.error("Error fetching users:", error);
            return [];
        }
    },

    // Set Admin Status (Organization-Specific)
    setAdminStatus: async (userId: string, isPromoting: boolean, orgId: string) => {
        const orgRef = doc(db, 'organizations', orgId);
        const orgSnap = await getDoc(orgRef);
        if (!orgSnap.exists()) throw new Error('Organization not found');

        const data = orgSnap.data();
        const currentAdmins = data.admins || [];

        let newAdmins;
        if (isPromoting) {
            if (currentAdmins.includes(userId)) return;
            newAdmins = [...currentAdmins, userId];
        } else {
            newAdmins = currentAdmins.filter((id: string) => id !== userId);
        }

        await updateDoc(orgRef, { admins: newAdmins });
    },

    // Toggle Global Admin Status (System-Wide)
    toggleGlobalAdmin: async (userId: string, status: boolean) => {
        const userRef = doc(db, USERS_COLLECTION, userId);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) throw new Error('User not found');

        const userData = userSnap.data();
        const superAdmins = ['urbraju@gmail.com', 'brutechgyan@gmail.com'];

        if (superAdmins.includes(userData.email?.toLowerCase()) && !status) {
            throw new Error('Security Policy: Hardcoded Super-Admin cannot be demoted.');
        }

        await updateDoc(userRef, { isAdmin: status });
    },

    // Bulk Update Configuration (Organization Aware)
    updateGlobalConfig: async (config: any, orgId?: string | null) => {
        let gameId = getScanningGameId();
        if (orgId && orgId !== 'default') {
            gameId = `${orgId}_${gameId}`;
        }
        const docRef = doc(db, LEGACY_SLOTS, gameId);
        await updateDoc(docRef, config);
    },

    // Toggle "Require Admin Approval" (Organization Aware)
    toggleApprovalRequirement: async (isRequired: boolean, orgId?: string | null) => {
        if (orgId) {
            const orgRef = doc(db, 'organizations', orgId);
            // Use updateDoc with dot notation for deep merge of settings
            await updateDoc(orgRef, {
                'settings.requireApproval': isRequired
            }).catch(async (err) => {
                // If doc doesn't exist or settings object is missing, set it
                if (err.code === 'not-found' || err.message.includes('No document to update')) {
                    await setDoc(orgRef, {
                        settings: { requireApproval: isRequired }
                    }, { merge: true });
                } else {
                    throw err;
                }
            });
        }

        // Always mirror to global settings for backward compatibility
        const path = `settings/general`;
        await setDoc(doc(db, path), {
            requireApproval: isRequired
        }, { merge: true });
    },

    // Get global settings (Organization Aware)
    getGlobalSettings: async (orgId?: string | null) => {
        if (orgId) {
            const orgSnap = await getDoc(doc(db, 'organizations', orgId));
            if (orgSnap.exists()) {
                const data = orgSnap.data();
                if (data.settings?.requireApproval !== undefined) {
                    return { requireApproval: data.settings.requireApproval };
                }
            }
        }

        const path = `settings/general`;
        const snap = await getDoc(doc(db, path));
        return snap.exists() ? snap.data() : { requireApproval: false };
    },

    // --- Persistent Weekly Match Defaults (Organization Aware) ---
    getWeeklyMatchDefaults: async (orgId?: string | null) => {
        const path = orgId && orgId !== 'default' ? `organizations/${orgId}/settings/weekly_match` : `settings/weekly_match`;
        const snap = await getDoc(doc(db, path));
        return snap.exists() ? snap.data() : null;
    },

    saveWeeklyMatchDefaults: async (config: any, orgId?: string | null) => {
        const path = orgId && orgId !== 'default' ? `organizations/${orgId}/settings/weekly_match` : `settings/weekly_match`;
        const persistentFields = {
            maxSlots: config.maxSlots,
            maxWaitlist: config.maxWaitlist,
            paymentEnabled: config.paymentEnabled,
            fees: config.fees,
            paymentDetails: config.paymentDetails,
            currency: config.currency,
            adminPhoneNumber: config.adminPhoneNumber,
            isAdminPhoneEnabled: config.isAdminPhoneEnabled,
            isCustomSlotsEnabled: config.isCustomSlotsEnabled,
            sportName: config.sportName,
            sportIcon: config.sportIcon,
            location: config.location,
            displayDay: config.displayDay,
            displayTime: config.displayTime,
            isCancelled: config.isCancelled,
            cancelReason: config.cancelReason
        };
        await setDoc(doc(db, path), persistentFields, { merge: true });
    },

    // --- System-wide Configuration (Multi-Tenancy Kill Switch) ---
    getSystemConfig: async () => {
        try {
            const snap = await getDoc(doc(db, 'settings', 'system'));
            return snap.exists() ? snap.data() : { multiTenancyEnabled: true };
        } catch (error) {
            console.error("Error fetching system config:", error);
            return { multiTenancyEnabled: true };
        }
    },

    updateSystemConfig: async (config: Partial<{ multiTenancyEnabled: boolean }>) => {
        await setDoc(doc(db, 'settings', 'system'), config, { merge: true });
    },

    // Delete User Completely (Auth + Firestore) via Cloud Function
    deleteUserCompletely: async (uid: string) => {
        const deleteAuthUser = httpsCallable(functions, 'deleteAuthUser');
        await deleteAuthUser({ uid });
    }
};
