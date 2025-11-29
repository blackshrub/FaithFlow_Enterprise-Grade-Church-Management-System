/**
 * Premium Motion v5 – Hybrid Apple + Material Shared Axis Motion System
 * Bentley-grade luxury transitions for 2025 apps
 *
 * Features:
 * - Apple + Material hybrid curves
 * - Phased motion engine (PRIME → MOVE → SETTLE)
 * - Shared axis tab transitions
 * - Zero blink, zero snap, pure liquid motion
 *
 * Usage:
 * import { PMotionV5, TAB_TRANSITION_V5, phasedEnter } from '@/components/motion/premium-motion';
 *
 * <Animated.View entering={PMotionV5.fadeEnter}>
 *   <Content />
 * </Animated.View>
 */

import {
  FadeIn,
  FadeOut,
  FadeInUp,
  FadeInDown,
  FadeOutDown,
  FadeOutUp,
  SlideInRight,
  SlideInLeft,
  SlideOutLeft,
  SlideOutRight,
  Easing,
  withTiming,
  withSpring,
  makeMutable,
} from 'react-native-reanimated';

// ============================================================================
// GLOBAL MOTION DELAY (defined here to avoid circular dependency with hoc/)
// ============================================================================

/**
 * Global motion delay shared value.
 * Used to coordinate animations across the app.
 * Child animations can read this to delay their start.
 */
export const GLOBAL_MOTION_DELAY = makeMutable(0);

/**
 * JS-side variable for reading global motion delay during render.
 * This avoids the Reanimated warning about reading shared values during render.
 * Updated whenever GLOBAL_MOTION_DELAY changes.
 */
let _globalMotionDelayJS = 0;

/**
 * Get the current global motion delay value for use during React render.
 * This is safe to call during component render (no Reanimated warning).
 */
export const getGlobalMotionDelay = (): number => _globalMotionDelayJS;

/**
 * Set both the shared value and JS-side variable.
 * Call this instead of directly setting GLOBAL_MOTION_DELAY.value
 */
export const setGlobalMotionDelay = (value: number): void => {
  _globalMotionDelayJS = value;
  GLOBAL_MOTION_DELAY.value = value;
};

// ============================================================================
// VISITED SCREENS TRACKER (Skip entering animations on revisit)
// ============================================================================

/**
 * Track which screens have been visited to skip entering animations on revisit.
 * This prevents animations from replaying when navigating back to a screen.
 */
const visitedScreens = new Set<string>();

/**
 * Check if a screen has been visited before.
 * If not, marks it as visited and returns false (should animate).
 * If yes, returns true (should skip animation).
 */
export const shouldSkipEnteringAnimation = (screenKey: string): boolean => {
  if (visitedScreens.has(screenKey)) {
    return true; // Already visited, skip animation
  }
  visitedScreens.add(screenKey);
  return false; // First visit, play animation
};

/**
 * Clear a specific screen from visited (force animation on next visit)
 */
export const clearVisitedScreen = (screenKey: string): void => {
  visitedScreens.delete(screenKey);
};

/**
 * Clear all visited screens (e.g., on logout)
 */
export const clearAllVisitedScreens = (): void => {
  visitedScreens.clear();
};

// ============================================================================
// TIMING PRESETS (v5)
// ============================================================================

/** Standard durations in ms - v5 refined timings */
export const MOTION_DURATION = {
  ultraFast: 90,
  fast: 140,
  normal: 220,
  slow: 300,
  xslow: 420,
  sharedAxis: 260,
  // Legacy aliases
  instant: 100,
  emphasis: 400,
} as const;

// ============================================================================
// EASING CURVES (v5)
// ============================================================================

/** Apple + Material hybrid curves */
export const MOTION_EASING = {
  // v5 Primary curves
  /** Apple iOS standard - silky smooth */
  ios: Easing.bezier(0.25, 0.1, 0.25, 1),
  /** Material You standard */
  material: Easing.bezier(0.4, 0, 0.2, 1),
  /** Accelerate - for exiting elements */
  accelerate: Easing.bezier(0.4, 0, 1, 1),
  /** Decelerate - for entering elements */
  decelerate: Easing.bezier(0, 0, 0.2, 1),
  /** Facebook/Instagram tab transition */
  facebookTab: Easing.bezier(0.22, 1, 0.36, 1),
  /** Smooth end - natural landing */
  smoothEnd: Easing.out(Easing.cubic),

  // Legacy aliases (v2 compatibility)
  standard: Easing.bezier(0.4, 0.0, 0.2, 1),
  sharp: Easing.bezier(0.4, 0.0, 0.6, 1),
  smoothOut: Easing.out(Easing.cubic),
  smoothIn: Easing.in(Easing.cubic),
} as const;

// ============================================================================
// SPRING CONFIGURATIONS (v5)
// ============================================================================

/** Spring configurations - v5 adaptive springs */
export const MOTION_SPRING = {
  /** Shared axis spring - balanced */
  shared: {
    damping: 22,
    stiffness: 180,
    mass: 0.7,
  },
  /** Overshoot spring - playful bounce */
  overshoot: {
    damping: 14,
    stiffness: 210,
    mass: 0.6,
  },
  // Legacy springs (v2 compatibility)
  gentle: { damping: 20, stiffness: 120, mass: 1 },
  responsive: { damping: 16, stiffness: 180, mass: 0.8 },
  bouncy: { damping: 12, stiffness: 200, mass: 0.6 },
} as const;

