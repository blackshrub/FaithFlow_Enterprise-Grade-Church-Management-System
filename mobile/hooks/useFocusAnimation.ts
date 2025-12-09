/**
 * Focus Animation Hook - Trigger animations on screen focus
 *
 * For tab screens with freezeOnBlur: true, the normal entering animations
 * only play on first mount. This hook triggers animations every time
 * the screen gains focus.
 *
 * Usage:
 * const { focusKey, animatedStyle } = useFocusAnimation();
 *
 * <Animated.View style={animatedStyle}>
 *   <Animated.View key={`section-${focusKey}`} entering={PMotion.sectionStagger(0)}>
 *     ...
 *   </Animated.View>
 * </Animated.View>
 */

import { useCallback, useState, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { setGlobalMotionDelay } from '@/components/motion/premium-motion';
import { getLiteMode } from '@/stores/deviceCapability';

/** Animation configuration */
const CONFIG = {
  /** Duration for container fade in */
  containerDuration: 200,
  /** Delay before child animations start */
  childDelay: 100,
  /** Easing curve */
  easing: Easing.bezier(0.21, 0.0, 0.0, 1),
};

interface UseFocusAnimationResult {
  /**
   * Key that changes on every focus.
   * Use this to key animated elements so they remount and replay animations.
   * Example: key={`section-${focusKey}`}
   */
  focusKey: number;

  /**
   * Animated style for the container.
   * Apply this to the root Animated.View to get a smooth fade-in.
   */
  animatedStyle: ReturnType<typeof useAnimatedStyle>;

  /**
   * Whether this is the first focus (initial mount).
   * Use to customize animation behavior on first vs subsequent visits.
   */
  isFirstFocus: boolean;
}

/**
 * Hook to trigger entering animations on every screen focus.
 *
 * How it works:
 * 1. On focus: increment focusKey to remount animated children
 * 2. Children with `entering` animations will replay
 * 3. Container fades in smoothly
 *
 * @param options Configuration options
 * @returns Animation state and styles
 */
export function useFocusAnimation(options?: {
  /** Skip animation (e.g., for Lite Mode) */
  skipAnimation?: boolean;
}): UseFocusAnimationResult {
  const { skipAnimation = false } = options ?? {};

  // Track focus count to create unique keys
  const [focusKey, setFocusKey] = useState(0);
  const [isFirstFocus, setIsFirstFocus] = useState(true);

  // Animated values for container
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);

  // Check Lite Mode
  const isLiteMode = getLiteMode();
  const shouldAnimate = !skipAnimation && !isLiteMode;

  useFocusEffect(
    useCallback(() => {
      // Set global motion delay for child stagger animations
      setGlobalMotionDelay(shouldAnimate ? CONFIG.childDelay : 0);

      if (shouldAnimate) {
        // Reset animation values
        opacity.value = 0;
        translateY.value = 8;

        // Animate in
        opacity.value = withTiming(1, {
          duration: CONFIG.containerDuration,
          easing: CONFIG.easing,
        });
        translateY.value = withDelay(
          50,
          withTiming(0, {
            duration: CONFIG.containerDuration,
            easing: CONFIG.easing,
          })
        );
      }

      // Increment focus key to remount animated children
      setFocusKey((prev) => prev + 1);

      // Track first focus
      if (isFirstFocus) {
        setIsFirstFocus(false);
      }

      // Cleanup on blur (optional: reset for next focus)
      return () => {
        // Don't reset values here - let freezeOnBlur handle it
      };
    }, [shouldAnimate, opacity, translateY, isFirstFocus])
  );

  // Container animated style
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return {
    focusKey,
    animatedStyle,
    isFirstFocus,
  };
}

/**
 * Simple hook that just returns a focus key for remounting animated children.
 * Use when you don't need container animation, just child remounting.
 *
 * NOTE: Animation replay on tab switch has been DISABLED to prevent flicker
 * when navigating back from detail screens. The initial mount animation
 * is sufficient for most use cases.
 *
 * If you need tab-switch animations in the future, consider using a global
 * navigation listener to properly distinguish between tab switches and stack pops.
 */
export function useFocusKey(): number {
  // Return a stable key - no animation replay on focus
  // This prevents flicker when navigating back from detail screens
  return 0;
}

export default useFocusAnimation;
