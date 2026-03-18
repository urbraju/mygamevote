import { activityLogService } from '../activityLogService';
import { db } from '../../firebaseConfig';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { timeService } from '../timeService';

// Mock Firebase dependencies
jest.mock('../../firebaseConfig', () => ({
    db: {}
}));

jest.mock('firebase/firestore', () => ({
    collection: jest.fn(),
    addDoc: jest.fn(),
    serverTimestamp: jest.fn(() => 'MOCK_SERVER_TIMESTAMP')
}));

jest.mock('../timeService', () => ({
    timeService: {
        getNow: jest.fn(() => 1772815000000)
    }
}));

describe('activityLogService Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('logAction should save a correctly formatted log to Firestore', async () => {
        const mockUserId = 'user-123';
        const mockUserName = 'Test User';
        const mockUserEmail = 'test@example.com';
        const mockAction = 'BUTTON_CLICKED';
        const mockEventId = 'event-456';
        const mockDetails = 'Test details';

        await activityLogService.logAction(
            mockUserId,
            mockUserName,
            mockUserEmail,
            mockAction,
            mockEventId,
            mockDetails
        );

        expect(collection).toHaveBeenCalledWith(db, 'activity_logs');
        expect(addDoc).toHaveBeenCalledWith(undefined, expect.objectContaining({
            userId: mockUserId,
            userName: mockUserName,
            userEmail: mockUserEmail,
            action: mockAction,
            eventId: mockEventId,
            details: mockDetails,
            serverTimestampMs: 1772815000000,
            createdAt: 'MOCK_SERVER_TIMESTAMP'
        }));
    });

    it('logAction should support BUTTON_CLICK_IGNORED action', async () => {
        await activityLogService.logAction(
            'u1', 'Name', 'email@test.com',
            'BUTTON_CLICK_IGNORED',
            'e1',
            'Rapid tap'
        );

        expect(addDoc).toHaveBeenCalledWith(undefined, expect.objectContaining({
            action: 'BUTTON_CLICK_IGNORED',
            details: 'Rapid tap'
        }));
    });

    it('logAction should use explicitServerMs if provided', async () => {
        const explicitMs = 1234567890;
        await activityLogService.logAction(
            'u1', 'Name', 'email@test.com',
            'VOTE_SUCCESS',
            'e1',
            undefined,
            explicitMs
        );

        expect(addDoc).toHaveBeenCalledWith(undefined, expect.objectContaining({
            serverTimestampMs: explicitMs
        }));
    });

    it('logAction should handle errors gracefully', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        (addDoc as jest.Mock).mockRejectedValueOnce(new Error('Firestore Error'));

        await activityLogService.logAction('u1', 'N', 'E', 'BUTTON_CLICKED', 'e1');

        expect(consoleErrorSpy).toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
    });
});
