/**
 * Interaction Constants - V6 Refinement Pack
 *
 * Unified micro-interactions across the entire app.
 * Everything feels intentional, smooth, premium, and cohesive.
 *
 * Covering:
 * - Tap & press feedback
 * - Haptic mapping (Light, Medium, Success, Error)
 * - Press visual states (opacity, scale)
 * - Animation timing curves
 * - Input field focus states
 * - Sheet & modal gesture tuning
 * - Disable states standardization
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// ==========================================================================
// HAPTIC FUNCTIONS
// ==========================================================================

export const haptics = {
  /**
   * Light tap feedback - buttons, list items, chips
   */
  tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),

  /**
   * Medium impact - destructive actions, important toggles
   */
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),

  /**
   * Soft feedback - subtle interactions
   */
  soft: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft),

  /**
   * Rigid feedback - confirmations
   */
  rigid: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid),

  /**
   * Success notification - form submissions, completed actions
   */
  success: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),

  /**
   * Error notification - validation errors, failed actions
   */
  error: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),

  /**
   * Warning notification - destructive confirmations
   */
  warning: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),

  /**
   * Selection changed - picker, stepper, slider ticks
   */
  selection: () => Haptics.selectionAsync(),
};

// ==========================================================================
// INTERACTION CONFIG
// ==========================================================================

export const interaction = {
  // =========================================================================
  // HAPTICS (re-exported for convenience)
  // =========================================================================
  haptics,

  // =========================================================================
  // PRESS FEEDBACK
  // =========================================================================
  press: {
    /** Opacity when pressed */
    opacity: 0.7,
    /** Scale when pressed (0.97 = 97%) */
    scale: 0.97,
    /** Duration of press animation in ms */
    duration: 90,
    /** Easing for press animation */
    easing: 'ease-out',
  },

  // =========================================================================
  // GESTURE CONFIG (for sheets)
  // =========================================================================
  gestures: {
    /** Velocity threshold to dismiss sheet (higher = harder to dismiss) */
    sheetDismissVelocity: 1400,
    /** Distance threshold to dismiss sheet */
    sheetDismissDistance: 120,
    /** Active offset for pan gesture */
    activeOffset: [-10, 10],
    /** Fail offset for pan gesture */
    failOffset: [-20, 20],
  },

  // =========================================================================
  // DISABLED STATE
  // =========================================================================
  /** Standard opacity for disabled elements */
  disableOpacity: 0.55,

  // =========================================================================
  // FOCUS STATES (for inputs)
  // =========================================================================
  focus: {
    shadow: {
      ios: {
        shadowColor: '#3b82f6',
        shadowOpacity: 0.25,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        borderColor: '#3b82f6',
        borderWidth: 1.5,
        elevation: 4,
      },
    },
    /** Border color when focused */
    borderColor: '#3b82f6',
    /** Border width when focused */
    borderWidth: 1.5,
    /** Scale factor for focused input (subtle) */
    scale: 1.005,
  },

  // =========================================================================
  // ANIMATION TIMINGS
  // =========================================================================
  animation: {
    /** Fast animations (90-140ms) - micro-interactions */
    fast: 140,
    /** Medium animations (200-280ms) - transitions */
    medium: 240,
    /** Slow animations (300-400ms) - complex transitions */
    slow: 320,
    /** Extra slow (400-500ms) - emphasis animations */
    extraSlow: 450,

    /** Animation curves */
    curve: {
      /** Standard Material Design curve */
      standard: {
        easing: 'ease-out',
        bezier: [0.4, 0.0, 0.2, 1],
      },
      /** Emphasized curve for important transitions */
      emphasized: {
        easing: 'cubic-bezier(0.17, 0.17, 0, 1)',
        bezier: [0.17, 0.17, 0, 1],
      },
      /** Deceleration curve for entering elements */
      decelerate: {
        easing: 'ease-out',
        bezier: [0.0, 0.0, 0.2, 1],
      },
      /** Acceleration curve for exiting elements */
      accelerate: {
        easing: 'ease-in',
        bezier: [0.4, 0.0, 1, 1],
      },
      /** iOS-like spring curve */
      spring: {
        damping: 15,
        stiffness: 150,
        mass: 1,
      },
    },
  },

  // =========================================================================
  // SCROLL CONFIG
  // =========================================================================
  scroll: {
    /** Scroll deceleration rate */
    decelerationRate: Platform.OS === 'ios' ? 'normal' : 0.985,
    /** Bounce enabled */
    bounces: true,
    /** Overscroll mode for Android */
    overScrollMode: 'always' as const,
    /** Scroll indicator insets */
    indicatorInsets: { top: 0, left: 0, bottom: 0, right: 0 },
  },

  // =========================================================================
  // MODAL/SHEET SPECIFIC
  // =========================================================================
  overlay: {
    /** Modal entry scale (0.96 = 96%) */
    modalEntryScale: 0.96,
    /** Modal entry translateY */
    modalEntryTranslateY: 40,
    /** Backdrop opacity */
    backdropOpacity: 0.45,
    /** Tap outside margin to close */
    tapOutsideMargin: 24,
  },
} as const;

// ==========================================================================
// STYLE HELPERS
// ==========================================================================

/**
 * Get pressed style for Pressable components
 */
export function getPressedStyle(pressed: boolean) {
  return pressed
    ? {
        opacity: interaction.press.opacity,
        transform: [{ scale: interaction.press.scale }],
      }
    : {};
}

/**
 * Get focus style for inputs based on platform
 */
export function getFocusStyle(focused: boolean) {
  if (!focused) return {};

  if (Platform.OS === 'ios') {
    return interaction.focus.shadow.ios;
  }

  return interaction.focus.shadow.android;
}

/**
 * Get disabled style
 */
export function getDisabledStyle(disabled: boolean) {
  return disabled ? { opacity: interaction.disableOpacity } : {};
}

// ==========================================================================
// ANIMATED VALUE CREATORS (for Reanimated)
// ==========================================================================

/**
 * Press animation config for withTiming
 */
export const PRESS_TIMING_CONFIG = {
  duration: interaction.press.duration,
};

/**
 * Medium animation config for withTiming
 */
export const MEDIUM_TIMING_CONFIG = {
  duration: interaction.animation.medium,
};

/**
 * Fast animation config for withTiming
 */
export const FAST_TIMING_CONFIG = {
  duration: interaction.animation.fast,
};

/**
 * Spring animation config for withSpring
 */
export const SPRING_CONFIG = {
  damping: interaction.animation.curve.spring.damping,
  stiffness: interaction.animation.curve.spring.stiffness,
  mass: interaction.animation.curve.spring.mass,
};

export default interaction;
