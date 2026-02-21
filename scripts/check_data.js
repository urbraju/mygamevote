const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyB15Kt1QJFxq84yFgBjDMwILj6WDYE6_qU",
    authDomain: "mygameslot-324a5.firebaseapp.com",
    projectId: "mygameslot-324a5",
    storageBucket: "mygameslot-324a5.firebasestorage.app",
    messagingSenderId: "722571257298",
    appId: "1:722571257298:web:3b29b9fa2dc28b4250140b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkData() {
    console.log('--- SPORTS ---');
    const sportsSnap = await getDocs(collection(db, 'sports'));
    sportsSnap.forEach(doc => {
        console.log(`ID: ${doc.id}, Name: ${doc.data().name}, Icon: ${doc.data().icon}`);
    });

    console.log('\n--- EVENTS ---');
    const eventsSnap = await getDocs(collection(db, 'events'));
    eventsSnap.forEach(doc => {
        const data = doc.data();
        console.log(`ID: ${doc.id}, Sport: ${data.sportName} (ID: ${data.sportId}), Status: ${data.status}, Date: ${new Date(data.eventDate).toLocaleString()}`);
    });

    console.log('\n--- WEEKLY SLOTS (Legacy) ---');
    const slotsSnap = await getDocs(collection(db, 'weekly_slots'));
    slotsSnap.forEach(doc => {
        const data = doc.data();
        console.log(`ID: ${doc.id}, OpensAt: ${new Date(data.votingOpensAt).toLocaleString()}, Status: ${data.isOpen ? 'Open' : 'Closed'}`);
    });
}

checkData().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
