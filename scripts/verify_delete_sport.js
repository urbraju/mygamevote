const { initializeApp } = require('firebase/app');
const { getFirestore, doc, deleteDoc, getDoc } = require('firebase/firestore');

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

async function verifyAndDelete() {
    const sportId = 'basketball';
    const sportRef = doc(db, 'sports', sportId);

    console.log(`🔍 Checking for sport: ${sportId}`);
    const snap = await getDoc(sportRef);
    if (snap.exists()) {
        console.log(`✅ Found sport: ${snap.data().name}`);
        console.log(`🗑️ Attempting to delete...`);
        try {
            await deleteDoc(sportRef);
            console.log(`✨ Delete command sent.`);
            const snap2 = await getDoc(sportRef);
            if (!snap2.exists()) {
                console.log(`🎉 Verified: Sport deleted successfully.`);
            } else {
                console.error(`❌ Error: Sport still exists after delete.`);
            }
        } catch (e) {
            console.error(`❌ Delete failed:`, e);
        }
    } else {
        console.log(`⚠️ Sport '${sportId}' not found. It might already be deleted or was never added.`);
    }
    process.exit(0);
}

verifyAndDelete();
