const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, '..', 'serviceAccountKey.json');
admin.initializeApp({
    credential: admin.credential.cert(require(keyPath)),
    projectId: 'mygameslot-324a5'
});

const db = admin.firestore();

async function checkMatch() {
    const doc = await db.collection('weekly_slots').doc('2026-10').get();
    const data = doc.data();

    console.log(`Max Slots: ${data.maxSlots}`);
    console.log(`Current Slots: ${data.slots ? data.slots.length : 0}`);
    console.log(`Current Waitlist: ${data.waitlist ? data.waitlist.length : 0}`);

    console.log(`\n--- SLOTS ---`);
    if (data.slots) {
        data.slots.forEach((s, idx) => console.log(`${idx + 1}. User: ${s.userId} (Timestamp: ${new Date(s.timestamp).toLocaleString()})`));
    }

    console.log(`\n--- WAITLIST ---`);
    if (data.waitlist) {
        data.waitlist.forEach((w, idx) => console.log(`${idx + 1}. User: ${w.userId} (Timestamp: ${new Date(w.timestamp).toLocaleString()})`));
    }

    process.exit(0);
}

checkMatch();
