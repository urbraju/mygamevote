const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyB15Kt1QJFxq84yFgBjDMwILj6WDYE_qU",
    authDomain: "mygameslot-324a5.firebaseapp.com",
    projectId: "mygameslot-324a5",
    storageBucket: "mygameslot-324a5.firebasestorage.app",
    messagingSenderId: "722571257298",
    appId: "1:722571257298:web:3b29b9fa2dc28b4250140b",
    measurementId: "G-4N1ZGL4B56"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const FEATURED_SPORTS = [
    { id: 'volleyball', name: 'Volleyball', icon: 'volleyball' },
    { id: 'pickleball', name: 'Pickle Ball', icon: 'tennis-ball' },
    { id: 'tennis', name: 'Tennis', icon: 'tennis' },
    { id: 'soccer', name: 'Soccer', icon: 'soccer' },
    { id: 'hiking', name: 'Hiking', icon: 'hiking' },
    { id: 'camping', name: 'Camping', icon: 'campfire' }
];

async function seed() {
    console.log('🌱 Seeding Featured Sports...');

    const featuredIds = FEATURED_SPORTS.map(s => s.id);

    // 1. Add/Update each sport in the 'sports' collection
    for (const sport of FEATURED_SPORTS) {
        try {
            await setDoc(doc(db, 'sports', sport.id), {
                name: sport.name,
                icon: sport.icon,
                updatedAt: Date.now()
            }, { merge: true });
            console.log(`✅ Sport synced: ${sport.name}`);
        } catch (e) {
            console.error(`❌ Failed to sync ${sport.name}:`, e);
        }
    }

    // 2. Set these as the featured IDs in settings
    try {
        await setDoc(doc(db, 'settings', 'sports'), {
            featuredIds: featuredIds
        }, { merge: true });
        console.log(`✨ Featured list updated: ${featuredIds.join(', ')}`);
    } catch (e) {
        console.error('❌ Failed to update featured settings:', e);
    }

    console.log('🚀 Seeding complete.');
    process.exit(0);
}

seed();
