/**
 * AnimatedPressable - V6 Interaction Refinement
 *
 * Enhanced Pressable with unified micro-interactions:
 * - Scale feedback (0.97 on press)
 * - Opacity feedback (0.7 on press)
 * - Haptic feedback (configurable)
 * - Smooth animations via Reanimated
 *
 * Drop-in replacement for Pressable with premium feel.
 */

import React, { useCallback } from 'react';
import { PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Pressable } from 'react-native';

import { interaction, haptics } from '@/constants/interaction';

// ==========================================================================
// TYPES
// ==========================================================================

export type HapticType = 'tap' | 'heavy' | 'soft' | 'success' | 'error' | 'selection' | 'none';

export interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  /** Style for the pressable */
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  /** Children */
  children: React.ReactNode;
  /** Haptic feedback type (default: 'tap') */
  haptic?: HapticType;
  /** Scale when pressed (default: 0.97) */
  pressScale?: number;
  /** Opacity when pressed (default: 0.7) */
  pressOpacity?: number;
  /** Animation duration in ms (default: 90) */
  animationDuration?: number;
  /** Whether to disable all animations (for performance) */
  disableAnimation?: boolean;
}

// ==========================================================================
// COMPONENT
// ==========================================================================

export function AnimatedPressable({
  style,
  children,
  onPressIn,
  onPressOut,
  onPress,
  haptic = 'tap',
  pressScale = interaction.press.scale,
  pressOpacity = interaction.press.opacity,
  animationDuration = interaction.press.duration,
  disableAnimation = false,
  disabled,
  ...rest
}: AnimatedPressableProps) {
  // Animation values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Handle press in
  const handlePressIn = useCallback(
    (e: any) => {
      if (!disableAnimation) {
        scale.value = withTiming(pressScale, {
          duration: animationDuration,
          easing: Easing.out(Easing.ease),
        });
        opacity.value = withTiming(pressOpacity, {
          duration: animationDuration,
          easing: Easing.out(Easing.ease),
        });
      }
      onPressIn?.(e);
    },
    [disableAnimation, pressScale, pressOpacity, animationDuration, onPressIn]
  );

  // Handle press out
  const handlePressOut = useCallback(
    (e: any) => {
      if (!disableAnimation) {
        scale.value = withTiming(1, {
          duration: animationDuration,
          easing: Easing.out(Easing.ease),
        });
        opacity.value = withTiming(1, {
          duration: animationDuration,
          easing: Easing.out(Easing.ease),
        });
      }
      onPressOut?.(e);
    },
    [disableAnimation, animationDuration, onPressOut]
  );

  // Handle press with haptic
  const handlePress = useCallback(
    (e: any) => {
      // Trigger haptic feedback
      if (haptic !== 'none' && !disabled) {
        switch (haptic) {
          case 'tap':
            haptics.tap();
            break;
          case 'heavy':
            haptics.heavy();
            break;
          case 'soft':
            haptics.soft();
            break;
          case 'success':
            haptics.success();
            break;
          case 'error':
            haptics.error();
            break;
          case 'selection':
            haptics.selection();
            break;
        }
      }
      onPress?.(e);
    },
    [haptic, disabled, onPress]
  );

  // Animated style
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? interaction.disableOpacity : opacity.value,
  }));

  // Resolve style
  const resolveStyle = (pressed: boolean): StyleProp<ViewStyle> => {
    if (typeof style === 'function') {
      return style({ pressed });
    }
    return style;
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      {...rest}
    >
      {({ pressed }) => (
        <Animated.View style={[resolveStyle(pressed), animatedStyle]}>
          {children}
        </Animated.View>
      )}
    </Pressable>
  );
}

// ==========================================================================
// PRESETS
// ==========================================================================

/**
 * Button preset - heavier haptic, more noticeable scale
 */
export function AnimatedButton(props: AnimatedPressableProps) {
  return (
    <AnimatedPressable
      haptic="heavy"
      pressScale={0.96}
      {...props}
    />
  );
}

/**
 * Card preset - subtle feedback for card taps
 */
export function AnimatedCard(props: AnimatedPressableProps) {
  return (
    <AnimatedPressable
      haptic="tap"
      pressScale={0.98}
      pressOpacity={0.85}
      {...props}
    />
  );
}

/**
 * Icon button preset - quick, light feedback
 */
export function AnimatedIconButton(props: AnimatedPressableProps) {
  return (
    <AnimatedPressable
      haptic="soft"
      pressScale={0.9}
      animationDuration={60}
      {...props}
    />
  );
}

/**
 * List item preset - standard list interaction
 */
export function AnimatedListItem(props: AnimatedPressableProps) {
  return (
    <AnimatedPressable
      haptic="selection"
      pressScale={0.99}
      pressOpacity={0.8}
      {...props}
    />
  );
}

export default AnimatedPressable;
