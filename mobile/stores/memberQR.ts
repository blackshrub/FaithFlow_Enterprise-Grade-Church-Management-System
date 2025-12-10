/**
 * Member QR Store
 *
 * Zustand store for controlling the MemberQRSheet visibility.
 * Pattern follows CLAUDE.md rules for gorhom/bottom-sheet.
 */

import { create } from 'zustand';

interface MemberQRStore {
  /** Whether the QR sheet is visible */
  visible: boolean;
  /** Open the QR sheet */
  open: () => void;
  /** Close the QR sheet */
  close: () => void;
  /** Toggle the QR sheet visibility */
  toggle: () => void;
}

export const useMemberQRStore = create<MemberQRStore>((set) => ({
  visible: false,

  open: () => set({ visible: true }),

  close: () => set({ visible: false }),

  toggle: () => set((state) => ({ visible: !state.visible })),
}));
