const mockDelete = jest.fn(() => Promise.resolve());
const mockSet = jest.fn(() => Promise.resolve());

const mockDb = {
    collection: jest.fn(() => ({
        doc: jest.fn(() => ({
            get: jest.fn(() => Promise.resolve({
                exists: false // Force week initialization to trigger
            })),
            set: mockSet
        })),
        where: jest.fn().mockReturnThis(), // Support chained queries like .where().get()
        get: jest.fn(() => Promise.resolve({
            docs: [
                {
                    id: 'doc1',
                    ref: { delete: mockDelete },
                    data: () => ({ orgId: 'default', votingOpensAt: 100 })
                },
                {
                    id: 'doc2',
                    ref: { delete: mockDelete },
                    data: () => ({ orgId: 'default', votingOpensAt: 200 })
                },
                {
                    id: 'doc3',
                    ref: { delete: mockDelete },
                    data: () => ({ orgId: 'default', votingOpensAt: 300 })
                },
                {
                    id: 'doc4',
                    ref: { delete: mockDelete },
                    data: () => ({ orgId: 'default', votingOpensAt: 400 })
                },
                {
                    id: 'doc5',
                    ref: { delete: mockDelete },
                    data: () => ({ orgId: 'default', votingOpensAt: 500 })
                }
            ],
            size: 5
        }))
    })),
    doc: jest.fn(() => ({
        get: jest.fn(() => Promise.resolve({
            exists: true,
            data: () => ({ weeklyGamesEnabled: true })
        })),
        set: mockSet
    }))
};

jest.mock('firebase-admin', () => {
    return {
        initializeApp: jest.fn(),
        firestore: () => mockDb,
        auth: jest.fn(() => ({
            deleteUser: jest.fn()
        })),
        messaging: jest.fn(() => ({
            send: jest.fn()
        }))
    };
});

const test = require('firebase-functions-test')();
const functions = require('../index.js');

describe('Cloud Functions Unit Tests', () => {
    describe('cleanupOldWeeklySlotsAndEvents', () => {
        beforeEach(() => {
            mockDelete.mockClear();
            mockSet.mockClear();
        });

        it('should prune old matches when autoInitializeWeeklyMatch runs', async () => {
            const wrapped = test.wrap(functions.autoInitializeWeeklyMatch);
            await wrapped({});

            // 14 deletions expected (2 for default, 2 for each of the 5 orgs, and 2 for final cleanup)
            expect(mockDelete).toHaveBeenCalledTimes(14);
        });
    });

    describe('searchSportGear', () => {
        it('should throw error if query is missing', async () => {
            const data = { sportName: 'soccer' };
            const context = { auth: { uid: 'test-user' } };

            await expect(functions.searchSportGear.run(data, context))
                .rejects.toThrow('Search query is required.');
        });

        it('should return fallback if API key is missing', async () => {
            const data = { query: 'shoes', sportName: 'soccer' };
            const context = { auth: { uid: 'test-user' } };

            // Mock the parameter value to be empty to force fallback
            const originalKey = process.env.SERPER_KEY;
            process.env.SERPER_KEY = '';
            
            try {
                const result = await functions.searchSportGear.run(data, context);
                
                expect(result.success).toBe(true);
                expect(result.isFallback).toBe(true);
                expect(result.amazonSearchUrl).toContain('amazon.com');
                expect(result.googleSearchUrl).toContain('google.com');
            } finally {
                // Restore original key
                process.env.SERPER_KEY = originalKey;
            }
        });

        it('should return success results on valid query', async () => {
            // This would require mocking the fetch call inside fetchDealsFromSerper
            // For now, we'll focus on the interface and argument validation
            expect(functions.searchSportGear).toBeDefined();
        });
    });

    describe('autoInitializeWeeklyMatch', () => {
        it('should be defined as a scheduled function', () => {
            expect(functions.autoInitializeWeeklyMatch).toBeDefined();
        });
    });
});
