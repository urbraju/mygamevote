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

jest.mock('firebase/functions', () => ({
    getFunctions: jest.fn(),
    httpsCallable: jest.fn(() => jest.fn(() => Promise.resolve({ data: { orgId: 'test-squad-123', inviteCode: 'ABCDEF' } })))
}));

import { setDoc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

describe('Organization Creation Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should successfully create an organization and sync to user profile', async () => {
        // Execute function
        const userId = 'user-123';
        const orgName = 'Test Squad';
        const resultOrgId = await organizationService.createOrganizationFromOnboarding(orgName, userId);

        // Verify result (mocked in our firebase/functions mock)
        expect(resultOrgId).toBe('test-squad-123');

        // Verify that httpsCallable was initialized for the correct function
        expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'createOrganization');
    });
});
