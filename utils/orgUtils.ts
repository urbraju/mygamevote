/**
 * Organization Utilities
 * 
 * Centralizes logic for organization IDs (slugs) and validation.
 */

/**
 * Converts a raw name or string into a URL-safe slug.
 * Removes special characters and replaces spaces with hyphens.
 */
export const slugify = (text: string): string => {
    return text
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars (except -)
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
};

/**
 * Validates if a slug meets requirements:
 * - Only lowercase letters, numbers, and hyphens.
 * - No consecutive hyphens.
 * - Does not start or end with a hyphen.
 */
export const isValidOrgSlug = (slug: string): boolean => {
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    return slugRegex.test(slug);
};
