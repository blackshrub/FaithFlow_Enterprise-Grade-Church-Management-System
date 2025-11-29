/**
 * Grow Panel Store
 *
 * Manages the state of the GROW floating action button panel.
 * The panel contains Bible and Explore quick-access cards.
 */

import { create } from 'zustand';

interface GrowStore {
  /** Whether the grow panel is currently open */
  isOpen: boolean;

  /** Open the grow panel */
  open: () => void;

  /** Close the grow panel */
  close: () => void;

  /** Toggle the grow panel */
  toggle: () => void;
}

export const useGrowStore = create<GrowStore>((set, get) => ({
  isOpen: false,

  open: () => set({ isOpen: true }),

  close: () => set({ isOpen: false }),

  toggle: () => set({ isOpen: !get().isOpen }),
}));
