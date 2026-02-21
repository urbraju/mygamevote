const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyB15Kt1QJFxq84yFgBjDMwILj6WDYE6_qU",
    authDomain: "mygameslot-324a5.firebaseapp.com",
    projectId: "mygameslot-324a5",
    storageBucket: "mygameslot-324a5.firebasestorage.app",
    messagingSenderId: "722571257298",
    appId: "1:722571257298:web:3b29b9fa2dc28b4250140b",
    measurementId: "G-4N1ZGL4B56"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function listSports() {
    console.log('📋 Existing Sports:');
    const snap = await getDocs(collection(db, 'sports'));
    snap.forEach(doc =\u003e {
        console.log(`- ID: ${doc.id}, Name: ${doc.data().name}, Icon: ${doc.data().icon}`);
    });
    if (snap.empty) console.log(' (No sports found)');
    process.exit(0);
}

listSports();
