/**
 * Cleanup Script: Remove all non-admin users from Firestore
 * 
 * This script will:
 * 1. Fetch all users from the 'users' collection
 * 2. Identify admin users (isAdmin: true)
 * 3. Delete all non-admin users
 * 
 * Usage:
 *   DRY_RUN=true npx ts-node scripts/cleanupNonAdminUsers.ts  # Preview only
 *   npx ts-node scripts/cleanupNonAdminUsers.ts                # Actually delete
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

// Firebase config (same as your app)
const firebaseConfig = {
    apiKey: "AIzaSyB15Kt1QJFxq84yFgBjDMwILj6WDYE6_qU",
    authDomain: "mygamevote.firebaseapp.com",
    projectId: "mygamevote",
    storageBucket: "mygamevote.firebasestorage.app",
    messagingSenderId: "1069673740653",
    appId: "1:1069673740653:web:d4f1e5e5f5e5e5e5e5e5e5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DRY_RUN = process.env.DRY_RUN === 'true';

interface User {
    id: string;
    email: string;
    isAdmin?: boolean;
    firstName?: string;
    lastName?: string;
}

async function cleanupNonAdminUsers() {
    console.log('🔍 Fetching all users from Firestore...\n');

    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);

    const allUsers: User[] = [];
    const adminUsers: User[] = [];
    const nonAdminUsers: User[] = [];

    snapshot.forEach((docSnap) => {
        const userData = docSnap.data();
        const user: User = {
            id: docSnap.id,
            email: userData.email || 'No email',
            isAdmin: userData.isAdmin || false,
            firstName: userData.firstName,
            lastName: userData.lastName
        };

        allUsers.push(user);

        if (user.isAdmin) {
            adminUsers.push(user);
        } else {
            nonAdminUsers.push(user);
        }
    });

    console.log(`📊 Total users: ${allUsers.length}`);
    console.log(`👑 Admin users: ${adminUsers.length}`);
    console.log(`👤 Non-admin users: ${nonAdminUsers.length}\n`);

    // Display admin users (will be kept)
    console.log('✅ ADMIN USERS (will be kept):');
    console.log('━'.repeat(60));
    adminUsers.forEach(user => {
        console.log(`  • ${user.firstName || ''} ${user.lastName || ''} (${user.email})`);
        console.log(`    ID: ${user.id}`);
    });
    console.log('');

    // Display non-admin users (will be deleted)
    if (nonAdminUsers.length > 0) {
        console.log('❌ NON-ADMIN USERS (will be deleted):');
        console.log('━'.repeat(60));
        nonAdminUsers.forEach(user => {
            console.log(`  • ${user.firstName || ''} ${user.lastName || ''} (${user.email})`);
            console.log(`    ID: ${user.id}`);
        });
        console.log('');
    }

    if (DRY_RUN) {
        console.log('🔍 DRY RUN MODE - No users will be deleted');
        console.log(`   ${nonAdminUsers.length} users would be deleted`);
        console.log('\nTo actually delete, run without DRY_RUN=true');
        return;
    }

    // Confirm deletion
    if (nonAdminUsers.length === 0) {
        console.log('✨ No non-admin users to delete!');
        return;
    }

    console.log(`⚠️  WARNING: About to delete ${nonAdminUsers.length} users!`);
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n');

    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('🗑️  Deleting non-admin users...\n');

    let deletedCount = 0;
    let errorCount = 0;

    for (const user of nonAdminUsers) {
        try {
            await deleteDoc(doc(db, 'users', user.id));
            console.log(`  ✓ Deleted: ${user.email}`);
            deletedCount++;
        } catch (error) {
            console.error(`  ✗ Failed to delete ${user.email}:`, error);
            errorCount++;
        }
    }

    console.log('\n━'.repeat(60));
    console.log(`✅ Cleanup complete!`);
    console.log(`   Deleted: ${deletedCount} users`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Remaining: ${adminUsers.length} admin users`);
}

// Run the cleanup
cleanupNonAdminUsers()
    .then(() => {
        console.log('\n✨ Script finished successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    });
