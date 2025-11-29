/**
 * Events UI State Store
 *
 * Manages temporary UI state for EventsScreen:
 * - Active tab
 * - Category filter
 * - Tab direction for animations
 * - Refreshing state
 *
 * Business logic stays in useEvents hooks.
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

// =============================================================================
// TYPES
// =============================================================================

export type EventTab = 'upcoming' | 'my_rsvps' | 'attended';

const TAB_ORDER: EventTab[] = ['upcoming', 'my_rsvps', 'attended'];

export type TabDirection = 'forward' | 'backward';

export interface EventsUIState {
  // Tab state
  activeTab: EventTab;
  prevTab: EventTab;
  tabDirection: TabDirection;

  // Filter state
  selectedCategory: string | null;

  // UI state
  refreshing: boolean;

  // Actions
  setActiveTab: (tab: EventTab) => void;
  setSelectedCategory: (categoryId: string | null) => void;
  setRefreshing: (refreshing: boolean) => void;
  reset: () => void;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState = {
  activeTab: 'upcoming' as EventTab,
  prevTab: 'upcoming' as EventTab,
  tabDirection: 'forward' as TabDirection,
  selectedCategory: null,
  refreshing: false,
};

// =============================================================================
// STORE
// =============================================================================

export const useEventsUIStore = create<EventsUIState>((set, get) => ({
  ...initialState,

  setActiveTab: (tab: EventTab) => {
    const { activeTab: currentTab } = get();
    const prevIndex = TAB_ORDER.indexOf(currentTab);
    const newIndex = TAB_ORDER.indexOf(tab);
    const direction: TabDirection = newIndex > prevIndex ? 'forward' : 'backward';

    set({
      prevTab: currentTab,
      activeTab: tab,
      tabDirection: direction,
    });
  },

  setSelectedCategory: (categoryId: string | null) => {
    set({ selectedCategory: categoryId });
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

export const useEventsTab = () =>
  useEventsUIStore(
    useShallow((state) => ({
      activeTab: state.activeTab,
      tabDirection: state.tabDirection,
      setActiveTab: state.setActiveTab,
    }))
  );

export const useEventsCategory = () =>
  useEventsUIStore(
    useShallow((state) => ({
      selectedCategory: state.selectedCategory,
      setSelectedCategory: state.setSelectedCategory,
    }))
  );

export const useEventsRefreshing = () =>
  useEventsUIStore(
    useShallow((state) => ({
      refreshing: state.refreshing,
      setRefreshing: state.setRefreshing,
    }))
  );

export default useEventsUIStore;
