/**
 * Global Animation Layout Definitions
 *
 * Centralized animation presets for consistent motion across all screens.
 * Import these instead of defining animations inline in screens.
 *
 * Based on Material Design 3 motion principles:
 * - Shared Axis transitions for navigation
 * - Container transforms for expanding elements
 * - Fade through for unrelated content changes
 */

import {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  SlideInLeft,
  SlideOutRight,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  Layout,
  FadeInDown,
  FadeInUp,
  FadeOutUp,
  FadeOutDown,
} from 'react-native-reanimated';

// =============================================================================
// TIMING CONSTANTS
// =============================================================================

export const timing = {
  instant: 0,
  fast: 150,
  normal: 200,
  medium: 250,
  slow: 350,
  emphasize: 500,
} as const;

export const springConfig = {
  snappy: { damping: 20, stiffness: 300 },
  smooth: { damping: 15, stiffness: 150 },
  bouncy: { damping: 10, stiffness: 100 },
} as const;

// =============================================================================
// SCREEN TRANSITIONS
// =============================================================================

/** Screen fade in - use for initial screen mount */
export const screenFadeIn = FadeIn.duration(timing.normal).easing(Easing.out(Easing.ease));

/** Screen fade out - use for screen unmount */
export const screenFadeOut = FadeOut.duration(timing.fast).easing(Easing.in(Easing.ease));

// =============================================================================
// SHARED AXIS X TRANSITIONS (Horizontal)
// =============================================================================

/** Forward navigation - content slides in from right */
export const sharedAxisXForward = SlideInRight.duration(timing.medium)
  .easing(Easing.out(Easing.cubic))
  .withInitialValues({ opacity: 0, transform: [{ translateX: 30 }] });

/** Backward navigation - content slides in from left */
export const sharedAxisXBackward = SlideInLeft.duration(timing.medium)
  .easing(Easing.out(Easing.cubic))
  .withInitialValues({ opacity: 0, transform: [{ translateX: -30 }] });

/** Exit forward - content slides out to left */
export const sharedAxisXExitForward = SlideOutLeft.duration(timing.fast)
  .easing(Easing.in(Easing.cubic));

/** Exit backward - content slides out to right */
export const sharedAxisXExitBackward = SlideOutRight.duration(timing.fast)
  .easing(Easing.in(Easing.cubic));

// =============================================================================
// SHARED AXIS Y TRANSITIONS (Vertical)
// =============================================================================

/** Content entering from bottom */
export const sharedAxisYEnter = FadeInUp.duration(timing.medium)
  .easing(Easing.out(Easing.cubic))
  .springify()
  .damping(20)
  .stiffness(200);

/** Content exiting upward */
export const sharedAxisYExit = FadeOutUp.duration(timing.fast)
  .easing(Easing.in(Easing.cubic));

/** Content entering from top */
export const sharedAxisYEnterDown = FadeInDown.duration(timing.medium)
  .easing(Easing.out(Easing.cubic));

/** Content exiting downward */
export const sharedAxisYExitDown = FadeOutDown.duration(timing.fast)
  .easing(Easing.in(Easing.cubic));

// =============================================================================
// HEADER ANIMATIONS
// =============================================================================

/** Header fade in - subtle entrance for headers */
export const headerFade = FadeIn.duration(timing.slow)
  .delay(40)
  .easing(Easing.out(Easing.ease));

/** Header fade out */
export const headerFadeOut = FadeOut.duration(timing.fast)
  .easing(Easing.in(Easing.ease));

// =============================================================================
// CARD & LIST ITEM STAGGER
// =============================================================================

/**
 * Card stagger animation - creates cascading entrance effect
 * @param index - Item index in list
 * @param baseDelay - Base delay between items (default 60ms)
 */
export const cardStagger = (index: number, baseDelay: number = 60) =>
  FadeInUp.duration(timing.medium)
    .delay(index * baseDelay)
    .easing(Easing.out(Easing.cubic))
    .springify()
    .damping(18)
    .stiffness(180);

/**
 * List item stagger - lighter animation for list items
 * @param index - Item index in list
 */
export const listItemStagger = (index: number) =>
  FadeIn.duration(timing.normal)
    .delay(Math.min(index * 40, 200)) // Cap delay at 200ms
    .easing(Easing.out(Easing.ease));

/**
 * Micro stagger for small elements
 * @param index - Element index
 * @param baseDelay - Base delay (default 30ms)
 */
export const microStagger = (index: number, baseDelay: number = 30) =>
  FadeIn.duration(timing.fast)
    .delay(index * baseDelay)
    .easing(Easing.out(Easing.ease));

// =============================================================================
// LAYOUT ANIMATIONS
// =============================================================================

/** Standard layout animation for size changes */
export const layoutSpring = Layout.springify().damping(18).stiffness(180);

/** Fast layout animation */
export const layoutFast = Layout.duration(timing.fast).easing(Easing.out(Easing.ease));

/** Delayed layout animation - prevents jarring initial layout */
export const layoutDelayed = Layout.delay(40).duration(timing.normal);

// =============================================================================
// MODAL & OVERLAY ANIMATIONS
// =============================================================================

/** Modal backdrop fade */
export const modalBackdropEnter = FadeIn.duration(timing.normal);
export const modalBackdropExit = FadeOut.duration(timing.fast);

/** Center modal scale + fade */
export const centerModalEnter = FadeIn.duration(timing.medium)
  .springify()
  .damping(20)
  .stiffness(200);

export const centerModalExit = FadeOut.duration(timing.fast)
  .easing(Easing.in(Easing.ease));

/** Bottom sheet slide up */
export const bottomSheetEnter = FadeInUp.duration(timing.medium)
  .springify()
  .damping(20)
  .stiffness(180);

export const bottomSheetExit = FadeOutDown.duration(timing.fast)
  .easing(Easing.in(Easing.ease));

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create a delayed animation
 * @param animation - Base animation
 * @param delayMs - Delay in milliseconds
 */
export const withAnimationDelay = <T extends object>(animation: T, delayMs: number) => {
  type AnimationWithDelay = T & { delay: (ms: number) => T };
  if ('delay' in animation && typeof (animation as AnimationWithDelay).delay === 'function') {
    return (animation as AnimationWithDelay).delay(delayMs);
  }
  return animation;
};

/**
 * Get timing config for withTiming
 */
export const getTimingConfig = (duration: number = timing.normal) => ({
  duration,
  easing: Easing.out(Easing.ease),
});

/**
 * Get spring config for withSpring
 */
export const getSpringConfig = (preset: keyof typeof springConfig = 'smooth') =>
  springConfig[preset];

// =============================================================================
// RE-EXPORT REANIMATED UTILITIES
// =============================================================================

export {
  withTiming,
  withSpring,
  withDelay,
  Easing,
  Layout,
};

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type TimingKey = keyof typeof timing;
export type SpringPreset = keyof typeof springConfig;
