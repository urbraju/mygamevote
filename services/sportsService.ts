import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export interface Sport {
    id: string;
    name: string;
    icon: string;
    orgId?: string; // Phase 3: Scope to organization
}

export const sportsService = {
    /**
     * Fetch all available sports, ordered by name.
     * Includes both Global sports and Org-specific sports.
     */
    getAllSports: async (orgId?: string | null): Promise<Sport[]> => {
        try {
            const sportsRef = collection(db, 'sports');
            const q = query(sportsRef, orderBy('name'));
            const querySnapshot = await getDocs(q);

            const sports = querySnapshot.docs.map(doc => {
                const data = doc.data();
                const sport = { id: doc.id, ...data } as Sport;

                // Data Shim: Correct Pickleball variations and update icon
                const normName = (sport.name || '').trim().toLowerCase();
                if (normName === 'pcikle ball' || normName === 'pickle ball' || normName === 'pickleball') {
                    sport.name = 'Pickleball';
                    sport.icon = 'table-tennis';
                }
                return sport;
            });

            // Filter: Keep global sports (no orgId or null) + sports belonging to this org
            return sports.filter(s => !s.orgId || s.orgId === 'global' || s.orgId === orgId);
        } catch (error) {
            console.error('Error fetching sports:', error);
            return [];
        }
    },

    /**
     * Add a new sport.
     */
    addSport: async (name: string, icon: string, orgId?: string | null): Promise<Sport | null> => {
        try {
            const finalOrgId = orgId || 'default';
            const docRef = await addDoc(collection(db, 'sports'), {
                name,
                icon,
                orgId: finalOrgId
            });
            return { id: docRef.id, name, icon, orgId: finalOrgId };
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
