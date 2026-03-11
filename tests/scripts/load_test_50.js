const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signOut } = require('firebase/auth');
const { getFirestore, doc, getDoc, setDoc, runTransaction, arrayUnion } = require('firebase/firestore');

// --- Firebase Config ---
const firebaseConfig = {
    apiKey: "AIzaSyB15Kt1QJFxq84yFgBjDMwILj6WDYE6_qU",
    authDomain: "mygameslot-324a5.firebaseapp.com",
    projectId: "mygameslot-324a5",
    storageBucket: "mygameslot-324a5.firebasestorage.app",
    messagingSenderId: "722571257298",
    appId: "1:722571257298:web:3b29b9fa2dc28b4250140b",
    measurementId: "G-4N1ZGL4B56"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Config ---
const USER_COUNT = 50;
const CONCURRENCY = 10; // Process 10 users at a time
const BASE_EMAIL = "loadtest.u{}@example.com";
const PASSWORD = "password123";

// --- Helpers ---
function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
}

function getNextGameDate() {
    const today = new Date();
    const day = today.getDay();
    const daysUntilSaturday = (6 - day + 7) % 7;
    const nextGame = new Date(today);
    nextGame.setDate(today.getDate() + daysUntilSaturday);
    return nextGame;
}

function getScanningGameId() {
    const gameDate = getNextGameDate();
    return `${gameDate.getFullYear()}-${getWeekNumber(gameDate)}`;
}

async function runUserFlow(i, gameId) {
    const email = BASE_EMAIL.replace('{}', i);
    const displayName = `LoadTest User ${i}`;

    const userApp = initializeApp(firebaseConfig, `UserApp-${i}`);
    const userAuth = getAuth(userApp);
    const userDb = getFirestore(userApp);

    try {
        // 1. Signup/Login
        let user;
        try {
            const cred = await createUserWithEmailAndPassword(userAuth, email, PASSWORD);
            user = cred.user;
            await updateProfile(user, { displayName });
            await setDoc(doc(userDb, 'users', user.uid), {
                uid: user.uid,
                email: user.email,
                displayName: displayName,
                isAdmin: false,
                createdAt: Date.now()
            });
        } catch (e) {
            if (e.code === 'auth/email-already-in-use') {
                const cred = await signInWithEmailAndPassword(userAuth, email, PASSWORD);
                user = cred.user;
            } else throw e;
        }

        // 2. Vote
        const slotRef = doc(userDb, 'weekly_slots', gameId);
        await runTransaction(userDb, async (transaction) => {
            const sfDoc = await transaction.get(slotRef);
            if (!sfDoc.exists()) throw "Game Slot Missing";

            const data = sfDoc.data();
            const slots = data.slots || [];
            if (slots.some(s => s.userId === user.uid)) return;

            transaction.update(slotRef, {
                slots: arrayUnion({
                    userId: user.uid,
                    userName: displayName,
                    userEmail: email,
                    timestamp: Date.now(),
                    status: slots.length < (data.maxSlots || 14) ? 'confirmed' : 'waitlist',
                    paid: false,
                    source: 'load_test'
                })
            });
        });

        // 3. Signout
        await signOut(userAuth);
        return { email, success: true };
    } catch (error) {
        return { email, success: false, error: error.message };
    }
}

async function runLoadTest() {
    const gameId = getScanningGameId();
    console.log(`\n🚀 Starting Load Test: ${USER_COUNT} concurrent users on Game ${gameId}`);
    const start = Date.now();

    const results = [];
    for (let i = 1; i <= USER_COUNT; i += CONCURRENCY) {
        const batch = [];
        for (let j = i; j < i + CONCURRENCY && j <= USER_COUNT; j++) {
            batch.push(runUserFlow(j, gameId));
        }
        console.log(`  - Processing batch ${Math.floor(i / CONCURRENCY) + 1}...`);
        const batchResults = await Promise.all(batch);
        results.push(...batchResults);
    }

    const end = Date.now();
    const duration = (end - start) / 1000;
    const passed = results.filter(r => r.success).length;
    const failed = results.length - passed;

    console.log(`\n📊 LOAD TEST SUMMARY`);
    console.log(`Total Users: ${USER_COUNT}`);
    console.log(`Success: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Duration: ${duration.toFixed(2)}s`);
    console.log(`Avg per user: ${(duration / USER_COUNT).toFixed(3)}s`);

    if (failed > 0) {
        console.log(`\n❌ Failures:`);
        results.filter(r => !r.success).forEach(r => console.log(`  - ${r.email}: ${r.error}`));
        process.exit(1);
    } else {
        console.log(`\n✨ Load Test Passed! ✨`);
        process.exit(0);
    }
}

runLoadTest();
