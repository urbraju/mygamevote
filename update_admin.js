const admin = require('firebase-admin');
const serviceAccount = require('./sa.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function makeAdmin() {
  const usersRef = db.collection('users');
  const q = usersRef.where('email', '==', 'tladmin@test.com');
  const snapshot = await q.get();
  
  if (snapshot.empty) {
    console.log('No matching documents.');
    return;
  }  

  snapshot.forEach(async doc => {
    console.log(doc.id, '=>', doc.data());
    await usersRef.doc(doc.id).update({
        isAdmin: true,
        superAdmin: true,
        orgId: 'default',
        status: 'approved'
    });
    console.log('User updated to admin.');
  });
}

makeAdmin().then(() => {
    setTimeout(() => process.exit(0), 2000);
}).catch(console.error);
