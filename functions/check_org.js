const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../sa.json');

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function checkOrg() {
  const doc = await db.collection('organizations').doc('default').get();
  if (doc.exists) {
    console.log('Default Org Data:', JSON.stringify(doc.data(), null, 2));
  } else {
    console.log('Default org does not exist!');
  }
}

checkOrg();
