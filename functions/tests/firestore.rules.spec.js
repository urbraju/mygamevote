const {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const fs = require('fs');
const path = require('path');

describe('Firestore Security Rules', () => {
    let testEnv;

    beforeAll(async () => {
        // Load actual rules from root
        const rulesPath = path.resolve(__dirname, '../../firestore.rules');
        const rules = fs.readFileSync(rulesPath, 'utf8');

        testEnv = await initializeTestEnvironment({
            projectId: 'gameslot-test',
            firestore: {
                rules: rules,
                host: '127.0.0.1',
                port: 8080,
            },
        });
    });

    afterAll(async () => {
        if (testEnv) await testEnv.cleanup();
    });

    beforeEach(async () => {
        await testEnv.clearFirestore();
    });

    it('should allow authenticated users to read sports_catalog', async () => {
        const alice = testEnv.authenticatedContext('alice_id');
        const db = alice.firestore();
        const docRef = db.collection('sports_catalog').doc('soccer');
        
        await assertSucceeds(docRef.get());
    });

    it('should allow unauthenticated users to read sports_catalog (Diagnostic)', async () => {
        const unauth = testEnv.unauthenticatedContext();
        const db = unauth.firestore();
        const docRef = db.collection('sports_catalog').doc('soccer');
        
        await assertSucceeds(docRef.get());
    });

    it('should allow anyone to read public settings', async () => {
        const unauth = testEnv.unauthenticatedContext();
        const db = unauth.firestore();
        const docRef = db.collection('settings').doc('general');
        
        await assertSucceeds(docRef.get());
    });

    it('should deny non-admins from writing to settings', async () => {
        const alice = testEnv.authenticatedContext('alice_id');
        const db = alice.firestore();
        const docRef = db.collection('settings').doc('general');
        
        await assertFails(docRef.set({ some: 'data' }));
    });
});
