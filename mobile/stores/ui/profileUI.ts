/**
 * Profile UI State Store
 *
 * Manages temporary UI state for ProfileScreen:
 * - Logout dialog visibility
 * - Refreshing state
 *
 * Business logic stays in useAuth hooks.
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

// =============================================================================
// TYPES
// =============================================================================

export interface ProfileUIState {
  // Dialog state
  showLogoutDialog: boolean;

  // UI state
  refreshing: boolean;

  // Actions
  setShowLogoutDialog: (show: boolean) => void;
  openLogoutDialog: () => void;
  closeLogoutDialog: () => void;
  setRefreshing: (refreshing: boolean) => void;
  reset: () => void;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState = {
  showLogoutDialog: false,
  refreshing: false,
};

// =============================================================================
// STORE
// =============================================================================

export const useProfileUIStore = create<ProfileUIState>((set) => ({
  ...initialState,

  setShowLogoutDialog: (show: boolean) => {
    set({ showLogoutDialog: show });
  },

  openLogoutDialog: () => {
    set({ showLogoutDialog: true });
  },

  closeLogoutDialog: () => {
    set({ showLogoutDialog: false });
  },

  setRefreshing: (refreshing: boolean) => {
    set({ refreshing });
  },

  reset: () => {
    set(initialState);
  },
}));

// =============================================================================
// SELECTORS (for optimized re-renders)
// =============================================================================

export const useProfileDialog = () =>
  useProfileUIStore(
    useShallow((state) => ({
      showLogoutDialog: state.showLogoutDialog,
      setShowLogoutDialog: state.setShowLogoutDialog,
      openLogoutDialog: state.openLogoutDialog,
      closeLogoutDialog: state.closeLogoutDialog,
    }))
  );

export const useProfileRefreshing = () =>
  useProfileUIStore(
    useShallow((state) => ({
      refreshing: state.refreshing,
      setRefreshing: state.setRefreshing,
    }))
  );

export default useProfileUIStore;