// ============================================================================
// PHASED MOTION ENGINE (v5)
// ============================================================================
//
// Phase 1: PRIME (opacity only - instant visibility)
// Phase 2: MOVE (translateX + scale - spatial movement)
// Phase 3: SETTLE (spring - natural landing)
//
// This avoids the classic "blink then animate" problem.
//

/**
 * Phased enter animation - liquid motion entry
 * @param direction - Slide direction (positive = from right, negative = from left)
 */
export const phasedEnter = (direction: number) => {
  return {
    initialValues: {
      opacity: 0,
      transform: [
        { translateX: direction },
        { scale: 0.96 },
      ],
    },
    animations: {
      opacity: withTiming(1, {
        duration: 120,
        easing: MOTION_EASING.decelerate,
      }),
      transform: [
        {
          translateX: withTiming(0, {
            duration: MOTION_DURATION.sharedAxis,
            easing: MOTION_EASING.ios,
          }),
        },
        {
          scale: withSpring(1, MOTION_SPRING.overshoot),
        },
      ],
    },
  };
};

/**
 * Phased exit animation - graceful departure
 * @param direction - Slide direction (positive = exit right, negative = exit left)
 */
export const phasedExit = (direction: number) => {
  return {
    initialValues: {
      opacity: 1,
      transform: [{ translateX: 0 }, { scale: 1 }],
    },
    animations: {
      opacity: withTiming(0, {
        duration: 160,
        easing: MOTION_EASING.accelerate,
      }),
      transform: [
        {
          translateX: withTiming(direction * 0.6, {
            duration: 200,
            easing: MOTION_EASING.accelerate,
          }),
        },
        {
          scale: withTiming(0.97, {
            duration: 160,
            easing: MOTION_EASING.accelerate,
          }),
        },
      ],
    },
  };
};

// ============================================================================
// TAB TRANSITION v5 – Shared Axis Upgrade
// ============================================================================
//
// Apple + Material You "container transform" hybrid.
// Translation + Scale + Opacity + Depth.
//
// Provides Bentley-grade smooth transitions between tabs.
// Zero blink. Zero snap. Pure liquid motion.
//

/** Tab transition v5 configuration */
export const TAB_TRANSITION_V5 = {
  duration: MOTION_DURATION.sharedAxis,
  easing: MOTION_EASING.ios,
  translate: 26,
  scaleStart: 0.97,
  opacityStart: 0,
  opacityEnd: 1,
} as const;

/**
 * MOTION_V5 - Simplified Apple-grade screen entry
 * Clean fade + vertical slide without directional complexity
 */
export const MOTION_V5 = {
  duration: 280,
  easing: MOTION_EASING.ios,
  translateY: 10,
} as const;

/**
 * Get tab transition config for v5
 * @param direction - Slide direction (1 = right, -1 = left)
 */
export const getTabTransitionConfigV5 = (direction: number) => ({
  translateX: {
    from: direction * TAB_TRANSITION_V5.translate,
    to: 0,
    duration: TAB_TRANSITION_V5.duration,
    easing: TAB_TRANSITION_V5.easing,
  },
  scale: {
    from: TAB_TRANSITION_V5.scaleStart,
    to: 1,
    duration: TAB_TRANSITION_V5.duration + 80,
    easing: MOTION_EASING.smoothEnd,
  },
  opacity: {
    from: TAB_TRANSITION_V5.opacityStart,
    to: TAB_TRANSITION_V5.opacityEnd,
    duration: TAB_TRANSITION_V5.duration,
    easing: MOTION_EASING.decelerate,
  },
});

// Legacy v2 TAB_TRANSITION (for backward compatibility)
export const TAB_TRANSITION = {
  duration: 240,
  slideAmount: 30,
  opacity: { start: 0, end: 1 },
  easing: MOTION_EASING.facebookTab,
} as const;

export const getTabTransitionConfig = (direction: number) => ({
  translateX: {
    from: direction,
    to: 0,
    duration: TAB_TRANSITION.duration,
    easing: TAB_TRANSITION.easing,
  },
  opacity: {
    from: TAB_TRANSITION.opacity.start,
    to: TAB_TRANSITION.opacity.end,
    duration: TAB_TRANSITION.duration,
    easing: TAB_TRANSITION.easing,
  },
});

// ============================================================================
// PREMIUM MOTION v5 PRESETS
// ============================================================================

/**
 * Premium Motion v5 Presets
 * Bentley-grade animations for 2025 apps
 */
