export interface UserSkill {
    uid: string;
    skills?: Record<string, number>;
}

export const teamService = {
    /**
     * Splits an array of participants into two balanced teams based on their skill level for a specific sport.
     * Uses a Snake Draft algorithm (1-2-2-1) to ensure fair distribution.
     * 
     * @param participants Array of user objects containing their skills 
     * @param sportId The sport ID to evaluate skill against (e.g. 'volleyball')
     * @returns An object containing two arrays of user IDs { teamA, teamB }
     */
    runSnakeSplit: (participants: UserSkill[], sportId: string): { teamA: string[], teamB: string[] } => {
        if (!participants || participants.length < 2) {
            return { teamA: [], teamB: [] };
        }

        // 1. Sort participants by skill level for this sport (High to Low)
        const sorted = [...participants].sort((a, b) => {
            const skillA = a.skills?.[sportId] || 3; // Default to average 3 if missing
            const skillB = b.skills?.[sportId] || 3;
            return skillB - skillA;
        });

        const teamA: string[] = [];
        const teamB: string[] = [];

        // 2. Snake Draft logic
        // Round 0 (index 0,1): P1 -> A, P2 -> B
        // Round 1 (index 2,3): P3 -> B, P4 -> A (Reverse Order)
        // Round 2 (index 4,5): P5 -> A, P6 -> B
        sorted.forEach((p, index) => {
            const round = Math.floor(index / 2);
            const isEvenRound = round % 2 === 0;

            if (isEvenRound) {
                if (index % 2 === 0) teamA.push(p.uid);
                else teamB.push(p.uid);
            } else {
                if (index % 2 === 0) teamB.push(p.uid);
                else teamA.push(p.uid);
            }
        });

        return { teamA, teamB };
    }
};
