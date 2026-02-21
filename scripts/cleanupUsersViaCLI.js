/**
 * Cleanup Script: Remove all non-admin users using Firebase CLI
 * 
 * This script uses your existing Firebase CLI authentication
 * No service account key needed!
 * 
 * Usage:
 *   DRY_RUN=true node scripts/cleanupUsersViaCLI.js  # Preview only
 *   node scripts/cleanupUsersViaCLI.js                # Actually delete
 */

const { execSync } = require('child_process');
const readline = require('readline');

const DRY_RUN = process.env.DRY_RUN === 'true';
const PROJECT_ID = 'mygamevote';

async function cleanupNonAdminUsers() {
    console.log('🔍 Fetching all users from Firestore via Firebase CLI...\n');

    try {
        // Use Firebase CLI to query Firestore
        const result = execSync(
            `firebase firestore:get users --project ${PROJECT_ID} --format json`,
            { encoding: 'utf-8' }
        );

        const users = JSON.parse(result);

        const allUsers = [];
        const adminUsers = [];
        const nonAdminUsers = [];

        Object.entries(users).forEach(([id, userData]) => {
            const user = {
                id,
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
            console.log('\nTo actually delete, run: node scripts/cleanupUsersViaCLI.js');
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

        for (const user of nonAdminUsers) {
            try {
                execSync(
                    `firebase firestore:delete users/${user.id} --project ${PROJECT_ID} --force`,
                    { encoding: 'utf-8' }
                );
                console.log(`  ✓ Deleted: ${user.email}`);
                deletedCount++;
            } catch (error) {
                console.error(`  ✗ Failed to delete ${user.email}:`, error.message);
                errorCount++;
            }
        }

        console.log('\n━'.repeat(60));
        console.log(`✅ Cleanup complete!`);
        console.log(`   Deleted: ${deletedCount} users`);
        console.log(`   Errors: ${errorCount}`);
        console.log(`   Remaining: ${adminUsers.length} admin users`);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('\nMake sure you are logged in to Firebase CLI:');
        console.error('  firebase login');
        console.error('  firebase projects:list');
        process.exit(1);
    }
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
