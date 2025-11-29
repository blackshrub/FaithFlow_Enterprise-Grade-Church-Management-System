/**
 * Reading Preferences Store
 *
 * Manages reading preferences for Faith Assistant and Explore content:
 * - Font size (small, medium, large, xlarge)
 * - Theme (light, sepia, dark)
 * - Line height
 * - Font family
 *
 * Persists preferences using AsyncStorage.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'faithflow_reading_preferences';

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
  /** Whether preferences are loaded */
  isLoaded: boolean;

  // Actions
  loadPreferences: () => Promise<void>;
  setFontSize: (size: FontSize) => Promise<void>;
  setTheme: (theme: ReadingTheme) => Promise<void>;
  setLineHeight: (height: number) => Promise<void>;
  setFontFamily: (family: FontFamily) => Promise<void>;
  resetToDefaults: () => Promise<void>;

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

export const useReadingPreferencesStore = create<ReadingPreferencesState>(
  (set, get) => ({
    ...DEFAULT_PREFERENCES,
    isLoaded: false,

    /**
     * Load preferences from storage
     */
    loadPreferences: async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const prefs = JSON.parse(stored) as Partial<ReadingPreferences>;
          set({
            ...DEFAULT_PREFERENCES,
            ...prefs,
            isLoaded: true,
          });
        } else {
          set({ isLoaded: true });
        }
        console.log('[ReadingPreferences] Loaded');
      } catch (error) {
        console.error('[ReadingPreferences] Failed to load:', error);
        set({ isLoaded: true });
      }
    },

    /**
     * Save current preferences
     */
    _savePreferences: async () => {
      try {
        const { fontSize, theme, lineHeight, fontFamily } = get();
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ fontSize, theme, lineHeight, fontFamily })
        );
      } catch (error) {
        console.error('[ReadingPreferences] Failed to save:', error);
      }
    },

    /**
     * Set font size
     */
    setFontSize: async (fontSize: FontSize) => {
      set({ fontSize });
      const { _savePreferences } = get() as any;
      await _savePreferences();
    },

    /**
     * Set theme
     */
    setTheme: async (theme: ReadingTheme) => {
      set({ theme });
      const { _savePreferences } = get() as any;
      await _savePreferences();
    },

    /**
     * Set line height
     */
    setLineHeight: async (lineHeight: number) => {
      set({ lineHeight: Math.max(1.2, Math.min(2.0, lineHeight)) });
      const { _savePreferences } = get() as any;
      await _savePreferences();
    },

    /**
     * Set font family
     */
    setFontFamily: async (fontFamily: FontFamily) => {
      set({ fontFamily });
      const { _savePreferences } = get() as any;
      await _savePreferences();
    },

    /**
     * Reset to defaults
     */
    resetToDefaults: async () => {
      set(DEFAULT_PREFERENCES);
      const { _savePreferences } = get() as any;
      await _savePreferences();
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
  })
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
