/**
 * Authentication Validation Utilities
 */

/**
 * Validates email format.
 */
export const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
};

/**
 * Validates password strength.
 * Requirements:
 * - Minimum 6 characters
 * - At least 1 uppercase letter
 * - At least 1 number
 * - No special characters (matched for consistency with existing rules)
 */
export const validatePassword = (password: string): boolean => {
    // Min 6 chars, 1 uppercase, 1 number, alphanumeric ONLY
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)[A-Za-z0-9]{6,}$/;
    return passwordRegex.test(password);
};

/**
 * Validates names (First/Last).
 */
export const validateName = (name: string): boolean => {
    return name.trim().length >= 2;
};

/**
 * Validates phone numbers (Min 10 digits).
 */
export const validatePhone = (phone: string): boolean => {
    if (!phone) return true; // Optional
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10;
};
