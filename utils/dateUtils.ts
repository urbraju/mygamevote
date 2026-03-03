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
    let target: Date;

    if (isSaturday(today)) {
        // Keep showing today's game until the end of Saturday
        target = today;
    } else {
        // If it's Sunday (past midnight) or any other weekday, show the upcoming Saturday
        target = nextSaturday(today);
    }

    // Set to 7:00 AM logical time
    const logical7AM = setHours(setMinutes(target, 0), 7);

    // Convert wall-clock 7:00 AM back to absolute epoch
    return fromZonedTime(logical7AM, TIMEZONE);
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
    // Find the Tuesday of the same week as the game (0=Sun, 1=Mon, 2=Tue...)
    // We want the Tuesday *before* or *on* the same week as the game.
    const weekStart = startOfWeek(gameDate, { weekStartsOn: 0 }); // Sunday
    const votingDay = addDays(weekStart, VOTING_DAY_INDEX);
    const votingTime = setHours(setMinutes(votingDay, VOTING_MINUTE), VOTING_HOUR);

    // Convert wall-clock voting time back to absolute epoch
    return fromZonedTime(votingTime, TIMEZONE);
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
