/**
 * Multilingual Content Helper Utilities
 *
 * Provides type-safe helpers for working with multilingual fields
 * that can be either strings or MultilingualText objects.
 */

import type { MultilingualText } from '@/types/explore';

/**
 * Extract localized text from a field that can be string or MultilingualText
 *
 * @param field - The field to extract text from (string | MultilingualText | undefined)
 * @param language - The preferred language code ('en' | 'id')
 * @param fallback - Optional fallback text if field is empty
 * @returns The localized string
 *
 * @example
 * ```ts
 * const title = getLocalizedText(event.title, 'en');
 * const description = getLocalizedText(event.description, contentLanguage, 'No description');
 * ```
 */
export function getLocalizedText(
  field: string | MultilingualText | undefined,
  language: string,
  fallback: string = ''
): string {
  if (!field) return fallback;
  if (typeof field === 'string') return field;

  // Try requested language, then English, then any available language, then fallback
  const langKey = language as keyof MultilingualText;
  return field[langKey] || field.en || Object.values(field)[0] || fallback;
}

/**
 * Type guard to check if a value is a MultilingualText object
 *
 * @param value - The value to check
 * @returns True if the value is a MultilingualText object
 *
 * @example
 * ```ts
 * if (isMultilingualText(event.title)) {
 *   console.log(event.title.en);
 * } else {
 *   console.log(event.title);
 * }
 * ```
 */
export function isMultilingualText(
  value: unknown
): value is MultilingualText {
  return (
    typeof value === 'object' &&
    value !== null &&
    ('en' in value || 'id' in value)
  );
}

/**
 * Extract text from array of multilingual strings
 *
 * @param items - Array of strings or MultilingualText objects
 * @param language - The preferred language code
 * @returns Array of localized strings
 *
 * @example
 * ```ts
 * const lessons = getLocalizedArray(figure.life_lessons, 'en');
 * ```
 */
export function getLocalizedArray(
  items: (string | MultilingualText)[] | undefined,
  language: string
): string[] {
  if (!items) return [];
  return items.map(item => getLocalizedText(item, language));
}

/**
 * Extract numeric value from field that can be number or string
 *
 * @param value - The value to extract number from
 * @param fallback - Fallback value if conversion fails
 * @returns The numeric value
 *
 * @example
 * ```ts
 * const correctIndex = getNumericValue(question.correct_answer_index, 0);
 * ```
 */
export function getNumericValue(
  value: number | string | undefined,
  fallback: number = 0
): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

/**
 * Type guard for checking if a field exists and has content in any language
 *
 * @param field - The field to check
 * @returns True if field has non-empty content
 *
 * @example
 * ```ts
 * if (hasContent(figure.biography)) {
 *   // Render biography section
 * }
 * ```
 */
export function hasContent(
  field: string | MultilingualText | undefined
): boolean {
  if (!field) return false;
  if (typeof field === 'string') return field.length > 0;
  return Object.values(field).some(val => val && val.length > 0);
}
