/**
 * Load Test Script using Firebase Admin SDK
 * Creates 20 test users with Volleyball interest and makes them vote
 * 
 * Prerequisites:
 *   - Service account key saved as serviceAccountKey.json in project root
 * 
 * Usage:
 *   node scripts/test_user_flow_admin.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
let serviceAccount;
try {
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, '..', '..', 'serviceAccountKey.json');
    serviceAccount = require(keyPath);
} catch (error) {
    console.error('❌ Error: Could not load service account key.');
    console.error('   Please download your Firebase service account key and:');
    console.error('   1. Save it as serviceAccountKey.json in the project root, OR');
    console.error('   2. Set GOOGLE_APPLICATION_CREDENTIALS environment variable\n');
    console.error('   Download from: https://console.firebase.google.com/project/mygameslot-324a5/settings/serviceaccounts/adminsdk');
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'mygameslot-324a5'
});

const db = admin.firestore();
const auth = admin.auth();

// --- Config ---
const USER_COUNT = 20;
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

// --- Main Test Logic ---
async function runLoadTest() {
    const gameId = getScanningGameId();

    console.log(`\n=== 🧪 Starting Load Test (Admin SDK) ===`);
    console.log(`Target Game ID: ${gameId}`);
    console.log(`Target Users: ${USER_COUNT}\n`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 1; i <= USER_COUNT; i++) {
        const email = BASE_EMAIL.replace('{}', i);
        const firstName = `First${i}`;
        const lastName = `Last${i}`;
        const displayName = `${firstName} ${lastName}`;

        console.log(`[Test User ${i}/${USER_COUNT}] ${email}`);

        try {
            // STEP 1: Create or get user in Firebase Auth
            let userRecord;
            try {
                userRecord = await auth.getUserByEmail(email);
                console.log(`  ✅ Auth: User exists (${userRecord.uid})`);
            } catch (error) {
                if (error.code === 'auth/user-not-found') {
                    userRecord = await auth.createUser({
                        email: email,
                        password: PASSWORD,
                        displayName: displayName
                    });
                    console.log(`  ✅ Auth: Created new user (${userRecord.uid})`);
                } else {
                    throw error;
                }
            }

            // STEP 2: Create/Update user document in Firestore
            await db.collection('users').doc(userRecord.uid).set({
                uid: userRecord.uid,
                email: email,
                firstName: firstName,
                lastName: lastName,
                displayName: displayName,
                isAdmin: false,
                approved: true,
                interests: ['volleyball'],
                createdAt: Date.now()
            }, { merge: true });
            console.log(`  ✅ Firestore: User document created/updated`);

            // STEP 3: Add vote to weekly_slots
            const slotRef = db.collection('weekly_slots').doc(gameId);
            const slotDoc = await slotRef.get();

            if (!slotDoc.exists) {
                console.log(`  ⚠️  Vote: Game slot ${gameId} doesn't exist, skipping vote`);
            } else {
                const slotData = slotDoc.data();
                const slots = slotData.slots || [];

                // Check if already voted
                const alreadyVoted = slots.some(s => s.userId === userRecord.uid);

                if (alreadyVoted) {
                    console.log(`  ⚠️  Vote: Already voted, skipping`);
                } else {
                    const maxSlots = slotData.maxSlots || 14;
                    const status = slots.length < maxSlots ? 'confirmed' : 'waitlist';

                    await slotRef.update({
                        slots: admin.firestore.FieldValue.arrayUnion({
                            userId: userRecord.uid,
                            userName: displayName,
                            userEmail: email,
                            timestamp: Date.now(),
                            status: status,
                            paid: false,
                            source: 'admin_load_test'
                        })
                    });
                    console.log(`  ✅ Vote: Added to ${status}`);
                }
            }

            successCount++;
            console.log('');

        } catch (error) {
            console.error(`  ❌ Failed: ${error.message}`);
            failCount++;
            console.log('');
        }
    }

    // --- Summary ---
    console.log(`\n=== 📊 Load Test Summary ===`);
    console.log(`Total Users: ${USER_COUNT}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${failCount}`);

    if (failCount > 0) {
        console.log(`\n⚠️  Some users failed to be created/vote`);
        process.exit(1);
    } else {
        console.log(`\n✨ All users created and voted successfully! ✨`);
        process.exit(0);
    }
}

// Run the test
runLoadTest()
    .catch((error) => {
        console.error('\n❌ Load test failed:', error);
        process.exit(1);
    });
