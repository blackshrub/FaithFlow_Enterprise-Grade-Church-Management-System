/**
 * Navigation Store
 *
 * Tracks tab navigation direction for animated transitions
 * and current route for notification suppression.
 *
 * Facebook-level smooth transitions:
 * - isTransitioning: freezes React renders during animation
 * - activeTabIndex: tracks current tab for z-index stacking
 * - previousTabIndex: tracks previous tab for exit animation
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/shallow';

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

  // Facebook-style transition state
  isTransitioning: boolean; // True during tab transitions - freezes renders
  activeTabIndex: number; // Current visible tab index
  previousTabIndex: number; // Previous tab for exit animation
  transitionDirection: 'left' | 'right' | null; // Direction of current transition

  setSlideDirection: (direction: number) => void;
  calculateDirection: (currentRoute: string, newRoute: string) => number;
  setCurrentRoute: (pathname: string, params?: RouteParams) => void;

  // Transition control methods
  startTransition: (fromIndex: number, toIndex: number) => void;
  endTransition: () => void;
  setActiveTab: (index: number) => void;
}

// Tab order for calculating direction (matches bottom navbar order)
// Today - Events - [GROW FAB] - Community - Give
// Export for use in tab layout
export const TAB_ORDER = [
  '/(tabs)',           // Today/Home (0)
  '/(tabs)/events',    // Events (1)
  '/(tabs)/bible',     // Bible (hidden - accessed via GROW)
  '/(tabs)/explore',   // Explore (hidden - accessed via GROW)
  '/(tabs)/groups',    // Community/Groups (2)
  '/(tabs)/give',      // Give (3)
  '/(tabs)/profile',   // Profile (hidden)
];

// Visible tabs in navbar order (for transition index calculation)
export const VISIBLE_TAB_ORDER = [
  'index',    // Today (0)
  'events',   // Events (1)
  'groups',   // Community (2)
  'give',     // Give (3)
];

// Get tab index from route name
export function getTabIndex(routeName: string): number {
  const name = routeName.replace('/(tabs)/', '').replace('/(tabs)', 'index');
  const index = VISIBLE_TAB_ORDER.indexOf(name);
  return index >= 0 ? index : 0;
}

// Transition duration in ms - must match animation duration
const TRANSITION_DURATION = 200;

export const useNavigationStore = create<NavigationState>((set, get) => ({
  slideDirection: 30, // Default: slide from right
  currentRoute: '',
  currentParams: {},

  // Facebook-style transition state
  isTransitioning: false,
  activeTabIndex: 0,
  previousTabIndex: 0,
  transitionDirection: null,

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

  // Start transition - freezes renders and sets up animation direction
  startTransition: (fromIndex, toIndex) => {
    const direction = toIndex > fromIndex ? 'right' : 'left';
    const slideAmount = direction === 'right' ? 30 : -30;

    set({
      isTransitioning: true,
      previousTabIndex: fromIndex,
      activeTabIndex: toIndex,
      transitionDirection: direction,
      slideDirection: slideAmount,
    });

    // Auto-end transition after animation completes
    setTimeout(() => {
      get().endTransition();
    }, TRANSITION_DURATION + 50); // Small buffer for safety
  },

  // End transition - unfreezes renders
  endTransition: () => {
    set({
      isTransitioning: false,
      transitionDirection: null,
    });
  },

  // Set active tab without transition (for initial load)
  setActiveTab: (index) => {
    set({ activeTabIndex: index, previousTabIndex: index });
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

// =============================================================================
// SHALLOW SELECTORS
// Performance: Prevent re-renders when only unrelated state changes
// =============================================================================

/**
 * Use when you only need transition state (for animation components)
 * @example const { isTransitioning, transitionDirection } = useTransitionState();
 */
export const useTransitionState = () =>
  useNavigationStore(
    useShallow((state) => ({
      isTransitioning: state.isTransitioning,
      transitionDirection: state.transitionDirection,
      slideDirection: state.slideDirection,
    }))
  );

/**
 * Use when you only need tab indices (for tab bar rendering)
 * @example const { activeTabIndex, previousTabIndex } = useTabIndices();
 */
export const useTabIndices = () =>
  useNavigationStore(
    useShallow((state) => ({
      activeTabIndex: state.activeTabIndex,
      previousTabIndex: state.previousTabIndex,
    }))
  );

/**
 * Use when you only need current route info (for route-based logic)
 * @example const { currentRoute, currentParams } = useCurrentRoute();
 */
export const useCurrentRoute = () =>
  useNavigationStore(
    useShallow((state) => ({
      currentRoute: state.currentRoute,
      currentParams: state.currentParams,
    }))
  );

/**
 * Use when you only need navigation actions (never re-renders)
 * @example const { startTransition, endTransition, setActiveTab } = useNavigationActions();
 */
export const useNavigationActions = () =>
  useNavigationStore(
    useShallow((state) => ({
      setSlideDirection: state.setSlideDirection,
      calculateDirection: state.calculateDirection,
      setCurrentRoute: state.setCurrentRoute,
      startTransition: state.startTransition,
      endTransition: state.endTransition,
      setActiveTab: state.setActiveTab,
    }))
  );

/**
 * Use when you only need slide direction (for swipe animations)
 * @example const { slideDirection } = useSlideDirection();
 */
export const useSlideDirection = () =>
  useNavigationStore(
    useShallow((state) => ({
      slideDirection: state.slideDirection,
    }))
  );
