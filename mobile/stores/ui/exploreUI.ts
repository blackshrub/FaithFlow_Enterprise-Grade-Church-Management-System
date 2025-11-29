/**
 * Explore UI State Store
 *
 * Manages temporary UI state for ExploreScreen:
 * - Content language
 * - Collapsed header state
 * - Refreshing state
 *
 * Business logic stays in useExplore hooks.
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

// =============================================================================
// TYPES
// =============================================================================

export type ContentLanguage = 'en' | 'id';

export interface ExploreUIState {
  // Language state
  contentLanguage: ContentLanguage;

  // Header state
  isHeaderCollapsed: boolean;

  // UI state
  refreshing: boolean;

  // Actions
  setContentLanguage: (language: ContentLanguage) => void;
  toggleContentLanguage: () => void;
  setIsHeaderCollapsed: (collapsed: boolean) => void;
  setRefreshing: (refreshing: boolean) => void;
  reset: () => void;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState = {
  contentLanguage: 'en' as ContentLanguage,
  isHeaderCollapsed: false,
  refreshing: false,
};

// =============================================================================
// STORE
// =============================================================================

export const useExploreUIStore = create<ExploreUIState>((set, get) => ({
  ...initialState,

  setContentLanguage: (language: ContentLanguage) => {
    set({ contentLanguage: language });
  },

  toggleContentLanguage: () => {
    const { contentLanguage } = get();
    set({ contentLanguage: contentLanguage === 'en' ? 'id' : 'en' });
  },

  setIsHeaderCollapsed: (collapsed: boolean) => {
    set({ isHeaderCollapsed: collapsed });
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

export const useExploreLanguage = () =>
  useExploreUIStore(
    useShallow((state) => ({
      contentLanguage: state.contentLanguage,
      setContentLanguage: state.setContentLanguage,
      toggleContentLanguage: state.toggleContentLanguage,
    }))
  );

export const useExploreHeader = () =>
  useExploreUIStore(
    useShallow((state) => ({
      isHeaderCollapsed: state.isHeaderCollapsed,
      setIsHeaderCollapsed: state.setIsHeaderCollapsed,
    }))
  );

export const useExploreRefreshing = () =>
  useExploreUIStore(
    useShallow((state) => ({
      refreshing: state.refreshing,
      setRefreshing: state.setRefreshing,
    }))
  );

export default useExploreUIStore;