export const PMotionV5 = {
  // ---- Soft Fade + Depth ----

  /** Soft fade enter - silky smooth */
  fadeEnter: FadeIn.duration(240).easing(MOTION_EASING.ios),

  /** Soft fade exit - graceful departure */
  fadeExit: FadeOut.duration(180).easing(MOTION_EASING.accelerate),

  // ---- Shared Axis (X-axis) ----

  /**
   * Shared axis enter animation
   * @param dir - Direction in pixels
   */
  sharedAxisEnter: (dir: number) => ({
    entering: phasedEnter(dir),
  }),

  /**
   * Shared axis exit animation
   * @param dir - Direction in pixels
   */
  sharedAxisExit: (dir: number) => ({
    exiting: phasedExit(dir),
  }),

  // ---- Staggered Animations ----

  /**
   * Card stagger - smoother v5 timing
   * @param index - Item index in list
   * @param base - Base delay (default 0)
   */
  cardStagger: (index: number, base = 0) =>
    FadeIn.duration(220)
      .delay(base + index * 70)
      .easing(MOTION_EASING.decelerate),

  /**
   * Section stagger - page section entrance
   * @param i - Section index (0, 1, 2...)
   */
  sectionStagger: (i: number) =>
    FadeIn.delay(i * 90)
      .duration(300)
      .easing(MOTION_EASING.ios),

  // ---- Special Effects ----

  /** Soft scale enter - for hero content */
  softScaleEnter: FadeIn
    .duration(MOTION_DURATION.slow)
    .easing(MOTION_EASING.ios)
    .withInitialValues({
      opacity: 0,
      transform: [{ scale: 0.96 }, { translateY: 12 }],
    }),

  /** Pop in - for buttons and CTAs */
  popIn: FadeIn
    .duration(MOTION_DURATION.fast)
    .easing(MOTION_EASING.smoothEnd)
    .withInitialValues({
      opacity: 0,
      transform: [{ scale: 0.92 }],
    }),
} as const;

// ============================================================================
// LEGACY PREMIUM MOTION v2 PRESETS (Backward Compatibility)
// ============================================================================

/**
 * Premium Motion v2 Presets (Base)
 * Now uses GLOBAL_MOTION_DELAY for automatic coordination with V6 wrapper
 */
const basePMotion = {
  // ---- Basic Enter/Exit ----
  enter: FadeIn
    .duration(MOTION_DURATION.normal)
    .easing(MOTION_EASING.standard),

  exit: FadeOut
    .duration(MOTION_DURATION.fast)
    .easing(MOTION_EASING.accelerate),

  // ---- Directional Enter ----
  enterUp: FadeInUp
    .duration(MOTION_DURATION.normal)
    .easing(MOTION_EASING.decelerate),

  enterDown: FadeInDown
    .duration(MOTION_DURATION.normal)
    .easing(MOTION_EASING.decelerate),

  enterRight: SlideInRight
    .duration(MOTION_DURATION.normal)
    .easing(MOTION_EASING.decelerate),

  enterLeft: SlideInLeft
    .duration(MOTION_DURATION.normal)
    .easing(MOTION_EASING.decelerate),

  // ---- Directional Exit ----
  exitDown: FadeOutDown
    .duration(MOTION_DURATION.fast)
    .easing(MOTION_EASING.accelerate),

  exitUp: FadeOutUp
    .duration(MOTION_DURATION.fast)
    .easing(MOTION_EASING.accelerate),

  // ---- Staggered Animations (uses GLOBAL_MOTION_DELAY) ----
  /**
   * Section stagger – used for header rows, titles, etc.
   * Automatically waits for GLOBAL_MOTION_DELAY before starting
   */
  sectionStagger: (sectionIndex: number) =>
    FadeInUp
      .duration(260)
      .easing(Easing.out(Easing.cubic))
      .delay(getGlobalMotionDelay() + sectionIndex * 70),

  /**
   * Card stagger – used for lists / cards.
   * Automatically waits for GLOBAL_MOTION_DELAY before starting
   */
  cardStagger: (index: number, baseDelay = 0) =>
    FadeInUp
      .duration(280)
      .easing(Easing.out(Easing.quad))
      .delay(getGlobalMotionDelay() + baseDelay + index * 60),

  horizontalStagger: (index: number, baseDelay = 0) =>
    FadeIn
      .delay(getGlobalMotionDelay() + baseDelay + index * 80)
      .duration(MOTION_DURATION.normal)
      .easing(MOTION_EASING.decelerate),

  // ---- Special Effects (uses GLOBAL_MOTION_DELAY) ----
  /**
   * Soft featured content entry – used for hero / verse cards.
   * Automatically waits for GLOBAL_MOTION_DELAY before starting
   */
  softScaleEnter: FadeIn
    .duration(320)
    .easing(Easing.out(Easing.cubic))
    .delay(getGlobalMotionDelay())
    .withInitialValues({
      opacity: 0,
      transform: [{ scale: 0.96 }, { translateY: 16 }],
    }),

  popIn: FadeIn
    .duration(MOTION_DURATION.fast)
    .easing(MOTION_EASING.smoothOut)
    .delay(getGlobalMotionDelay())
    .withInitialValues({
      opacity: 0,
      transform: [{ scale: 0.9 }],
    }),

  subtleSlide: (direction: 'left' | 'right' = 'right') =>
    FadeIn
      .duration(MOTION_DURATION.normal)
      .easing(MOTION_EASING.decelerate)
      .delay(getGlobalMotionDelay())
      .withInitialValues({
        opacity: 0,
        transform: [{ translateX: direction === 'right' ? 12 : -12 }],
      }),

  // ---- Screen Transitions ----
  screenEnter: FadeInUp
    .duration(MOTION_DURATION.slow)
    .easing(MOTION_EASING.decelerate)
    .springify()
    .damping(18),

  screenExit: FadeOutDown
    .duration(MOTION_DURATION.normal)
    .easing(MOTION_EASING.accelerate),

  // ---- Container Animations (NO GLOBAL_MOTION_DELAY) ----
  // These are for screen containers that need to appear instantly with the wrapper

  /**
   * Header fade – instant fade for header gradient wrapper
   * Prevents 1-frame white flash when LinearGradient mounts
   * Does NOT use GLOBAL_MOTION_DELAY – appears with screen wrapper
   */
  headerFade: FadeIn
    .duration(MOTION_DURATION.fast)
    .easing(MOTION_EASING.ios),

  /**
   * Screen fade in – for ScrollView/FlatList containers
   * Prevents blank first frame on mount
   * Does NOT use GLOBAL_MOTION_DELAY – appears with screen wrapper
   */
  screenFadeIn: FadeIn
    .duration(MOTION_DURATION.normal)
    .easing(MOTION_EASING.ios),
};

