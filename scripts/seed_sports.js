const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

// --- Firebase Config ---
// Copying config from other scripts to ensure connectivity
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

const SPORTS = [
    { id: 'volleyball', name: 'Volleyball', icon: 'volleyball' },
    { id: 'tennis', name: 'Tennis', icon: 'tennis' },
    { id: 'pickleball', name: 'Pickleball', icon: 'tennis-ball' }, // approximate
    { id: 'hiking', name: 'Hiking', icon: 'hiking' },
    { id: 'movies', name: 'Movies', icon: 'movie-open' },
    { id: 'camping', name: 'Camping', icon: 'campfire' }
];

async function seedSports() {
    console.log('🌱 Seeding Sports Collection...');

    for (const sport of SPORTS) {
        try {
            await setDoc(doc(db, 'sports', sport.id), {
                name: sport.name,
                icon: sport.icon,
                isActive: true,
                createdAt: Date.now()
            });
            console.log(`✅ Added/Updated: ${sport.name}`);
        } catch (error) {
            console.error(`❌ Failed to add ${sport.name}:`, error);
        }
    }
    console.log('✨ Seeding Check Complete.');
    process.exit(0);
}

seedSports();
