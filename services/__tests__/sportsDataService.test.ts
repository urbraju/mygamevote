import { sportsDataService } from '../sportsDataService';

describe('sportsDataService', () => {
    describe('getSportKnowledge', () => {
        it('should return correct data for valid sportId (case-insensitive)', async () => {
            const data = await sportsDataService.getSportKnowledge('Volleyball');
            expect(data).toBeDefined();
            expect(data?.id).toBe('volleyball');
            expect(data?.name).toBe('Volleyball');
        });

        it('should return null for invalid sportId', async () => {
            const data = await sportsDataService.getSportKnowledge('non-existent');
            expect(data).toBeNull();
        });

        it('should contain all required fields in the response', async () => {
            const data = await sportsDataService.getSportKnowledge('soccer');
            expect(data).toHaveProperty('howToPlay');
            expect(data).toHaveProperty('rules');
            expect(data).toHaveProperty('tutorials');
            expect(data).toHaveProperty('events');
            expect(data).toHaveProperty('deals');
        });
    });

    describe('getAllSports', () => {
        it('should return an array of all sports', async () => {
            const all = await sportsDataService.getAllSports();
            expect(Array.isArray(all)).toBe(true);
            expect(all.length).toBeGreaterThan(0);
        });
    });

    describe('seedSportsData', () => {
        it('should successfully seed sports to Firestore', async () => {
            const result = await sportsDataService.seedSportsData();
            expect(result.success).toBe(true);
            expect(result.count).toBeGreaterThan(0);
        });
    });

    describe('refreshSportsHub', () => {
        it('should call the refresh Cloud Function', async () => {
            const result = await sportsDataService.refreshSportsHub();
            expect(result).toEqual({ success: true, count: 0 }); // Mock default
        });
    });

    /**
     * SECURITY & INTEGRITY TESTS
     */
    describe('Security & Data Integrity', () => {
        it('should only contain verified secure URLs for external content', async () => {
            const all = await sportsDataService.getAllSports();
            const secureUrlPattern = /^https:\/\//;

            all.forEach(sport => {
                sport.rules.forEach(rule => {
                    expect(rule.sourceUrl).toMatch(secureUrlPattern);
                });
                sport.deals.forEach(deal => {
                    expect(deal.shopUrl).toMatch(secureUrlPattern);
                });
            });
        });

        it('should ensure no sensitive data is leaked in sport descriptions', async () => {
            const all = await sportsDataService.getAllSports();
            all.forEach(sport => {
                // Basic check for common PII patterns if this were dynamic
                expect(sport.description).not.toMatch(/[0-9]{3}-[0-9]{2}-[0-9]{4}/);
            });
        });
    });
});
