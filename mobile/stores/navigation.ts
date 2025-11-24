/**
 * Navigation Store
 *
 * Tracks tab navigation direction for animated transitions
 */

import { create } from 'zustand';

interface NavigationState {
  slideDirection: number; // positive = from right (forward), negative = from left (backward)
  setSlideDirection: (direction: number) => void;
  calculateDirection: (currentRoute: string, newRoute: string) => number;
}

// Tab order for calculating direction
const TAB_ORDER = [
  '/(tabs)',           // Home (0)
  '/(tabs)/bible',     // Bible (1)
  '/(tabs)/events',    // Events (2)
  '/(tabs)/profile',   // Profile (3)
];

export const useNavigationStore = create<NavigationState>((set) => ({
  slideDirection: 30, // Default: slide from right

  setSlideDirection: (direction) => set({ slideDirection: direction }),

  calculateDirection: (currentRoute, newRoute) => {
    const currentIndex = TAB_ORDER.indexOf(currentRoute);
    const newIndex = TAB_ORDER.indexOf(newRoute);

    // Forward (increasing index) = slide from right (positive)
    // Backward (decreasing index) = slide from left (negative)
    const direction = newIndex > currentIndex ? 30 : -30;
    set({ slideDirection: direction });
    return direction;
  },
}));
