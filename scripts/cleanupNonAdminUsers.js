/**
 * Cleanup Script: Remove all non-admin users from Firestore
 * 
 * This script uses Firebase Admin SDK to:
 * 1. Fetch all users from the 'users' collection
 * 2. Identify admin users (isAdmin: true)
 * 3. Delete all non-admin users
 * 
 * Prerequisites:
 *   - Set GOOGLE_APPLICATION_CREDENTIALS environment variable
 *   - Or place service account key at ./serviceAccountKey.json
 * 
 * Usage:
 *   DRY_RUN=true npm run cleanup-users  # Preview only
 *   npm run cleanup-users                # Actually delete
 */

const admin = require('firebase-admin');
const readline = require('readline');
const path = require('path');

// Initialize Firebase Admin
let serviceAccount;
try {
    // Try to load from environment variable path or default location
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, '..', 'serviceAccountKey.json');
    serviceAccount = require(keyPath);
} catch (error) {
    console.error('❌ Error: Could not load service account key.');
    console.error('   Please download your Firebase service account key and:');
    console.error('   1. Save it as serviceAccountKey.json in the project root, OR');
    console.error('   2. Set GOOGLE_APPLICATION_CREDENTIALS environment variable\n');
    console.error('   Download from: https://console.firebase.google.com/project/mygameslot-324a5/settings/serviceaccounts/adminsdk');
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'mygameslot-324a5'
});

const db = admin.firestore();
const DRY_RUN = process.env.DRY_RUN === 'true';

async function cleanupNonAdminUsers() {
    console.log('🔍 Fetching all users from Firestore...\n');

    const usersSnapshot = await db.collection('users').get();

    const allUsers = [];
    const adminUsers = [];
    const nonAdminUsers = [];

    usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        const user = {
            id: doc.id,
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
    if (adminUsers.length === 0) {
        console.log('  ⚠️  WARNING: No admin users found!');
    } else {
        adminUsers.forEach(user => {
            console.log(`  • ${user.firstName || ''} ${user.lastName || ''} (${user.email})`);
            console.log(`    ID: ${user.id}`);
        });
    }
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
        console.log('\nTo actually delete, run: npm run cleanup-users');
        return;
    }

    // Confirm deletion
    if (nonAdminUsers.length === 0) {
        console.log('✨ No non-admin users to delete!');
        return;
    }

    console.log(`⚠️  WARNING: About to delete ${nonAdminUsers.length} users!`);
    console.log('   This action cannot be undone!\n');

    // Ask for confirmation
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const answer = await new Promise((resolve) => {
        rl.question('Type "DELETE" to confirm: ', resolve);
    });
    rl.close();

    if (answer !== 'DELETE') {
        console.log('\n❌ Deletion cancelled.');
        return;
    }

    console.log('\n🗑️  Deleting non-admin users...\n');

    let deletedCount = 0;
    let errorCount = 0;

    // Use batch operations for better performance
    const batchSize = 500;
    for (let i = 0; i < nonAdminUsers.length; i += batchSize) {
        const batch = db.batch();
        const batchUsers = nonAdminUsers.slice(i, i + batchSize);

        batchUsers.forEach(user => {
            batch.delete(db.collection('users').doc(user.id));
        });

        try {
            await batch.commit();
            batchUsers.forEach(user => {
                console.log(`  ✓ Deleted: ${user.email}`);
                deletedCount++;
            });
        } catch (error) {
            console.error(`  ✗ Batch deletion failed:`, error.message);
            errorCount += batchUsers.length;
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
