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
const USER_COUNT = 20;
// Using a prefix to avoid collision with existing accounts that have unknown passwords
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

// --- Test State ---
let passedTests = 0;
let failedTests = 0;
const results = [];

function log(msg) {
    console.log(msg);
}

function recordResult(userEmail, stage, success, error = null) {
    results.push({ user: userEmail, stage, success, error });
    if (!success) {
        console.error(`  [FAILED] ${stage}: ${error}`);
    }
}

// --- Main Test Logic ---
async function runTestSuite() {
    const gameId = getScanningGameId();
    // Check for clear-only flag
    const clearOnly = process.argv.includes('--clear-only');

    if (clearOnly) {
        console.log('🧹 Clear One Mode Active: Removing test users and signout...');
        // We will just sign them out and maybe remove them if we had a delete function exposed here,
        // but for now, we can just ensure the slots are empty.
        // Actually, the best way to "clear" for a fresh run is to have the Admin clear the slots.
        // Let's us use this script to just sign everyone out so they can log in again fresh?
        // Or better, let's just exit if we only wanted to clear, but we don't have a clear function in this script.

        console.log('⚠️  This script currently only supports adding users. To clear data, please use the Admin Dashboard "Clear All" button.');
        process.exit(0);
    }

    log(`\n=== 🧪 Starting User Flow Test Suite ===`);
    log(`Target Game ID: ${gameId}`);
    log(`Target Users: ${USER_COUNT}\n`);

    for (let i = 1; i <= USER_COUNT; i++) {
        const email = BASE_EMAIL.replace('{}', i);
        const firstName = `First${i}`;
        const lastName = `Last${i}`;
        const displayName = `${firstName} ${lastName}`;
        let userFailed = false;

        log(`[Test User ${i}/${USER_COUNT}] ${email}`);

        let user;

        // STEP 1: AUTHENTICATION (Signup or Login)
        try {
            // Try Create
            try {
                const cred = await createUserWithEmailAndPassword(auth, email, PASSWORD);
                user = cred.user;
                await updateProfile(user, { displayName });
                await setDoc(doc(db, 'users', user.uid), {
                    uid: user.uid,
                    email: user.email,
                    firstName: firstName,
                    lastName: lastName,
                    displayName: displayName,
                    isAdmin: false,
                    createdAt: Date.now()
                });
                log(`  ✅ Auth: Created New User`);
            } catch (createErr) {
                if (createErr.code === 'auth/email-already-in-use') {
                    // Try Login
                    const cred = await signInWithEmailAndPassword(auth, email, PASSWORD);
                    user = cred.user;
                    log(`  ✅ Auth: Logged In Existing User`);
                } else {
                    throw createErr;
                }
            }
        } catch (authErr) {
            recordResult(email, 'Authentication', false, authErr.message);
            userFailed = true;
            failedTests++;
            continue; // Skip to next user
        }

        // STEP 2: VOTE
        if (!userFailed) {
            try {
                const slotRef = doc(db, 'weekly_slots', gameId);
                await runTransaction(db, async (transaction) => {
                    const sfDoc = await transaction.get(slotRef);
                    if (!sfDoc.exists()) throw "Game Slot Missing";

                    const data = sfDoc.data();
                    const slots = data.slots || [];

                    if (slots.some(s => s.userId === user.uid)) {
                        log(`  ⚠️ Vote: Already Voted (Skipping Transaction)`);
                        return;
                    }

                    const maxSlots = data.maxSlots || 14;
                    const status = slots.length < maxSlots ? 'confirmed' : 'waitlist';

                    transaction.update(slotRef, {
                        slots: arrayUnion({
                            userId: user.uid,
                            userName: displayName,
                            userEmail: email,
                            timestamp: Date.now(),
                            status: status,
                            paid: false,
                            source: 'test_suite'
                        })
                    });
                });
                log(`  ✅ Vote: Success`);
            } catch (voteErr) {
                recordResult(email, 'Vote', false, voteErr.message);
                userFailed = true;
            }
        }

        // STEP 3: SIGNOUT
        try {
            await signOut(auth);
            log(`  ✅ Signout: Success`);
        } catch (signOutErr) {
            recordResult(email, 'Signout', false, signOutErr.message);
            userFailed = true;
        }

        if (!userFailed) {
            passedTests++;
        } else {
            failedTests++;
        }
        log(''); // Spacer
    }

    // --- Summary Report ---
    log(`\n=== 📊 Test Summary ===`);
    log(`Total Users: ${USER_COUNT}`);
    log(`Passed Flows: ${passedTests}`);
    log(`Failed Flows: ${failedTests}`);

    if (failedTests > 0) {
        log(`\n❌ Failures Details:`);
        results.filter(r => !r.success).forEach(r => {
            log(`- ${r.user} [${r.stage}]: ${r.error}`);
        });
        process.exit(1);
    } else {
        log(`\n✨ All Tests Passed! ✨`);
        process.exit(0);
    }
}

runTestSuite();
