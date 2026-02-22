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
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

// Configuration
const TIMEZONE = 'America/Chicago';
const VOTING_DAY_INDEX = 2; // Tuesday (0=Sun, 1=Mon, 2=Tue...)
const VOTING_HOUR = 19; // 7 PM
const VOTING_MINUTE = 0;

/**
 * Returns the current date/time in America/Chicago
 */
export const getCentralTime = (): Date => {
    return toZonedTime(new Date(), TIMEZONE);
};

export const getNextGameDate = (): Date => {
    const today = getCentralTime();
    let target = today;

    if (isSaturday(today)) {
        // Keep showing the current Saturday all day Saturday
        target = today;
    } else if (isSunday(today)) {
        const cutoff = setHours(setMinutes(today, 0), 9); // Sunday 9 AM (24h after completion)
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

    // Always return exactly 7 AM on the target Saturday
    return setHours(setMinutes(target, 0), 7);
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
    const today = getCentralTime();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 0 }); // Sunday
    let votingDay = addDays(currentWeekStart, VOTING_DAY_INDEX);
    let votingTime = setHours(setMinutes(votingDay, VOTING_MINUTE), VOTING_HOUR);

    // If it's already past Tuesday 7 PM in the current week, return the next week's Tuesday 7 PM
    if (isAfter(today, votingTime)) {
        votingDay = addDays(votingDay, 7);
        votingTime = setHours(setMinutes(votingDay, VOTING_MINUTE), VOTING_HOUR);
    }

    return votingTime;
};

/**
 * Calculates the preceding Tuesday 7 PM opening time for a specific game date.
 */
export const getVotingStartForDate = (eventDate: Date | number): Date => {
    const gameDate = new Date(eventDate);
    // Find the Tuesday of the same week as the game (0=Sun, 1=Mon, 2=Tue...)
    // We want the Tuesday *before* or *on* the same week as the game.
    const weekStart = startOfWeek(gameDate, { weekStartsOn: 0 }); // Sunday
    const votingDay = addDays(weekStart, VOTING_DAY_INDEX);
    const votingTime = setHours(setMinutes(votingDay, VOTING_MINUTE), VOTING_HOUR);

    // Convert to zoned time to ensure we are returning the correct epoch for local comparisons
    return toZonedTime(votingTime, TIMEZONE);
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
    const d = new Date(ts).getTime();
    return isNaN(d) ? 0 : d;
};
