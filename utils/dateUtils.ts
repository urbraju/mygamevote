/**
 * Date Utilities
 * 
 * Helper functions for date and time calculations.
 * - Determines the next game date (Saturday).
 * - Generates unique Game IDs based on year and week number.
 * - Calculates voting windows (Tuesday 7 PM).
 */
import { startOfWeek, addDays, nextSaturday, isSaturday, setHours, setMinutes, isAfter, isBefore } from 'date-fns';

// Configuration
// TODO: Make these configurable via Admin settings
const VOTING_DAY_INDEX = 2; // Tuesday (0=Sun, 1=Mon, 2=Tue...)
const VOTING_HOUR = 19; // 7 PM
const VOTING_MINUTE = 0;

export const getNextGameDate = (): Date => {
    const today = new Date();
    if (isSaturday(today)) {
        // If today is Saturday, is the game over? Assuming game is evening.
        // For simplicity, if it's Saturday, the "next game" is next week's Saturday?
        // Let's say if today is Saturday, we are looking at *this* Saturday's game until end of day.
        return today;
    }
    return nextSaturday(today);
};

export const getScanningGameId = (): string => {
    const gameDate = getNextGameDate();
    return `${gameDate.getFullYear()}-${getWeekNumber(gameDate)}`;
};

export const isVotingOpen = (): boolean => {
    const now = new Date();
    const votingStart = getVotingStartTime();

    // Voting is open if current time is after voting start time
    // And before the game starts (e.g. Saturday 6PM?)
    const gameTime = setHours(getNextGameDate(), 18); // Example 6pm

    return isAfter(now, votingStart) && isBefore(now, gameTime);
};

export const getVotingStartTime = (): Date => {
    const today = new Date();
    const currentWeekStart = startOfWeek(today);
    const votingDay = addDays(currentWeekStart, VOTING_DAY_INDEX);
    const votingTime = setHours(setMinutes(votingDay, VOTING_MINUTE), VOTING_HOUR);

    // If we are past the voting time for this week, it remains the start time.
    // The logic might need adjustment if we are close to next week. 
    // For now, let's assume standard weekly cycle.
    return votingTime;
};

// Helper: ISO week number
function getWeekNumber(d: Date): number {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
}
