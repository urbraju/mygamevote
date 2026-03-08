import { votingService } from '../votingService';
import { db, auth } from '../../firebaseConfig';
import { runTransaction, doc, updateDoc, getDoc } from 'firebase/firestore';

// Mock Firebase dependencies
jest.mock('../../firebaseConfig', () => ({
    db: {},
    auth: { currentUser: { uid: 'test-admin-id' } }
}));

jest.mock('firebase/firestore', () => ({
    doc: jest.fn(),
    collection: jest.fn(),
    runTransaction: jest.fn(),
    updateDoc: jest.fn(),
    getDoc: jest.fn(() => Promise.resolve({
        exists: () => true,
        data: () => ({})
    })),
    setDoc: jest.fn(),
    arrayUnion: jest.fn(),
    arrayRemove: jest.fn(),
    deleteField: jest.fn(() => 'MOCK_DELETE_FIELD')
}));

// Mock Date utils
jest.mock('../../utils/dateUtils', () => ({
    getScanningGameId: jest.fn(() => 'test-week-id'),
    getVotingStartTime: jest.fn(() => new Date('2026-03-01T00:00:00Z')),
    getMillis: jest.fn((val) => val),
    getVotingStartForDate: jest.fn(),
    getNextGameDate: jest.fn(() => new Date('2026-03-07T00:00:00Z'))
}));

describe('votingService API Tests', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Team Splitting toggles', () => {
        it('legacyToggleTeamSplitting should update document with enabled status', async () => {
            await votingService.legacyToggleTeamSplitting(true);
            expect(doc).toHaveBeenCalledWith(db, 'weekly_slots', 'test-week-id');
            expect(updateDoc).toHaveBeenCalledWith(undefined, { isTeamSplittingEnabled: true });
        });

        it('legacyToggleTeamSplitting should handle orgId prefix', async () => {
            await votingService.legacyToggleTeamSplitting(false, 'org123');
            expect(doc).toHaveBeenCalledWith(db, 'weekly_slots', 'org123_test-week-id');
            expect(updateDoc).toHaveBeenCalledWith(undefined, { isTeamSplittingEnabled: false });
        });

        it('legacyToggleTeamSplitting should call deleteField for null state', async () => {
            await votingService.legacyToggleTeamSplitting(null);
            expect(doc).toHaveBeenCalledWith(db, 'weekly_slots', 'test-week-id');
            expect(updateDoc).toHaveBeenCalledWith(undefined, { isTeamSplittingEnabled: 'MOCK_DELETE_FIELD' });
        });
    });

    describe('Live Score toggles', () => {
        it('legacyToggleLiveScore should update document', async () => {
            await votingService.legacyToggleLiveScore(true);
            expect(doc).toHaveBeenCalledWith(db, 'weekly_slots', 'test-week-id');
            expect(updateDoc).toHaveBeenCalledWith(undefined, { isLiveScoreEnabled: true });
        });

        it('legacyToggleLiveScore should call deleteField for null state', async () => {
            await votingService.legacyToggleLiveScore(null);
            expect(doc).toHaveBeenCalledWith(db, 'weekly_slots', 'test-week-id');
            expect(updateDoc).toHaveBeenCalledWith(undefined, { isLiveScoreEnabled: 'MOCK_DELETE_FIELD' });
        });

        it('legacyUpdateEventScore should update score with timestamp and userId', async () => {
            // Mock Date.now for predictable testing
            const mockNow = 1772815000000;
            jest.spyOn(Date, 'now').mockImplementation(() => mockNow);

            (getDoc as jest.Mock).mockResolvedValueOnce({
                exists: () => true,
                data: () => ({})
            });

            await votingService.legacyUpdateEventScore(10, 5, 'admin-user-id');

            expect(doc).toHaveBeenCalledWith(db, 'weekly_slots', 'test-week-id');
            expect(updateDoc).toHaveBeenCalledWith(undefined, {
                liveScore: {
                    teamAScore: 10,
                    teamBScore: 5,
                    updatedBy: 'admin-user-id',
                    updatedAt: mockNow
                }
            });

            jest.restoreAllMocks();
        });
    });

    describe('Update Teams array', () => {
        it('legacyUpdateTeams should save arrays to document', async () => {
            await votingService.legacyUpdateTeams(['user1', 'user2'], ['user3', 'user4']);
            expect(doc).toHaveBeenCalledWith(db, 'weekly_slots', 'test-week-id');
            expect(updateDoc).toHaveBeenCalledWith(undefined, {
                teams: { teamA: ['user1', 'user2'], teamB: ['user3', 'user4'] }
            });
        });
    });

    describe('Multi-Set Match Scoring', () => {
        it('legacyRecordSetAndAdvance should calculate winner and push to sets array', async () => {
            (getDoc as jest.Mock).mockResolvedValueOnce({
                exists: () => true,
                data: () => ({
                    liveScore: {
                        teamAScore: 21,
                        teamBScore: 19,
                        currentSet: 1,
                        sets: []
                    }
                })
            });

            await votingService.legacyRecordSetAndAdvance('admin-user-id');

            expect(doc).toHaveBeenCalledWith(db, 'weekly_slots', 'test-week-id');
            expect(updateDoc).toHaveBeenCalledWith(undefined, expect.objectContaining({
                liveScore: expect.objectContaining({
                    currentSet: 2,
                    teamAScore: 0,
                    teamBScore: 0,
                    sets: [
                        { teamAScore: 21, teamBScore: 19, winner: 'A' }
                    ],
                    updatedBy: 'admin-user-id'
                })
            }));
        });

        it('legacyFinalizeMatch should tally set wins and declare matchWinner', async () => {
            (getDoc as jest.Mock).mockResolvedValueOnce({
                exists: () => true,
                data: () => ({
                    liveScore: {
                        sets: [
                            { teamAScore: 21, teamBScore: 10, winner: 'A' },
                            { teamAScore: 22, teamBScore: 20, winner: 'A' }
                        ]
                    }
                })
            });

            await votingService.legacyFinalizeMatch('admin-user-id');

            expect(doc).toHaveBeenCalledWith(db, 'weekly_slots', 'test-week-id');
            expect(updateDoc).toHaveBeenCalledWith(undefined, expect.objectContaining({
                'liveScore.matchWinner': 'A',
                'liveScore.updatedBy': 'admin-user-id'
            }));
        });
    });

});
