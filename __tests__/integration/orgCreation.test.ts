import { organizationService } from '../../services/organizationService';
import { db } from '../../firebaseConfig';
import { runTransaction } from 'firebase/firestore';

// Mock Firestore
jest.mock('../../firebaseConfig', () => ({
    db: {},
}));

jest.mock('firebase/firestore', () => ({
    doc: jest.fn((db, collection, id) => ({ id: id || 'mock-doc-id' })),
    collection: jest.fn(),
    setDoc: jest.fn(),
    updateDoc: jest.fn(),
    runTransaction: jest.fn(),
    arrayUnion: jest.fn((val) => [val]),
}));

import { setDoc, updateDoc } from 'firebase/firestore';

describe('Organization Creation Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should successfully create an organization and sync to user profile', async () => {
        // Execute function
        const userId = 'user-123';
        const orgName = 'Test Squad';
        const resultOrgId = await organizationService.createOrganizationFromOnboarding(orgName, userId);

        // Verify result
        expect(resultOrgId).toContain('test-squad-');

        // Verify interactions
        expect(setDoc).toHaveBeenCalledTimes(1); // the org doc
        expect(updateDoc).toHaveBeenCalledTimes(1); // the user doc

        // Verify the organization was created with correct initial state
        const setCallArgs = (setDoc as jest.Mock).mock.calls[0];
        expect(setCallArgs[1]).toEqual(expect.objectContaining({
            name: orgName,
            ownerId: userId,
            settings: expect.objectContaining({
                requireApproval: true,
                allowPublicVoting: false
            }),
            members: [userId],
            admins: [userId]
        }));

        // Verify the user profile was synced correctly
        const updateCallArgs = (updateDoc as jest.Mock).mock.calls[0];
        expect(updateCallArgs[1]).toEqual(expect.objectContaining({
            isApproved: true,
            isAdmin: true,
            activeOrgId: resultOrgId,
            orgIds: [resultOrgId]
        }));
    });
});
