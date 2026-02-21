import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, arrayUnion } from 'firebase/firestore';

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
        const orgsRef = collection(db, 'organizations');
        const q = query(orgsRef, where('inviteCode', '==', code.toUpperCase()));
        console.log('[OrgService] Searching for code:', code.toUpperCase());
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.error('[OrgService] Code not found:', code.toUpperCase());
            throw new Error('Invalid invite code');
        }

        const orgDoc = querySnapshot.docs[0];
        const orgId = orgDoc.id;
        console.log('[OrgService] Found OrgId:', orgId, 'Joining...');
        await this.joinOrganization(orgId, userId);
        return orgId;
    },

    async createOrganizationFromOnboarding(orgName: string, userId: string): Promise<string> {
        // 1. Generate a unique ID (slug based on orgName)
        const baseSlug = orgName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        const orgId = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

        // 2. Generate a random 6-character uppercase invite code
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let inviteCode = '';
        for (let i = 0; i < 6; i++) {
            inviteCode += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        const newOrg: Organization = {
            id: orgId,
            name: orgName.trim(),
            ownerId: userId,
            createdAt: Date.now(),
            inviteCode: inviteCode,
            settings: {
                requireApproval: true,
                allowPublicVoting: false,
                currency: 'USD',
            },
            members: [userId],
            pendingMembers: [],
            admins: [userId],
        };

        // 3. Create the organization document
        const orgRef = doc(db, 'organizations', orgId);
        await setDoc(orgRef, newOrg);
        console.log(`[OrgService] Created new organization: ${orgId} with Invite Code: ${inviteCode}`);

        // 4. Sync the status to the user's profile making them an admin
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            orgIds: arrayUnion(orgId),
            activeOrgId: orgId,
            isApproved: true,
            isAdmin: true
        });
        console.log(`[OrgService] Profile synced for ${userId}. Promoted to admin for ${orgId}.`);

        return orgId;
    }
};

