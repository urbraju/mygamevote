import { db } from '../firebaseConfig';
import { collection, doc, getDoc, getDocs, setDoc, addDoc, query, where, onSnapshot, orderBy, Timestamp, limit, runTransaction } from 'firebase/firestore';
import { SlotUser } from './votingService';

export interface GameEvent {
    id?: string;
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
    createdAt: number;
}

const COLLECTION_NAME = 'events';

export const eventService = {
    // Admin: Create a new event
    createEvent: async (eventData: Omit<GameEvent, 'id' | 'slots' | 'createdAt'>): Promise<string> => {
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

    // Get active events filtered by user interests
    getEventsForUser: async (interests: string[]): Promise<GameEvent[]> => {
        try {
            console.log('[EventService] Fetching events for interests:', interests);
            if (interests.length === 0) return [];

            // Note: Firestore 'in' query has a limit of 10-30 items depending on version.
            const q = query(
                collection(db, COLLECTION_NAME),
                where('sportId', 'in', interests),
                where('status', '!=', 'completed'),
                orderBy('status'),
                orderBy('eventDate', 'asc')
            );

            const snap = await getDocs(q);
            const events = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GameEvent));
            console.log(`[EventService] Found ${events.length} events for user.`);
            return events;
        } catch (error: any) {
            console.error('[EventService] Error fetching events for user:', error.code || error.message, error);
            if (error.code === 'permission-denied') {
                console.error('[EventService] DIAGNOSTIC: verify auth state and firestore rules for "events" collection.');
            }
            throw error;
        }
    },

    // Subscribe to active events for a user
    subscribeToEvents: (interests: string[], callback: (events: GameEvent[]) => void) => {
        console.log('[EventService] Subscribing to events for interests:', interests);
        if (interests.length === 0) {
            callback([]);
            return () => { };
        }

        const q = query(
            collection(db, COLLECTION_NAME),
            where('sportId', 'in', interests),
            where('status', '!=', 'completed'),
            orderBy('status'),
            orderBy('eventDate', 'asc')
        );

        return onSnapshot(q, (snap) => {
            const events = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GameEvent));
            console.log(`[EventService] Snapshot update: ${events.length} events.`);
            callback(events);
        }, (error: any) => {
            console.error('[EventService] Subscription error:', error.code || error.message, error);
            if (error.code === 'permission-denied') {
                console.error('[EventService] DIAGNOSTIC: check if user is authenticated and "events" read rule.');
            }
            callback([]);
        });
    },

    // Admin: Get all upcoming events
    getAllUpcomingEvents: async (): Promise<GameEvent[]> => {
        try {
            console.log('[EventService] Fetching all upcoming events for Admin...');
            const q = query(
                collection(db, COLLECTION_NAME),
                where('status', 'in', ['scheduled', 'open', 'closed']),
                orderBy('eventDate', 'asc')
            );
            const snap = await getDocs(q);
            const events = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GameEvent));
            console.log(`[EventService] Found ${events.length} upcoming events.`);
            return events;
        } catch (error: any) {
            console.error('[EventService] Error fetching all events:', error.code || error.message, error);
            if (error.code === 'permission-denied') {
                console.error('[EventService] DIAGNOSTIC: Admin rights required for "events" read.');
            }
            return [];
        }
    },

    leaveEvent: async (eventId: string, userId: string) => {
        // ... (existing code)
    },

    deleteEvent: async (eventId: string) => {
        const docRef = doc(db, COLLECTION_NAME, eventId);
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(docRef);
    }
};