// ============================================================================
// PREMIUM MOTION V8 – SHARED AXIS PRESETS
// ============================================================================

/**
 * Premium Motion V8 - Extended with Material Design 3 Shared Axis transitions
 *
 * Shared Axis X: Horizontal tab/page transitions
 * Shared Axis Y: Vertical modal/sheet transitions
 * Shared Axis Z: Depth-based feature navigation
 */
export const PMotion = {
  ...basePMotion,

  // ============================================================================
  // SHARED AXIS X (Tabs / Horizontal Transitions)
  // ============================================================================

  /** Forward horizontal enter (navigating to next tab) */
  sharedAxisXForward: FadeIn
    .duration(240)
    .easing(Easing.out(Easing.cubic)),

  /** Backward horizontal enter (navigating to previous tab) */
  sharedAxisXBackward: FadeIn
    .duration(240)
    .easing(Easing.out(Easing.cubic)),

  /** Forward horizontal exit (exiting to next tab) */
  sharedAxisXExitForward: SlideOutLeft
    .duration(220)
    .easing(Easing.out(Easing.cubic)),

  /** Backward horizontal exit (exiting to previous tab) */
  sharedAxisXExitBackward: SlideOutRight
    .duration(220)
    .easing(Easing.out(Easing.cubic)),

  // ============================================================================
  // SHARED AXIS Y (Modals / Sheets / Vertical Transitions)
  // ============================================================================

  /** Modal/sheet enter animation (from bottom with scale) */
  sharedAxisYEnter: FadeIn
    .duration(260)
    .easing(Easing.out(Easing.cubic))
    .withInitialValues({
      opacity: 0,
      transform: [{ translateY: 40 }, { scale: 0.96 }],
    }),

  /** Modal/sheet exit animation */
  sharedAxisYExit: FadeOut
    .duration(220)
    .easing(Easing.out(Easing.cubic)),

  // ============================================================================
  // SHARED AXIS Z (Depth / Feature Navigation)
  // ============================================================================

  /** Forward depth enter (zooming in to feature) */
  sharedAxisZForward: FadeIn
    .duration(260)
    .easing(Easing.out(Easing.cubic))
    .withInitialValues({
      opacity: 0,
      transform: [{ scale: 0.96 }],
    }),

  /** Backward depth enter (zooming out from feature) */
  sharedAxisZBackward: FadeIn
    .duration(260)
    .easing(Easing.out(Easing.cubic))
    .withInitialValues({
      opacity: 0,
      transform: [{ scale: 1.02 }],
    }),

  /** Forward depth exit */
  sharedAxisZExitForward: FadeOut
    .duration(220)
    .easing(Easing.out(Easing.cubic)),

  /** Backward depth exit */
  sharedAxisZExitBackward: FadeOut
    .duration(220)
    .easing(Easing.out(Easing.cubic)),
};

// ============================================================================
// PREMIUM MOTION V9 – APPLE-FRIENDLY SHARED AXIS
// ============================================================================

/**
 * V9 Easing Curves - Apple-friendly cubic-bezier
 * These curves provide smooth, natural motion on iOS and Android
 */
export const V9_EASING = {
  /** Apple-style entering curve - smooth deceleration */
  entering: Easing.bezier(0.21, 0.0, 0.0, 1),
  /** Apple-style exiting curve - quick acceleration */
  exiting: Easing.bezier(0.3, 0, 0.8, 0.15),
  /** Standard smooth curve */
  smooth: Easing.bezier(0.25, 0.1, 0.25, 1),
} as const;

/** V9 timing constants */
export const V9_DURATION = {
  /** Standard shared axis duration */
  sharedAxis: 260,
  /** Fast fade through */
  fadeThrough: 200,
  /** Collapse/expand */
  collapse: 180,
} as const;

/**
 * Premium Motion V9 Presets
 *
 * Apple-friendly transitions with refined curves:
 * - Shared Axis X: Horizontal tab/page transitions
 * - Shared Axis Y: Vertical modal/sheet transitions
 * - Fade Through: Fast cross-fade between content
 */
