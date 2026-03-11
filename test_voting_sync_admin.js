const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
let serviceAccount;
try {
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, 'serviceAccountKey.json');
    serviceAccount = require(keyPath);
} catch (error) {
    console.error('❌ Error: Could not load service account key.');
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'mygameslot-324a5'
});

const db = admin.firestore();
const EVENT_ID = 'test-clock-sync-event';

async function attemptVote(userId, userName, userEmail, simulatedNow) {
    const docRef = db.collection('events').doc(EVENT_ID);
    try {
        await db.runTransaction(async (transaction) => {
            const sfDoc = await transaction.get(docRef);
            if (!sfDoc.exists) throw "Event does not exist!";

            const data = sfDoc.data();

            // In the real app, "now" is evaluated on the server.
            // For this test, we pass in a simulated "now" to prove the validation logic Works.
            const now = simulatedNow;

            const opensAt = data.votingOpensAt;
            const closesAt = data.votingClosesAt || 0;
            const gameTime = data.eventDate;
            const isTimeOpen = now >= opensAt && (closesAt === 0 || now <= closesAt);

            const isLive = (data.isOpen !== false) && now < gameTime && isTimeOpen && (data.status === 'open' || data.status === 'scheduled');

            if (!isLive) {
                if (now < opensAt) {
                    const diff = opensAt - now;
                    throw `Voting is not open yet! (Too early by ${diff}ms)`;
                }
                if (closesAt > 0 && now > closesAt) throw "Voting has ended!";
                throw "Voting is currently closed/not live!";
            }

            if (data.slots && data.slots.some(s => s.userId === userId)) throw "You have already voted for this event!";

            const newSlot = {
                userId, userName, userEmail,
                timestamp: now,
                status: 'confirmed', paid: false
            };

            const updatedSlots = [...(data.slots || []), newSlot];
            transaction.update(docRef, {
                slots: updatedSlots,
                participantIds: admin.firestore.FieldValue.arrayUnion(userId)
            });
        });
        return true;
    } catch (error) {
        return error;
    }
}

async function runTest() {
    try {
        console.log("=========================================");
        console.log("   TESTING CLOCK SYNC & EARLY REJECTS    ");
        console.log("=========================================\n");

        const now = Date.now();
        const opensAt = now + 5000; // opens in 5 seconds

        console.log(`=> Creating Test Event. True server time is: ${new Date(now).toISOString()}`);
        console.log(`=> Opens At: ${new Date(opensAt).toISOString()}`);
        await db.collection('events').doc(EVENT_ID).set({
            id: EVENT_ID,
            title: "Test Clock Event",
            sportId: "cricket",
            location: "Test Arena",
            eventDate: now + 86400000,
            votingOpensAt: opensAt,
            votingClosesAt: 0,
            maxSlots: 10,
            maxWaitlist: 5,
            slots: [],
            participantIds: [],
            status: "scheduled",
            isOpen: true,
            orgId: "default"
        });

        // Test 1: Simulating User with a FAST clock (Clicks early)
        console.log("\n[Attempt 1] User clicks Join Now 1.5 seconds BEFORE true server opensAt...");
        const fastUserTime = opensAt - 1500; // Client sends request early

        console.log(`=> Validating vote at server time ${new Date(fastUserTime).toISOString()}...`);
        let result = await attemptVote("user123", "User One", "user1@test.com", fastUserTime);
        if (result === true) {
            console.error("❌ FAILED: Server accepted vote early!");
        } else {
            console.log(`✅ SUCCESS: Server rejected early vote with error -> "${result}"`);
        }

        // Test 2: Simulating User with perfect clock (Clicks on time)
        console.log(`\n[Attempt 2] User clicks Join Now exactly ON opensAt...`);
        const exactUserTime = opensAt + 50; // Server receives request 50ms after open
        console.log(`=> Validating vote at server time ${new Date(exactUserTime).toISOString()}...`);

        result = await attemptVote("user456", "User Two", "user2@test.com", exactUserTime);
        if (result === true) {
            console.log("✅ SUCCESS: Server accepted vote at correct time!");
        } else {
            console.error(`❌ FAILED: Vote was rejected on time with error -> "${result}"`);
        }

        console.log("\nTest complete! Cleaning up...");
        await db.collection('events').doc(EVENT_ID).delete();
        process.exit(0);

    } catch (e) {
        console.error("Test execution failed:", e);
        process.exit(1);
    }
}

runTest();
