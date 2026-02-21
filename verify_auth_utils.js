const { validateEmail, validatePassword, validateName, validatePhone } = require('./utils/authUtils');

const tests = [
    { name: 'Email valid', input: 'test@example.com', fn: validateEmail, expected: true },
    { name: 'Email invalid no @', input: 'test.com', fn: validateEmail, expected: false },
    { name: 'Password valid', input: 'Pass123', fn: validatePassword, expected: true },
    { name: 'Password too short', input: 'P123', fn: validatePassword, expected: false },
    { name: 'Password no upper', input: 'pass123', fn: validatePassword, expected: false },
    { name: 'Password no num', input: 'Password', fn: validatePassword, expected: false },
    { name: 'Name valid', input: 'John', fn: validateName, expected: true },
    { name: 'Name too short', input: 'J', fn: validateName, expected: false },
    { name: 'Phone valid', input: '1234567890', fn: validatePhone, expected: true },
    { name: 'Phone invalid', input: '12345', fn: validatePhone, expected: false }
];

let failed = 0;
tests.forEach(test => {
    const result = test.fn(test.input);
    if (result === test.expected) {
        console.log(`✅ PASSED: ${test.name}`);
    } else {
        console.log(`❌ FAILED: ${test.name} (Expected ${test.expected}, got ${result})`);
        failed++;
    }
});

if (failed > 0) process.exit(1);
