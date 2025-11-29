/**
 * useHeaderAnimation - Reusable Header Animation Hook
 *
 * Provides:
 * - Collapsible header animation based on scroll
 * - Manual mount animation to avoid nested entering conflicts
 * - Stable animated styles for header elements
 *
 * Usage:
 * ```tsx
 * const {
 *   mounted,
 *   headerEnterStyle,
 *   isCollapsed,
 *   handleScroll,
 *   statsRowStyle,
 *   headerTopStyle,
 *   headerPaddingStyle,
 * } = useHeaderAnimation();
 * ```
 */

import { useCallback, useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { timing } from '@/components/motion/layout';

export interface HeaderAnimationConfig {
  /** Duration of mount animation in ms (default: 350) */
  mountDuration?: number;
  /** Scroll position where collapse starts (default: 20) */
  collapseStart?: number;
  /** Scroll position where fully collapsed (default: 120) */
  collapseEnd?: number;
  /** Stats row expanded height (default: 72) */
  statsExpandedHeight?: number;
  /** Stats row expanded margin (default: 16) */
  statsExpandedMargin?: number;
  /** Header padding when expanded (default: 24) */
  headerPaddingExpanded?: number;
  /** Header padding when collapsed (default: 12) */
  headerPaddingCollapsed?: number;
}

const defaultConfig: Required<HeaderAnimationConfig> = {
  mountDuration: 350,
  collapseStart: 20,
  collapseEnd: 120,
  statsExpandedHeight: 72,
  statsExpandedMargin: 16,
  headerPaddingExpanded: 24,
  headerPaddingCollapsed: 12,
};

export function useHeaderAnimation(config: HeaderAnimationConfig = {}) {
  const cfg = { ...defaultConfig, ...config };

  // Mount animation - controls header enter animation
  const mounted = useSharedValue(0);

  // Collapse state - 0 = expanded, 1 = collapsed
  const isCollapsed = useSharedValue(0);

  // Trigger mount animation on component mount
  useEffect(() => {
    mounted.value = withTiming(1, { duration: cfg.mountDuration });
  }, [cfg.mountDuration]);

  // Header enter style - replaces entering={...} props
  const headerEnterStyle = useAnimatedStyle(() => {
    const opacity = interpolate(mounted.value, [0, 1], [0, 1], Extrapolation.CLAMP);
    const translateY = interpolate(mounted.value, [0, 1], [20, 0], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  // Stats row animated style - collapses on scroll
  const statsRowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(isCollapsed.value, [0, 1], [1, 0], Extrapolation.CLAMP),
    height: interpolate(
      isCollapsed.value,
      [0, 1],
      [cfg.statsExpandedHeight, 0],
      Extrapolation.CLAMP
    ),
    marginBottom: interpolate(
      isCollapsed.value,
      [0, 1],
      [cfg.statsExpandedMargin, 0],
      Extrapolation.CLAMP
    ),
    overflow: 'hidden' as const,
  }));

  // Header top animated style - reduces margin when collapsed
  const headerTopStyle = useAnimatedStyle(() => ({
    marginBottom: interpolate(
      isCollapsed.value,
      [0, 1],
      [cfg.statsExpandedMargin, 0],
      Extrapolation.CLAMP
    ),
  }));

  // Header padding animated style - reduces bottom padding when collapsed
  const headerPaddingStyle = useAnimatedStyle(() => ({
    paddingBottom: interpolate(
      isCollapsed.value,
      [0, 1],
      [cfg.headerPaddingExpanded, cfg.headerPaddingCollapsed],
      Extrapolation.CLAMP
    ),
  }));

  // Scroll handler - updates collapse state based on scroll position
  const handleScroll = useCallback(
    (event: any) => {
      const scrollY = event.nativeEvent.contentOffset.y;
      const collapseRange = cfg.collapseEnd - cfg.collapseStart;
      const targetCollapse = Math.min(
        1,
        Math.max(0, (scrollY - cfg.collapseStart) / collapseRange)
      );
      isCollapsed.value = targetCollapse;
    },
    [cfg.collapseStart, cfg.collapseEnd, isCollapsed]
  );

  return {
    // Shared values
    mounted,
    isCollapsed,

    // Animated styles
    headerEnterStyle,
    statsRowStyle,
    headerTopStyle,
    headerPaddingStyle,

    // Handlers
    handleScroll,
  };
}

export default useHeaderAnimation;
