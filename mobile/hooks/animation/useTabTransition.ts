/**
 * useTabTransition - Tab Navigation Transition Hook
 *
 * Provides Shared Axis X transitions for tab navigation.
 * Automatically tracks tab direction (forward/backward) and provides
 * appropriate entering/exiting animations.
 *
 * Usage:
 * ```tsx
 * const { activeTab, setTab, tabDirection, enteringAnimation, exitingAnimation } = useTabTransition(['tab1', 'tab2', 'tab3']);
 *
 * <Animated.View
 *   key={activeTab}
 *   entering={enteringAnimation}
 *   exiting={exitingAnimation}
 * >
 *   {content}
 * </Animated.View>
 * ```
 */

import { useRef, useCallback, useMemo } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  sharedAxisXForward,
  sharedAxisXBackward,
  sharedAxisXExitForward,
  sharedAxisXExitBackward,
} from '@/components/motion/layout';

export type TabDirection = 'forward' | 'backward';

export interface UseTabTransitionOptions<T extends string> {
  /** Initial active tab */
  initialTab?: T;
  /** Enable haptic feedback on tab change */
  enableHaptics?: boolean;
  /** Custom haptic style */
  hapticStyle?: Haptics.ImpactFeedbackStyle;
}

export function useTabTransition<T extends string>(
  tabOrder: readonly T[],
  options: UseTabTransitionOptions<T> = {}
) {
  const {
    initialTab = tabOrder[0],
    enableHaptics = true,
    hapticStyle = Haptics.ImpactFeedbackStyle.Light,
  } = options;

  // Track active tab
  const activeTabRef = useRef<T>(initialTab);
  const directionRef = useRef<TabDirection>('forward');

  // Shared value for current tab index (useful for animations)
  const tabIndex = useSharedValue(tabOrder.indexOf(initialTab));

  // Get current active tab
  const getActiveTab = useCallback(() => activeTabRef.current, []);

  // Get current direction
  const getDirection = useCallback(() => directionRef.current, []);

  // Set tab with direction detection
  const setTab = useCallback(
    (newTab: T, customDirection?: TabDirection) => {
      const prevIndex = tabOrder.indexOf(activeTabRef.current);
      const newIndex = tabOrder.indexOf(newTab);

      // Determine direction
      const direction = customDirection ?? (newIndex > prevIndex ? 'forward' : 'backward');

      // Update refs
      directionRef.current = direction;
      activeTabRef.current = newTab;
      tabIndex.value = newIndex;

      // Haptic feedback
      if (enableHaptics) {
        Haptics.impactAsync(hapticStyle);
      }

      return { newTab, direction };
    },
    [tabOrder, enableHaptics, hapticStyle, tabIndex]
  );

  // Go to next tab
  const nextTab = useCallback(() => {
    const currentIndex = tabOrder.indexOf(activeTabRef.current);
    if (currentIndex < tabOrder.length - 1) {
      return setTab(tabOrder[currentIndex + 1], 'forward');
    }
    return null;
  }, [tabOrder, setTab]);

  // Go to previous tab
  const prevTab = useCallback(() => {
    const currentIndex = tabOrder.indexOf(activeTabRef.current);
    if (currentIndex > 0) {
      return setTab(tabOrder[currentIndex - 1], 'backward');
    }
    return null;
  }, [tabOrder, setTab]);

  // Get entering animation based on direction
  const getEnteringAnimation = useCallback(() => {
    return directionRef.current === 'forward'
      ? sharedAxisXForward
      : sharedAxisXBackward;
  }, []);

  // Get exiting animation based on direction
  const getExitingAnimation = useCallback(() => {
    return directionRef.current === 'forward'
      ? sharedAxisXExitForward
      : sharedAxisXExitBackward;
  }, []);

  // Memoized animation objects (for stable references)
  const animations = useMemo(
    () => ({
      forward: {
        entering: sharedAxisXForward,
        exiting: sharedAxisXExitForward,
      },
      backward: {
        entering: sharedAxisXBackward,
        exiting: sharedAxisXExitBackward,
      },
    }),
    []
  );

  return {
    // State accessors
    getActiveTab,
    getDirection,
    tabIndex,

    // Actions
    setTab,
    nextTab,
    prevTab,

    // Animation getters
    getEnteringAnimation,
    getExitingAnimation,

    // Static animation references
    animations,

    // Tab info
    tabOrder,
    isFirstTab: useCallback(() => activeTabRef.current === tabOrder[0], [tabOrder]),
    isLastTab: useCallback(
      () => activeTabRef.current === tabOrder[tabOrder.length - 1],
      [tabOrder]
    ),
  };
}

/**
 * Simplified hook that returns current values instead of functions
 * Use this when you need reactive values in render
 */
export function useTabTransitionState<T extends string>(
  tabOrder: readonly T[],
  activeTab: T,
  prevTabRef: React.MutableRefObject<T>
) {
  const direction: TabDirection = useMemo(() => {
    const prevIndex = tabOrder.indexOf(prevTabRef.current);
    const currentIndex = tabOrder.indexOf(activeTab);
    return currentIndex > prevIndex ? 'forward' : 'backward';
  }, [tabOrder, activeTab, prevTabRef]);

  const enteringAnimation = useMemo(
    () => (direction === 'forward' ? sharedAxisXForward : sharedAxisXBackward),
    [direction]
  );

  const exitingAnimation = useMemo(
    () => (direction === 'forward' ? sharedAxisXExitForward : sharedAxisXExitBackward),
    [direction]
  );

  return {
    direction,
    enteringAnimation,
    exitingAnimation,
  };
}

export default useTabTransition;
