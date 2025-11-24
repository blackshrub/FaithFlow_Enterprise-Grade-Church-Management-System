/**
 * Bible Font Utilities
 *
 * Provides font mapping and utilities for Bible reading customization.
 * These fonts are ONLY used in Bible reader components.
 * The rest of the app continues using Gluestack UI default fonts.
 */

export type BibleFontKey =
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

export interface BibleFont {
  key: BibleFontKey;
  label: string;
  category: 'serif' | 'sans-serif';
}

/**
 * Font file mapping for expo-font loader
 * These files should exist in /assets/fonts/
 */
export const BIBLE_FONT_FILES: Record<BibleFontKey, any> = {
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
 * Available Bible fonts with metadata
 * Used for font selector UI
 */
export const AVAILABLE_BIBLE_FONTS: BibleFont[] = [
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
 * Get all available fonts
 */
export function getAvailableBibleFonts(): BibleFont[] {
  return AVAILABLE_BIBLE_FONTS;
}

/**
 * Get font by key
 */
export function getBibleFont(key: BibleFontKey): BibleFont | undefined {
  return AVAILABLE_BIBLE_FONTS.find(font => font.key === key);
}

/**
 * Default font key
 */
export const DEFAULT_BIBLE_FONT: BibleFontKey = 'Lora';

/**
 * Validate if a font key is valid
 */
export function isValidBibleFont(key: string): key is BibleFontKey {
  return AVAILABLE_BIBLE_FONTS.some(font => font.key === key);
}
