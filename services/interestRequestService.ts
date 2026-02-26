import { db } from '../firebaseConfig';
import { collection, addDoc, getDocs, query, where, doc, updateDoc, writeBatch, Timestamp, orderBy } from 'firebase/firestore';

export interface InterestRequest {
    id?: string;
    userId: string;
    orgId: string;
    userName: string;
    userEmail: string;
    requestedInterests: string[];
    status: 'pending' | 'approved' | 'rejected';
    createdAt: number;
    updatedAt?: number;
}

const COLLECTION_NAME = 'interestRequests';

export const interestRequestService = {
    /**
     * Creates a new pending interest change request for a user.
     */
    createRequest: async (
        userId: string,
        orgId: string,
        requestedInterests: string[],
        userName: string,
        userEmail: string
    ) => {
        try {
            const data: Omit<InterestRequest, 'id'> = {
                userId,
                orgId,
                userName,
                userEmail,
                requestedInterests,
                status: 'pending',
                createdAt: Date.now()
            };
            const docRef = await addDoc(collection(db, COLLECTION_NAME), data);
            return docRef.id;
        } catch (error) {
            console.error('[InterestRequestService] Error creating request:', error);
            throw error;
        }
    },

    /**
     * Checks if a user already has an active pending request in the current active organization.
     */
    getPendingRequestForUser: async (userId: string, orgId: string): Promise<InterestRequest | null> => {
        try {
            const q = query(
                collection(db, COLLECTION_NAME),
                where('userId', '==', userId),
                where('orgId', '==', orgId),
                where('status', '==', 'pending')
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
                const docSnap = snap.docs[0];
                return { id: docSnap.id, ...docSnap.data() } as InterestRequest;
            }
            return null;
        } catch (error) {
            console.error('[InterestRequestService] Error getting pending requests for user:', error);
            return null;
        }
    },

    /**
     * Admin: Fetches all pending requests for their organization.
     */
    getPendingRequestsForOrg: async (orgId: string): Promise<InterestRequest[]> => {
        try {
            const q = query(
                collection(db, COLLECTION_NAME),
                where('orgId', '==', orgId),
                where('status', '==', 'pending'),
                orderBy('createdAt', 'desc')
            );
            const snap = await getDocs(q);
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InterestRequest));
        } catch (error) {
            console.error('[InterestRequestService] Error fetching org pending requests:', error);
            throw error;
        }
    },

    /**
     * Admin: Approves a request. Updates the request status AND the user's sports interests in a single batch.
     */
    approveRequest: async (requestId: string, userId: string, requestedInterests: string[]) => {
        try {
            const batch = writeBatch(db);

            // 1. Update the request status
            const requestRef = doc(db, COLLECTION_NAME, requestId);
            batch.update(requestRef, {
                status: 'approved',
                updatedAt: Date.now()
            });

            // 2. Update the user's actual profile interests
            const userRef = doc(db, 'users', userId);
            batch.update(userRef, {
                sportsInterests: requestedInterests
            });

            await batch.commit();
        } catch (error) {
            console.error('[InterestRequestService] Error approving request:', error);
            throw error;
        }
    },

    /**
     * Admin: Rejects a request. Only updates the request status.
     */
    rejectRequest: async (requestId: string) => {
        try {
            const requestRef = doc(db, COLLECTION_NAME, requestId);
            await updateDoc(requestRef, {
                status: 'rejected',
                updatedAt: Date.now()
            });
        } catch (error) {
            console.error('[InterestRequestService] Error rejecting request:', error);
            throw error;
        }
    }
};
