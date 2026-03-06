import { teamService } from '../teamService';

describe('teamService Logic', () => {

    describe('runSnakeSplit', () => {

        it('should return empty arrays for less than 2 participants', () => {
            const result = teamService.runSnakeSplit([{ uid: '1', skills: {} }], 'volleyball');
            expect(result.teamA).toEqual([]);
            expect(result.teamB).toEqual([]);
        });

        it('should correctly balance teams based on skill using snake draft', () => {
            const participants = [
                { uid: 'p5', skills: { 'volleyball': 1 } }, // Weakest
                { uid: 'p1', skills: { 'volleyball': 5 } }, // Strongest
                { uid: 'p3', skills: { 'volleyball': 3 } }, // Average
                { uid: 'p4', skills: { 'volleyball': 2 } }, // Weak
                { uid: 'p2', skills: { 'volleyball': 4 } }, // Strong
                { uid: 'p6', skills: { 'volleyball': 1 } }  // Weakest
            ];

            // Expected Sorted Order (High to Low):
            // 0: p1 (5)
            // 1: p2 (4)
            // 2: p3 (3)
            // 3: p4 (2)
            // 4: p5 (1)
            // 5: p6 (1)

            // Expected Snake Draft Distribution:
            // Round 0: teamA gets p1 (index 0), teamB gets p2 (index 1)
            // Round 1: teamB gets p3 (index 2), teamA gets p4 (index 3)
            // Round 2: teamA gets p5 (index 4), teamB gets p6 (index 5)

            // Expected Final Arrays:
            // teamA: ['p1', 'p4', 'p5']
            // teamB: ['p2', 'p3', 'p6']

            const result = teamService.runSnakeSplit(participants, 'volleyball');

            expect(result.teamA).toEqual(['p1', 'p4', 'p5']);
            expect(result.teamB).toEqual(['p2', 'p3', 'p6']);
        });

        it('should use default skill of 3 if sportId is missing or skills object is undefined', () => {
            const participants = [
                { uid: 'p1', skills: { 'basketball': 5 } as Record<string, number> }, // No volleyball skill, should default to 3
                { uid: 'p2' }, // No skills object, should default to 3
                { uid: 'p3', skills: { 'volleyball': 5 } as Record<string, number> }, // Strongest
                { uid: 'p4', skills: { 'volleyball': 1 } as Record<string, number> }, // Weakest
            ];

            // Expected Sorted Order:
            // 0: p3 (5)
            // 1: p1 (3)
            // 2: p2 (3)
            // 3: p4 (1)

            // Expected Distribution:
            // teamA gets p3, teamB gets p1
            // teamB gets p2, teamA gets p4

            // teamA: ['p3', 'p4']
            // teamB: ['p1', 'p2']

            const result = teamService.runSnakeSplit(participants, 'volleyball');
            expect(result.teamA).toEqual(['p3', 'p4']);
            expect(result.teamB).toEqual(['p1', 'p2']);
        });
    });
});
