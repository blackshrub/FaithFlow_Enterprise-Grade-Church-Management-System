/**
 * Streak Store
 *
 * Controls the streak details bottom sheet visibility
 */

import { create } from 'zustand';

interface StreakStore {
  visible: boolean;
  open: () => void;
  close: () => void;
}

export const useStreakStore = create<StreakStore>((set) => ({
  visible: false,
  open: () => set({ visible: true }),
  close: () => set({ visible: false }),
}));
