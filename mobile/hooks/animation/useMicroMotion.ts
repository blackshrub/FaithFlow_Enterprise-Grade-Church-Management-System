/**
 * useMicroMotion - Micro-interaction Animation Hooks
 *
 * Collection of small, focused animation hooks for common UI interactions:
 * - Press animations
 * - Focus states
 * - Selection feedback
 * - Hover effects (for web)
 */

import { useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

// =============================================================================
// PRESS ANIMATION
// =============================================================================

export interface UsePressAnimationOptions {
  /** Scale when pressed (default: 0.96) */
  pressedScale?: number;
  /** Opacity when pressed (default: 0.9) */
  pressedOpacity?: number;
  /** Enable haptic feedback (default: true) */
  enableHaptics?: boolean;
  /** Spring damping (default: 20) */
  damping?: number;
  /** Spring stiffness (default: 300) */
  stiffness?: number;
}

export function usePressAnimation(options: UsePressAnimationOptions = {}) {
  const {
    pressedScale = 0.96,
    pressedOpacity = 0.9,
    enableHaptics = true,
    damping = 20,
    stiffness = 300,
  } = options;

  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          pressed.value,
          [0, 1],
          [1, pressedScale],
          Extrapolation.CLAMP
        ),
      },
    ],
    opacity: interpolate(
      pressed.value,
      [0, 1],
      [1, pressedOpacity],
      Extrapolation.CLAMP
    ),
  }));

  const onPressIn = useCallback(() => {
    pressed.value = withSpring(1, { damping, stiffness });
    if (enableHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [pressed, damping, stiffness, enableHaptics]);

  const onPressOut = useCallback(() => {
    pressed.value = withSpring(0, { damping, stiffness });
  }, [pressed, damping, stiffness]);

  return {
    pressed,
    animatedStyle,
    onPressIn,
    onPressOut,
    pressHandlers: { onPressIn, onPressOut },
  };
}

// =============================================================================
// SELECTION ANIMATION
// =============================================================================

export interface UseSelectionAnimationOptions {
  /** Initial selected state */
  initialSelected?: boolean;
  /** Scale when selected (default: 1.02) */
  selectedScale?: number;
  /** Border width when selected (default: 2) */
  selectedBorderWidth?: number;
  /** Enable haptic feedback (default: true) */
  enableHaptics?: boolean;
}

export function useSelectionAnimation(options: UseSelectionAnimationOptions = {}) {
  const {
    initialSelected = false,
    selectedScale = 1.02,
    selectedBorderWidth = 2,
    enableHaptics = true,
  } = options;

  const selected = useSharedValue(initialSelected ? 1 : 0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          selected.value,
          [0, 1],
          [1, selectedScale],
          Extrapolation.CLAMP
        ),
      },
    ],
    borderWidth: interpolate(
      selected.value,
      [0, 1],
      [1, selectedBorderWidth],
      Extrapolation.CLAMP
    ),
  }));

  const setSelected = useCallback(
    (isSelected: boolean) => {
      selected.value = withSpring(isSelected ? 1 : 0, {
        damping: 15,
        stiffness: 200,
      });
      if (enableHaptics && isSelected) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    },
    [selected, enableHaptics]
  );

  const toggle = useCallback(() => {
    const newValue = selected.value === 0 ? 1 : 0;
    selected.value = withSpring(newValue, { damping: 15, stiffness: 200 });
    if (enableHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [selected, enableHaptics]);

  return {
    selected,
    animatedStyle,
    setSelected,
    toggle,
    isSelected: () => selected.value === 1,
  };
}

// =============================================================================
// FOCUS ANIMATION
// =============================================================================

export interface UseFocusAnimationOptions {
  /** Shadow radius when focused (default: 8) */
  focusShadowRadius?: number;
  /** Shadow opacity when focused (default: 0.15) */
  focusShadowOpacity?: number;
  /** Border color interpolation - [unfocused, focused] */
  borderColors?: [string, string];
  /** Enable haptic feedback (default: true) */
  enableHaptics?: boolean;
}

export function useFocusAnimation(options: UseFocusAnimationOptions = {}) {
  const {
    focusShadowRadius = 8,
    focusShadowOpacity = 0.15,
    enableHaptics = true,
  } = options;

  const focused = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(
      focused.value,
      [0, 1],
      [0, focusShadowOpacity],
      Extrapolation.CLAMP
    ),
    shadowRadius: interpolate(
      focused.value,
      [0, 1],
      [0, focusShadowRadius],
      Extrapolation.CLAMP
    ),
  }));

  const onFocus = useCallback(() => {
    focused.value = withTiming(1, { duration: 150 });
    if (enableHaptics) {
      Haptics.selectionAsync();
    }
  }, [focused, enableHaptics]);

  const onBlur = useCallback(() => {
    focused.value = withTiming(0, { duration: 150 });
  }, [focused]);

  return {
    focused,
    animatedStyle,
    onFocus,
    onBlur,
    focusHandlers: { onFocus, onBlur },
  };
}

