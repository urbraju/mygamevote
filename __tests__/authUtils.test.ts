import { validateEmail, validatePassword, validateName, validatePhone } from '../utils/authUtils';

describe('Auth Utilities', () => {
    describe('validateEmail', () => {
        it('should return true for valid emails', () => {
            expect(validateEmail('test@example.com')).toBe(true);
            expect(validateEmail('user.name@domain.co.uk')).toBe(true);
        });

        it('should return false for invalid emails', () => {
            expect(validateEmail('test@')).toBe(false);
            expect(validateEmail('test@domain')).toBe(false);
            expect(validateEmail('test.com')).toBe(false);
            expect(validateEmail('test @domain.com')).toBe(false);
        });
    });

    describe('validatePassword', () => {
        it('should return true for valid passwords (6+ chars, 1 Upper, 1 Num)', () => {
            expect(validatePassword('Pass123')).toBe(true);
            expect(validatePassword('SECUREpassword9')).toBe(true);
        });

        it('should return false for short passwords', () => {
            expect(validatePassword('Pass1')).toBe(false);
        });

        it('should return false for passwords missing uppercase', () => {
            expect(validatePassword('pass123')).toBe(false);
        });

        it('should return false for passwords missing number', () => {
            expect(validatePassword('Password')).toBe(false);
        });

        it('should return false for passwords with special chars', () => {
            expect(validatePassword('Pass123!')).toBe(false);
        });
    });

    describe('validateName', () => {
        it('should return true for names with 2+ chars', () => {
            expect(validateName('Jo')).toBe(true);
            expect(validateName('John')).toBe(true);
        });

        it('should return false for empty or 1-char names', () => {
            expect(validateName('')).toBe(false);
            expect(validateName('A')).toBe(false);
            expect(validateName('  ')).toBe(false);
        });
    });

    describe('validatePhone', () => {
        it('should return true for 10+ digits', () => {
            expect(validatePhone('1234567890')).toBe(true);
            expect(validatePhone('(123) 456-7890')).toBe(true);
        });

        it('should return false for fewer than 10 digits', () => {
            expect(validatePhone('123456789')).toBe(false);
        });

        it('should return true for empty phone', () => {
            expect(validatePhone('')).toBe(true);
        });
    });
});
