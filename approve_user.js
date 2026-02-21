const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // I need to find if this exists

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function approveUser(email) {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();
    if (snapshot.empty) {
        console.log('No matching documents.');
        return;
    }

    snapshot.forEach(doc => {
        console.log(doc.id, '=>', doc.data());
        db.collection('users').doc(doc.id).update({ isApproved: true });
        console.log('User approved!');
    });
}

approveUser('testuser123@gmail.com');
