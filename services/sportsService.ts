import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export interface Sport {
    id: string;
    name: string;
    icon: string;
}

export const sportsService = {
    /**
     * Fetch all available sports, ordered by name.
     */
    getAllSports: async (): Promise<Sport[]> => {
        try {
            const q = query(collection(db, 'sports'), orderBy('name'));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Sport));
        } catch (error) {
            console.error('Error fetching sports:', error);
            return [];
        }
    },

    /**
     * Add a new sport.
     * @param name Display name of the sport (e.g., "Basketball")
     * @param icon MaterialCommunityIcon name (e.g., "basketball")
     */
    addSport: async (name: string, icon: string): Promise<Sport | null> => {
        try {
            const docRef = await addDoc(collection(db, 'sports'), {
                name,
                icon
            });
            return { id: docRef.id, name, icon };
        } catch (error) {
            console.error('Error adding sport:', error);
            throw error;
        }
    },

    /**
     * Remove a sport by ID.
     */
    deleteSport: async (id: string): Promise<void> => {
        try {
            await deleteDoc(doc(db, 'sports', id));
        } catch (error) {
            console.error('Error deleting sport:', error);
            throw error;
        }
    },

    /**
     * Get IDs of featured sports.
     */
    getFeaturedSportIds: async (): Promise<string[]> => {
        try {
            const snap = await getDoc(doc(db, 'settings', 'sports'));
            return snap.exists() ? (snap.data().featuredIds || []) : [];
        } catch (error) {
            console.error('Error getting featured sports:', error);
            return [];
        }
    },

    /**
     * Update IDs of featured sports (max 6).
     */
    updateFeaturedSportIds: async (ids: string[]): Promise<void> => {
        try {
            await setDoc(doc(db, 'settings', 'sports'), {
                featuredIds: ids.slice(0, 6)
            }, { merge: true });
        } catch (error) {
            console.error('Error updating featured sports:', error);
            throw error;
        }
    }
};
