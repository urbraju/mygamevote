const { slugify, isValidOrgSlug } = require('./utils/orgUtils');

const tests = [
    { name: 'Basic slugify', input: 'My Group Name', expected: 'my-group-name', type: 'slugify' },
    { name: 'Special chars slugify', input: 'Masti @ Group!', expected: 'masti-group', type: 'slugify' },
    { name: 'Multi hyphen slugify', input: 'my---group', expected: 'my-group', type: 'slugify' },
    { name: 'Valid slug', input: 'masti-group', expected: true, type: 'validate' },
    { name: 'Invalid symbol slug', input: 'masti@group', expected: false, type: 'validate' },
    { name: 'Invalid space slug', input: 'masti group', expected: false, type: 'validate' },
    { name: 'Starting hyphen', input: '-masti', expected: false, type: 'validate' },
    { name: 'Ending hyphen', input: 'masti-', expected: false, type: 'validate' },
    { name: 'Consecutive hyphen', input: 'masti--group', expected: false, type: 'validate' }
];

let failed = 0;
tests.forEach(test => {
    const result = test.type === 'slugify' ? slugify(test.input) : isValidOrgSlug(test.input);
    if (result === test.expected) {
        console.log(`✅ PASSED: ${test.name}`);
    } else {
        console.log(`❌ FAILED: ${test.name} (Expected ${test.expected}, got ${result})`);
        failed++;
    }
});

if (failed > 0) {
    process.exit(1);
}
