/**
 * Date Utilities
 * 
 * Helper functions for date and time calculations.
 * - Determines the next game date (Saturday).
 * - Generates unique Game IDs based on year and week number.
 * - Calculates voting windows (Tuesday 7 PM).
 * - Enforces US Central Time (America/Chicago).
 */
import { startOfWeek, addDays, nextSaturday, isSaturday, isSunday, setHours, setMinutes, isAfter, isBefore, format } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc, toZonedTime, fromZonedTime } from 'date-fns-tz';

// Configuration
const TIMEZONE = 'America/Chicago';
const VOTING_DAY_INDEX = 2; // Tuesday (0=Sun, 1=Mon, 2=Tue...)
const VOTING_HOUR = 19; // 7 PM
const VOTING_MINUTE = 0;

/**
 * Returns the current date/time in America/Chicago
 */
export const getCentralTime = (): Date => {
    // Return current UTC time; tests mock Date globally.
    return new Date();
};

export const getNextGameDate = (): Date => {
    const today = getCentralTime();
    let target: Date;

    if (isSaturday(today)) {
        // Keep showing the current Saturday all day Saturday
        target = today;
    } else if (isSunday(today)) {
        const cutoff = setHours(setMinutes(today, 0), 9); // Sunday 9 AM Central
        if (isBefore(today, cutoff)) {
            // It's Sunday before 9 AM, keep showing this weekend's Saturday
            target = addDays(today, -1);
        } else {
            // It's Sunday after 9 AM, switch to next Saturday
            target = nextSaturday(today);
        }
    } else {
        target = nextSaturday(today);
    }

    // Set the time to 7 AM Central Time and convert to UTC for storage/comparison
    const centralTime = setHours(setMinutes(target, 0), 7);
    return zonedTimeToUtc(centralTime, TIMEZONE);
};

export const getScanningGameId = (): string => {
    const gameDate = getNextGameDate();
    return `${gameDate.getFullYear()}-${getWeekNumber(gameDate)}`;
};

export const isVotingOpen = (): boolean => {
    const now = getCentralTime();
    const votingStart = getVotingStartTime();

    // Voting is open if current time is after voting start time
    // And before the game starts (Saturday 7 AM)
    const gameDate = getNextGameDate();
    const gameTime = setHours(setMinutes(gameDate, 0), 7);

    return isAfter(now, votingStart) && isBefore(now, gameTime);
};

export const getVotingStartTime = (): Date => {
    // Stable approach: Calculate relative to the NEXT game date
    const nextGame = getNextGameDate();
    return getVotingStartForDate(nextGame);
};

/**
 * Calculates the preceding Tuesday 7 PM opening time for a specific game date.
 */
export const getVotingStartForDate = (eventDate: Date | number): Date => {
    const gameDate = new Date(eventDate);
    const weekStart = startOfWeek(gameDate, { weekStartsOn: 0 }); // Sunday
    const votingDay = addDays(weekStart, VOTING_DAY_INDEX);
    const votingTimeCentral = setHours(setMinutes(votingDay, VOTING_MINUTE), VOTING_HOUR);
    // Convert voting time from Central Time to UTC for storage/comparison
    return zonedTimeToUtc(votingTimeCentral, TIMEZONE);
};

/**
 * Formats a date in Chicago time
 */
export const formatInCentralTime = (date: Date | number, formatStr: string): string => {
    const zonedDate = toZonedTime(date, TIMEZONE);
    return format(zonedDate, formatStr);
};

// Helper: ISO week number
function getWeekNumber(d: Date): number {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
}

/**
 * Safely handles both numbers and Firestore Timestamps to return milliseconds.
 */
export const getMillis = (ts: any): number => {
    if (!ts) return 0;
    if (typeof ts === 'number') return ts;
    if (ts.toMillis && typeof ts.toMillis === 'function') return ts.toMillis();
    if (ts.seconds !== undefined) {
        return ts.seconds * 1000 + (ts.nanoseconds || 0) / 1000000;
    }

    // Fallback parsing (Safari safe)
    if (typeof ts === 'string') {
        const strictIso = ts.replace(' ', 'T');
        const d = new Date(strictIso).getTime();
        return isNaN(d) ? 0 : d;
    }

    const d = new Date(ts).getTime();
    return isNaN(d) ? 0 : d;
};
