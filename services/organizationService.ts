/**
 * Organization Service
 * 
 * Manages the multi-tenant architecture lifecycle.
 * - Handles organization creation and profile synchronization.
 * - Manages membership workflows (Invite Codes, Pending Approvals).
 * - Synchronizes user profiles with organization membership (orgIds/isApproved).
 */
import { db, auth } from '../firebaseConfig';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, arrayUnion } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

export interface Organization {
    id: string; // The slug/unique ID
    name: string;
    ownerId: string;
    description?: string;
    icon?: string;
    createdAt: number;
    inviteCode?: string; // Phase 2: Unique code for joining
    settings: {
        requireApproval: boolean;
        allowPublicVoting: boolean;
        currency: string;
    };
    members: string[]; // Array of UIDs
    pendingMembers: string[]; // Array of UIDs for approval workflow
    admins: string[]; // Array of UIDs
}

export const organizationService = {
    async getOrganization(orgId: string): Promise<Organization | null> {
        const orgRef = doc(db, 'organizations', orgId);
        const orgSnap = await getDoc(orgRef);
        return orgSnap.exists() ? orgSnap.data() as Organization : null;
    },

    async createOrganization(org: Organization): Promise<void> {
        const orgRef = doc(db, 'organizations', org.id);
        await setDoc(orgRef, org);
    },

    async updateOrganization(orgId: string, updates: Partial<Organization>): Promise<void> {
        const orgRef = doc(db, 'organizations', orgId);
        await updateDoc(orgRef, updates);
    },

    async getUserOrganizations(userId: string): Promise<Organization[]> {
        const orgsRef = collection(db, 'organizations');
        // Check both members and pendingMembers
        const [membersSnap, pendingSnap] = await Promise.all([
            getDocs(query(orgsRef, where('members', 'array-contains', userId))),
            getDocs(query(orgsRef, where('pendingMembers', 'array-contains', userId)))
        ]);

        const orgMap = new Map<string, Organization>();
        membersSnap.docs.forEach(doc => orgMap.set(doc.id, { id: doc.id, ...doc.data() } as Organization));
        pendingSnap.docs.forEach(doc => orgMap.set(doc.id, { id: doc.id, ...doc.data() } as Organization));

        return Array.from(orgMap.values());
    },

    async getOrganizationMembers(orgId: string): Promise<any[]> {
        const orgRef = doc(db, 'organizations', orgId);
        const orgSnap = await getDoc(orgRef);
        if (!orgSnap.exists()) return [];

        const members = orgSnap.data().members || [];
        if (members.length === 0) return [];

        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('uid', 'in', members.slice(0, 10))); // Firestore 'in' limit
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => doc.data());
    },

    async generateInviteCode(orgId: string): Promise<string> {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        await updateDoc(doc(db, 'organizations', orgId), { inviteCode: code });
        return code;
    },

    async joinOrganization(orgId: string, userId: string): Promise<void> {
        const orgRef = doc(db, 'organizations', orgId);
        const orgSnap = await getDoc(orgRef);
        if (!orgSnap.exists()) throw new Error('Organization not found');

        const data = orgSnap.data() as Organization;
        if (!data.members.includes(userId) && !(data.pendingMembers || []).includes(userId)) {
            let requireApproval = data.settings?.requireApproval;

            // CRITICAL: If default org OR setting is missing, check global settings
            if (orgId === 'default' || requireApproval === undefined) {
                console.log(`[OrgService] Org (${orgId}) setting missing or default, checking global...`);
                const globalSnap = await getDoc(doc(db, 'settings/general'));
                if (globalSnap.exists()) {
                    requireApproval = globalSnap.data().requireApproval ?? false;
                } else {
                    requireApproval = false;
                }
            }

            console.log(`[OrgService] Joining Org: ${orgId}. RequireApproval: ${requireApproval}`);

            if (requireApproval) {
                console.log('[OrgService] Adding to pendingMembers');
                await updateDoc(orgRef, {
                    pendingMembers: arrayUnion(userId)
                });
                // Ensure global profile is NOT approved if trapped in pending
                await updateDoc(doc(db, 'users', userId), { isApproved: false });
            } else {
                console.log('[OrgService] Adding to members (Auto-Approve)');
                await updateDoc(orgRef, {
                    members: arrayUnion(userId)
                });
                // SYNC: If they join an org that doesn't require approval, they are GLOBALLY approved
                // AND synced to the orgIds list
                await updateDoc(doc(db, 'users', userId), {
                    isApproved: true,
                    orgIds: arrayUnion(orgId),
                    activeOrgId: orgId
                });
            }
        } else {
            console.log('[OrgService] User already in members or pending');
        }
    },

    async approveMember(orgId: string, userId: string): Promise<void> {
        const orgRef = doc(db, 'organizations', orgId);
        const orgSnap = await getDoc(orgRef);
        if (!orgSnap.exists()) throw new Error('Organization not found');

        const data = orgSnap.data() as Organization;
        const pending = data.pendingMembers || [];
        const members = data.members || [];

        if (pending.includes(userId)) {
            // 1. Move in Organization Doc
            await updateDoc(orgRef, {
                pendingMembers: pending.filter(id => id !== userId),
                members: arrayUnion(userId)
            });
            // 2. Sync to Global User Doc (Satisfies Firestore Rules)
            await updateDoc(doc(db, 'users', userId), {
                isApproved: true,
                orgIds: arrayUnion(orgId)
            });
            console.log(`[OrgService] Member ${userId} approved for ${orgId} and synced to profile.`);
        }
    },

    async joinByInviteCode(code: string, userId: string): Promise<string> {
        console.log('[OrgService] Calling joinOrganizationByCode Cloud Function for code:', code);
        const functions = getFunctions();
        const joinOrg = httpsCallable(functions, 'joinOrganizationByCode');

        try {
            const result = await joinOrg({ inviteCode: code });
            const data = result.data as { orgId: string, status: string };
            console.log(`[OrgService] Cloud Function Success - Joined OrgId: ${data.orgId}, Status: ${data.status}`);
            return data.orgId;
        } catch (error: any) {
            console.error('[OrgService] Cloud Function Error:', error);
            // Re-throw with a clean message for the UI
            throw new Error(error.message || 'Failed to join organization with the provided code.');
        }
    },

    async createOrganizationFromOnboarding(orgName: string, userId: string): Promise<string> {
        console.log('[OrgService] Calling createOrganization Cloud Function for name:', orgName);
        const functions = getFunctions();
        const createOrg = httpsCallable(functions, 'createOrganization');

        try {
            const result = await createOrg({ orgName });
            const data = result.data as { orgId: string, inviteCode: string };
            console.log(`[OrgService] Cloud Function Success - Created OrgId: ${data.orgId}`);
            return data.orgId;
        } catch (error: any) {
            console.error('[OrgService] Cloud Function Error:', error);
            throw new Error(error.message || 'Failed to create organization.');
        }
    },

    async deleteOrganization(orgId: string): Promise<void> {
        const { deleteDoc } = await import('firebase/firestore');
        const orgRef = doc(db, 'organizations', orgId);
        await deleteDoc(orgRef);
        console.log(`[OrgService] Organization ${orgId} deleted from Firestore.`);
    }
};

