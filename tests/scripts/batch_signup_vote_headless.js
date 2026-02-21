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
const USER_COUNT = 14;
const BASE_EMAIL = "firstlast{}@example.com";
const PASSWORD = "password123";

// --- Date Utils (Simplified port of utils/dateUtils.ts) ---
function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
}

function getNextGameDate() {
    const today = new Date();
    // Assuming game is Saturday.
    // Logic: if today is Saturday, use today. Else next Saturday.
    // Simple check:
    const day = today.getDay(); // 0-6 Sun-Sat
    const daysUntilSaturday = (6 - day + 7) % 7;
    // If today is sat (6), daysUntil is 0.
    const nextGame = new Date(today);
    nextGame.setDate(today.getDate() + daysUntilSaturday);
    return nextGame;
}

function getScanningGameId() {
    const gameDate = getNextGameDate();
    return `${gameDate.getFullYear()}-${getWeekNumber(gameDate)}`;
}

// --- Main Logic ---
async function runBatch() {
    const gameId = getScanningGameId();
    console.log(`[Batch] Target Game ID: ${gameId}`);

    // Ensure the slot document exists
    // (We assume it exists or votingService.initializeWeek would have run, but let's just proceed)

    for (let i = 1; i <= USER_COUNT; i++) {
        const email = BASE_EMAIL.replace('{}', i);
        const firstName = `First${i}`;
        const lastName = `Last${i}`;
        const displayName = `${firstName} ${lastName}`;

        console.log(`\n[User ${i}/${USER_COUNT}] Processing ${email}...`);

        let user;
        try {
            // Try to Create
            const cred = await createUserWithEmailAndPassword(auth, email, PASSWORD);
            user = cred.user;
            console.log(`  - Created new user: ${user.uid}`);

            // Set Auth Profile
            await updateProfile(user, { displayName });

            // Set Firestore Profile
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: user.email,
                firstName: firstName,
                lastName: lastName,
                displayName: displayName,
                isAdmin: false,
                createdAt: Date.now()
            });
            console.log(`  - Profile set.`);

        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                console.log(`  - User exists, logging in...`);
                try {
                    const cred = await signInWithEmailAndPassword(auth, email, PASSWORD);
                    user = cred.user;
                    console.log(`  - Logged in: ${user.uid}`);
                } catch (loginErr) {
                    console.error(`  [!] Login failed: ${loginErr.message}`);
                    continue;
                }
            } else {
                console.error(`  [!] Creation failed: ${error.message}`);
                continue;
            }
        }

        // --- VOTE ---
        try {
            const slotRef = doc(db, 'weekly_slots', gameId);

            await runTransaction(db, async (transaction) => {
                const sfDoc = await transaction.get(slotRef);
                if (!sfDoc.exists()) {
                    throw "Game Slot Document does not exist! Please visit Admin/Home page once to initialize it.";
                }

                const data = sfDoc.data();
                const slots = data.slots || [];

                // Check if already voted
                if (slots.some(s => s.userId === user.uid)) {
                    console.log(`  - Already voted.`);
                    return;
                }

                // Determine status (this is a simplified check, race conditions ignored for batch script)
                const maxSlots = data.maxSlots || 14;
                const status = slots.length < maxSlots ? 'confirmed' : 'waitlist';

                const newSlot = {
                    userId: user.uid,
                    userName: displayName,
                    userEmail: email,
                    timestamp: Date.now(),
                    status: status,
                    paid: false
                };

                transaction.update(slotRef, {
                    slots: arrayUnion(newSlot)
                });
            });
            console.log(`  - Vote cast successfully!`);

        } catch (voteErr) {
            console.error(`  [!] Vote failed: ${voteErr}`);
        }

        // Sign out to clean up for next iteration (though create/signIn overwrites current auth instance usually)
        await signOut(auth);
    }

    console.log('\n[Batch] All done.');
    process.exit(0);
}

runBatch();
