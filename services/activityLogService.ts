import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { timeService } from './timeService';

export type ActivityActionType = 'BUTTON_RENDERED_ACTIVE' | 'BUTTON_CLICKED' | 'VOTE_SUCCESS' | 'VOTE_FAILED';

export interface ActivityLog {
    userId: string;
    userName: string;
    userEmail: string;
    action: ActivityActionType;
    eventId: string;
    localTimestamp: string;
    serverTimestampMs: number;
    localTimestampMs: number;
    differenceMs: number;
    details?: string;
    createdAt?: any;
}

export const activityLogService = {
    logAction: async (
        userId: string,
        userName: string,
        userEmail: string,
        action: ActivityActionType,
        eventId: string,
        details?: string
    ) => {
        try {
            const localNow = new Date();
            const serverNowMs = timeService.getNow();
            const localNowMs = localNow.getTime();

            const logEntry: ActivityLog = {
                userId,
                userName,
                userEmail,
                action,
                eventId,
                localTimestamp: localNow.toISOString(),
                serverTimestampMs: serverNowMs,
                localTimestampMs: localNowMs,
                differenceMs: localNowMs - serverNowMs,
                details,
                createdAt: serverTimestamp()
            };

            const logsCollection = collection(db, 'activity_logs');
            await addDoc(logsCollection, logEntry);

            // Also log to console for local debugging
            console.log(`[ACTIVITY LOG SAVED] ${userEmail} -> ${action} on ${eventId}`);

        } catch (error) {
            console.error('[ActivityLogService] Failed to save log to Firestore', error);
        }
    }
};
