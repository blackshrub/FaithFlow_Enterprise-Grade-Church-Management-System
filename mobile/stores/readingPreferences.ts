/**
 * Reading Preferences Store
 *
 * Manages reading preferences for Faith Assistant and Explore content:
 * - Font size (small, medium, large, xlarge)
 * - Theme (light, sepia, dark)
 * - Line height
 * - Font family
 *
 * Uses MMKV for fast, synchronous storage operations.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '@/lib/storage';

export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';
export type ReadingTheme = 'light' | 'sepia' | 'dark';
export type FontFamily = 'system' | 'serif' | 'sans-serif';

export interface ReadingPreferences {
  /** Font size preset */
  fontSize: FontSize;
  /** Reading theme */
  theme: ReadingTheme;
  /** Line height multiplier */
  lineHeight: number;
  /** Font family */
  fontFamily: FontFamily;
}

interface ReadingPreferencesState extends ReadingPreferences {
  /** Whether preferences are loaded (always true with MMKV sync) */
  isLoaded: boolean;

  // Actions (now synchronous thanks to MMKV)
  setFontSize: (size: FontSize) => void;
  setTheme: (theme: ReadingTheme) => void;
  setLineHeight: (height: number) => void;
  setFontFamily: (family: FontFamily) => void;
  resetToDefaults: () => void;

  // Computed values
  getFontSizeValue: () => number;
  getThemeColors: () => ThemeColors;
}

export interface ThemeColors {
  background: string;
  text: string;
  textSecondary: string;
  border: string;
  card: string;
}

// Theme color definitions
const THEME_COLORS: Record<ReadingTheme, ThemeColors> = {
  light: {
    background: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    card: '#F9FAFB',
  },
  sepia: {
    background: '#F5F0E6',
    text: '#3D3929',
    textSecondary: '#6B6353',
    border: '#D8D0C0',
    card: '#EDE8DC',
  },
  dark: {
    background: '#1A1A1A',
    text: '#E5E5E5',
    textSecondary: '#9CA3AF',
    border: '#374151',
    card: '#262626',
  },
};

// Font size values in pixels
const FONT_SIZE_VALUES: Record<FontSize, number> = {
  small: 14,
  medium: 16,
  large: 18,
  xlarge: 22,
};

const DEFAULT_PREFERENCES: ReadingPreferences = {
  fontSize: 'medium',
  theme: 'light',
  lineHeight: 1.6,
  fontFamily: 'system',
};

export const useReadingPreferencesStore = create<ReadingPreferencesState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_PREFERENCES,
      isLoaded: true, // Always true with MMKV sync storage

      /**
       * Set font size
       */
      setFontSize: (fontSize: FontSize) => {
        set({ fontSize });
      },

      /**
       * Set theme
       */
      setTheme: (theme: ReadingTheme) => {
        set({ theme });
      },

      /**
       * Set line height
       */
      setLineHeight: (lineHeight: number) => {
        set({ lineHeight: Math.max(1.2, Math.min(2.0, lineHeight)) });
      },

      /**
       * Set font family
       */
      setFontFamily: (fontFamily: FontFamily) => {
        set({ fontFamily });
      },

      /**
       * Reset to defaults
       */
      resetToDefaults: () => {
        set(DEFAULT_PREFERENCES);
      },

      /**
       * Get font size value in pixels
       */
      getFontSizeValue: () => {
        return FONT_SIZE_VALUES[get().fontSize];
      },

      /**
       * Get theme colors
       */
      getThemeColors: () => {
        return THEME_COLORS[get().theme];
      },
    }),
    {
      name: 'faithflow-reading-preferences',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        fontSize: state.fontSize,
        theme: state.theme,
        lineHeight: state.lineHeight,
        fontFamily: state.fontFamily,
      }),
    }
  )
);

/**
 * Hook to get computed reading styles
 */
export function useReadingStyles() {
  const { fontSize, theme, lineHeight, fontFamily, getFontSizeValue, getThemeColors } =
    useReadingPreferencesStore();

  const colors = getThemeColors();
  const fontSizeValue = getFontSizeValue();

  return {
    fontSize,
    theme,
    lineHeight,
    fontFamily,
    fontSizeValue,
    colors,
    // Ready-to-use text style
    textStyle: {
      fontSize: fontSizeValue,
      lineHeight: fontSizeValue * lineHeight,
      color: colors.text,
      fontFamily:
        fontFamily === 'system'
          ? undefined
          : fontFamily === 'serif'
            ? 'Georgia'
            : 'System',
    },
    // Container style
    containerStyle: {
      backgroundColor: colors.background,
    },
    // Card style
    cardStyle: {
      backgroundColor: colors.card,
      borderColor: colors.border,
    },
  };
}

export default useReadingPreferencesStore;
