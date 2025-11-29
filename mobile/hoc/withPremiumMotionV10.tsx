/**
 * Premium Motion V10 Ultra – Production-Grade Screen Wrapper (HOC)
 *
 * V10 Ultra Features:
 * - Apple-friendly cubic-bezier curves (0.21, 0.0, 0.0, 1)
 * - Velocity-aware animation (rapid navigation detection)
 * - Adaptive CPU load / low-performance detection
 * - Interrupt-friendly transitions with proper cleanup
 * - Modal parallax engine with subtle translateY/scale
 * - Predictive transition scheduling via rAF
 * - Layout pre-measurement using onLayout
 *
 * Animation Types:
 * - fadeThrough: Fast cross-fade (default)
 * - sharedAxisX: Horizontal slide + fade
 * - sharedAxisY: Vertical slide + fade (modals/sheets)
 * - slideLift: Shared Axis Z with scale + depth
 * - none: No animation (instant)
 *
 * Usage:
 * - Wrap individual screens: export default withPremiumMotionV10(MyScreen)
 * - Override animation: withPremiumMotionV10(MyScreen, { animation: 'sharedAxisX' })
 */

import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, View, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  cancelAnimation,
  runOnJS,
} from 'react-native-reanimated';
import { usePathname } from 'expo-router';
import { V10_EASING, V10_DURATION, V10_CONFIG, GLOBAL_MOTION_DELAY, setGlobalMotionDelay } from '@/components/motion/premium-motion';

// Re-export GLOBAL_MOTION_DELAY for backwards compatibility
export { GLOBAL_MOTION_DELAY };

// ============================================================================
// TYPES
// ============================================================================

/** V10 animation types */
export type V10AnimationType =
  | 'fadeThrough'
  | 'sharedAxisX'
  | 'sharedAxisY'
  | 'slideLift'
  | 'none';

/** V10 HOC options */
export interface PremiumMotionV10Options {
  /** Animation type (default: fadeThrough) */
  animation?: V10AnimationType;
  /** Skip transition animation */
  skipTransition?: boolean;
  /** Disable initial animation (useful for first-load screens) */
  disableInitialAnimation?: boolean;
  /** Custom duration override */
  duration?: number;
  /** Enable modal parallax effect */
  enableModalParallax?: boolean;
  /** Enable velocity-aware adaptive duration */
  enableVelocityAware?: boolean;
  /** Enable low-performance detection */
  enableLowPerfDetection?: boolean;
}

// ============================================================================
// PERFORMANCE DETECTION
// ============================================================================

/** Track last navigation timestamp for velocity detection */
let lastNavigationTime = 0;

/** Track frame timing for low-performance detection */
let lowPerformanceMode = false;
let frameTimeSamples: number[] = [];
const FRAME_SAMPLE_SIZE = 5;
const LOW_PERF_THRESHOLD_MS = 20; // >20ms frame time = low perf

/**
 * Detect rapid navigation (user tapping tabs quickly)
 * Returns shortened duration if navigating within 400ms of last nav
 */
const getVelocityAwareDuration = (baseDuration: number): number => {
  const now = Date.now();
  const timeSinceLastNav = now - lastNavigationTime;
  lastNavigationTime = now;

  // Rapid navigation: reduce duration by 40%
  if (timeSinceLastNav < 400) {
    return Math.round(baseDuration * 0.6);
  }

  return baseDuration;
};

/**
 * Sample frame timing to detect low-performance device/state
 * Uses requestAnimationFrame heuristics
 */
const sampleFrameTiming = (): void => {
  let lastFrameTime = performance.now();

  const measureFrame = () => {
    const now = performance.now();
    const frameTime = now - lastFrameTime;
    lastFrameTime = now;

    frameTimeSamples.push(frameTime);
    if (frameTimeSamples.length > FRAME_SAMPLE_SIZE) {
      frameTimeSamples.shift();
    }

    // Calculate average frame time
    const avgFrameTime =
      frameTimeSamples.reduce((a, b) => a + b, 0) / frameTimeSamples.length;

    // Set low performance mode if average frame time > threshold
    lowPerformanceMode = avgFrameTime > LOW_PERF_THRESHOLD_MS;
  };

  // Sample 3 frames
  requestAnimationFrame(() => {
    measureFrame();
    requestAnimationFrame(() => {
      measureFrame();
      requestAnimationFrame(measureFrame);
    });
  });
};

/**
 * Get performance-adjusted duration
 * Shortens duration on low-perf devices for smoother feel
 */