// =============================================================================
// EXPAND/COLLAPSE ANIMATION
// =============================================================================

export interface UseExpandAnimationOptions {
  /** Initial expanded state */
  initialExpanded?: boolean;
  /** Expanded height (required for smooth animation) */
  expandedHeight: number;
  /** Collapsed height (default: 0) */
  collapsedHeight?: number;
  /** Animation duration (default: 200) */
  duration?: number;
}

export function useExpandAnimation(options: UseExpandAnimationOptions) {
  const {
    initialExpanded = false,
    expandedHeight,
    collapsedHeight = 0,
    duration = 200,
  } = options;

  const expanded = useSharedValue(initialExpanded ? 1 : 0);

  const animatedStyle = useAnimatedStyle(() => ({
    height: interpolate(
      expanded.value,
      [0, 1],
      [collapsedHeight, expandedHeight],
      Extrapolation.CLAMP
    ),
    opacity: interpolate(expanded.value, [0, 0.5, 1], [0, 0, 1], Extrapolation.CLAMP),
    overflow: 'hidden' as const,
  }));

  const expand = useCallback(() => {
    expanded.value = withTiming(1, { duration });
  }, [expanded, duration]);

  const collapse = useCallback(() => {
    expanded.value = withTiming(0, { duration });
  }, [expanded, duration]);

  const toggle = useCallback(() => {
    expanded.value = withTiming(expanded.value === 0 ? 1 : 0, { duration });
  }, [expanded, duration]);

  return {
    expanded,
    animatedStyle,
    expand,
    collapse,
    toggle,
    isExpanded: () => expanded.value === 1,
  };
}

// =============================================================================
// SHAKE ANIMATION (for errors)
// =============================================================================

export function useShakeAnimation() {
  const shake = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          shake.value,
          [0, 0.25, 0.5, 0.75, 1],
          [0, -10, 10, -5, 0],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

  const triggerShake = useCallback(() => {
    shake.value = 0;
    shake.value = withTiming(1, { duration: 400 });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, [shake]);

  return {
    shake,
    animatedStyle,
    triggerShake,
  };
}

// =============================================================================
// PULSE ANIMATION (for attention)
// =============================================================================

export function usePulseAnimation() {
  const pulse = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const triggerPulse = useCallback(() => {
    pulse.value = withSpring(1.1, { damping: 2, stiffness: 200 }, () => {
      pulse.value = withSpring(1, { damping: 15, stiffness: 200 });
    });
  }, [pulse]);

  return {
    pulse,
    animatedStyle,
    triggerPulse,
  };
}

export default {
  usePressAnimation,
  useSelectionAnimation,
  useFocusAnimation,
  useExpandAnimation,
  useShakeAnimation,
  usePulseAnimation,
};
