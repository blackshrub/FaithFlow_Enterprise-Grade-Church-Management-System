/**
 * Today Motion - Shared Motion Module
 *
 * Single source of truth for Today-style animations.
 * Used by TodayScreen, EventsScreen, and any screen requiring
 * consistent header enter, collapsible behavior, and list item motion.
 *
 * Values extracted directly from TodayScreen (index.tsx).
 */

import { useEffect } from 'react';
import {
  useSharedValue,
  useDerivedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Easing,
  FadeInUp,
  type SharedValue,
} from 'react-native-reanimated';
import { getGlobalMotionDelay } from '@/components/motion/premium-motion';

// =============================================================================
// CONSTANTS (from TodayScreen)
// =============================================================================

/**
 * Header enter animation timing
 * TodayScreen uses PMotion.headerFade which is 260ms with bezier easing
 */
export const HEADER_ENTER_DURATION = 260;
export const HEADER_ENTER_EASING = Easing.bezier(0.22, 1.0, 0.36, 1.0);
export const HEADER_ENTER_TRANSLATE_Y = 10;

/**
 * Collapsible header scroll thresholds
 * From TodayScreen: starts at 20px, fully collapsed at 120px (range of 100px)
 */
export const COLLAPSE_SCROLL_START = 20;
export const COLLAPSE_SCROLL_RANGE = 100;

/**
 * Stats row dimensions (TodayScreen values)
 */
export const STATS_ROW_HEIGHT = 64;
export const STATS_ROW_MARGIN_TOP_COLLAPSED = -16;

/**
 * Greeting margin values (TodayScreen values)
 */
export const GREETING_MARGIN_EXPANDED = 24;
export const GREETING_MARGIN_COLLAPSED = 8;

/**
 * Header padding values (TodayScreen values)
 */
export const HEADER_PADDING_EXPANDED = 28;
export const HEADER_PADDING_COLLAPSED = 4;

/**
 * List item animation timing
 */
export const LIST_ITEM_BASE_DELAY = 70;
export const LIST_ITEM_DURATION = 220;

// =============================================================================
// HOOK 1: Today-style Header Mount Animation
// =============================================================================

/**
 * Hook for Today-style header mount animation.
 * Provides smooth fade-in with subtle translateY.
 *
 * @returns mounted - SharedValue for animation progress
 * @returns headerEnterStyle - AnimatedStyle to apply to header content wrapper
 */
export const useTodayHeaderMotion = () => {
  const mounted = useSharedValue(0);

  useEffect(() => {
    mounted.value = withTiming(1, {
      duration: HEADER_ENTER_DURATION,
      easing: HEADER_ENTER_EASING,
    });
  }, [mounted]);

  const headerEnterStyle = useAnimatedStyle(() => ({
    opacity: mounted.value,
    transform: [
      {
        translateY: interpolate(
          mounted.value,
          [0, 1],
          [HEADER_ENTER_TRANSLATE_Y, 0],
          'clamp'
        ),
      },
    ],
  }));

  return { mounted, headerEnterStyle };
};

// =============================================================================
// HOOK 2: Today-style Collapsible Header (TodayScreen Pattern)
// =============================================================================

/**
 * Hook for TodayScreen-style collapsible header.
 * Uses isCollapsed pattern (direct scroll value mapping).
 *
 * TodayScreen collapse formula: Math.min(1, Math.max(0, (scrollY - 20) / 100))
 *
 * @param scrollY - SharedValue from scroll handler
 * @returns isCollapsed - SharedValue (0 = expanded, 1 = collapsed)
 * @returns statsRowAnimatedStyle - AnimatedStyle for stats row
 * @returns greetingAnimatedStyle - AnimatedStyle for greeting section
 * @returns headerPaddingAnimatedStyle - AnimatedStyle for header padding
 */
export const useTodayCollapsibleHeader = (scrollY: SharedValue<number>) => {
  // Direct scroll-based collapse (TodayScreen pattern)
  const isCollapsed = useDerivedValue(() => {
    'worklet';
    return Math.min(
      1,
      Math.max(0, (scrollY.value - COLLAPSE_SCROLL_START) / COLLAPSE_SCROLL_RANGE)
    );
  });

  // Stats row animated style (TodayScreen exact values)
  const statsRowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(isCollapsed.value, [0, 1], [1, 0], 'clamp'),
    height: interpolate(isCollapsed.value, [0, 1], [STATS_ROW_HEIGHT, 0], 'clamp'),
    marginTop: interpolate(
      isCollapsed.value,
      [0, 1],
      [0, STATS_ROW_MARGIN_TOP_COLLAPSED],
      'clamp'
    ),
    overflow: 'hidden' as const,
  }));

  // Greeting section animated style (TodayScreen exact values)
  const greetingAnimatedStyle = useAnimatedStyle(() => ({
    marginBottom: interpolate(
      isCollapsed.value,
      [0, 1],
      [GREETING_MARGIN_EXPANDED, GREETING_MARGIN_COLLAPSED],
      'clamp'
    ),
  }));

  // Header padding animated style (TodayScreen exact values)
  const headerPaddingAnimatedStyle = useAnimatedStyle(() => ({
    paddingBottom: interpolate(
      isCollapsed.value,
      [0, 1],
      [HEADER_PADDING_EXPANDED, HEADER_PADDING_COLLAPSED],
      'clamp'
    ),
  }));

  return {
    isCollapsed,
    statsRowAnimatedStyle,
    greetingAnimatedStyle,
    headerPaddingAnimatedStyle,
  };
};

