/**
 * Shared Axis Y Modal Wrapper (V8)
 *
 * Material Design 3 vertical transition for modals.
 * Uses PMotion.sharedAxisY presets for consistent animations.
 *
 * Specification:
 * - Enter: translateY 40→0, opacity 0→1, scale 0.96→1.00
 * - Exit: opacity 1→0
 * - Duration: 260ms enter, 220ms exit
 * - Backdrop: BlurView with 50% dim
 *
 * Styling: NativeWind-first with StyleSheet for absoluteFill utilities only
 *
 * FIXED: Uses single Animated.View with both entering/exiting instead of
 * conditional render (which broke exit animations because swapping components
 * doesn't trigger entering/exiting properly).
 */

import React, { useEffect, useCallback, useState, useRef } from 'react';
import { StyleSheet, Pressable, Dimensions, BackHandler } from 'react-native';
import type { ViewStyle } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { PMotion } from '../motion/premium-motion';

// ============================================================================
// CONFIGURATION
// ============================================================================

export const SHARED_AXIS_Y_CONFIG = {
  /** Backdrop configuration */
  backdrop: {
    blurIntensity: 20,
    dimOpacity: 0.5,
    fadeDuration: 200,
  },
  /** Exit animation duration */
  exitDuration: 220,
} as const;

// ============================================================================
// TYPES
// ============================================================================

export interface SharedAxisModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal content */
  children: React.ReactNode;
  /** Custom container style */
  style?: ViewStyle;
  /** Whether to close on backdrop press (default: true) */
  closeOnBackdropPress?: boolean;
  /** Whether to handle Android back button (default: true) */
  handleBackButton?: boolean;
  /** Custom animation duration */
  duration?: number;
  /** Callback when enter animation completes */
  onEnterComplete?: () => void;
  /** Callback when exit animation completes */
  onExitComplete?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function SharedAxisModal({
  visible,
  onClose,
  children,
  style,
  closeOnBackdropPress = true,
  handleBackButton = true,
  duration, // Kept for API compatibility, but PMotion presets control actual duration
  onEnterComplete,
  onExitComplete,
}: SharedAxisModalProps) {
  // Track if modal should render (allows exit animation to complete)
  const [shouldRender, setShouldRender] = useState(false);
  const exitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animated values for manual exit animation control
  const backdropOpacity = useSharedValue(0);

  // Handle visibility changes
  useEffect(() => {
    // Clear any pending exit timeout
    if (exitTimeoutRef.current) {
      clearTimeout(exitTimeoutRef.current);
      exitTimeoutRef.current = null;
    }

    if (visible) {
      // Show: immediately render, animate in
      setShouldRender(true);
      backdropOpacity.value = withTiming(1, {
        duration: SHARED_AXIS_Y_CONFIG.backdrop.fadeDuration,
        easing: Easing.out(Easing.cubic),
      });
    } else if (shouldRender) {
      // Hide: animate out, then stop rendering
      backdropOpacity.value = withTiming(0, {
        duration: SHARED_AXIS_Y_CONFIG.backdrop.fadeDuration,
        easing: Easing.in(Easing.cubic),
      });

      // Schedule removal after exit animation completes
      exitTimeoutRef.current = setTimeout(() => {
        setShouldRender(false);
        onExitComplete?.();
      }, SHARED_AXIS_Y_CONFIG.exitDuration);
    }

    return () => {
      if (exitTimeoutRef.current) {
        clearTimeout(exitTimeoutRef.current);
      }
    };
  }, [visible]);

  // Handle Android back button
  useEffect(() => {
    if (!visible || !handleBackButton) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (visible) {
        onClose();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [visible, handleBackButton, onClose]);

  // Handle animation completion callbacks
  const handleEnterAnimationComplete = useCallback(() => {
    onEnterComplete?.();
  }, [onEnterComplete]);

  // Animated backdrop style
  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  // Don't render if not visible and exit animation is complete
  if (!shouldRender) {
    return null;
  }

  return (
    <Animated.View
      className="absolute inset-0 justify-center items-center"
      style={{ zIndex: 1000 }}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {/* Backdrop with blur - uses animated opacity */}
      <Animated.View
        style={[StyleSheet.absoluteFill, backdropAnimatedStyle]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={closeOnBackdropPress ? onClose : undefined}
        >
          <BlurView
            intensity={SHARED_AXIS_Y_CONFIG.backdrop.blurIntensity}
            style={StyleSheet.absoluteFill}
            tint="dark"
          />
          <Animated.View
            className="absolute inset-0 bg-black"
            style={{ opacity: SHARED_AXIS_Y_CONFIG.backdrop.dimOpacity }}
          />
        </Pressable>
      </Animated.View>

      {/* Modal content - uses entering/exiting on mount/unmount */}
      {visible && (
        <Animated.View
          entering={PMotion.sharedAxisYEnter.withCallback((finished) => {
            'worklet';
            if (finished) {
              runOnJS(handleEnterAnimationComplete)();
            }
          })}
          exiting={PMotion.sharedAxisYExit}
          style={[{ maxWidth: SCREEN_WIDTH - 32, maxHeight: SCREEN_HEIGHT - 100 }, style]}
          pointerEvents="box-none"
        >
          {children}
        </Animated.View>
      )}
    </Animated.View>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default SharedAxisModal;
