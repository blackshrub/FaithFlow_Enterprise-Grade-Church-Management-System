/**
 * Event Filters Store (Zustand)
 *
 * Unified state management for all event filtering:
 * - Search term
 * - Category filter
 * - Date filter (calendar)
 * - Status filter
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/shallow';
import { EventStatus } from '@/utils/eventStatus';

interface EventFiltersStore {
  // Filter states
  searchTerm: string;
  selectedCategory: string | null;
  selectedDate: Date | null;
  selectedStatus: EventStatus | null;

  // UI states
  isSearching: boolean;
  isCalendarOpen: boolean;

  // Actions
  setSearchTerm: (term: string) => void;
  setCategory: (categoryId: string | null) => void;
  setSelectedDate: (date: Date | null) => void;
  clearSelectedDate: () => void;
  setStatus: (status: EventStatus | null) => void;
  setIsSearching: (isSearching: boolean) => void;
  setIsCalendarOpen: (isOpen: boolean) => void;
  clearAllFilters: () => void;
  clearSearch: () => void;
}

export const useEventFiltersStore = create<EventFiltersStore>((set, get) => ({
  // Initial states
  searchTerm: '',
  selectedCategory: null,
  selectedDate: null,
  selectedStatus: null,
  isSearching: false,
  isCalendarOpen: false,

  // Actions
  setSearchTerm: (term) => {
    const currentCategory = get().selectedCategory;
    set({
      searchTerm: term,
      isSearching: term.trim().length > 0,
      // Clear category filter when searching (per requirements)
      selectedCategory: term.trim().length > 0 ? null : currentCategory,
    });
  },

  setCategory: (categoryId) => {
    set({ selectedCategory: categoryId });
  },

  setSelectedDate: (date) => {
    set({ selectedDate: date });
  },

  clearSelectedDate: () => {
    set({ selectedDate: null });
  },

  setStatus: (status) => {
    set({ selectedStatus: status });
  },

  setIsSearching: (isSearching) => {
    set({ isSearching });
  },

  setIsCalendarOpen: (isOpen) => {
    set({ isCalendarOpen: isOpen });
  },

  clearAllFilters: () => {
    set({
      searchTerm: '',
      selectedCategory: null,
      selectedDate: null,
      selectedStatus: null,
      isSearching: false,
    });
  },

  clearSearch: () => {
    set({
      searchTerm: '',
      isSearching: false,
    });
  },
}));

// Granular selectors - prevent cascading re-renders
export const useSearchTerm = () => useEventFiltersStore((s) => s.searchTerm);
export const useSelectedCategory = () => useEventFiltersStore((s) => s.selectedCategory);
export const useSelectedDate = () => useEventFiltersStore((s) => s.selectedDate);
export const useSelectedStatus = () => useEventFiltersStore((s) => s.selectedStatus);
export const useIsSearching = () => useEventFiltersStore((s) => s.isSearching);
export const useIsCalendarOpen = () => useEventFiltersStore((s) => s.isCalendarOpen);

// Actions selector - never causes re-renders since actions are stable
export const useEventFilterActions = () =>
  useEventFiltersStore(
    useShallow((s) => ({
      setSearchTerm: s.setSearchTerm,
      setCategory: s.setCategory,
      setSelectedDate: s.setSelectedDate,
      clearSelectedDate: s.clearSelectedDate,
      setStatus: s.setStatus,
      setIsSearching: s.setIsSearching,
      setIsCalendarOpen: s.setIsCalendarOpen,
      clearAllFilters: s.clearAllFilters,
      clearSearch: s.clearSearch,
    }))
  );

// Combined filters selector for query dependencies
export const useEventFilters = () =>
  useEventFiltersStore(
    useShallow((s) => ({
      searchTerm: s.searchTerm,
      selectedCategory: s.selectedCategory,
      selectedDate: s.selectedDate,
      selectedStatus: s.selectedStatus,
    }))
  );
