import { getNextGameDate, isVotingOpen } from '../utils/dateUtils';

describe('Date Utilities', () => {
    it('should return a date', () => {
        const date = getNextGameDate();
        expect(date).toBeInstanceOf(Date);
    });

    it('should return boolean for voting status', () => {
        const isOpen = isVotingOpen();
        expect(typeof isOpen).toBe('boolean');
    });
});
