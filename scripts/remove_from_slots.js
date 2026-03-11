
const admin = require('firebase-admin');
// Use the project ID directly since we don't have the key file, 
// and hope applicationDefault works or we can just use the CLI for the rest.
// Actually, I can use the CLI to delete the field in weekly_slots? 
// No, firestore:update doesn't exist for arrays easily.
// I'll use a Node script with the client SDK (requires apiKey) to update the slots array.

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, updateDoc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyB15Kt1QJFxq84yFgBjDMwILj6WDYE6_qU",
    authDomain: "mygameslot-324a5.firebaseapp.com",
    projectId: "mygameslot-324a5",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function removeFromSlots(gameId, uid) {
    const docRef = doc(db, 'weekly_slots', gameId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.slots) {
            const newSlots = data.slots.filter(s => s.userId !== uid);
            await updateDoc(docRef, { slots: newSlots });
            console.log(`Successfully removed ${uid} from ${gameId}`);
        }
    }
}

removeFromSlots('2026-7', 'axQj127BDKaPxiVbS4zE4KblTp62');
