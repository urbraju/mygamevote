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
const auth = admin.auth();

async function pullUserActions(email) {
    console.log(`\n========================================`);
    console.log(`PULLING ACTIVITY FOR: ${email}`);
    console.log(`========================================\n`);

    let uid = null;
    let userRecord = null;

    try {
        userRecord = await auth.getUserByEmail(email);
        uid = userRecord.uid;
        console.log(`[AUTH] User found! UID: ${uid}`);
        console.log(`  > Account Created: ${userRecord.metadata.creationTime}`);
        console.log(`  > Last Sign In: ${userRecord.metadata.lastSignInTime}`);
    } catch (error) {
        console.log(`[AUTH] Could not find user in Firebase Auth. Searching Firestore...`);
    }

    console.log(`\n--- FIRESTORE PROFILE ---`);
    let userDocData = null;

    if (uid) {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
            userDocData = userDoc.data();
            console.log(JSON.stringify(userDocData, null, 2));
        } else {
            console.log(`No user document found for UID ${uid}`);
        }
    } else {
        const snapshot = await db.collection("users").where("email", "==", email).get();
        if (!snapshot.empty) {
            userDocData = snapshot.docs[0].data();
            uid = snapshot.docs[0].id;
            console.log(`Found Firestore profile via email match. Document ID: ${uid}`);
            console.log(JSON.stringify(userDocData, null, 2));
        } else {
            console.log(`No user document found containing email ${email}`);
        }
    }

    if (!uid) {
        console.log(`\nCannot continue without a UID. Exiting.`);
        process.exit(0);
    }

    console.log(`\n--- EVENT ACTIVITY (VOTES & WAITLISTS) ---`);
    try {
        const eventsSnapshot = await db.collection('events').get();
        let actionCount = 0;

        eventsSnapshot.forEach(doc => {
            const event = doc.data();

            const slots = event.slots || [];
            const userInSlot = slots.find(s => s.userId === uid);

            const waitlist = event.waitlist || [];
            const userInWaitlist = waitlist.find(w => w.userId === uid);

            if (userInSlot || userInWaitlist) {
                actionCount++;
                const status = userInSlot ? 'JOINED SLOT' : 'ON WAITLIST';
                const dateRaw = event.eventDate;
                const dateStr = dateRaw ? new Date(dateRaw).toLocaleString() : 'Unknown Date';

                console.log(`- [${status}] Match: ${event.sportName} on ${dateStr}`);
                if (userInSlot) {
                    const paidStatus = userInSlot.paidVerified ? "Verified Paid" : (userInSlot.paid ? "Marked Paid" : "Unpaid");
                    console.log(`  > Payment Status: ${paidStatus}`);
                    console.log(`  > Voted At: ${new Date(userInSlot.timestamp).toLocaleString()}`);
                }
            }
        });

        if (actionCount === 0) {
            console.log("No event activity found for this user.");
        }
    } catch (err) {
        console.error("Error fetching events:", err);
    }

    console.log(`\n========================================\n`);
    process.exit(0);
}

pullUserActions("pbmalode4b@gmail.com");
