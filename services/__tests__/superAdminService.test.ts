import { superAdminService } from '../superAdminService';
import { db } from '../../firebaseConfig';
import { getDocs, deleteDoc, setDoc } from 'firebase/firestore';

// Mock Firebase configuration
jest.mock('../../firebaseConfig', () => ({
    db: {},
    auth: { currentUser: { uid: 'test-admin-id' } },
    functions: {}
}));

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
    collection: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    getDocs: jest.fn(),
    doc: jest.fn(),
    deleteDoc: jest.fn(),
    setDoc: jest.fn(),
    getDoc: jest.fn(),
    updateDoc: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
}));

describe('superAdminService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('searchOrganizations', () => {
        it('should perform search by invite code and name', async () => {
            (getDocs as jest.Mock).mockResolvedValue({
                docs: [
                    { id: 'org1', data: () => ({ name: 'Test Org', inviteCode: 'ABC', members: [] }) }
                ]
            });

            const results = await superAdminService.searchOrganizations('test');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].name).toBe('Test Org');
            expect(getDocs).toHaveBeenCalledTimes(2); // One for code, one for name
        });
    });

    describe('deleteOrganizationGlobal', () => {
        it('should call deleteDoc with correct reference', async () => {
            await superAdminService.deleteOrganizationGlobal('org-to-delete');
            expect(deleteDoc).toHaveBeenCalled();
        });
    });

    describe('updateSystemConfig', () => {
        it('should update global feature toggles', async () => {
            const mockConfig = { sportsHubEnabled: false };
            await superAdminService.updateSystemConfig(mockConfig);
            expect(setDoc).toHaveBeenCalledWith(expect.anything(), mockConfig, { merge: true });
        });
    });
});
