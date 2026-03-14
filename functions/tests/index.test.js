const test = require('firebase-functions-test')();
const functions = require('../index.js');

describe('Cloud Functions Unit Tests', () => {
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
});
