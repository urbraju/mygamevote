/**
 * Manual Verification Script for Team Formation Name Resolution
 * This simulates the logic used in home.tsx and TeamManager.tsx
 */

function resolveName(uid, participants) {
    const p = participants.find(part => (part.userId || part.uid) === uid);
    if (!p) return 'Player';

    // Prioritize firstName (UserProfile), then userName (Slot/Guest data)
    if (p.firstName) return p.firstName;
    if (p.userName) return p.userName.split(' ')[0] || 'Player';
    
    return 'Player';
}

const mockParticipants = [
    { uid: 'user1', firstName: 'Alice', userName: 'Alice Smith' },
    { userId: 'user2', userName: 'Bob Guest' }, // Guest player
    { uid: 'user3', firstName: '', userName: 'Charlie' }, // Profile with empty name
];

const results = {
    testRegistered: resolveName('user1', mockParticipants) === 'Alice',
    testGuest: resolveName('user2', mockParticipants) === 'Bob',
    testEmptyProfile: resolveName('user3', mockParticipants) === 'Charlie',
    testMissing: resolveName('user99', mockParticipants) === 'Player',
};

console.log('--- Team Formation Name Resolution Tests ---');
console.table(results);

const allPassed = Object.values(results).every(r => r === true);
if (allPassed) {
    console.log('✅ All tests passed!');
} else {
    console.log('❌ Some tests failed.');
}
