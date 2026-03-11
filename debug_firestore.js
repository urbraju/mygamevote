const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkUser(uid) {
    console.log('--- USER CHECK ---');
    console.log('Checking user:', uid);
    const doc = await db.collection('users').doc(uid).get();
    if (!doc.exists) {
        console.log('User doc does not exist!');
    } else {
        console.log('User doc data:', JSON.stringify(doc.data(), null, 2));
    }

    console.log('\n--- ORG CHECK ---');
    console.log('Checking default organization...');
    const defaultOrg = await db.collection('organizations').doc('default').get();
    if (!defaultOrg.exists) {
        console.log('Default organization MISSING!');
    } else {
        console.log('Default organization data:', JSON.stringify(defaultOrg.data(), null, 2));
    }

    console.log('\n--- QUERY CHECK ---');
    console.log('Checking organizations where user is a member...');
    const orgs = await db.collection('organizations')
        .where('members', 'array-contains', uid)
        .get();
    console.log('Found orgs count:', orgs.size);
    orgs.forEach(o => console.log('Org ID:', o.id));
}

const uid = process.argv[2];
checkUser(uid).then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
