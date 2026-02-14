
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Assume it exists or use default

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function deleteUser(email) {
    console.log(`Searching for user: ${email}`);
    const usersSnapshot = await db.collection('users').where('email', '==', email).get();

    if (usersSnapshot.empty) {
        console.log('No user found with that email.');
        return;
    }

    const userDoc = usersSnapshot.docs[0];
    const uid = userDoc.id;
    console.log(`Found user UID: ${uid}`);

    // 1. Delete from users collection
    await db.collection('users').doc(uid).delete();
    console.log('Deleted from users collection.');

    // 2. Remove from weekly_slots
    const slotsSnapshot = await db.collection('weekly_slots').get();
    for (const doc of slotsSnapshot.docs) {
        const data = doc.data();
        if (data.slots) {
            const filteredSlots = data.slots.filter(s => s.userId !== uid);
            if (filteredSlots.length !== data.slots.length) {
                await doc.ref.update({ slots: filteredSlots });
                console.log(`Removed user from slots in: ${doc.id}`);
            }
        }
    }

    // 3. Delete from Auth (requires admin)
    try {
        await admin.auth().deleteUser(uid);
        console.log('Deleted from Firebase Auth.');
    } catch (e) {
        console.log('Failed to delete from Auth (might not have permissions/token):', e.message);
    }

    console.log('Cleanup complete.');
}

deleteUser('deals2raj@gmail.com');