// =============================================================================
// HOOK 3: Events-style Collapsible Header (EventsScreen Pattern)
// =============================================================================

/**
 * Hook for EventsScreen-style collapsible header.
 * Similar to TodayScreen but with different values for Events layout.
 *
 * Events collapse formula: Math.min(1, Math.max(0, (scrollY - 30) / 120))
 * Uses delayed opacity fade for stats row.
 *
 * @param scrollY - SharedValue from scroll handler
 * @param spacing - Spacing constants object with m, l, s, sm properties
 * @returns collapse - SharedValue (0 = expanded, 1 = collapsed)
 * @returns statsRowAnimatedStyle - AnimatedStyle for stats row
 * @returns headerTopAnimatedStyle - AnimatedStyle for header top row
 * @returns headerPaddingAnimatedStyle - AnimatedStyle for header padding
 */
export const useEventsCollapsibleHeader = (
  scrollY: SharedValue<number>,
  spacing: { m: number; l: number; s: number; sm: number }
) => {
  // Events-specific collapse (30-150px range for smoother transition)
  const collapse = useDerivedValue(() => {
    'worklet';
    return Math.min(1, Math.max(0, (scrollY.value - 30) / 120));
  });

  // Stats row with delayed opacity fade
  const statsRowAnimatedStyle = useAnimatedStyle(() => ({
    // Delayed opacity: stays visible until 30% collapse, then fades
    opacity: interpolate(collapse.value, [0, 0.3, 1], [1, 1, 0], 'clamp'),
    height: interpolate(collapse.value, [0, 1], [72, 0], 'clamp'),
    marginBottom: interpolate(collapse.value, [0, 1], [spacing.m, 0], 'clamp'),
    overflow: 'hidden' as const,
  }));

  // Header top row animated style
  const headerTopAnimatedStyle = useAnimatedStyle(() => ({
    marginBottom: interpolate(collapse.value, [0, 1], [spacing.m, 0], 'clamp'),
  }));

  // Header padding animated style
  const headerPaddingAnimatedStyle = useAnimatedStyle(() => ({
    paddingBottom: interpolate(
      collapse.value,
      [0, 1],
      [spacing.l, spacing.s],
      'clamp'
    ),
  }));

  return {
    collapse,
    statsRowAnimatedStyle,
    headerTopAnimatedStyle,
    headerPaddingAnimatedStyle,
  };
};

// =============================================================================
// HELPER 3: Today-style List Item Motion
// =============================================================================

/**
 * Today-style list item enter animation.
 * FadeInUp with staggered delay based on index.
 * Uses getGlobalMotionDelay() for automatic coordination with V10 wrapper,
 * ensuring animations replay on tab focus (matching PMotion.sectionStagger behavior).
 *
 * @param index - Item index in list
 * @param baseDelay - Base delay per item (default: 70ms)
 * @returns Animation config for entering prop
 */
export const todayListItemMotion = (index: number, baseDelay = LIST_ITEM_BASE_DELAY) => {
  // Use the JS-side getter (safe to call during render, no Reanimated warning)
  const globalDelay = getGlobalMotionDelay();

  return FadeInUp.delay(globalDelay + index * baseDelay)
    .duration(LIST_ITEM_DURATION)
    .easing(HEADER_ENTER_EASING);
};

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  useTodayHeaderMotion,
  useTodayCollapsibleHeader,
  useEventsCollapsibleHeader,
  todayListItemMotion,
  // Constants
  HEADER_ENTER_DURATION,
  HEADER_ENTER_EASING,
  HEADER_ENTER_TRANSLATE_Y,
  COLLAPSE_SCROLL_START,
  COLLAPSE_SCROLL_RANGE,
  STATS_ROW_HEIGHT,
  LIST_ITEM_BASE_DELAY,
  LIST_ITEM_DURATION,
};
