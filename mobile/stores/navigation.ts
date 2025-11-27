/**
 * Navigation Store
 *
 * Tracks tab navigation direction for animated transitions
 * and current route for notification suppression
 */

import { create } from 'zustand';

interface RouteParams {
  communityId?: string;
  subgroupId?: string;
  eventId?: string;
  [key: string]: string | undefined;
}

interface NavigationState {
  slideDirection: number; // positive = from right (forward), negative = from left (backward)
  currentRoute: string; // Current pathname
  currentParams: RouteParams; // Current route params
  setSlideDirection: (direction: number) => void;
  calculateDirection: (currentRoute: string, newRoute: string) => number;
  setCurrentRoute: (pathname: string, params?: RouteParams) => void;
}

// Tab order for calculating direction (matches bottom navbar order)
const TAB_ORDER = [
  '/(tabs)',           // Home (0)
  '/(tabs)/bible',     // Bible (1)
  '/give',             // Give (2) - special route
  '/(tabs)/explore',   // Explore (3)
  '/(tabs)/events',    // Events (4)
  '/(tabs)/profile',   // Profile (5)
];

export const useNavigationStore = create<NavigationState>((set) => ({
  slideDirection: 30, // Default: slide from right
  currentRoute: '',
  currentParams: {},

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

  setCurrentRoute: (pathname, params = {}) => {
    set({ currentRoute: pathname, currentParams: params });
  },
}));

/**
 * Check if user is currently viewing a specific chat
 * Used by notification handler to suppress notifications for active chats
 */
export function isViewingChat(communityId?: string, subgroupId?: string): boolean {
  const { currentRoute, currentParams } = useNavigationStore.getState();

  // Check if viewing community chat
  if (communityId && !subgroupId) {
    const isCommunityChat = currentRoute.includes('/community/') && currentRoute.includes('/chat');
    return isCommunityChat && currentParams.communityId === communityId;
  }

  // Check if viewing subgroup chat
  if (communityId && subgroupId) {
    const isSubgroupChat = currentRoute.includes('/subgroups/');
    return isSubgroupChat &&
           currentParams.communityId === communityId &&
           currentParams.subgroupId === subgroupId;
  }

  return false;
}
