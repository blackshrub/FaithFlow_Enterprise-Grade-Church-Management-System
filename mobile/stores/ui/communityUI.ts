/**
 * Community UI State Store
 *
 * Manages temporary UI state for CommunityScreen:
 * - Search query
 * - Refreshing state
 *
 * Business logic stays in useCommunity hooks.
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

// =============================================================================
// TYPES
// =============================================================================

export interface CommunityUIState {
  // Search state
  searchQuery: string;

  // UI state
  refreshing: boolean;

  // Actions
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  setRefreshing: (refreshing: boolean) => void;
  reset: () => void;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState = {
  searchQuery: '',
  refreshing: false,
};

// =============================================================================
// STORE
// =============================================================================

export const useCommunityUIStore = create<CommunityUIState>((set) => ({
  ...initialState,

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  clearSearch: () => {
    set({ searchQuery: '' });
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

export const useCommunitySearch = () =>
  useCommunityUIStore(
    useShallow((state) => ({
      searchQuery: state.searchQuery,
      setSearchQuery: state.setSearchQuery,
      clearSearch: state.clearSearch,
    }))
  );

export const useCommunityRefreshing = () =>
  useCommunityUIStore(
    useShallow((state) => ({
      refreshing: state.refreshing,
      setRefreshing: state.setRefreshing,
    }))
  );

export default useCommunityUIStore;
