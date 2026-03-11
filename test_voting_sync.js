const firebase = require("firebase/compat/app").default;
require("firebase/compat/auth");
require("firebase/compat/firestore");

const firebaseConfig = {
    apiKey: "AIzaSyCKSsWcII16luCPgp9LfOpDjNgH6N4rqv4",
    authDomain: "mygamevote.com",
    projectId: "mygameslot-324a5",
    storageBucket: "mygameslot-324a5.firebasestorage.app",
    messagingSenderId: "722571257298",
    appId: "1:722571257298:web:3b29b9fa2dc28b4250140b"
};

const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const EVENT_ID = 'test-clock-sync-event';

async function attemptVote(userId, userName, userEmail) {
    const docRef = db.collection('events').doc(EVENT_ID);
    try {
        await db.runTransaction(async (transaction) => {
            const sfDoc = await transaction.get(docRef);
            if (!sfDoc.exists) throw "Event does not exist!";

            const data = sfDoc.data();
            const now = Date.now();

            const opensAt = data.votingOpensAt;
            const closesAt = data.votingClosesAt || 0;
            const gameTime = data.eventDate;
            const isTimeOpen = now >= opensAt && (closesAt === 0 || now <= closesAt);

            const isLive = (data.isOpen !== false) && now < gameTime && isTimeOpen && (data.status === 'open' || data.status === 'scheduled');

            if (!isLive) {
                if (now < opensAt) throw `Voting is not open yet! (Too early by ${opensAt - now}ms)`;
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
                participantIds: firebase.firestore.FieldValue.arrayUnion(userId)
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

        console.log("=> Logging in as Admin (tladmin@test.com)...");
        const adminCred = await auth.signInWithEmailAndPassword('tladmin@test.com', 'admin123');
        const adminUid = adminCred.user.uid;

        const now = Date.now();
        const opensAt = now + 4000; // opens in 4 seconds

        console.log(`=> Creating Test Event. Opens at: ${new Date(opensAt).toISOString()}`);
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

        console.log("=> Logging in as User (gg@test.com)...");
        const userCred = await auth.signInWithEmailAndPassword('gg@test.com', 'test1234');
        const userUid = userCred.user.uid;

        console.log("\n[Attempt 1] Simulating Fast Clock user clicking 1 second BEFORE opensAt...");
        const earlyWait = opensAt - Date.now() - 1000;
        if (earlyWait > 0) await new Promise(r => setTimeout(r, earlyWait));

        console.log(`=> Firing vote request at ${new Date().toISOString()}...`);
        let result = await attemptVote(userUid, "GG Test", "gg@test.com");
        if (result === true) {
            console.error("❌ FAILED: Vote was accepted early!");
        } else {
            console.log(`✅ SUCCESS: Server rejected early vote with error -> "${result}"`);
        }

        console.log("\n[Waiting] Waiting for correct server time to arrive...");
        const remainingWait = opensAt - Date.now() + 500;
        if (remainingWait > 0) await new Promise(r => setTimeout(r, remainingWait));

        console.log(`[Attempt 2] Simulating precise sync user clicking ON or slightly AFTER opensAt...`);
        console.log(`=> Firing vote request at ${new Date().toISOString()}...`);
        result = await attemptVote(userUid, "GG Test", "gg@test.com");
        if (result === true) {
            console.log("✅ SUCCESS: Server accepted vote at correct time!");
        } else {
            console.error(`❌ FAILED: Vote was rejected on time with error -> "${result}"`);
        }

        console.log("\nTest complete!");
        process.exit(0);

    } catch (e) {
        console.error("Test execution failed:", e);
        process.exit(1);
    }
}

runTest();
