/**
 * FocusableInput - V6 Interaction Refinement
 *
 * Enhanced TextInput with animated focus states:
 * - Animated border color on focus
 * - Soft shadow elevation on focus
 * - Smooth transitions via Reanimated
 * - Optional haptic feedback on focus
 *
 * Drop-in replacement for Input with premium feel.
 * Styling: NativeWind-first with inline style for animated/dynamic values
 */

import React, { useState, useCallback, useRef } from 'react';
import { View, TextInput, TextInputProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';

import { interaction, haptics } from '@/constants/interaction';

// ==========================================================================
// TYPES
// ==========================================================================

export interface FocusableInputProps extends TextInputProps {
  /** Container className (NativeWind) */
  containerClassName?: string;
  /** Input className (NativeWind) */
  inputClassName?: string;
  /** Error state */
  isInvalid?: boolean;
  /** Disabled state */
  isDisabled?: boolean;
  /** Left icon/element */
  leftElement?: React.ReactNode;
  /** Right icon/element */
  rightElement?: React.ReactNode;
  /** Enable haptic feedback on focus */
  enableHaptic?: boolean;
  /** Variant style */
  variant?: 'outline' | 'filled' | 'underlined';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

// ==========================================================================
// THEME COLORS
// ==========================================================================

const colors = {
  border: {
    default: '#E5E5E5',
    focus: '#2563EB', // Primary blue
    error: '#EF4444',
    disabled: '#D4D4D4',
  },
  background: {
    default: '#FFFFFF',
    filled: '#F5F5F5',
    focus: '#FFFFFF',
    disabled: '#FAFAFA',
  },
  shadow: {
    default: 'transparent',
    focus: 'rgba(37, 99, 235, 0.15)', // Primary blue with opacity
    error: 'rgba(239, 68, 68, 0.15)',
  },
  text: {
    default: '#171717',
    placeholder: '#A3A3A3',
    disabled: '#A3A3A3',
  },
};

const sizes = {
  sm: { height: 36, paddingHorizontal: 12, fontSize: 14 },
  md: { height: 44, paddingHorizontal: 16, fontSize: 16 },
  lg: { height: 52, paddingHorizontal: 20, fontSize: 18 },
};

// ==========================================================================
// COMPONENT
// ==========================================================================

export function FocusableInput({
  containerClassName,
  inputClassName,
  isInvalid = false,
  isDisabled = false,
  leftElement,
  rightElement,
  enableHaptic = true,
  variant = 'outline',
  size = 'md',
  onFocus,
  onBlur,
  style,
  ...textInputProps
}: FocusableInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Animation values
  const focusProgress = useSharedValue(0);
  const shadowOpacity = useSharedValue(0);

  // Handle focus
  const handleFocus = useCallback(
    (e: any) => {
      setIsFocused(true);

      // Animate focus state
      focusProgress.value = withTiming(1, {
        duration: interaction.animation.fast,
        easing: Easing.out(Easing.ease),
      });
      shadowOpacity.value = withTiming(interaction.focus.shadow.ios.shadowOpacity, {
        duration: interaction.animation.fast,
        easing: Easing.out(Easing.ease),
      });

      // Haptic feedback
      if (enableHaptic) {
        haptics.selection();
      }

      onFocus?.(e);
    },
    [enableHaptic, onFocus]
  );

  // Handle blur
  const handleBlur = useCallback(
    (e: any) => {
      setIsFocused(false);

      // Animate blur state
      focusProgress.value = withTiming(0, {
        duration: interaction.animation.fast,
        easing: Easing.out(Easing.ease),
      });
      shadowOpacity.value = withTiming(0, {
        duration: interaction.animation.fast,
        easing: Easing.out(Easing.ease),
      });

      onBlur?.(e);
    },
    [onBlur]
  );

  // Determine colors based on state
  const getBorderColor = () => {
    if (isDisabled) return colors.border.disabled;
    if (isInvalid) return colors.border.error;
    return isFocused ? colors.border.focus : colors.border.default;
  };

  const getShadowColor = () => {
    if (isInvalid) return colors.shadow.error;
    return colors.shadow.focus;
  };

  // Animated container style
  const animatedContainerStyle = useAnimatedStyle(() => {
    const borderColor = isInvalid
      ? colors.border.error
      : interpolateColor(
          focusProgress.value,
          [0, 1],
          [colors.border.default, colors.border.focus]
        );

    return {
      borderColor,
      shadowOpacity: shadowOpacity.value,
    };
  });

  // Get variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'filled':
        return {
          backgroundColor: isDisabled
            ? colors.background.disabled
            : isFocused
            ? colors.background.focus
            : colors.background.filled,
          borderWidth: 1,
          borderRadius: 12,
        };
      case 'underlined':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
          borderBottomWidth: 2,
          borderRadius: 0,
        };
      case 'outline':
      default:
        return {
          backgroundColor: isDisabled
            ? colors.background.disabled
            : colors.background.default,
          borderWidth: 1.5,
          borderRadius: 12,
        };
    }
  };

  const sizeStyles = sizes[size];
  const variantStyles = getVariantStyles();

  return (
    <Animated.View
      className={`flex-row items-center overflow-hidden ${isDisabled ? 'opacity-50' : ''}`}
      style={[
        variantStyles,
        {
          height: sizeStyles.height,
          shadowColor: getShadowColor(),
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: interaction.focus.shadow.ios.shadowRadius,
        },
        animatedContainerStyle,
      ]}
    >
      {leftElement && (
        <View className="pl-3 justify-center items-center">{leftElement}</View>
      )}

      <TextInput
        ref={inputRef}
        editable={!isDisabled}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholderTextColor={colors.text.placeholder}
        className="flex-1 h-full p-0"
        style={[
          {
            fontSize: sizeStyles.fontSize,
            paddingHorizontal: leftElement ? 8 : sizeStyles.paddingHorizontal,
            color: isDisabled ? colors.text.disabled : colors.text.default,
          },
          style,
        ]}
        {...textInputProps}
      />

      {rightElement && (
        <View className="pr-3 justify-center items-center">{rightElement}</View>
      )}
    </Animated.View>
  );
}

// ==========================================================================
// PRESETS
// ==========================================================================

/**
 * Search input preset
 */
export function SearchInput(props: FocusableInputProps) {
  return (
    <FocusableInput
      variant="filled"
      placeholder="Search..."
      autoCapitalize="none"
      autoCorrect={false}
      returnKeyType="search"
      {...props}
    />
  );
}

/**
 * Form input preset
 */
export function FormInput(props: FocusableInputProps) {
  return (
    <FocusableInput
      variant="outline"
      size="md"
      {...props}
    />
  );
}

/**
 * Underlined input preset (minimal style)
 */
export function UnderlinedInput(props: FocusableInputProps) {
  return (
    <FocusableInput
      variant="underlined"
      {...props}
    />
  );
}

export default FocusableInput;
