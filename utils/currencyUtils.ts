/**
 * Currency Utilities
 * 
 * Provides helpers for currency formatting and symbol mapping.
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
    'USD': '$',
    'INR': '₹',
    'EUR': '€',
    'GBP': '£',
    'AED': 'AED',
    'CAD': '$',
    'AUD': '$',
    'JPY': '¥',
    'SGD': '$',
};

export const getCurrencySymbol = (code: string | undefined): string => {
    if (!code) return '$';
    const normalized = code.toUpperCase().trim();
    return CURRENCY_SYMBOLS[normalized] || normalized;
};

export const formatCurrency = (amount: number, code: string | undefined): string => {
    const symbol = getCurrencySymbol(code);
    return `${symbol}${amount.toFixed(2)}`;
};
