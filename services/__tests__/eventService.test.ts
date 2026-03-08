import { eventService } from '../eventService';
import { db } from '../../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';

jest.mock('../../firebaseConfig', () => ({
    db: {}
}));

jest.mock('firebase/firestore', () => ({
    doc: jest.fn(() => 'MOCK_DOC_REF'),
    getDoc: jest.fn(),
    updateDoc: jest.fn(),
    deleteField: jest.fn(() => 'MOCK_DELETE_FIELD')
}));

describe('eventService API Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Team Splitting toggles', () => {
        it('toggleTeamSplitting should update document with true', async () => {
            await eventService.toggleTeamSplitting('event-123', true);
            expect(doc).toHaveBeenCalledWith(db, 'events', 'event-123');
            expect(updateDoc).toHaveBeenCalledWith('MOCK_DOC_REF', { isTeamSplittingEnabled: true });
        });

        it('toggleTeamSplitting should update document with false', async () => {
            await eventService.toggleTeamSplitting('event-123', false);
            expect(updateDoc).toHaveBeenCalledWith('MOCK_DOC_REF', { isTeamSplittingEnabled: false });
        });

        it('toggleTeamSplitting should call deleteField for null state', async () => {
            await eventService.toggleTeamSplitting('event-123', null);
            expect(updateDoc).toHaveBeenCalledWith('MOCK_DOC_REF', { isTeamSplittingEnabled: 'MOCK_DELETE_FIELD' });
        });
    });

    describe('Live Score toggles', () => {
        it('toggleLiveScore should update document', async () => {
            await eventService.toggleLiveScore('event-123', true);
            expect(updateDoc).toHaveBeenCalledWith('MOCK_DOC_REF', { isLiveScoreEnabled: true });
        });

        it('toggleLiveScore should call deleteField for null state', async () => {
            await eventService.toggleLiveScore('event-123', null);
            expect(updateDoc).toHaveBeenCalledWith('MOCK_DOC_REF', { isLiveScoreEnabled: 'MOCK_DELETE_FIELD' });
        });
    });

    describe('Update Teams array', () => {
        it('updateTeams should save arrays to document', async () => {
            await eventService.updateTeams('event-123', ['user1'], ['user2']);
            expect(updateDoc).toHaveBeenCalledWith('MOCK_DOC_REF', {
                teams: { teamA: ['user1'], teamB: ['user2'] }
            });
        });
    });

    describe('Multi-Set Match Scoring', () => {
        const { getDoc } = require('firebase/firestore');

        it('recordSetAndAdvance should calculate winner and push to sets array', async () => {
            getDoc.mockResolvedValueOnce({
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

            await eventService.recordSetAndAdvance('event-123', 'admin1');

            expect(updateDoc).toHaveBeenCalledWith('MOCK_DOC_REF', expect.objectContaining({
                liveScore: expect.objectContaining({
                    currentSet: 2,
                    teamAScore: 0,
                    teamBScore: 0,
                    sets: [
                        { teamAScore: 21, teamBScore: 19, winner: 'A' }
                    ],
                    updatedBy: 'admin1'
                })
            }));
        });

        it('finalizeMatch should tally set wins and declare matchWinner', async () => {
            getDoc.mockResolvedValueOnce({
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

            await eventService.finalizeMatch('event-123', 'admin1');

            expect(updateDoc).toHaveBeenCalledWith('MOCK_DOC_REF', expect.objectContaining({
                'liveScore.matchWinner': 'A',
                'liveScore.updatedBy': 'admin1'
            }));
        });
    });
});