export const PMotionV9 = {
  // ============================================================================
  // SHARED AXIS X (Tabs / Horizontal Transitions) - V9
  // ============================================================================

  /** Forward horizontal enter (navigating to next tab) - Apple curve */
  sharedAxisXForward: FadeIn
    .duration(V9_DURATION.sharedAxis)
    .easing(V9_EASING.entering)
    .withInitialValues({
      opacity: 0,
      transform: [{ translateX: 30 }, { scale: 0.97 }],
    }),

  /** Backward horizontal enter (navigating to previous tab) - Apple curve */
  sharedAxisXBackward: FadeIn
    .duration(V9_DURATION.sharedAxis)
    .easing(V9_EASING.entering)
    .withInitialValues({
      opacity: 0,
      transform: [{ translateX: -30 }, { scale: 0.97 }],
    }),

  /** Forward horizontal exit (exiting to next tab) - Apple curve */
  sharedAxisXExitForward: FadeOut
    .duration(V9_DURATION.sharedAxis - 40)
    .easing(V9_EASING.exiting)
    .withInitialValues({
      opacity: 1,
      transform: [{ translateX: 0 }, { scale: 1 }],
    }),

  /** Backward horizontal exit (exiting to previous tab) - Apple curve */
  sharedAxisXExitBackward: FadeOut
    .duration(V9_DURATION.sharedAxis - 40)
    .easing(V9_EASING.exiting)
    .withInitialValues({
      opacity: 1,
      transform: [{ translateX: 0 }, { scale: 1 }],
    }),

  // ============================================================================
  // SHARED AXIS Y (Modals / Sheets) - V9
  // ============================================================================

  /** Modal/sheet enter animation - Apple curve */
  sharedAxisY: FadeIn
    .duration(V9_DURATION.sharedAxis)
    .easing(V9_EASING.entering)
    .withInitialValues({
      opacity: 0,
      transform: [{ translateY: 40 }, { scale: 0.96 }],
    }),

  /** Modal/sheet exit animation - Apple curve */
  sharedAxisYExit: FadeOut
    .duration(V9_DURATION.sharedAxis - 40)
    .easing(V9_EASING.exiting),

  // ============================================================================
  // FADE THROUGH (Fast Cross-Fade) - V9
  // ============================================================================

  /** Fast fade through - for content swapping */
  fadeThrough: FadeIn
    .duration(V9_DURATION.fadeThrough)
    .easing(V9_EASING.smooth),

  /** Fast fade through exit */
  fadeThroughExit: FadeOut
    .duration(V9_DURATION.fadeThrough - 40)
    .easing(V9_EASING.exiting),

  // ============================================================================
  // COLLAPSE / EXPAND - V9
  // ============================================================================

  /** Fast collapse animation */
  collapse: FadeOut
    .duration(V9_DURATION.collapse)
    .easing(V9_EASING.exiting),

  /** Fast expand animation */
  expand: FadeIn
    .duration(V9_DURATION.collapse)
    .easing(V9_EASING.entering),

  // ============================================================================
  // SCREEN TRANSITIONS - V9
  // ============================================================================

  /** Screen enter with Apple curve */
  screenEnterV9: FadeIn
    .duration(V9_DURATION.sharedAxis)
    .easing(V9_EASING.entering)
    .withInitialValues({
      opacity: 0,
      transform: [{ scale: 0.98 }],
    }),

  /** Screen exit with Apple curve */
  screenExitV9: FadeOut
    .duration(V9_DURATION.sharedAxis - 60)
    .easing(V9_EASING.exiting),

  // ============================================================================
  // DIRECTION-BASED HELPERS - V9
  // ============================================================================

  /**
   * Shared Axis X Enter - direction-aware
   * @param direction 'forward' | 'backward'
   */
  sharedAxisXEnter: (direction: 'forward' | 'backward') =>
    direction === 'forward'
      ? FadeIn
          .duration(V9_DURATION.sharedAxis)
          .easing(V9_EASING.entering)
          .withInitialValues({
            opacity: 0,
            transform: [{ translateX: 30 }, { scale: 0.97 }],
          })
      : FadeIn
          .duration(V9_DURATION.sharedAxis)
          .easing(V9_EASING.entering)
          .withInitialValues({
            opacity: 0,
            transform: [{ translateX: -30 }, { scale: 0.97 }],
          }),

  /**
   * Shared Axis X Exit - direction-aware
   * @param _direction 'forward' | 'backward' (kept for API consistency)
   */
  sharedAxisXExit: (_direction: 'forward' | 'backward') =>
    FadeOut
      .duration(V9_DURATION.sharedAxis - 40)
      .easing(V9_EASING.exiting)
      .withInitialValues({
        opacity: 1,
        transform: [{ translateX: 0 }, { scale: 1 }],
      }),
};

// ============================================================================
// TIMING HELPERS
// ============================================================================

/** Create a standard timing animation */
export const standardTiming = (
  value: number,
  duration = MOTION_DURATION.normal
) =>
  withTiming(value, {
    duration,
    easing: MOTION_EASING.standard,
  });

