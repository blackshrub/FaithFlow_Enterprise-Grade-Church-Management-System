/**
 * Bible Font Store
 *
 * Manages font selection for Bible reading components ONLY.
 * This store persists to AsyncStorage and does not affect other app fonts.
 *
 * Usage:
 * ```tsx
 * const { fontFamily, setFontFamily } = useBibleFontStore();
 * <Text style={{ fontFamily }}>{verseText}</Text>
 * ```
 */

import { create } from 'zustand';
import { persist, createJSONStorage, subscribeWithSelector } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_BIBLE_FONT, isValidBibleFont, type BibleFontKey } from '@/utils/fonts';

interface BibleFontState {
  /**
   * Current Bible reading font family
   * This is the actual font name loaded via expo-font
   */
  fontFamily: BibleFontKey;

  /**
   * Whether fonts have been loaded from storage
   * Used to prevent flashing during initial load
   */
  isHydrated: boolean;

  /**
   * Set the Bible reading font
   * Automatically persists to AsyncStorage
   */
  setFontFamily: (font: BibleFontKey) => void;

  /**
   * Load font preference from AsyncStorage
   * Called automatically by persist middleware
   */
  _setHydrated: (hydrated: boolean) => void;
}

/**
 * Bible Font Store
 *
 * Key features:
 * - Persists to AsyncStorage under 'bible-font-storage'
 * - Uses subscribeWithSelector to prevent unnecessary rerenders
 * - Validates font keys before saving
 * - Falls back to 'Lora' for invalid keys
 */
export const useBibleFontStore = create<BibleFontState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Default state
        fontFamily: DEFAULT_BIBLE_FONT,
        isHydrated: false,

        // Actions
        setFontFamily: (font: BibleFontKey) => {
          // Validate font key
          if (!isValidBibleFont(font)) {
            console.warn(`Invalid Bible font key: ${font}. Falling back to ${DEFAULT_BIBLE_FONT}`);
            set({ fontFamily: DEFAULT_BIBLE_FONT });
            return;
          }

          console.log(`📖 Bible font changed to: ${font}`);
          set({ fontFamily: font });
        },

        _setHydrated: (hydrated: boolean) => {
          set({ isHydrated: hydrated });
        },
      }),
      {
        name: 'bible-font-storage',
        storage: createJSONStorage(() => AsyncStorage),
        version: 1,

        // Partial persistence - only save fontFamily
        partialize: (state) => ({
          fontFamily: state.fontFamily,
        }),

        // Handle rehydration
        onRehydrateStorage: () => (state, error) => {
          if (error) {
            console.error('Failed to rehydrate Bible font store:', error);
          } else if (state) {
            // Validate rehydrated font
            if (!isValidBibleFont(state.fontFamily)) {
              console.warn(`Invalid rehydrated font: ${state.fontFamily}. Using default.`);
              state.fontFamily = DEFAULT_BIBLE_FONT;
            }
            state._setHydrated(true);
            console.log(`✅ Bible font rehydrated: ${state.fontFamily}`);
          }
        },
      }
    )
  )
);

/**
 * Selector hook for font family only
 * Use this to prevent unnecessary rerenders
 *
 * Example:
 * ```tsx
 * const fontFamily = useBibleFont();
 * ```
 */
export const useBibleFont = () => useBibleFontStore((state) => state.fontFamily);

/**
 * Selector hook for hydration status
 * Use this to prevent rendering before storage is loaded
 *
 * Example:
 * ```tsx
 * const isHydrated = useBibleFontHydrated();
 * if (!isHydrated) return <SplashScreen />;
 * ```
 */
export const useBibleFontHydrated = () => useBibleFontStore((state) => state.isHydrated);
