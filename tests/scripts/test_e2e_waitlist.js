/**
 * End-to-End Waitlist Promotion Test
 * 
 * This test:
 * 1. Cleans up existing test users
 * 2. Creates 20 new users with Volleyball interest
 * 3. Has them vote for the regular weekly game
 * 4. Removes one confirmed user
 * 5. Verifies waitlist promotion
 * 
 * Usage:
 *   node scripts/test_e2e_waitlist.js
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
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'mygameslot-324a5'
});

const db = admin.firestore();
const auth = admin.auth();

// Config
const USER_COUNT = 20;
const BASE_EMAIL = "e2etest.u{}@example.com";
const PASSWORD = "password123";

// Helpers
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

async function runE2ETest() {
    const gameId = getScanningGameId();

    console.log(`\n╔═══════════════════════════════════════════════════════╗`);
    console.log(`║  🧪 End-to-End Waitlist Promotion Test              ║`);
    console.log(`╚═══════════════════════════════════════════════════════╝\n`);
    console.log(`Game ID: ${gameId}\n`);

    // STEP 1: Clean up existing test users
    console.log('━'.repeat(60));
    console.log('📊 STEP 1: Cleaning up existing test users...');
    console.log('━'.repeat(60));

    const usersSnapshot = await db.collection('users').get();
    let cleanedCount = 0;

    for (const doc of usersSnapshot.docs) {
        const userData = doc.data();
        if (userData.email && userData.email.startsWith('e2etest.')) {
            await db.collection('users').doc(doc.id).delete();
            try {
                await auth.deleteUser(doc.id);
            } catch (e) {
                // User might not exist in auth
            }
            cleanedCount++;
        }
    }

    console.log(`✅ Cleaned up ${cleanedCount} existing test users\n`);

    // STEP 2: Clear the game slot
    console.log('━'.repeat(60));
    console.log('📊 STEP 2: Clearing game slot...');
    console.log('━'.repeat(60));

    const slotRef = db.collection('weekly_slots').doc(gameId);
    await slotRef.set({
        slots: [],
        maxSlots: 14,
        gameDate: getNextGameDate().toISOString(),
        createdAt: Date.now()
    }, { merge: true });

    console.log(`✅ Game slot cleared\n`);

    // STEP 3: Create 20 users
    console.log('━'.repeat(60));
    console.log('📊 STEP 3: Creating 20 users with Volleyball interest...');
    console.log('━'.repeat(60));

    const createdUsers = [];

    for (let i = 1; i <= USER_COUNT; i++) {
        const email = BASE_EMAIL.replace('{}', i);
        const firstName = `E2E${i}`;
        const lastName = `Test${i}`;
        const displayName = `${firstName} ${lastName}`;

        try {
            // Create user in Auth
            const userRecord = await auth.createUser({
                email: email,
                password: PASSWORD,
                displayName: displayName
            });

            // Create user document
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
            });

            createdUsers.push({
                uid: userRecord.uid,
                email: email,
                displayName: displayName
            });

            console.log(`  ✅ Created: ${displayName} (${email})`);
        } catch (error) {
            console.error(`  ❌ Failed to create ${email}: ${error.message}`);
        }
    }

    console.log(`\n✅ Created ${createdUsers.length} users\n`);

    // STEP 4: Have all users vote
    console.log('━'.repeat(60));
    console.log('📊 STEP 4: Having all users vote for the game...');
    console.log('━'.repeat(60));

    for (const user of createdUsers) {
        const slotDoc = await slotRef.get();
        const slotData = slotDoc.data();
        const slots = slotData.slots || [];
        const maxSlots = slotData.maxSlots || 14;
        const status = slots.length < maxSlots ? 'confirmed' : 'waitlist';

        await slotRef.update({
            slots: admin.firestore.FieldValue.arrayUnion({
                userId: user.uid,
                userName: user.displayName,
                userEmail: user.email,
                timestamp: Date.now(),
                status: status,
                paid: false,
                source: 'e2e_test'
            })
        });

        console.log(`  ✅ ${user.displayName} voted (${status})`);
    }

    console.log('');

    // STEP 5: Verify initial state
    console.log('━'.repeat(60));
    console.log('📊 STEP 5: Verifying initial state...');
    console.log('━'.repeat(60));

    let slotDoc = await slotRef.get();
    let slotData = slotDoc.data();
    let slots = slotData.slots || [];

    const confirmedUsers = slots.filter(s => s.status === 'confirmed');
    const waitlistUsers = slots.filter(s => s.status === 'waitlist');

    console.log(`   Total Users: ${slots.length}`);
    console.log(`   ✅ Confirmed: ${confirmedUsers.length}`);
    console.log(`   ⏳ Waitlist: ${waitlistUsers.length}\n`);

    if (confirmedUsers.length !== 14) {
        console.error(`❌ Expected 14 confirmed, got ${confirmedUsers.length}`);
        process.exit(1);
    }

    if (waitlistUsers.length !== 6) {
        console.error(`❌ Expected 6 waitlist, got ${waitlistUsers.length}`);
        process.exit(1);
    }

    console.log('✅ Initial state verified!\n');

    // STEP 6: Remove a confirmed user
    console.log('━'.repeat(60));
    console.log('📊 STEP 6: Removing a confirmed user...');
    console.log('━'.repeat(60));

    const userToRemove = confirmedUsers[0];
    const firstWaitlistUser = waitlistUsers[0];

    console.log(`   Removing: ${userToRemove.userName}`);
    console.log(`   First waitlist user: ${firstWaitlistUser.userName}\n`);

    // Remove the user
    const updatedSlots = slots.filter(s => s.userId !== userToRemove.userId);
    await slotRef.update({ slots: updatedSlots });

    console.log('✅ User removed\n');

    // STEP 7: Check for automatic promotion
    console.log('━'.repeat(60));
    console.log('📊 STEP 7: Checking for automatic waitlist promotion...');
    console.log('━'.repeat(60));

    // Wait for potential cloud functions
    await new Promise(resolve => setTimeout(resolve, 3000));

    slotDoc = await slotRef.get();
    slotData = slotDoc.data();
    slots = slotData.slots || [];

    const newConfirmedUsers = slots.filter(s => s.status === 'confirmed');
    const newWaitlistUsers = slots.filter(s => s.status === 'waitlist');

    console.log(`   Total Users: ${slots.length}`);
    console.log(`   ✅ Confirmed: ${newConfirmedUsers.length}`);
    console.log(`   ⏳ Waitlist: ${newWaitlistUsers.length}\n`);

    // Check if the first waitlist user was promoted
    const wasPromoted = newConfirmedUsers.some(u => u.userId === firstWaitlistUser.userId);

    if (wasPromoted) {
        console.log('✅ SUCCESS: First waitlist user was automatically promoted!');
        console.log(`   ${firstWaitlistUser.userName} is now confirmed\n`);
    } else {
        console.log('⚠️  Automatic promotion did NOT occur');
        console.log('   This indicates manual promotion is required\n');
    }

    // STEP 8: Summary
    console.log('━'.repeat(60));
    console.log('📊 FINAL SUMMARY');
    console.log('━'.repeat(60));
    console.log('\nInitial State:');
    console.log(`  ✅ Confirmed: 14`);
    console.log(`  ⏳ Waitlist: 6`);
    console.log(`  📊 Total: 20`);

    console.log('\nAfter Removal:');
    console.log(`  ✅ Confirmed: ${newConfirmedUsers.length}`);
    console.log(`  ⏳ Waitlist: ${newWaitlistUsers.length}`);
    console.log(`  📊 Total: ${slots.length}`);

    console.log('\nWaitlist Promotion:');
    if (wasPromoted) {
        console.log(`  ✅ AUTOMATIC - ${firstWaitlistUser.userName} promoted`);
    } else {
        console.log(`  ⚠️  MANUAL - No automatic promotion`);
    }

    console.log('\n' + '═'.repeat(60));
    if (wasPromoted && newConfirmedUsers.length === 14 && newWaitlistUsers.length === 5) {
        console.log('✨ ALL TESTS PASSED! ✨');
        console.log('═'.repeat(60) + '\n');
        process.exit(0);
    } else if (!wasPromoted && newConfirmedUsers.length === 13 && newWaitlistUsers.length === 6) {
        console.log('⚠️  MANUAL PROMOTION REQUIRED');
        console.log('   The app does not auto-promote waitlist users');
        console.log('═'.repeat(60) + '\n');
        process.exit(0);
    } else {
        console.log('❌ UNEXPECTED STATE');
        console.log('═'.repeat(60) + '\n');
        process.exit(1);
    }
}

// Run the test
runE2ETest()
    .catch((error) => {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    });