/** Create a decelerate timing animation (for entering) */
export const decelerateTiming = (
  value: number,
  duration = MOTION_DURATION.normal
) =>
  withTiming(value, {
    duration,
    easing: MOTION_EASING.decelerate,
  });

/** Create an accelerate timing animation (for exiting) */
export const accelerateTiming = (
  value: number,
  duration = MOTION_DURATION.fast
) =>
  withTiming(value, {
    duration,
    easing: MOTION_EASING.accelerate,
  });

/** Create a gentle spring animation */
export const gentleSpring = (value: number) =>
  withSpring(value, MOTION_SPRING.gentle);

/** Create a responsive spring animation */
export const responsiveSpring = (value: number) =>
  withSpring(value, MOTION_SPRING.responsive);

/** Create a v5 shared spring animation */
export const sharedSpring = (value: number) =>
  withSpring(value, MOTION_SPRING.shared);

/** Create a v5 overshoot spring animation */
export const overshootSpring = (value: number) =>
  withSpring(value, MOTION_SPRING.overshoot);

// ============================================================================
// iOS-STYLE TIMING (v5)
// ============================================================================

/** Create an iOS-style timing animation */
export const iosTiming = (
  value: number,
  duration = MOTION_DURATION.sharedAxis
) =>
  withTiming(value, {
    duration,
    easing: MOTION_EASING.ios,
  });

// ============================================================================
// PREMIUM MOTION V10 ULTRA – PRODUCTION-GRADE MOTION SYSTEM
// ============================================================================

/**
 * V10 Easing Curves - Apple-friendly cubic-bezier
 * Refined curves for silky smooth transitions
 */
export const V10_EASING = {
  /** Apple-style entering curve - smooth deceleration */
  entering: Easing.bezier(0.21, 0.0, 0.0, 1),
  /** Apple-style exiting curve - quick acceleration */
  exiting: Easing.bezier(0.3, 0, 0.8, 0.15),
  /** Standard smooth curve */
  smooth: Easing.bezier(0.25, 0.1, 0.25, 1),
  /** iOS spring-like curve */
  spring: Easing.bezier(0.175, 0.885, 0.32, 1.275),
  /** Material You emphasized */
  emphasized: Easing.bezier(0.2, 0.0, 0.0, 1.0),
} as const;

/** V10 timing constants */
export const V10_DURATION = {
  /** Standard shared axis duration */
  sharedAxisX: 260,
  sharedAxisY: 280,
  /** Fast fade through */
  fadeThrough: 200,
  /** Slide lift (depth) */
  slideLift: 240,
  /** Collapse/expand */
  collapse: 180,
  /** Ultra fast (velocity-aware rapid nav) */
  ultraFast: 120,
  /** Slow emphasis */
  emphasis: 320,
} as const;

/** V10 configuration constants */
export const V10_CONFIG = {
  /** Initial scale for fade through */
  initialScale: 0.98,
  /** Shared Axis X initial translateX */
  translateX: 30,
  /** Shared Axis X scale */
  sharedAxisXScale: 0.97,
  /** Shared Axis Y initial translateY */
  translateY: 40,
  /** Shared Axis Y scale */
  sharedAxisYScale: 0.96,
  /** Slide lift initial scale */
  slideLiftScale: 0.94,
  /** Modal parallax translateY */
  modalParallaxY: 24,
} as const;

/**
 * Premium Motion V10 Presets
 *
 * Production-grade transitions with:
 * - Velocity-aware animation support
 * - Low-performance device optimization
 * - Interrupt-friendly design
 * - Modal parallax effects
 */
