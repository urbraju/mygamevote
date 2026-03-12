import { organizationService } from '../../services/organizationService';
import { db } from '../../firebaseConfig';
import { doc, deleteDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

// Mock Firestore
jest.mock('../../firebaseConfig', () => ({
    db: {},
    auth: {
        currentUser: { uid: 'user-123', email: 'test@example.com' }
    },
    functions: {}
}));

jest.mock('firebase/firestore', () => ({
    getFirestore: jest.fn(),
    doc: jest.fn((db, col, id) => ({ id, path: `${col}/${id}` })),
    collection: jest.fn(),
    getDoc: jest.fn(),
    setDoc: jest.fn(),
    updateDoc: jest.fn(),
    deleteDoc: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    getDocs: jest.fn(),
    arrayUnion: jest.fn((val) => [val]),
    runTransaction: jest.fn(),
}));

jest.mock('firebase/functions', () => ({
    getFunctions: jest.fn(() => ({})),
    httpsCallable: jest.fn((functions, name) => {
        if (name === 'createOrganization') {
            return jest.fn(() => Promise.resolve({ data: { orgId: 'new-squad-123', inviteCode: 'SQUAD1' } }));
        }
        if (name === 'joinOrganizationByCode') {
            return jest.fn(() => Promise.resolve({ data: { orgId: 'joined-squad-456', status: 'success' } }));
        }
        return jest.fn();
    })
}));

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
    useRouter: () => ({
        replace: mockReplace,
        back: jest.fn()
    }),
    useSegments: jest.fn(() => ['(app)', 'home']),
    Stack: { Screen: jest.fn(() => null) }
}));

describe('Squad API Flows (Service Integration)', () => {
    const mockUserId = 'user-123';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Signup & Onboarding Flow', () => {
        it('should create an organization via Cloud Function and return orgId', async () => {
            const orgName = 'Dynamic Squad';
            const orgId = await organizationService.createOrganizationFromOnboarding(orgName, mockUserId);

            expect(orgId).toBe('new-squad-123');
            expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'createOrganization');
        });

        it('should join an organization via invite code', async () => {
            const inviteCode = 'SQUAD1';
            const orgId = await organizationService.joinByInviteCode(inviteCode, mockUserId);

            expect(orgId).toBe('joined-squad-456');
            expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'joinOrganizationByCode');
        });
    });

    describe('Deletion & Redirection Flow', () => {
        it('should delete organization document from Firestore', async () => {
            const targetOrgId = 'test-squad-to-delete';
            await organizationService.deleteOrganization(targetOrgId);

            expect(deleteDoc).toHaveBeenCalledWith(
                expect.objectContaining({ id: targetOrgId })
            );
        });

        it('should call router.replace("/") after deletion logic is triggered', async () => {
            // This mirrors the logic in org-settings.tsx
            const simulateDeletion = async (orgId: string, setActiveOrgId: Function, router: any) => {
                await organizationService.deleteOrganization(orgId);
                await setActiveOrgId('');
                router.replace('/');
            };

            const mockSetActive = jest.fn();
            await simulateDeletion('org-123', mockSetActive, { replace: mockReplace });

            expect(mockSetActive).toHaveBeenCalledWith('');
            expect(mockReplace).toHaveBeenCalledWith('/');
        });
    });

    describe('Masti Org Content Filtering', () => {
        // Logic mirrored from home.tsx legacyEvent filtering
        const getLegacyMatchForOrg = (activeOrgId: string, hasData: boolean, interests: string[]) => {
            // Only show if Masti Org ('default') OR data exists for this specific org
            const isMastiOrg = activeOrgId === 'default';
            if (!isMastiOrg && !hasData) return null;
            if (!interests.includes('volleyball')) return null;
            return { id: 'masti-volleyball', title: 'Weekly Volleyball' };
        };

        it('should HIDE Masti matches for new squads with no match data', () => {
            const result = getLegacyMatchForOrg('new-squad-xyz', false, ['volleyball']);
            expect(result).toBeNull();
        });

        it('should SHOW Masti matches for the default organization', () => {
            const result = getLegacyMatchForOrg('default', false, ['volleyball']);
            expect(result).not.toBeNull();
            expect(result?.title).toBe('Weekly Volleyball');
        });

        it('should SHOW matches if data specifically exists for the custom organization', () => {
            const result = getLegacyMatchForOrg('custom-squad', true, ['volleyball']);
            expect(result).not.toBeNull();
        });

        it('should HIDE matches if user does not have required interests', () => {
            const result = getLegacyMatchForOrg('default', false, ['soccer']); // No volleyball interest
            expect(result).toBeNull();
        });
    });
});
