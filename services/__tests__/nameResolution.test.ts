
/**
 * Test suite for participant name resolution logic.
 * This logic ensures that 'Player' is only a last-resort fallback.
 */

interface MockParticipant {
    uid?: string;
    userId?: string;
    firstName?: string;
    userName?: string;
}

function resolveDisplayName(p: MockParticipant | undefined): string {
    return (p?.userName || 'Player').trim().split(' ')[0];
}

describe('Participant Name Resolution', () => {
    it('should resolve first name from userName for guest players', () => {
        const guest = { userId: 'g1', userName: 'John Doe' };
        expect(resolveDisplayName(guest)).toBe('John');
    });

    it('should handle single-word userName', () => {
        const guest = { userId: 'g2', userName: 'Batman' };
        expect(resolveDisplayName(guest)).toBe('Batman');
    });

    it('should fallback to Player if participant is undefined', () => {
        expect(resolveDisplayName(undefined)).toBe('Player');
    });

    it('should fallback to Player if userName is empty/null', () => {
        const broken = { userId: 'b1', userName: '' };
        expect(resolveDisplayName(broken)).toBe('Player');
    });

    it('should correctly prioritize first part of userName even with multiple spaces', () => {
        const complex = { userId: 'c1', userName: '  Mary   Jane  ' };
        expect(resolveDisplayName(complex)).toBe('Mary');
    });
});
