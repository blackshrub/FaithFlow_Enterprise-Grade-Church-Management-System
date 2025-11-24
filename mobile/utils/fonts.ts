/**
 * Bible Font Utilities
 *
 * Provides font mapping and utilities for Bible reading customization.
 *
 * IMPORTANT: This system handles TWO distinct font groups:
 *
 * 1. LATIN FONTS (Custom fonts for English, Indonesian, etc.)
 *    - Loaded via expo-font
 *    - User can select from font picker
 *    - Saved to AsyncStorage
 *
 * 2. CHINESE FONTS (System fonts only)
 *    - NO custom fonts loaded
 *    - Uses system default CJK font
 *    - Font picker is HIDDEN for Chinese Bibles
 *    - No storage/selection needed
 */

import { Platform } from 'react-native';
import type { BibleTranslation } from '@/types/bible';

/**
 * Latin Bible Font Keys (Custom Fonts Only)
 * These are ONLY for English, Indonesian, and other Latin-script Bibles
 */
export type LatinBibleFontKey =
  | 'Lora'
  | 'Merriweather'
  | 'PTSerif'
  | 'NotoSerif'
  | 'SourceSerifPro'
  | 'Inter'
  | 'OpenSans'
  | 'Montserrat'
  | 'NotoSans'
  | 'Roboto';

export interface LatinBibleFont {
  key: LatinBibleFontKey;
  label: string;
  category: 'serif' | 'sans-serif';
}

/**
 * Font file mapping for expo-font loader
 * ONLY Latin fonts - NO Chinese fonts
 */
export const BIBLE_FONT_FILES: Record<LatinBibleFontKey, any> = {
  Lora: require('@/assets/fonts/Lora-Regular.ttf'),
  Merriweather: require('@/assets/fonts/Merriweather-Regular.ttf'),
  PTSerif: require('@/assets/fonts/PTSerif-Regular.ttf'),
  NotoSerif: require('@/assets/fonts/NotoSerif-Regular.ttf'),
  SourceSerifPro: require('@/assets/fonts/SourceSerifPro-Regular.ttf'),
  Inter: require('@/assets/fonts/Inter-Regular.ttf'),
  OpenSans: require('@/assets/fonts/OpenSans-Regular.ttf'),
  Montserrat: require('@/assets/fonts/Montserrat-Regular.ttf'),
  NotoSans: require('@/assets/fonts/NotoSans-Regular.ttf'),
  Roboto: require('@/assets/fonts/Roboto-Regular.ttf'),
};

/**
 * Available Latin Bible fonts with metadata
 * Used for font selector UI (ONLY shown for Latin Bibles)
 */
export const AVAILABLE_LATIN_FONTS: LatinBibleFont[] = [
  // Serif fonts - Traditional, readable for long-form text
  { key: 'Lora', label: 'Lora', category: 'serif' },
  { key: 'Merriweather', label: 'Merriweather', category: 'serif' },
  { key: 'PTSerif', label: 'PT Serif', category: 'serif' },
  { key: 'NotoSerif', label: 'Noto Serif', category: 'serif' },
  { key: 'SourceSerifPro', label: 'Source Serif Pro', category: 'serif' },

  // Sans-serif fonts - Modern, clean
  { key: 'Inter', label: 'Inter', category: 'sans-serif' },
  { key: 'OpenSans', label: 'Open Sans', category: 'sans-serif' },
  { key: 'Montserrat', label: 'Montserrat', category: 'sans-serif' },
  { key: 'NotoSans', label: 'Noto Sans', category: 'sans-serif' },
  { key: 'Roboto', label: 'Roboto', category: 'sans-serif' },
];

/**
 * Default Latin font key
 */
export const DEFAULT_LATIN_FONT: LatinBibleFontKey = 'Lora';

/**
 * Detect if a Bible version is Chinese
 *
 * Checks both version code and language metadata to determine if this is
 * a Chinese Bible (Simplified or Traditional).
 *
 * For Chinese Bibles:
 * - NO custom fonts are loaded
 * - Font selector is HIDDEN
 * - System CJK font is used automatically
 *
 * @param versionCode - Bible version code (e.g., 'CHS', 'CHT', 'NIV', 'TB')
 * @returns true if this is a Chinese Bible version
 */
export function isChineseBible(versionCode: string): boolean {
  // Normalized version code for comparison
  const code = versionCode.toUpperCase().trim();

  // Known Chinese version codes
  const chineseVersions = [
    'CHS', // Chinese Union Simplified
    'CHT', // Chinese Union Traditional
    'CUVSV', // Chinese Union Version Simplified (Vertical)
    'CUVS', // Chinese Union Version Simplified
    'CUVT', // Chinese Union Version Traditional
    'CUNPSS', // Chinese Union New Punctuation Simplified
    'CUNPTS', // Chinese Union New Punctuation Traditional
    'NCV', // New Chinese Version
    'CNV', // Chinese New Version
  ];

  return chineseVersions.includes(code);
}

/**
 * Get system font for Chinese text
 * Uses platform-specific system CJK font
 *
 * @returns Platform-appropriate system font family
 */
export function getChineseSystemFont(): string {
  return Platform.select({
    ios: 'System', // iOS uses system font with automatic CJK support
    android: 'sans-serif', // Android uses Noto Sans CJK by default
    default: 'System',
  }) as string;
}

/**
 * Get applied font for a Bible version
 *
 * For Latin Bibles: Returns the user's selected font or default
 * For Chinese Bibles: Returns system font (ignores custom selection)
 *
 * @param versionCode - Bible version code
 * @param selectedFont - User's selected Latin font (if any)
 * @returns Font family string to apply
 */
export function getAppliedBibleFont(
  versionCode: string,
  selectedFont?: LatinBibleFontKey
): string {
  // Chinese Bibles ALWAYS use system font
  if (isChineseBible(versionCode)) {
    return getChineseSystemFont();
  }

  // Latin Bibles use custom font or default
  return selectedFont || DEFAULT_LATIN_FONT;
}

/**
 * Get all available Latin fonts
 * (For font selector UI - only shown for Latin Bibles)
 */
export function getAvailableLatinFonts(): LatinBibleFont[] {
  return AVAILABLE_LATIN_FONTS;
}

/**
 * Get Latin font by key
 */
export function getLatinFont(key: LatinBibleFontKey): LatinBibleFont | undefined {
  return AVAILABLE_LATIN_FONTS.find(font => font.key === key);
}

/**
 * Validate if a font key is valid Latin font
 */
export function isValidLatinFont(key: string): key is LatinBibleFontKey {
  return AVAILABLE_LATIN_FONTS.some(font => font.key === key);
}

// Legacy exports for backward compatibility
export type BibleFontKey = LatinBibleFontKey;
export type BibleFont = LatinBibleFont;
export const AVAILABLE_BIBLE_FONTS = AVAILABLE_LATIN_FONTS;
export const DEFAULT_BIBLE_FONT = DEFAULT_LATIN_FONT;
export const getAvailableBibleFonts = getAvailableLatinFonts;
export const getBibleFont = getLatinFont;
export const isValidBibleFont = isValidLatinFont;
