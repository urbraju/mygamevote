const admin = require('firebase-admin');

// Initialize Firebase Admin (assuming default application credential from GOOGLE_APPLICATION_CREDENTIALS)
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

const TOTAL_USERS = 20;
const TEST_ORG_ID = 'load-test-org-' + Date.now();

async function createLoadTestUsers() {
    console.log(`[Phase 1] Creating ${TOTAL_USERS} mock users...`);
    const uids = [];

    for (let i = 0; i < TOTAL_USERS; i++) {
        const email = `loadtestuser${i}@mygamevote.com`;
        const password = 'LoadTestPassword123!';

        try {
            const userRecord = await auth.createUser({
                email,
                password,
                displayName: `Load Test User ${i}`,
            });

            // Even numbers go to default org, odd numbers go to test org
            const assignedOrg = i % 2 === 0 ? 'default' : TEST_ORG_ID;

            await db.collection('users').doc(userRecord.uid).set({
                uid: userRecord.uid,
                email,
                displayName: `Load Test User ${i}`,
                createdAt: Date.now(),
                isApproved: true,
                isAdmin: false,
                activeOrgId: assignedOrg,
                orgIds: [assignedOrg],
                sportsInterests: ['Football', 'Basketball']
            });

            uids.push(userRecord.uid);
            process.stdout.write('.');
        } catch (e) {
            console.error(`\nError creating user ${i}:`, e.message);
        }
    }
    console.log(`\n[Phase 1] Successfully created ${uids.length} users.`);
    return uids;
}

async function createTestOrg(uids) {
    console.log(`\n[Phase 2] Creating ${TEST_ORG_ID} organization...`);

    // The odd-indexed users were assigned to TEST_ORG_ID
    const members = uids.filter((_, i) => i % 2 !== 0);

    await db.collection('organizations').doc(TEST_ORG_ID).set({
        id: TEST_ORG_ID,
        name: 'Load Test Organization',
        ownerId: members[0] || 'admin',
        createdAt: Date.now(),
        inviteCode: 'LOADT6',
        settings: {
            requireApproval: false,
            allowPublicVoting: false,
            currency: 'USD'
        },
        members: members,
        pendingMembers: [],
        admins: [members[0] || 'admin']
    });

    console.log(`[Phase 2] ${TEST_ORG_ID} created with ${members.length} members.`);
}

async function runPerformanceQuery() {
    console.log(`\n[Phase 3] Running performance timing query...`);

    const startTime = Date.now();

    // Query users belonging to the test organization
    const snapshot = await db.collection('users')
        .where('orgIds', 'array-contains', TEST_ORG_ID)
        .orderBy('createdAt', 'desc')
        .get();

    const fetchTime = Date.now() - startTime;

    console.log(`[Phase 3] Query completed in ${fetchTime}ms.`);
    console.log(`[Phase 3] Retrieved ${snapshot.size} users for ${TEST_ORG_ID}.`);

    return fetchTime;
}

async function cleanup(uids) {
    console.log(`\n[Phase 4] Initiating Cleanup...`);

    // Delete Auth Users
    console.log(`Deleting ${uids.length} Auth users...`);
    try {
        await auth.deleteUsers(uids);
        console.log('Auth users deleted.');
    } catch (e) {
        console.error('Error batch deleting users:', e);
    }

    // Delete User Documents
    console.log('Deleting Firestore user documents...');
    const batch = db.batch();
    uids.forEach(uid => {
        batch.delete(db.collection('users').doc(uid));
    });

    // Delete Test Org
    batch.delete(db.collection('organizations').doc(TEST_ORG_ID));

    await batch.commit();
    console.log('[Phase 4] Cleanup completed successfully. Database restored.');
}

async function main() {
    console.log('=== Starting Load Test & Cleanup Sequence ===\n');
    let uids = [];
    try {
        uids = await createLoadTestUsers();
        await createTestOrg(uids);
        await runPerformanceQuery();
    } catch (e) {
        console.error('Test sequence failed:', e);
    } finally {
        if (uids.length > 0) {
            await cleanup(uids);
        }
    }
    console.log('\n=== Sequence Finished ===');
    process.exit(0);
}

main();
