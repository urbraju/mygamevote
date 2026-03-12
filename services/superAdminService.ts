/**
 * Super Admin Service
 * 
 * Provides global administrative functions for the platform.
 * - Organization Search & Deletion
 * - Global Feature Toggles
 * - System-wide user management
 */
import { db } from '../firebaseConfig';
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    deleteDoc,
    setDoc,
    getDoc,
    updateDoc,
    orderBy,
    limit,
    QueryConstraint
} from 'firebase/firestore';

export interface SystemConfig {
    multiTenancyEnabled: boolean;
    sportsHubEnabled: boolean;
}

export interface OrganizationInfo {
    id: string;
    name: string;
    inviteCode: string;
    createdAt: number;
    membersCount: number;
}

export const superAdminService = {
    /**
     * Search organizations across the entire platform.
     * Searches by name (case-insensitive prefix) or invite code.
     */
    searchOrganizations: async (searchTerm: string): Promise<OrganizationInfo[]> => {
        try {
            console.log(`[SuperAdminService] Searching for orgs: ${searchTerm}`);
            const orgsRef = collection(db, 'organizations');
            const searchLower = searchTerm.toLowerCase();

            // Search by Invite Code first (Exact match)
            const codeQuery = query(orgsRef, where('inviteCode', '==', searchTerm.toUpperCase()));
            const codeSnap = await getDocs(codeQuery);

            // Search by Name
            // Note: Firestore doesn't support case-insensitive contains, so we do a range query for prefix
            const nameQuery = query(
                orgsRef,
                where('name', '>=', searchTerm),
                where('name', '<=', searchTerm + '\uf8ff'),
                limit(20)
            );
            const nameSnap = await getDocs(nameQuery);

            const resultsMap = new Map<string, OrganizationInfo>();

            [...codeSnap.docs, ...nameSnap.docs].forEach(doc => {
                const data = doc.data();
                resultsMap.set(doc.id, {
                    id: doc.id,
                    name: data.name || 'Unnamed',
                    inviteCode: data.inviteCode || 'N/A',
                    createdAt: data.createdAt || 0,
                    membersCount: (data.members || []).length
                });
            });

            return Array.from(resultsMap.values()).sort((a, b) => b.createdAt - a.createdAt);
        } catch (error) {
            console.error("[SuperAdminService] Search failed", error);
            return [];
        }
    },

    /**
     * Administrative force-delete of an organization.
     */
    deleteOrganizationGlobal: async (orgId: string): Promise<void> => {
        console.log(`[SuperAdminService] Deleting organization: ${orgId}`);
        const orgRef = doc(db, 'organizations', orgId);
        await deleteDoc(orgRef);
        // Note: In production, we might want to also clean up associated matches (weekly_slots)
    },

    /**
     * Get global system configuration (Feature Toggles).
     */
    getSystemConfig: async (): Promise<SystemConfig> => {
        const snap = await getDoc(doc(db, 'settings', 'system'));
        const data = snap.data();
        return {
            multiTenancyEnabled: data?.multiTenancyEnabled ?? true,
            sportsHubEnabled: data?.sportsHubEnabled ?? true
        };
    },

    /**
     * Update global feature toggles.
     */
    updateSystemConfig: async (config: Partial<SystemConfig>): Promise<void> => {
        console.log('[SuperAdminService] Updating system config:', config);
        await setDoc(doc(db, 'settings', 'system'), config, { merge: true });
    }
};
