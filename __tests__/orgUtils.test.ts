import { slugify, isValidOrgSlug } from '../utils/orgUtils';

describe('Organization Utilities', () => {
    describe('slugify', () => {
        it('should convert to lowercase and replace spaces with hyphens', () => {
            expect(slugify('My Group Name')).toBe('my-group-name');
        });

        it('should remove special characters', () => {
            expect(slugify('M@5ti Group!')).toBe('m5ti-group');
        });

        it('should handle leading/trailing spaces and hyphens', () => {
            expect(slugify('  -my-group-  ')).toBe('my-group');
        });

        it('should replace multiple hyphens with a single one', () => {
            expect(slugify('my---group')).toBe('my-group');
        });
    });

    describe('isValidOrgSlug', () => {
        it('should return true for valid slugs', () => {
            expect(isValidOrgSlug('masti-group')).toBe(true);
            expect(isValidOrgSlug('group123')).toBe(true);
            expect(isValidOrgSlug('a-b-c')).toBe(true);
        });

        it('should return false for slugs with special characters', () => {
            expect(isValidOrgSlug('masti@group')).toBe(false);
            expect(isValidOrgSlug('masti!group')).toBe(false);
            expect(isValidOrgSlug('masti group')).toBe(false);
        });

        it('should return false for slugs starting or ending with hyphens', () => {
            expect(isValidOrgSlug('-masti-group')).toBe(false);
            expect(isValidOrgSlug('masti-group-')).toBe(false);
        });

        it('should return false for consecutive hyphens', () => {
            expect(isValidOrgSlug('masti--group')).toBe(false);
        });

        it('should return false for uppercase letters', () => {
            expect(isValidOrgSlug('Masti-Group')).toBe(false);
        });
    });
});
