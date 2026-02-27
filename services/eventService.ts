/**
 * Event Service
 * 
 * Manages the multi-sport game events logic.
 * - Handles the creation, querying, and snapshot listening of distinct events per organization.
 * - Manages user joining/leaving of specific events.
 * - Supports waitlist and dynamic open/close states.
 */
import { db } from '../firebaseConfig';
import { collection, doc, getDoc, getDocs, setDoc, addDoc, query, where, onSnapshot, orderBy, Timestamp, limit, runTransaction } from 'firebase/firestore';
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
            console.error('[EventService] Subscription error:', error);
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

            transaction.update(docRef, {
                slots: recalculated,
                participantIds: updatedParticipants
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
        const { updateDoc } = await import('firebase/firestore');
        await updateDoc(docRef, {
            isCancelled,
            cancelReason: isCancelled ? (reason || 'Match cancelled by administrator') : null
        });
    }
};
