const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function fixUser(uid) {
    console.log('--- FIXING USER MEMBERSHIP ---');
    const orgId = 'default';
    const orgRef = db.collection('organizations').doc(orgId);
    const orgSnap = await orgRef.get();

    if (!orgSnap.exists) {
        console.log('Org "default" does not exist. Creating it...');
        await orgRef.set({
            name: 'Masti (Default)',
            ownerId: 'system',
            createdAt: Date.now(),
            settings: {
                requireApproval: false,
                currency: 'USD',
                allowPublicVoting: true
            },
            members: [uid],
            admins: [uid]
        });
        console.log('Default org created with user as member.');
    } else {
        const data = orgSnap.data();
        const members = data.members || [];
        const admins = data.admins || [];

        if (!members.includes(uid)) {
            console.log('Adding user to members...');
            await orgRef.update({
                members: admin.firestore.FieldValue.arrayUnion(uid)
            });
        }
        if (!admins.includes(uid)) {
            console.log('Adding user to admins...');
            await orgRef.update({
                admins: admin.firestore.FieldValue.arrayUnion(uid)
            });
        }
        console.log('User membership updated.');
    }

    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (userSnap.exists) {
        const userData = userSnap.data();
        if (!(userData.orgIds || []).includes(orgId)) {
            console.log('Updating user doc orgIds...');
            await userRef.update({
                orgIds: admin.firestore.FieldValue.arrayUnion(orgId)
            });
        }
    }
}

const uid = process.argv[2];
if (!uid) {
    console.error('Usage: node fix_firestore.js <uid>');
    process.exit(1);
}

fixUser(uid).then(() => {
    console.log('Fix complete.');
    process.exit(0);
}).catch(e => {
    console.error(e);
    process.exit(1);
});
