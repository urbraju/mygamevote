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

async function migrateCollections() {
    console.log('🚀 Starting Multi-Tenancy Migration (Phase 3)...');

    // 1. Migrate 'events' collection
    console.log('--- Migrating Events ---');
    const eventsRef = db.collection('events');
    const eventsSnap = await eventsRef.get();

    let eventCount = 0;
    const eventPromises = eventsSnap.docs.map(async (doc) => {
        const data = doc.data();
        if (!data.orgId) {
            await doc.ref.update({ orgId: 'default' });
            eventCount++;
        }
    });
    await Promise.all(eventPromises);
    console.log(`✅ Migrated ${eventCount} events to 'default' org.`);

    // 2. Migrate 'sports' collection (Tag existing as 'global')
    console.log('--- Migrating Sports ---');
    const sportsRef = db.collection('sports');
    const sportsSnap = await sportsRef.get();

    let sportCount = 0;
    const sportPromises = sportsSnap.docs.map(async (doc) => {
        const data = doc.data();
        if (!data.orgId) {
            await doc.ref.update({ orgId: 'global' });
            sportCount++;
        }
    });
    await Promise.all(sportPromises);
    console.log(`✅ Migrated ${sportCount} sports to 'global' scope.`);

    // 3. User Profiles (Ensure all users have 'default' in orgIds)
    console.log('--- Migrating Users ---');
    const usersRef = db.collection('users');
    const usersSnap = await usersRef.get();

    let userCount = 0;
    const userPromises = usersSnap.docs.map(async (doc) => {
        const data = doc.data();
        const orgIds = data.orgIds || [];
        if (!orgIds.includes('default')) {
            await doc.ref.update({
                orgIds: [...orgIds, 'default']
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
