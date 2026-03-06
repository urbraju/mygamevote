const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./functions/sa.json');

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function checkSports() {
  const snapshot = await db.collection('sports').get();
  snapshot.forEach(doc => {
    console.log(doc.id, '=>', doc.data().orgId);
  });
}

checkSports();
