/**
 * Event Service
 * 
 * Manages the multi-sport game events logic.
 * - Handles the creation, querying, and snapshot listening of distinct events per organization.
 * - Manages user joining/leaving of specific events.
 * - Supports waitlist and dynamic open/close states.
 */
import { db } from '../firebaseConfig';
import { collection, doc, getDoc, getDocs, setDoc, addDoc, query, where, onSnapshot, orderBy, Timestamp, limit, runTransaction, updateDoc, deleteField } from 'firebase/firestore';
import { SlotUser } from './votingService';

export interface GameEvent {
    id?: string;
    orgId?: string; // Multi-tenancy support
    sportId: string;
    sportName: string;
    sportIcon: string;
    eventDate: number; // Timestamp of the game
    votingOpensAt: number;
    votingClosesAt: number;
    maxSlots: number;
    maxWaitlist: number;
    isOpen: boolean;
    status: 'scheduled' | 'open' | 'closed' | 'completed';
    location: string;
    fees?: number;
    currency?: string;
    paymentDetails?: {
        zelle?: string;
        paypal?: string;
    };
    slots: SlotUser[];
    participantIds: string[];
    isCancelled?: boolean;
    cancelReason?: string;
    displayDay?: string; // e.g. "Saturday"
    displayTime?: string; // e.g. "7:00 AM"
    liveScore?: {
        currentSet?: number; // Defaults to 1 if not present
        teamAScore: number;
        teamBScore: number;
        sets?: { teamAScore: number; teamBScore: number; winner?: 'A' | 'B' }[];
        matchWinner?: 'A' | 'B' | null;
        updatedBy: string;
        updatedAt: number;
    };
    isTeamSplittingEnabled?: boolean;
    isLiveScoreEnabled?: boolean | null;
    teams?: {
        teamA: string[]; // userIds
        teamB: string[]; // userIds
    };
    createdAt: number;
}

const COLLECTION_NAME = 'events';

