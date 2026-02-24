/**
 * Multi-Tenancy Migration Script (Phase 3)
 * 
 * Tags all legacy documents in 'events' and 'weekly_slots' that lack an orgId 
 * with the 'default' organization identifier.
 */
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const MASTI_ORG_ID = 'default';
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function migrateCollections() {
    console.log('🚀 Starting Multi-Tenancy Migration (Phase 3)...');

    // 1. Migrate 'events' collection
    console.log('--- Migrating Events ---');
    const eventsRef = db.collection('events');
    const eventsSnap = await eventsRef.get();

    const eventPromises = eventsSnap.docs.map(async (doc: any) => {
        const data = doc.data();
        await doc.ref.update({
            organizationId: MASTI_ORG_ID,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        await sleep(50); // Small delay to avoid rate limits
    });
    await Promise.all(eventPromises);
    console.log(`Updated ${eventsSnap.size} events`);

    // 2. Migrate 'sports' collection (Tag existing as 'global')
    console.log('--- Migrating Sports ---');
    const sportsRef = db.collection('sports');
    const sportsSnap = await sportsRef.get();
    console.log(`Found ${sportsSnap.size} sports. Updating...`);

    const sportPromises = sportsSnap.docs.map(async (doc: any) => {
        await doc.ref.update({
            organizationId: MASTI_ORG_ID,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        await sleep(50);
    });
    await Promise.all(sportPromises);
    console.log(`Updated ${sportsSnap.size} sports`);

    // 3. User Profiles (Ensure all users have 'default' in orgIds)
    console.log('--- Migrating Users ---');
    const usersRef = db.collection('users');
    const usersSnap = await usersRef.get();
    console.log(`Found ${usersSnap.size} users. Updating...`);

    let userCount = 0;
    const userPromises = usersSnap.docs.map(async (doc: any) => {
        const data = doc.data();
        const orgIds = data.orgIds || [];
        if (!orgIds.includes('default')) {
            await doc.ref.update({
                orgIds: [...orgIds, 'default'],
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            userCount++;
        }
    });
    await Promise.all(userPromises);
    console.log(`✅ Migrated ${userCount} users with 'default' orgId.`);

    console.log('🏁 Migration Complete!');
}

migrateCollections().catch(err => {
    console.error('❌ Migration Failed:', err);
    process.exit(1);
});
