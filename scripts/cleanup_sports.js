const { initializeApp } = require('firebase/app');
const { getFirestore, doc, deleteDoc } = require('firebase/firestore');

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

async function cleanup() {
    const ids = ['2mwhSJbbAqSDO8a0Wlia', '9UAdK32puluqKru88OkX'];
    console.log('🗑️ Cleaning up test sports...');
    for (const id of ids) {
        try {
            await deleteDoc(doc(db, 'sports', id));
            console.log(`✅ Deleted: ${id}`);
        } catch (e) {
            console.error(`❌ Failed to delete ${id}:`, e);
        }
    }
    process.exit(0);
}

cleanup();
