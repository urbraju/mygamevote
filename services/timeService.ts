import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

class TimeService {
    private offset: number = 0;
    private synced: boolean = false;
    private listeners: ((offset: number) => void)[] = [];

    async sync() {
        try {
            const syncRef = doc(db, 'public', 'time_sync');
            // Write for fresh timestamp
            await setDoc(syncRef, { lastSync: serverTimestamp() }, { merge: true });

            // Read back
            const snap = await getDoc(syncRef);
            if (snap.exists()) {
                const data = snap.data();
                const serverTs = data?.lastSync as Timestamp;
                if (serverTs) {
                    const serverMillis = serverTs.toMillis();
                    const localMillis = Date.now();
                    this.offset = serverMillis - localMillis;
                    this.synced = true;
                    console.log('[TimeService] Synced. Offset:', this.offset, 'ms');
                    this.notifyListeners();
                }
            }
        } catch (err) {
            console.warn('[TimeService] Sync failed:', err);
        }
    }

    getOffset() {
        return this.offset;
    }

    isSynced() {
        return this.synced;
    }

    getNow() {
        return Date.now() + this.offset;
    }

    subscribe(callback: (offset: number) => void) {
        this.listeners.push(callback);
        if (this.synced) callback(this.offset);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    private notifyListeners() {
        this.listeners.forEach(callback => callback(this.offset));
    }
}

export const timeService = new TimeService();