const getPerformanceAdjustedDuration = (baseDuration: number): number => {
  if (lowPerformanceMode) {
    return Math.round(baseDuration * 0.7);
  }
  return baseDuration;
};

// ============================================================================
// SKIP TRANSITION PATTERNS
// ============================================================================

const SKIP_TRANSITION_PATTERNS = [
  /^\/prayer\/new$/, // FAB morph target
  /^\/call\/.*$/, // Call screens (fullscreen overlay)
  /^\/\(auth\).*$/, // Auth flow (has own transitions)
  /^\/$|^\/index$/, // Root/index (initial load)
  /^\/\(tabs\)/, // All tab screens - instant switching, no animation
] as const;

const shouldSkipTransition = (pathname: string): boolean => {
  return SKIP_TRANSITION_PATTERNS.some((pattern) => pattern.test(pathname));
};

// ============================================================================
// V10 HOC
// ============================================================================

export function withPremiumMotionV10<P extends object>(
  ScreenComponent: React.ComponentType<P>,
  options: PremiumMotionV10Options = {}
) {
  const {
    animation = 'fadeThrough',
    skipTransition = false,
    disableInitialAnimation = false,
    duration: customDuration,
    enableModalParallax = false,
    enableVelocityAware = true,
    enableLowPerfDetection = true,
  } = options;

  function WrappedScreen(props: P) {
    const pathname = usePathname();
    const hasAnimatedRef = useRef(false);
    const isMountedRef = useRef(true);
    const layoutMeasuredRef = useRef(false);
    const shouldSkip = skipTransition || shouldSkipTransition(pathname);

    // Animation values
    const opacity = useSharedValue(disableInitialAnimation || shouldSkip ? 1 : 0);
    const scale = useSharedValue(disableInitialAnimation || shouldSkip ? 1 : V10_CONFIG.initialScale);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

    // Layout pre-measurement
    const layoutWidth = useSharedValue(0);
    const layoutHeight = useSharedValue(0);

    // Calculate effective duration
    const getEffectiveDuration = useCallback(() => {
      // Get base duration from config (handle 'none' which has no duration entry)
      const durationKey = animation === 'none' ? 'fadeThrough' : animation;
      let baseDuration = customDuration ?? V10_DURATION[durationKey as keyof typeof V10_DURATION] ?? V10_DURATION.fadeThrough;

      if (enableVelocityAware) {
        baseDuration = getVelocityAwareDuration(baseDuration);
      }

      if (enableLowPerfDetection) {
        baseDuration = getPerformanceAdjustedDuration(baseDuration);
      }

      return baseDuration;
    }, [customDuration, enableVelocityAware, enableLowPerfDetection]);

    // Layout handler for pre-measurement
    const handleLayout = useCallback(
      (event: LayoutChangeEvent) => {
        if (layoutMeasuredRef.current) return;
        layoutMeasuredRef.current = true;

        const { width, height } = event.nativeEvent.layout;
        layoutWidth.value = width;
        layoutHeight.value = height;
      },
      [layoutWidth, layoutHeight]
    );

    // Set initial values based on animation type
    useEffect(() => {
      // Sample frame timing on mount for low-perf detection
      if (enableLowPerfDetection) {
        sampleFrameTiming();
      }

      if (hasAnimatedRef.current) return;
      hasAnimatedRef.current = true;

      const effectiveDuration = getEffectiveDuration();

      // Set global delay for child animations (both shared value and JS variable)
      setGlobalMotionDelay(shouldSkip ? 0 : Math.round(effectiveDuration * 0.5));

      if (shouldSkip || disableInitialAnimation) {
        return;
      }

      // Set initial values based on animation type
      switch (animation) {
        case 'sharedAxisX':
          translateX.value = V10_CONFIG.translateX;
          scale.value = V10_CONFIG.sharedAxisXScale;
          break;
        case 'sharedAxisY':
          translateY.value = V10_CONFIG.translateY;
          scale.value = V10_CONFIG.sharedAxisYScale;
          break;
        case 'slideLift':
          scale.value = V10_CONFIG.slideLiftScale;
          break;
        case 'fadeThrough':
        default:
          scale.value = V10_CONFIG.initialScale;
          break;
      }

      // Run animation on next frame (predictive scheduling)
      requestAnimationFrame(() => {
        if (!isMountedRef.current) return;

        opacity.value = withTiming(1, {
          duration: effectiveDuration,
          easing: V10_EASING.entering,
        });

        scale.value = withTiming(1, {
          duration: effectiveDuration,
          easing: V10_EASING.entering,
        });

        if (animation === 'sharedAxisX') {
          translateX.value = withTiming(0, {
            duration: effectiveDuration,
            easing: V10_EASING.entering,
          });
        }

        if (animation === 'sharedAxisY' || enableModalParallax) {
          translateY.value = withTiming(0, {
            duration: effectiveDuration,
            easing: V10_EASING.entering,
          });
        }
      });

      // Cleanup: cancel animations on unmount (interrupt-friendly)
      return () => {
        isMountedRef.current = false;
        cancelAnimation(opacity);
        cancelAnimation(scale);
        cancelAnimation(translateX);
        cancelAnimation(translateY);
      };
    }, [
      shouldSkip,
      animation,
      getEffectiveDuration,
      enableLowPerfDetection,
      enableModalParallax,
    ]);

    // Animated style
    const animatedStyle = useAnimatedStyle(() => ({
      flex: 1,
      opacity: opacity.value,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    }));

    // Skip animation mode
    if (shouldSkip || animation === 'none') {
      return (
        <View style={styles.container} onLayout={handleLayout}>
          <ScreenComponent {...props} />
        </View>
      );
    }

    return (
      <Animated.View
        style={[styles.container, animatedStyle]}
        onLayout={handleLayout}
      >
        <ScreenComponent {...props} />
      </Animated.View>
    );
  }

  // Preserve display name for debugging
  WrappedScreen.displayName = `withPremiumMotionV10(${
    ScreenComponent.displayName || ScreenComponent.name || 'Component'
  })`;

  return WrappedScreen;
}

