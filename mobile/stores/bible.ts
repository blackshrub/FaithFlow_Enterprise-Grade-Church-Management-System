/**
 * Bible Settings Store (Legacy)
 *
 * Note: This store is kept for backward compatibility.
 * New code should use bibleStore.ts which has more comprehensive features.
 *
 * Uses MMKV for synchronous, fast storage operations.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '@/lib/storage';

interface BibleState {
  selectedVersion: string;
  fontSize: number;
  fontFamily: string;

  // Actions (now synchronous thanks to MMKV)
  setSelectedVersion: (version: string) => void;
  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
}

export const useBibleStore = create<BibleState>()(
  persist(
    (set) => ({
      selectedVersion: 'tb', // Default to Indonesian Terjemahan Baru
      fontSize: 16,
      fontFamily: 'default',

      setSelectedVersion: (version: string) => {
        set({ selectedVersion: version });
      },

      setFontSize: (size: number) => {
        set({ fontSize: size });
      },

      setFontFamily: (family: string) => {
        set({ fontFamily: family });
      },
    }),
    {
      name: 'bible-settings-storage',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
