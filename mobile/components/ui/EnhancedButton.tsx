/**
 * EnhancedButton - V6 Interaction Refinement
 *
 * Wraps gluestack Button with unified micro-interactions:
 * - Haptic feedback on press
 * - Animated scale/opacity feedback
 * - Different haptic types for different button actions
 *
 * Drop-in replacement for Button with premium feel.
 */

import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { Button, ButtonText, ButtonIcon, ButtonSpinner } from './button';
import { interaction, haptics } from '@/constants/interaction';
import type { HapticType } from './AnimatedPressable';

// ==========================================================================
// TYPES
// ==========================================================================

type ButtonAction = 'primary' | 'secondary' | 'positive' | 'negative' | 'default';
type ButtonVariant = 'solid' | 'outline' | 'link';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface EnhancedButtonProps {
  /** Button action type */
  action?: ButtonAction;
  /** Button variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Button children */
  children: React.ReactNode;
  /** Press handler */
  onPress?: () => void;
  /** Whether button is disabled */
  disabled?: boolean;
  /** Whether button is loading */
  isLoading?: boolean;
  /** Additional className */
  className?: string;
  /** Haptic feedback type (auto-detected based on action if not provided) */
  haptic?: HapticType;
  /** Disable animations */
  disableAnimation?: boolean;
}

// ==========================================================================
// HAPTIC MAPPING
// ==========================================================================

const getHapticForAction = (action: ButtonAction): HapticType => {
  switch (action) {
    case 'primary':
      return 'heavy';
    case 'positive':
      return 'success';
    case 'negative':
      return 'error';
    case 'secondary':
    case 'default':
    default:
      return 'tap';
  }
};

// ==========================================================================
// COMPONENT
// ==========================================================================

export function EnhancedButton({
  action = 'primary',
  variant = 'solid',
  size = 'md',
  children,
  onPress,
  disabled = false,
  isLoading = false,
  className,
  haptic,
  disableAnimation = false,
}: EnhancedButtonProps) {
  // Animation values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Determine haptic type
  const hapticType = haptic ?? getHapticForAction(action);

  // Handle press in
  const handlePressIn = useCallback(() => {
    if (!disableAnimation && !disabled) {
      scale.value = withTiming(interaction.press.scale, {
        duration: interaction.press.duration,
        easing: Easing.out(Easing.ease),
      });
      opacity.value = withTiming(interaction.press.opacity, {
        duration: interaction.press.duration,
        easing: Easing.out(Easing.ease),
      });
    }
  }, [disableAnimation, disabled]);

  // Handle press out
  const handlePressOut = useCallback(() => {
    if (!disableAnimation) {
      scale.value = withTiming(1, {
        duration: interaction.press.duration,
        easing: Easing.out(Easing.ease),
      });
      opacity.value = withTiming(1, {
        duration: interaction.press.duration,
        easing: Easing.out(Easing.ease),
      });
    }
  }, [disableAnimation]);

  // Handle press with haptic
  const handlePress = useCallback(() => {
    if (!disabled && !isLoading) {
      // Trigger haptic feedback
      if (hapticType !== 'none') {
        switch (hapticType) {
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
      onPress?.();
    }
  }, [hapticType, disabled, isLoading, onPress]);

  // Animated style
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? interaction.disableOpacity : opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Button
        action={action}
        variant={variant}
        size={size}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || isLoading}
        className={className}
      >
        {isLoading ? <ButtonSpinner /> : children}
      </Button>
    </Animated.View>
  );
}

// ==========================================================================
// CONVENIENCE EXPORTS
// ==========================================================================

// Re-export Button subcomponents for use with EnhancedButton
export { ButtonText, ButtonIcon, ButtonSpinner };

// ==========================================================================
// PRESETS
// ==========================================================================

/**
 * Primary action button preset
 */
export function PrimaryButton(props: Omit<EnhancedButtonProps, 'action' | 'variant'>) {
  return <EnhancedButton action="primary" variant="solid" {...props} />;
}

/**
 * Secondary action button preset
 */
export function SecondaryButton(props: Omit<EnhancedButtonProps, 'action' | 'variant'>) {
  return <EnhancedButton action="secondary" variant="outline" {...props} />;
}

/**
 * Destructive/negative action button preset
 */
export function DestructiveButton(props: Omit<EnhancedButtonProps, 'action' | 'variant'>) {
  return <EnhancedButton action="negative" variant="solid" haptic="error" {...props} />;
}

/**
 * Success/positive action button preset
 */
export function SuccessButton(props: Omit<EnhancedButtonProps, 'action' | 'variant'>) {
  return <EnhancedButton action="positive" variant="solid" haptic="success" {...props} />;
}

/**
 * Ghost/text button preset
 */
export function GhostButton(props: Omit<EnhancedButtonProps, 'variant'>) {
  return <EnhancedButton variant="link" haptic="soft" {...props} />;
}

export default EnhancedButton;