// ============================================================================
// CONVENIENCE WRAPPERS
// ============================================================================

/**
 * V10 FadeThrough wrapper (default)
 * Fast cross-fade transition between screens
 */
export function withPremiumMotionV10FadeThrough<P extends object>(
  ScreenComponent: React.ComponentType<P>
) {
  return withPremiumMotionV10(ScreenComponent, { animation: 'fadeThrough' });
}

/**
 * V10 Shared Axis X wrapper
 * Horizontal slide + fade transition
 */
export function withPremiumMotionV10SharedAxisX<P extends object>(
  ScreenComponent: React.ComponentType<P>
) {
  return withPremiumMotionV10(ScreenComponent, { animation: 'sharedAxisX' });
}

/**
 * V10 Shared Axis Y wrapper
 * Vertical slide + fade transition (for modals/sheets)
 */
export function withPremiumMotionV10SharedAxisY<P extends object>(
  ScreenComponent: React.ComponentType<P>
) {
  return withPremiumMotionV10(ScreenComponent, { animation: 'sharedAxisY' });
}

/**
 * V10 Slide Lift wrapper
 * Shared Axis Z with scale + depth (for feature navigation)
 */
export function withPremiumMotionV10SlideLift<P extends object>(
  ScreenComponent: React.ComponentType<P>
) {
  return withPremiumMotionV10(ScreenComponent, { animation: 'slideLift' });
}

/**
 * V10 Instant wrapper
 * No animation, but still sets up GLOBAL_MOTION_DELAY
 */
export function withPremiumMotionV10Instant<P extends object>(
  ScreenComponent: React.ComponentType<P>
) {
  return withPremiumMotionV10(ScreenComponent, {
    animation: 'none',
    disableInitialAnimation: true,
  });
}

/**
 * V10 Modal Parallax wrapper
 * Optimized for bottom sheets and modals with parallax effect
 */
export function withPremiumMotionV10Modal<P extends object>(
  ScreenComponent: React.ComponentType<P>
) {
  return withPremiumMotionV10(ScreenComponent, {
    animation: 'sharedAxisY',
    enableModalParallax: true,
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Reset performance detection state
 * Call this when app returns from background
 */
export const resetPerformanceDetection = (): void => {
  lowPerformanceMode = false;
  frameTimeSamples = [];
  sampleFrameTiming();
};

/**
 * Force low-performance mode
 * Useful for battery saver or accessibility settings
 */
export const setLowPerformanceMode = (enabled: boolean): void => {
  lowPerformanceMode = enabled;
};

/**
 * Get current performance mode
 */
export const isLowPerformanceMode = (): boolean => lowPerformanceMode;

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

// ============================================================================
// EXPORTS
// ============================================================================

export default withPremiumMotionV10;
