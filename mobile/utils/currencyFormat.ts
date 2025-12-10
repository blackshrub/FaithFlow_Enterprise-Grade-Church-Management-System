/**
 * Currency Formatting Utilities
 *
 * Provides consistent currency formatting across the app.
 * Default: Indonesian Rupiah (IDR)
 *
 * DATA FIX: Standardize currency formatting (Sprint 5 - DATA-L1)
 */

/**
 * Format a number as Indonesian Rupiah currency
 * @param amount - The amount to format
 * @param options - Formatting options
 * @returns Formatted currency string (e.g., "Rp 100.000")
 */
export function formatCurrency(
  amount: number,
  options?: {
    locale?: string;
    currency?: string;
    compact?: boolean;
    showDecimals?: boolean;
  }
): string {
  const {
    locale = 'id-ID',
    currency = 'IDR',
    compact = false,
    showDecimals = false,
  } = options || {};

  // Handle NaN, undefined, null
  if (amount == null || isNaN(amount)) {
    return formatCurrency(0, options);
  }

  // Compact formatting for large amounts
  if (compact) {
    if (Math.abs(amount) >= 1_000_000_000) {
      return `Rp ${(amount / 1_000_000_000).toFixed(1)}B`;
    }
    if (Math.abs(amount) >= 1_000_000) {
      return `Rp ${(amount / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(amount) >= 1_000) {
      return `Rp ${(amount / 1_000).toFixed(0)}K`;
    }
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount);
}

/**
 * Format currency in compact form for display in limited space
 * @param amount - The amount to format
 * @returns Compact formatted string (e.g., "Rp 1.5M", "Rp 500K")
 */
export function formatCompactCurrency(amount: number): string {
  return formatCurrency(amount, { compact: true });
}

/**
 * Parse a formatted currency string back to a number
 * Handles Indonesian number formatting (dots as thousands separator)
 * @param value - The formatted currency string
 * @returns The numeric value
 */
export function parseCurrency(value: string): number {
  if (!value) return 0;

  // Remove currency symbol and spaces
  let cleaned = value.replace(/[Rp\s]/gi, '');

  // Handle Indonesian number format (dot as thousands separator)
  // Replace dots with empty string (thousands separator)
  // Replace comma with dot (decimal separator) if present
  cleaned = cleaned.replace(/\./g, '').replace(',', '.');

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