export const PMotionV10 = {
  // ============================================================================
  // FADE THROUGH (Default Screen Transition)
  // ============================================================================

  /** Fade through enter - fast cross-fade with subtle scale */
  fadeThroughEnter: FadeIn
    .duration(V10_DURATION.fadeThrough)
    .easing(V10_EASING.entering)
    .withInitialValues({
      opacity: 0,
      transform: [{ scale: V10_CONFIG.initialScale }],
    }),

  /** Fade through exit */
  fadeThroughExit: FadeOut
    .duration(V10_DURATION.fadeThrough - 40)
    .easing(V10_EASING.exiting),

  // ============================================================================
  // SHARED AXIS X (Horizontal Transitions)
  // ============================================================================

  /** Forward horizontal enter (navigating to next tab) */
  sharedAxisXForward: FadeIn
    .duration(V10_DURATION.sharedAxisX)
    .easing(V10_EASING.entering)
    .withInitialValues({
      opacity: 0,
      transform: [{ translateX: V10_CONFIG.translateX }, { scale: V10_CONFIG.sharedAxisXScale }],
    }),

  /** Backward horizontal enter (navigating to previous tab) */
  sharedAxisXBackward: FadeIn
    .duration(V10_DURATION.sharedAxisX)
    .easing(V10_EASING.entering)
    .withInitialValues({
      opacity: 0,
      transform: [{ translateX: -V10_CONFIG.translateX }, { scale: V10_CONFIG.sharedAxisXScale }],
    }),

  /** Shared Axis X exit */
  sharedAxisXExit: FadeOut
    .duration(V10_DURATION.sharedAxisX - 40)
    .easing(V10_EASING.exiting),

  /** Shared Axis X exit forward (exiting to next tab - slide left) */
  sharedAxisXExitForward: FadeOut
    .duration(V10_DURATION.sharedAxisX - 40)
    .easing(V10_EASING.exiting)
    .withInitialValues({
      opacity: 1,
      transform: [{ translateX: 0 }, { scale: 1 }],
    }),

  /** Shared Axis X exit backward (exiting to previous tab - slide right) */
  sharedAxisXExitBackward: FadeOut
    .duration(V10_DURATION.sharedAxisX - 40)
    .easing(V10_EASING.exiting)
    .withInitialValues({
      opacity: 1,
      transform: [{ translateX: 0 }, { scale: 1 }],
    }),

  /**
   * Direction-aware Shared Axis X Enter
   * @param direction 'forward' | 'backward'
   */
  sharedAxisXEnter: (direction: 'forward' | 'backward') =>
    direction === 'forward'
      ? FadeIn
          .duration(V10_DURATION.sharedAxisX)
          .easing(V10_EASING.entering)
          .withInitialValues({
            opacity: 0,
            transform: [{ translateX: V10_CONFIG.translateX }, { scale: V10_CONFIG.sharedAxisXScale }],
          })
      : FadeIn
          .duration(V10_DURATION.sharedAxisX)
          .easing(V10_EASING.entering)
          .withInitialValues({
            opacity: 0,
            transform: [{ translateX: -V10_CONFIG.translateX }, { scale: V10_CONFIG.sharedAxisXScale }],
          }),

  // ============================================================================
  // SHARED AXIS Y (Vertical Transitions / Modals)
  // ============================================================================

  /** Modal/sheet enter animation */
  sharedAxisYEnter: FadeIn
    .duration(V10_DURATION.sharedAxisY)
    .easing(V10_EASING.entering)
    .withInitialValues({
      opacity: 0,
      transform: [{ translateY: V10_CONFIG.translateY }, { scale: V10_CONFIG.sharedAxisYScale }],
    }),

  /** Modal/sheet exit animation */
  sharedAxisYExit: FadeOut
    .duration(V10_DURATION.sharedAxisY - 40)
    .easing(V10_EASING.exiting),

  // ============================================================================
  // SLIDE LIFT (Shared Axis Z / Depth Transitions)
  // ============================================================================

  /** Slide lift enter - zoom in effect */
  slideLiftEnter: FadeIn
    .duration(V10_DURATION.slideLift)
    .easing(V10_EASING.entering)
    .withInitialValues({
      opacity: 0,
      transform: [{ scale: V10_CONFIG.slideLiftScale }],
    }),

  /** Slide lift exit - zoom out effect */
  slideLiftExit: FadeOut
    .duration(V10_DURATION.slideLift - 40)
    .easing(V10_EASING.exiting)
    .withInitialValues({
      opacity: 1,
      transform: [{ scale: 1 }],
    }),

  // ============================================================================
  // STAGGERED ANIMATIONS (Uses GLOBAL_MOTION_DELAY)
  // ============================================================================

  /**
   * Section stagger - for page sections
   * @param index Section index (0, 1, 2...)
   */
  sectionStagger: (index: number) =>
    FadeInUp
      .duration(260)
      .easing(V10_EASING.entering)
      .delay(getGlobalMotionDelay() + index * 60),

  /**
   * Card stagger - for lists/cards
   * @param index Item index
   * @param baseDelay Additional base delay
   */
  cardStagger: (index: number, baseDelay = 0) =>
    FadeInUp
      .duration(280)
      .easing(V10_EASING.entering)
      .delay(getGlobalMotionDelay() + baseDelay + index * 50),

  /**
   * Horizontal stagger - for horizontal scrolling items
   * @param index Item index
   * @param baseDelay Additional base delay
   */
  horizontalStagger: (index: number, baseDelay = 0) =>
    FadeIn
      .duration(220)
      .easing(V10_EASING.entering)
      .delay(getGlobalMotionDelay() + baseDelay + index * 70),

  // ============================================================================
  // CONTAINER ANIMATIONS (No GLOBAL_MOTION_DELAY)
  // ============================================================================

  /** Header fade - instant for gradient headers */
  headerFade: FadeIn
    .duration(140)
    .easing(V10_EASING.smooth),

  /** Screen fade in - for ScrollView/FlatList containers */
  screenFadeIn: FadeIn
    .duration(200)
    .easing(V10_EASING.smooth),

  /** Screen fade out - for exiting screens */
  screenFadeOut: FadeOut
    .duration(160)
    .easing(V10_EASING.exiting),

  // ============================================================================
  // SHARED AXIS X (Nested Object API)
  // ============================================================================

  /** Shared Axis X object API for step transitions */
  sharedAxisX: {
    enter: FadeIn
      .duration(V10_DURATION.sharedAxisX)
      .easing(V10_EASING.entering)
      .withInitialValues({
        opacity: 0,
        transform: [{ translateX: V10_CONFIG.translateX }, { scale: V10_CONFIG.sharedAxisXScale }],
      }),
    exit: FadeOut
      .duration(V10_DURATION.sharedAxisX - 40)
      .easing(V10_EASING.exiting),
  },

  // ============================================================================
  // MODAL PARALLAX
  // ============================================================================

  /** Modal parallax enter - subtle lift effect */
  modalParallaxEnter: FadeIn
    .duration(V10_DURATION.sharedAxisY)
    .easing(V10_EASING.spring)
    .withInitialValues({
      opacity: 0,
      transform: [{ translateY: V10_CONFIG.modalParallaxY }, { scale: 0.98 }],
    }),

  /** Modal parallax exit */
  modalParallaxExit: FadeOut
    .duration(V10_DURATION.sharedAxisY - 60)
    .easing(V10_EASING.exiting),

  // ============================================================================
  // VELOCITY-AWARE PRESETS
  // ============================================================================

  /** Ultra fast fade (for rapid navigation) */
  ultraFastFade: FadeIn
    .duration(V10_DURATION.ultraFast)
    .easing(V10_EASING.smooth),

  /** Ultra fast exit */
  ultraFastExit: FadeOut
    .duration(V10_DURATION.ultraFast - 20)
    .easing(V10_EASING.exiting),

  // ============================================================================
  // SPECIAL EFFECTS
  // ============================================================================

  /** Soft scale enter - for hero content */
  softScaleEnter: FadeIn
    .duration(V10_DURATION.emphasis)
    .easing(V10_EASING.entering)
    .delay(getGlobalMotionDelay())
    .withInitialValues({
      opacity: 0,
      transform: [{ scale: 0.96 }, { translateY: 12 }],
    }),

  /** Pop in - for buttons and CTAs */
  popIn: FadeIn
    .duration(140)
    .easing(V10_EASING.spring)
    .delay(getGlobalMotionDelay())
    .withInitialValues({
      opacity: 0,
      transform: [{ scale: 0.9 }],
    }),

  /** Subtle slide - directional reveal */
  subtleSlide: (direction: 'left' | 'right' = 'right') =>
    FadeIn
      .duration(220)
      .easing(V10_EASING.entering)
      .delay(getGlobalMotionDelay())
      .withInitialValues({
        opacity: 0,
        transform: [{ translateX: direction === 'right' ? 12 : -12 }],
      }),

  // ============================================================================
  // MICRO MOTION PRESETS (V10.1)
  // ============================================================================

  /**
   * Screen micro enter - subtle entrance for screen content
   * Minimal movement for faster perceived loading
   */
  screenMicroEnter: FadeIn
    .duration(180)
    .easing(V10_EASING.entering)
    .withInitialValues({
      opacity: 0,
      transform: [{ translateY: 6 }, { scale: 0.995 }],
    }),

  /**
   * Screen micro exit - fast exit for screen transitions
   */
  screenMicroExit: FadeOut
    .duration(120)
    .easing(V10_EASING.exiting),

  /**
   * Shared Axis X Enhanced - refined horizontal transition
   * Includes subtle Y parallax for depth perception
   * @param direction 'forward' | 'backward'
   */
  sharedAxisXEnhanced: (direction: 'forward' | 'backward') =>
    FadeIn
      .duration(V10_DURATION.sharedAxisX)
      .easing(V10_EASING.emphasized)
      .withInitialValues({
        opacity: 0,
        transform: [
          { translateX: direction === 'forward' ? 24 : -24 },
          { translateY: 4 },
          { scale: 0.98 },
        ],
      }),

  /**
   * Shared Axis X Enhanced Exit
   * @param direction 'forward' | 'backward'
   */
  sharedAxisXEnhancedExit: (direction: 'forward' | 'backward') =>
    FadeOut
      .duration(V10_DURATION.sharedAxisX - 60)
      .easing(V10_EASING.exiting)
      .withInitialValues({
        opacity: 1,
        transform: [
          { translateX: 0 },
          { translateY: 0 },
          { scale: 1 },
        ],
      }),

  /**
   * List item stagger - optimized for FlatList/ScrollView items
   * Shorter delay intervals for snappy list rendering
   * @param index Item index
   * @param baseDelay Optional base delay offset
   */
  listItemStagger: (index: number, baseDelay = 0) =>
    FadeIn
      .duration(200)
      .easing(V10_EASING.entering)
      .delay(getGlobalMotionDelay() + baseDelay + index * 35)
      .withInitialValues({
        opacity: 0,
        transform: [{ translateY: 8 }],
      }),

  /**
   * List item stagger with scale - for cards/tiles
   * @param index Item index
   * @param baseDelay Optional base delay offset
   */
  listItemStaggerScale: (index: number, baseDelay = 0) =>
    FadeIn
      .duration(220)
      .easing(V10_EASING.entering)
      .delay(getGlobalMotionDelay() + baseDelay + index * 40)
      .withInitialValues({
        opacity: 0,
        transform: [{ translateY: 10 }, { scale: 0.97 }],
      }),

  /**
   * Quick fade - ultra fast reveal for rapid interactions
   */
  quickFade: FadeIn
    .duration(100)
    .easing(V10_EASING.smooth),

  /**
   * Quick fade exit
   */
  quickFadeExit: FadeOut
    .duration(80)
    .easing(V10_EASING.exiting),
};

// Export default
export default PMotionV5;
