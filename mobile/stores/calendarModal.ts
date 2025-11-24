/**
 * Calendar Modal Store
 *
 * Controls the calendar bottom sheet modal globally
 * Uses declarative control pattern with BottomSheet component
 */

import { create } from 'zustand';

interface CalendarModalStore {
  visible: boolean;
  open: () => void;
  close: () => void;
}

export const useCalendarModalStore = create<CalendarModalStore>((set) => ({
  visible: false,

  open: () => {
    set({ visible: true });
  },

  close: () => {
    set({ visible: false });
  },
}));