export const eventService = {
    // Admin: Create a new event
    createEvent: async (eventData: Omit<GameEvent, 'id' | 'slots' | 'createdAt'> & { orgId: string }): Promise<string> => {
        try {
            const data = {
                ...eventData,
                slots: [],
                participantIds: [],
                createdAt: Date.now()
            };
            const docRef = await addDoc(collection(db, COLLECTION_NAME), data);
            return docRef.id;
        } catch (error) {
            console.error('[EventService] Error creating event:', error);
            throw error;
        }
    },

    // Get active events filtered by user interests AND active organization
    getEventsForUser: async (interests: string[], orgId?: string | null): Promise<GameEvent[]> => {
        try {
            console.log('[EventService] Fetching events for interests:', interests, 'org:', orgId);
            if (interests.length === 0) return [];

            const constraints = [
                where('sportId', 'in', interests),
                where('status', '!=', 'completed')
            ];

            // Multi-tenancy isolation
            if (orgId) {
                constraints.push(where('orgId', '==', orgId));
            } else {
                // Backward compatibility: allow untagged events if no org filter
                // However, security rules might still block if untagged data isn't allowed for certain roles
            }

            const q = query(
                collection(db, COLLECTION_NAME),
                ...constraints,
                orderBy('status'),
                orderBy('eventDate', 'asc')
            );

            const snap = await getDocs(q);
            const now = Date.now();
            const twelveHoursAgo = now - (12 * 60 * 60 * 1000);

            const events = snap.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as GameEvent))
                .filter(event => (event.eventDate || 0) > twelveHoursAgo);

            // Data Shim: Correct Pickleball variations
            events.forEach(event => {
                const normName = (event.sportName || '').trim().toLowerCase();
                if (normName === 'pcikle ball' || normName === 'pickle ball' || normName === 'pickleball') {
                    event.sportName = 'Pickleball';
                    event.sportIcon = 'table-tennis';
                }
            });
            console.log(`[EventService] Found ${events.length} events for user after temporal filtering.`);
            return events;
        } catch (error: any) {
            console.error('[EventService] Error fetching events for user:', error.code || error.message, error);
            throw error;
        }
    },

    // Subscribe to active events for a user AND active organization
    subscribeToEvents: (interests: string[], callback: (events: GameEvent[]) => void, orgId?: string | null) => {
        console.log('[EventService] Subscribing to events for interests:', interests, 'org:', orgId);
        if (interests.length === 0) {
            callback([]);
            return () => { };
        }

        const constraints = [
            where('sportId', 'in', interests),
            where('status', '!=', 'completed')
        ];

        if (orgId) {
            constraints.push(where('orgId', '==', orgId));
        }

        const q = query(
            collection(db, COLLECTION_NAME),
            ...constraints,
            orderBy('status'),
            orderBy('eventDate', 'asc')
        );

        return onSnapshot(q, (snap) => {
            const now = Date.now();
            const twelveHoursAgo = now - (12 * 60 * 60 * 1000);

            const events = snap.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as GameEvent))
                .filter(event => (event.eventDate || 0) > twelveHoursAgo);

            // Data Shim: Correct Pickleball variations
            events.forEach(event => {
                const normName = (event.sportName || '').trim().toLowerCase();
                if (normName === 'pcikle ball' || normName === 'pickle ball' || normName === 'pickleball') {
                    event.sportName = 'Pickleball';
                    event.sportIcon = 'table-tennis';
                }
            });
            callback(events);
        }, (error: any) => {
            if (error.code === 'permission-denied') {
                // Silently drop expected warning during logout
            } else {
                console.error('[EventService] Subscription error:', error);
            }
            callback([]);
        });
    },

    // Admin: Get all upcoming events for their organization
    getAllUpcomingEvents: async (orgId?: string | null): Promise<GameEvent[]> => {
        try {
            console.log('[EventService] Fetching all upcoming events for Admin, org:', orgId);
            const constraints = [
                where('status', 'in', ['scheduled', 'open', 'closed'])
            ];

            if (orgId) {
                constraints.push(where('orgId', '==', orgId));
            }

            const q = query(
                collection(db, COLLECTION_NAME),
                ...constraints,
                orderBy('eventDate', 'asc')
            );
            const snap = await getDocs(q);
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GameEvent));
        } catch (error: any) {
            console.error('[EventService] Error fetching all events:', error);
            return [];
        }
    },

    leaveEvent: async (eventId: string, userId: string) => {
        const docRef = doc(db, COLLECTION_NAME, eventId);
        await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(docRef);
            if (!snap.exists()) throw "Event not found";
            const data = snap.data() as GameEvent;
            const updatedSlots = data.slots.filter(s => s.userId !== userId);
            const updatedParticipants = (data.participantIds || []).filter(id => id !== userId);

            // Recalculate statuses
            const recalculated = updatedSlots.map((s, idx) => ({
                ...s,
                status: (idx < data.maxSlots ? 'confirmed' : 'waitlist') as 'confirmed' | 'waitlist'
            }));

            // --- SYNC TEAMS ---
            let updatedTeams = data.teams;
            if (updatedTeams) {
                const teamA = [...(updatedTeams.teamA || [])];
                const teamB = [...(updatedTeams.teamB || [])];
                const idxA = teamA.indexOf(userId);
                const idxB = teamB.indexOf(userId);

                if (idxA !== -1 || idxB !== -1) {
                    const promotedPlayer = (data.slots.length >= data.maxSlots && recalculated.length >= data.maxSlots)
                        ? recalculated[data.maxSlots - 1]
                        : null;

                    if (idxA !== -1) {
                        if (promotedPlayer) teamA[idxA] = promotedPlayer.userId;
                        else teamA.splice(idxA, 1);
                    } else {
                        if (promotedPlayer) teamB[idxB] = promotedPlayer.userId;
                        else teamB.splice(idxB, 1);
                    }
                    updatedTeams = { teamA, teamB };
                }
            }

            transaction.update(docRef, {
                slots: recalculated,
                participantIds: updatedParticipants,
                teams: updatedTeams || deleteField()
            });
        });
    },

    deleteEvent: async (eventId: string) => {
        const docRef = doc(db, COLLECTION_NAME, eventId);
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(docRef);
    },

    cancelEvent: async (eventId: string, isCancelled: boolean, reason?: string) => {
        const docRef = doc(db, COLLECTION_NAME, eventId);
        await updateDoc(docRef, {
            isCancelled,
            cancelReason: isCancelled ? (reason || 'Match cancelled by administrator') : null
        });
    },

    // Participant/Admin: Update live score
    updateEventScore: async (eventId: string, teamAScore: number, teamBScore: number, userId: string) => {
        try {
            const docRef = doc(db, COLLECTION_NAME, eventId);
            const eventDoc = await getDoc(docRef);
            if (!eventDoc.exists()) throw new Error('Event not found');

            const eventData = eventDoc.data() as GameEvent;
            const currentLiveScore = eventData.liveScore || {};

            await updateDoc(docRef, {
                liveScore: {
                    ...currentLiveScore,
                    teamAScore,
                    teamBScore,
                    updatedBy: userId,
                    updatedAt: Date.now()
                }
            });
            console.log(`[EventService] Score updated for event ${eventId}: ${teamAScore} - ${teamBScore}`);
        } catch (error) {
            console.error('[EventService] Error updating score:', error);
            throw error;
        }
    },

    // Admin: Record completed set and advance to next
    recordSetAndAdvance: async (eventId: string, userId: string) => {
        try {
            const docRef = doc(db, COLLECTION_NAME, eventId);
            const eventDoc = await getDoc(docRef);
            if (!eventDoc.exists()) throw new Error('Event not found');

            const eventData = eventDoc.data() as GameEvent;
            const ls = eventData.liveScore;

            if (!ls) return; // No score to record

            const currentSet = ls.currentSet || 1;
            const sets = ls.sets || [];

            // Determine winner of this set
            let setWinner: 'A' | 'B' | undefined;
            if (ls.teamAScore > ls.teamBScore) setWinner = 'A';
            else if (ls.teamBScore > ls.teamAScore) setWinner = 'B';

            const newSetData = {
                teamAScore: ls.teamAScore,
                teamBScore: ls.teamBScore,
                winner: setWinner
            };

            await updateDoc(docRef, {
                liveScore: {
                    ...ls,
                    currentSet: currentSet + 1,
                    teamAScore: 0,
                    teamBScore: 0,
                    sets: [...sets, newSetData],
                    updatedBy: userId,
                    updatedAt: Date.now()
                }
            });
            console.log(`[EventService] Set ${currentSet} recorded for event ${eventId}`);
        } catch (error) {
            console.error('[EventService] Error recording set:', error);
            throw error;
        }
    },

    // Admin: Finalize Match
    finalizeMatch: async (eventId: string, userId: string) => {
        try {
            const docRef = doc(db, COLLECTION_NAME, eventId);
            const eventDoc = await getDoc(docRef);
            if (!eventDoc.exists()) throw new Error('Event not found');

            const eventData = eventDoc.data() as GameEvent;
            const ls = eventData.liveScore;

            if (!ls || !ls.sets) return;

            // Calculate match winner based on set wins
            let winsA = 0;
            let winsB = 0;

            ls.sets.forEach(s => {
                if (s.winner === 'A') winsA++;
                if (s.winner === 'B') winsB++;
            });

            let matchWinner: 'A' | 'B' | null = null;
            if (winsA > winsB) matchWinner = 'A';
            else if (winsB > winsA) matchWinner = 'B';

            await updateDoc(docRef, {
                'liveScore.matchWinner': matchWinner,
                'liveScore.updatedBy': userId,
                'liveScore.updatedAt': Date.now()
            });
            console.log(`[EventService] Match finalized for event ${eventId}. Winner: ${matchWinner}`);
        } catch (error) {
            console.error('[EventService] Error finalizing match:', error);
            throw error;
        }
    },

    // Admin: Toggle team splitting
    toggleTeamSplitting: async (eventId: string, enabled: boolean | null) => {
        const docRef = doc(db, COLLECTION_NAME, eventId);
        await updateDoc(docRef, {
            isTeamSplittingEnabled: enabled === null ? deleteField() : enabled
        });
    },

    // Admin: Update teams
    updateTeams: async (eventId: string, teamA: string[], teamB: string[]) => {
        const docRef = doc(db, COLLECTION_NAME, eventId);
        await updateDoc(docRef, {
            teams: { teamA, teamB }
        });
    },

    // Admin: Toggle live scoreboarding
    toggleLiveScore: async (eventId: string, enabled: boolean | null) => {
        const docRef = doc(db, COLLECTION_NAME, eventId);
        await updateDoc(docRef, {
            isLiveScoreEnabled: enabled === null ? deleteField() : enabled
        });
    }
};
