/**
 * Bible Font Store
 *
 * Manages font selection for Bible reading components ONLY.
 * Uses MMKV for fast, synchronous storage operations.
 *
 * IMPORTANT: This store ONLY handles Latin Bible fonts.
 * Chinese Bibles use system fonts automatically (no storage needed).
 *
 * Usage:
 * ```tsx
 * const { latinFont, setLatinFont } = useBibleFontStore();
 * const appliedFont = getAppliedBibleFont(version, latinFont);
 * <Text style={{ fontFamily: appliedFont }}>{verseText}</Text>
 * ```
 */

import { create } from 'zustand';
import { persist, createJSONStorage, subscribeWithSelector } from 'zustand/middleware';
import { mmkvStorage } from '@/lib/storage';
import { DEFAULT_LATIN_FONT, isValidLatinFont, type LatinBibleFontKey } from '@/utils/fonts';

interface BibleFontState {
  /**
   * Current Latin Bible reading font family
   * This is ONLY used for Latin-script Bibles (English, Indonesian, etc.)
   * Chinese Bibles ignore this and use system fonts
   */
  latinFont: LatinBibleFontKey;

  /**
   * Whether fonts have been loaded from storage
   * With MMKV sync storage, this is always true after initial load
   */
  isHydrated: boolean;

  /**
   * Set the Latin Bible reading font
   * Automatically persists to MMKV (synchronously)
   * Note: This has NO effect on Chinese Bibles
   */
  setLatinFont: (font: LatinBibleFontKey) => void;

  /**
   * Internal: Set hydration status
   */
  _setHydrated: (hydrated: boolean) => void;
}

/**
 * Bible Font Store
 *
 * Key features:
 * - Persists to MMKV under 'bible-font-storage' (fast, sync)
 * - Uses subscribeWithSelector to prevent unnecessary rerenders
 * - Validates font keys before saving
 * - Falls back to 'Lora' for invalid keys
 */
export const useBibleFontStore = create<BibleFontState>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        // Default state
        latinFont: DEFAULT_LATIN_FONT,
        isHydrated: false,

        // Actions
        setLatinFont: (font: LatinBibleFontKey) => {
          // Validate font key
          if (!isValidLatinFont(font)) {
            console.warn(`Invalid Latin Bible font key: ${font}. Falling back to ${DEFAULT_LATIN_FONT}`);
            set({ latinFont: DEFAULT_LATIN_FONT });
            return;
          }

          console.log(`📖 Latin Bible font changed to: ${font}`);
          set({ latinFont: font });
        },

        _setHydrated: (hydrated: boolean) => {
          set({ isHydrated: hydrated });
        },
      }),
      {
        name: 'bible-font-storage',
        storage: createJSONStorage(() => mmkvStorage),
        version: 2, // Keep version for migration compatibility

        // Partial persistence - only save latinFont
        partialize: (state) => ({
          latinFont: state.latinFont,
        }),

        // Handle rehydration
        onRehydrateStorage: () => (state, error) => {
          if (error) {
            console.error('Failed to rehydrate Bible font store:', error);
          } else if (state) {
            // Validate rehydrated font
            if (!isValidLatinFont(state.latinFont)) {
              console.warn(`Invalid rehydrated Latin font: ${state.latinFont}. Using default.`);
              state.latinFont = DEFAULT_LATIN_FONT;
            }
            state._setHydrated(true);
          }
        },
      }
    )
  )
);

/**
 * Selector hook for Latin Bible font only
 * Use this to prevent unnecessary rerenders
 *
 * IMPORTANT: This returns the Latin font selection only.
 * For actual font application, use getAppliedBibleFont() with the version code.
 *
 * Example:
 * ```tsx
 * const latinFont = useLatinBibleFont();
 * const appliedFont = getAppliedBibleFont(version, latinFont);
 * ```
 */
export const useLatinBibleFont = () => useBibleFontStore((state) => state.latinFont);

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

// Legacy export for backward compatibility
// @deprecated Use useLatinBibleFont() instead
export const useBibleFont = useLatinBibleFont;
