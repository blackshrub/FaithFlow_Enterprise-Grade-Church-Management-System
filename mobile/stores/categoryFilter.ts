/**
 * Category Filter Modal Store (Zustand)
 *
 * Global state management for event category filter bottom sheet
 */

import { create } from 'zustand';

interface CategoryFilterStore {
  visible: boolean;
  categories: Array<{ id: string; name: string }>;
  selectedCategory: string | null;
  onSelectCategory: ((categoryId: string | null) => void) | null;

  // Actions
  open: (
    categories: Array<{ id: string; name: string }>,
    selectedCategory: string | null,
    onSelect: (categoryId: string | null) => void
  ) => void;
  close: () => void;
  selectCategory: (categoryId: string | null) => void;
}

export const useCategoryFilterStore = create<CategoryFilterStore>((set, get) => ({
  visible: false,
  categories: [],
  selectedCategory: null,
  onSelectCategory: null,

  open: (categories, selectedCategory, onSelect) => {
    set({
      visible: true,
      categories,
      selectedCategory,
      onSelectCategory: onSelect,
    });
  },

  close: () => {
    set({
      visible: false,
      categories: [],
      selectedCategory: null,
      onSelectCategory: null,
    });
  },

  selectCategory: (categoryId) => {
    const { onSelectCategory, close } = get();
    if (onSelectCategory) {
      onSelectCategory(categoryId);
    }
    close();
  },
}));
