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
  setDate: (date: Date | null) => void;
  setStatus: (status: EventStatus | null) => void;
  setIsSearching: (isSearching: boolean) => void;
  setIsCalendarOpen: (isOpen: boolean) => void;
  clearAllFilters: () => void;
  clearSearch: () => void;
}

export const useEventFiltersStore = create<EventFiltersStore>((set) => ({
  // Initial states
  searchTerm: '',
  selectedCategory: null,
  selectedDate: null,
  selectedStatus: null,
  isSearching: false,
  isCalendarOpen: false,

  // Actions
  setSearchTerm: (term) => {
    set({
      searchTerm: term,
      isSearching: term.trim().length > 0,
      // Clear category filter when searching (per requirements)
      selectedCategory: term.trim().length > 0 ? null : set((state) => state).selectedCategory,
    });
  },

  setCategory: (categoryId) => {
    set({ selectedCategory: categoryId });
  },

  setDate: (date) => {
    set({ selectedDate: date });
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
