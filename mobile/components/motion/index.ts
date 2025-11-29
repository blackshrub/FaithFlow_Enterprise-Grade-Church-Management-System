/**
 * Premium Motion System Exports
 *
 * V5: Premium Motion presets (PMotion, PMotionV5)
 * V6: Zero-blink tab wrapper (withPremiumMotionV6)
 * V7: Material Shared Axis X transitions
 */

// V5 Premium Motion Presets
export {
  PMotion,
  PMotionV5,
  PMotionV9,
  PMotionV10,
  V9_EASING,
  V9_DURATION,
  V10_EASING,
  V10_DURATION,
  V10_CONFIG,
  MOTION_DURATION,
  MOTION_EASING,
  MOTION_SPRING,
  TAB_TRANSITION,
  TAB_TRANSITION_V5,
  getTabTransitionConfig,
  getTabTransitionConfigV5,
  phasedEnter,
  phasedExit,
  standardTiming,
  decelerateTiming,
  accelerateTiming,
  gentleSpring,
  responsiveSpring,
  sharedSpring,
  overshootSpring,
  iosTiming,
} from './premium-motion';
export { default as PremiumMotion } from './premium-motion';

// V7 Shared Axis X Transitions
export {
  sharedAxisXEnter,
  sharedAxisXExit,
  sharedAxisXEnterReverse,
  sharedAxisXExitReverse,
  getSharedAxisTimingConfig,
  SHARED_AXIS_CONFIG,
  EASE_OUT_QUINT,
  EASE_IN_QUINT,
  EASE_IOS,
  lerp,
  clamp,
} from './sharedAxisX';
export type { SharedAxisXStyle, TransformItem } from './sharedAxisX';
export { default as SharedAxisX } from './sharedAxisX';

// V7 Page Transition Component
export {
  PageTransition,
  PageTransitionInstant,
  PageTransitionControlled,
} from './PageTransition';
export type { PageTransitionProps, PageTransitionControlledProps } from './PageTransition';
export { default as PageTransitionDefault } from './PageTransition';
