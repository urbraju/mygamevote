const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let serviceAccount;
try {
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, '..', 'serviceAccountKey.json');
    if (fs.existsSync(keyPath)) {
        serviceAccount = require(keyPath);
    }
} catch (error) {
    // Ignore and try default
}

if (serviceAccount) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'mygameslot-324a5'
    });
} else {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: "mygameslot-324a5"
    });
}

const db = admin.firestore();

async function pullUserActions(email) {
    console.log(`\n========================================`);
    console.log(`PULLING ACTIVITY FOR: ${email}`);
    console.log(`========================================\n`);

    const snapshot = await db.collection("users").where("email", "==", email).get();
    if (snapshot.empty) {
        console.log(`No user document found for email ${email}`);
        process.exit(0);
    }

    const uid = snapshot.docs[0].id;
    console.log(`Found Firestore profile. Document ID (UID): ${uid}\n`);

    let actionCount = 0;

    // 1. Check Custom Events
    console.log(`--- CUSTOM EVENTS ---`);
    try {
        const eventsSnapshot = await db.collection('events').get();
        eventsSnapshot.forEach(doc => {
            const event = doc.data();
            const slots = event.slots || [];
            const waitlist = event.waitlist || [];

            const inSlot = slots.find(s => s.userId === uid);
            const inWait = waitlist.find(w => w.userId === uid);

            if (inSlot || inWait) {
                actionCount++;
                const status = inSlot ? 'JOINED SLOT' : 'ON WAITLIST';
                const dateStr = event.eventDate ? new Date(event.eventDate).toLocaleString() : 'Unknown Date';
                console.log(`- [${status}] Match: ${event.sportName} on ${dateStr}`);
                if (inSlot) console.log(`  > Voted At: ${new Date(inSlot.timestamp).toLocaleString()}`);
            }
        });
    } catch (err) {
        console.error("Error fetching custom events:", err);
    }

    // 2. Check Legacy Weekly Slots
    console.log(`\n--- LEGACY WEEKLY MATCHES ---`);
    try {
        const legacySnapshot = await db.collection('weekly_slots').get();
        legacySnapshot.forEach(doc => {
            const match = doc.data();
            const matchId = doc.id; // Usually e.g. "2026-10"
            const slots = match.slots || [];
            const waitlist = match.waitlist || [];

            const inSlot = slots.find(s => s.userId === uid);
            const inWait = waitlist.find(w => w.userId === uid);

            if (inSlot || inWait) {
                actionCount++;
                const status = inSlot ? 'JOINED SLOT' : 'ON WAITLIST';
                console.log(`- [${status}] Weekly Match ID: ${matchId}`);
                if (inSlot) console.log(`  > Voted At: ${new Date(inSlot.timestamp).toLocaleString()}`);
            }
        });
    } catch (err) {
        console.error("Error fetching legacy matches:", err);
    }

    if (actionCount === 0) {
        console.log("\nNo event activity found for this user in any collection.");
    }

    console.log(`\n========================================\n`);
    process.exit(0);
}

pullUserActions("pbmalode4b@gmail.com");
