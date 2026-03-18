/**
 * Number formatting utilities for consistent display across the app.
 * - Whole numbers: no decimals (e.g., 180, not 180.00)
 * - Fractional numbers: max 1 decimal (e.g., 81.6, not 81.60)
 * - Large numbers: locale-formatted with commas (e.g., 1,806)
 */

export function formatNum(value: number | string | null | undefined): string {
  if (value == null) return '\u2014';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '\u2014';
  if (num % 1 === 0) return num.toLocaleString();
  return parseFloat(num.toFixed(1)).toLocaleString();
}

/**
 * Format volume in kg with smart abbreviation.
 * - >= 10,000 → "45.1k" (no "kg" appended — caller adds unit)
 * - >= 1,000  → "1,234"
 * - < 1,000   → "800"
 */
export function formatVolume(kg: number): string {
  if (kg >= 10000) return `${parseFloat((kg / 1000).toFixed(1))}k`;
  if (kg >= 1000) return kg.toLocaleString();
  return kg.toString();
}

/**
 * Returns true when formatVolume(kg) already encodes a unit abbreviation ("k"),
 * meaning the caller should NOT append a separate "kg" label to avoid "45.1k kg".
 */
export function volumeHasAbbreviation(kg: number): boolean {
  return kg >= 10000;
}
