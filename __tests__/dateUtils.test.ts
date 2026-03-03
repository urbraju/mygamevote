import { getNextGameDate, getVotingStartTime, formatInCentralTime } from '../utils/dateUtils';
import { setHours, setMinutes, addDays, startOfWeek } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Chicago';

describe('Date Utilities - Voting Window', () => {
    const originalDate = global.Date;

    function mockDate(isoString: string) {
        const date = new Date(isoString);
        // @ts-ignore
        global.Date = class extends Date {
            constructor() {
                super();
                return date;
            }
            static now() {
                return date.getTime();
            }
        };
    }

    afterEach(() => {
        global.Date = originalDate;
    });

    it('should calculate Tuesday 7 PM for the CURRENT week if called on Monday', () => {
        // Monday, March 2nd, 2026
        mockDate('2026-03-02T12:00:00');
        const nextGame = getNextGameDate();
        const votingStart = getVotingStartTime();

        // Game should be Saturday March 7th
        expect(formatInCentralTime(nextGame, 'yyyy-MM-dd HH:mm')).toBe('2026-03-07 07:00');
        // Voting should start Tuesday March 3rd 7 PM
        expect(formatInCentralTime(votingStart, 'yyyy-MM-dd HH:mm')).toBe('2026-03-03 19:00');
    });

    it('should keep the SAME voting start even after Tuesday 7 PM passes', () => {
        // Wednesday, March 4th, 2026
        mockDate('2026-03-04T12:00:00');
        const nextGame = getNextGameDate();
        const votingStart = getVotingStartTime();

        expect(formatInCentralTime(nextGame, 'yyyy-MM-dd HH:mm')).toBe('2026-03-07 07:00');
        // Voting should STILL start Tuesday March 3rd 7 PM (the stable one for this Saturday)
        expect(formatInCentralTime(votingStart, 'yyyy-MM-dd HH:mm')).toBe('2026-03-03 19:00');
    });

    it('should shift to NEXT week immediately after Sunday Midnight', () => {
        // Sunday, March 8th, 2026, 01:00 AM
        mockDate('2026-03-08T01:00:00');
        const nextGame = getNextGameDate();
        const votingStart = getVotingStartTime();

        // Game should be for Saturday March 14th
        expect(formatInCentralTime(nextGame, 'yyyy-MM-dd HH:mm')).toBe('2026-03-14 07:00');
        // Voting should start Tuesday March 10th 7 PM
        expect(formatInCentralTime(votingStart, 'yyyy-MM-dd HH:mm')).toBe('2026-03-10 19:00');
    });

    it('should show upcoming Saturday if called on Sunday afternoon', () => {
        // Sunday, March 8th, 2026, 15:00 (3 PM)
        mockDate('2026-03-08T15:00:00');
        const nextGame = getNextGameDate();

        expect(formatInCentralTime(nextGame, 'yyyy-MM-dd HH:mm')).toBe('2026-03-14 07:00');
    });
});
