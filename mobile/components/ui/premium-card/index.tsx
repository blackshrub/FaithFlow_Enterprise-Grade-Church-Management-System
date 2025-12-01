/**
 * PremiumCard3 - Premium Card Component V3
 *
 * Features:
 * - 18px border radius (V9 standard)
 * - Soft dual shadows for depth
 * - Animated press scale (0.97)
 * - Gold glow ring on selection
 * - Frost layer effect
 * - Proper overflow clipping + shadow correctness
 * - Supports disabled state
 * - Works with nested clickable areas
 * - Three variants: default, subtle, elevated
 *
 * Styling: NativeWind-first with inline style for shadows/animated values
 *
 * Usage:
 * <PremiumCard3 selected={isSelected} onPress={handlePress}>
 *   {children}
 * </PremiumCard3>
 */

import React from 'react';
import { View, Pressable } from 'react-native';
import type { ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { spacing, radius } from '@/constants/spacing';

// Premium color palette - consistent with app theme
const Colors = {
  accent: {
    gold: '#D4AF37',
    goldLight: '#FFFDF6',
  },
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    900: '#171717',
  },
  white: '#FFFFFF',
};

export type PremiumCard3Variant = 'default' | 'subtle' | 'elevated';

export interface PremiumCard3Props {
  children: React.ReactNode;
  /** Whether the card is selected (shows gold glow ring) */
  selected?: boolean;
  /** Press handler */
  onPress?: () => void;
  /** Long press handler */
  onLongPress?: () => void;
  /** Outer container style */
  style?: ViewStyle;
  /** Inner content style */
  innerStyle?: ViewStyle;
  /** Whether the card is disabled */
  disabled?: boolean;
  /** Card variant: default, subtle (less shadow), elevated (more shadow) */
  variant?: PremiumCard3Variant;
  /** Disable press animation */
  disablePressAnimation?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PremiumCard3({
  children,
  selected = false,
  onPress,
  onLongPress,
  style,
  innerStyle,
  disabled = false,
  variant = 'default',
  disablePressAnimation = false,
}: PremiumCard3Props) {
  // Animated scale for press feedback
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled && !disablePressAnimation) {
      scale.value = withTiming(0.97, {
        duration: 100,
        easing: Easing.out(Easing.cubic),
      });
    }
  };

  const handlePressOut = () => {
    if (!disabled && !disablePressAnimation) {
      scale.value = withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      });
    }
  };

  // Variant style configurations
  const variantOuterStyles: Record<PremiumCard3Variant, ViewStyle> = {
    default: {
      borderRadius: radius.card,
      overflow: 'visible',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
      backgroundColor: 'transparent',
    },
    subtle: {
      borderRadius: radius.card,
      overflow: 'visible',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
      backgroundColor: 'transparent',
    },
    elevated: {
      borderRadius: radius.card,
      overflow: 'visible',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 5,
      backgroundColor: 'transparent',
    },
  };

  const variantInnerStyles: Record<PremiumCard3Variant, ViewStyle> = {
    default: {
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.08)',
      padding: spacing.m,
      backgroundColor: 'rgba(255,255,255,0.95)',
      overflow: 'hidden',
    },
    subtle: {
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.05)',
      padding: spacing.m,
      backgroundColor: 'rgba(255,255,255,0.9)',
      overflow: 'hidden',
    },
    elevated: {
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.08)',
      padding: spacing.m,
      backgroundColor: 'rgba(255,255,255,0.95)',
      overflow: 'hidden',
    },
  };

  const selectedOuterStyle: ViewStyle = {
    shadowColor: Colors.accent.gold,
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  };

  const selectedInnerStyle: ViewStyle = {
    backgroundColor: Colors.accent.goldLight,
    borderColor: Colors.accent.gold,
    borderWidth: 2,
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || (!onPress && !onLongPress)}
      className={disabled ? 'opacity-50' : ''}
      style={[
        variantOuterStyles[variant],
        selected && selectedOuterStyle,
        animatedStyle,
        style,
      ]}
    >
      {/* Inner surface with frost effect */}
      <View
        style={[
          variantInnerStyles[variant],
          selected && selectedInnerStyle,
          innerStyle,
        ]}
      >
        {children}
      </View>
    </AnimatedPressable>
  );
}

// Legacy export for backward compatibility
export const PremiumCard2 = PremiumCard3;

export default PremiumCard3;
