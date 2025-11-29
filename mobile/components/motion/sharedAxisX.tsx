/**
 * Premium Motion V7 — Material Shared Axis X Transition
 *
 * Material Design 3 "Container Transform" style horizontal transitions.
 * Optimized for 60fps on low-end Android devices.
 *
 * Specification:
 * - Entering: translateX 80→0, opacity 0→1, scale 0.92→1.00
 * - Exiting: translateX 0→-40, opacity 1→0, scale 1.00→1.02
 * - Duration: 280ms
 * - Easing: Material You standard (easeOutQuint enter, easeInQuint exit)
 */

import { Easing } from 'react-native-reanimated';

// ============================================================================
// EASING CURVES — Material You Standard
// ============================================================================

/**
 * Material 3 Emphasized Decelerate (entering)
 * cubic-bezier(0.2, 0, 0, 1) — smooth landing
 */
export const EASE_OUT_QUINT = Easing.bezier(0.2, 0, 0, 1);

/**
 * Material 3 Emphasized Accelerate (exiting)
 * cubic-bezier(0.4, 0, 1, 1) — quick departure
 */
export const EASE_IN_QUINT = Easing.bezier(0.4, 0, 1, 1);

/**
 * iOS-style smooth ease (fallback)
 */
export const EASE_IOS = Easing.bezier(0.25, 0.1, 0.25, 1);

// ============================================================================
// TIMING CONFIGURATION
// ============================================================================

export const SHARED_AXIS_CONFIG = {
  /** Total transition duration in ms */
  duration: 280,

  /** Entering screen values */
  enter: {
    translateX: {
      from: 80,
      to: 0,
    },
    opacity: {
      from: 0,
      to: 1,
    },
    scale: {
      from: 0.92,
      to: 1.0,
    },
  },

  /** Exiting screen values (for parallel exit animation) */
  exit: {
    translateX: {
      from: 0,
      to: -40,
    },
    opacity: {
      from: 1,
      to: 0,
    },
    scale: {
      from: 1.0,
      to: 1.02,
    },
  },
} as const;

// ============================================================================
// INTERPOLATION HELPERS
// ============================================================================

/**
 * Linear interpolation between two values
 */
export const lerp = (start: number, end: number, progress: number): number => {
  'worklet';
  return start + (end - start) * progress;
};

/**
 * Clamp value between min and max
 */
export const clamp = (value: number, min: number, max: number): number => {
  'worklet';
  return Math.min(Math.max(value, min), max);
};

// ============================================================================
// SHARED AXIS X TRANSITION
// ============================================================================

/**
 * Transform type for React Native
 * Each transform object has ONE property
 */
export type TransformItem =
  | { translateX: number }
  | { translateY: number }
  | { scale: number }
  | { scaleX: number }
  | { scaleY: number }
  | { rotate: string }
  | { rotateX: string }
  | { rotateY: string }
  | { rotateZ: string };

export interface SharedAxisXStyle {
  opacity: number;
  transform: TransformItem[];
}

/**
 * Calculate shared axis X entering animation values
 *
 * @param progress - Animation progress (0 = start, 1 = end)
 * @returns Style object with opacity and transform
 */
export const sharedAxisXEnter = (progress: number): SharedAxisXStyle => {
  'worklet';

  const { enter } = SHARED_AXIS_CONFIG;
  const clampedProgress = clamp(progress, 0, 1);

  return {
    opacity: lerp(enter.opacity.from, enter.opacity.to, clampedProgress),
    transform: [
      {
        translateX: lerp(enter.translateX.from, enter.translateX.to, clampedProgress),
      },
      {
        scale: lerp(enter.scale.from, enter.scale.to, clampedProgress),
      },
    ],
  };
};

/**
 * Calculate shared axis X exiting animation values
 *
 * @param progress - Animation progress (0 = start, 1 = end)
 * @returns Style object with opacity and transform
 */
export const sharedAxisXExit = (progress: number): SharedAxisXStyle => {
  'worklet';

  const { exit } = SHARED_AXIS_CONFIG;
  const clampedProgress = clamp(progress, 0, 1);

  return {
    opacity: lerp(exit.opacity.from, exit.opacity.to, clampedProgress),
    transform: [
      {
        translateX: lerp(exit.translateX.from, exit.translateX.to, clampedProgress),
      },
      {
        scale: lerp(exit.scale.from, exit.scale.to, clampedProgress),
      },
    ],
  };
};

/**
 * Get shared axis transition config for use with withTiming
 *
 * @param direction - 'forward' for push, 'backward' for pop
 * @returns Timing configuration object
 */
export const getSharedAxisTimingConfig = (direction: 'forward' | 'backward' = 'forward') => ({
  duration: SHARED_AXIS_CONFIG.duration,
  easing: direction === 'forward' ? EASE_OUT_QUINT : EASE_IN_QUINT,
});

// ============================================================================
// REVERSE TRANSITIONS (for back navigation)
// ============================================================================

/**
 * Calculate reverse shared axis X entering animation (coming back)
 * Screen slides in from left instead of right
 */
export const sharedAxisXEnterReverse = (progress: number): SharedAxisXStyle => {
  'worklet';

  const clampedProgress = clamp(progress, 0, 1);

  return {
    opacity: lerp(0, 1, clampedProgress),
    transform: [
      {
        translateX: lerp(-40, 0, clampedProgress), // Come from left
      },
      {
        scale: lerp(1.02, 1.0, clampedProgress), // Slight scale down to normal
      },
    ],
  };
};

/**
 * Calculate reverse shared axis X exiting animation (going back)
 * Screen slides out to right instead of left
 */
export const sharedAxisXExitReverse = (progress: number): SharedAxisXStyle => {
  'worklet';

  const clampedProgress = clamp(progress, 0, 1);

  return {
    opacity: lerp(1, 0, clampedProgress),
    transform: [
      {
        translateX: lerp(0, 80, clampedProgress), // Exit to right
      },
      {
        scale: lerp(1.0, 0.92, clampedProgress), // Scale down as it exits
      },
    ],
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  enter: sharedAxisXEnter,
  exit: sharedAxisXExit,
  enterReverse: sharedAxisXEnterReverse,
  exitReverse: sharedAxisXExitReverse,
  config: SHARED_AXIS_CONFIG,
  timing: getSharedAxisTimingConfig,
  easing: {
    enter: EASE_OUT_QUINT,
    exit: EASE_IN_QUINT,
    ios: EASE_IOS,
  },
};
