/**
 * Premium Motion V7 — Page Transition Wrapper
 *
 * High-order wrapper component for Material Shared Axis X transitions.
 * Integrates with V6 AutoWrapper for seamless screen transitions.
 *
 * Features:
 * - Detects initial render and skips animation on mount
 * - Animates on layout change / navigation
 * - Hardware-accelerated native driver
 * - 60fps optimized for low-end Android
 *
 * Usage:
 * <PageTransition direction="x" duration={280}>
 *   <YourScreen />
 * </PageTransition>
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  SharedValue,
} from 'react-native-reanimated';
import {
  SHARED_AXIS_CONFIG,
  EASE_OUT_QUINT,
  sharedAxisXEnter,
} from './sharedAxisX';

// ============================================================================
// TYPES
// ============================================================================

export interface PageTransitionProps {
  children: React.ReactNode;
  /** Transition axis direction */
  direction?: 'x' | 'y';
  /** Animation duration in ms */
  duration?: number;
  /** Whether to skip the enter animation (for tabs, modals, etc.) */
  skipEnterAnimation?: boolean;
  /** Custom container style */
  style?: ViewStyle;
  /** Callback when animation completes */
  onAnimationComplete?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PageTransition({
  children,
  direction = 'x',
  duration = SHARED_AXIS_CONFIG.duration,
  skipEnterAnimation = false,
  style,
  onAnimationComplete,
}: PageTransitionProps) {
  // Animation progress: 0 = hidden, 1 = visible
  const progress = useSharedValue(skipEnterAnimation ? 1 : 0);

  // Track if this is the initial render
  const isInitialRender = useRef(true);
  const hasAnimated = useRef(false);

  // Handle animation completion
  const handleAnimationComplete = useCallback(() => {
    if (onAnimationComplete) {
      onAnimationComplete();
    }
  }, [onAnimationComplete]);

  // Run enter animation on mount (unless skipped)
  useEffect(() => {
    if (skipEnterAnimation || hasAnimated.current) {
      isInitialRender.current = false;
      return;
    }

    hasAnimated.current = true;

    // Use requestAnimationFrame for optimal timing
    requestAnimationFrame(() => {
      progress.value = withTiming(
        1,
        {
          duration,
          easing: EASE_OUT_QUINT,
        },
        (finished) => {
          if (finished) {
            runOnJS(handleAnimationComplete)();
          }
        }
      );
    });

    isInitialRender.current = false;
  }, [duration, skipEnterAnimation, progress, handleAnimationComplete]);

  // Animated style using worklet for 60fps performance
  const animatedStyle = useAnimatedStyle(() => {
    // If animation is complete, return simple style
    if (progress.value >= 1) {
      return {
        flex: 1,
        opacity: 1,
        transform: [{ translateX: 0 }, { scale: 1 }],
      };
    }

    // Calculate shared axis values
    const values = sharedAxisXEnter(progress.value);

    return {
      flex: 1,
      opacity: values.opacity,
      transform: values.transform as any,
    };
  }, []);

  return (
    <Animated.View style={[styles.container, animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}

// ============================================================================
// INSTANT VARIANT (no animation)
// ============================================================================

/**
 * Instant variant - no animation, just renders children
 * Used for tabs, modals, and screens that should not animate
 */
export function PageTransitionInstant({
  children,
  style,
}: Pick<PageTransitionProps, 'children' | 'style'>) {
  return (
    <Animated.View style={[styles.container, style]}>
      {children}
    </Animated.View>
  );
}

// ============================================================================
// CONTROLLED VARIANT (external progress control)
// ============================================================================

export interface PageTransitionControlledProps {
  children: React.ReactNode;
  /** External progress value (0-1) */
  progress: SharedValue<number>;
  /** Whether entering or exiting */
  isEntering?: boolean;
  /** Custom container style */
  style?: ViewStyle;
}

/**
 * Controlled variant - progress controlled externally
 * Used for gesture-based navigation or coordinated transitions
 */
export function PageTransitionControlled({
  children,
  progress,
  isEntering = true,
  style,
}: PageTransitionControlledProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const values = sharedAxisXEnter(progress.value);

    return {
      flex: 1,
      opacity: values.opacity,
      transform: values.transform as any,
    };
  }, []);

  return (
    <Animated.View style={[styles.container, animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Ensure native driver compositing
    backfaceVisibility: 'hidden',
  },
});

// ============================================================================
// EXPORTS
// ============================================================================

export default PageTransition;
