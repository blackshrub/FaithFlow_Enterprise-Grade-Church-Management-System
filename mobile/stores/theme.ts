/**
 * Theme Store
 *
 * Manages app theme preference with persistence using AsyncStorage.
 * Supports light, dark, and system-following modes.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  /** User's selected theme preference */
  themeMode: ThemeMode;
  /** Resolved theme (light or dark) based on preference and system */
  resolvedTheme: 'light' | 'dark';
  /** Whether the store has been hydrated from persistence */
  hasHydrated: boolean;
}

interface ThemeActions {
  /** Set theme preference */
  setThemeMode: (mode: ThemeMode) => void;
  /** Update resolved theme based on system preference */
  updateResolvedTheme: () => void;
  /** Mark store as hydrated */
  setHasHydrated: (state: boolean) => void;
}

/**
 * Resolve theme based on mode and system preference
 */
function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    const systemTheme = Appearance.getColorScheme();
    return systemTheme === 'dark' ? 'dark' : 'light';
  }
  return mode;
}

export const useThemeStore = create<ThemeState & ThemeActions>()(
  persist(
    (set, get) => ({
      themeMode: 'light',
      resolvedTheme: 'light',
      hasHydrated: false,

      setThemeMode: (mode: ThemeMode) => {
        const resolved = resolveTheme(mode);
        set({ themeMode: mode, resolvedTheme: resolved });
      },

      updateResolvedTheme: () => {
        const { themeMode } = get();
        const resolved = resolveTheme(themeMode);
        set({ resolvedTheme: resolved });
      },

      setHasHydrated: (state: boolean) => {
        set({ hasHydrated: state });
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        // Update resolved theme on rehydration
        if (state) {
          state.setHasHydrated(true);
          state.updateResolvedTheme();
        }
      },
      partialize: (state) => ({
        themeMode: state.themeMode,
      }),
    }
  )
);

// Subscribe to system theme changes
Appearance.addChangeListener(({ colorScheme }) => {
  const { themeMode, updateResolvedTheme } = useThemeStore.getState();
  if (themeMode === 'system') {
    updateResolvedTheme();
  }
});

export default useThemeStore;
