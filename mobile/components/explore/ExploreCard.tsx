/**
 * ExploreCard - Base card component for Explore feature
 *
 * Design Philosophy: "A sanctuary in your pocket"
 * - Warm colors, generous spacing, soft shadows
 * - Gentle animations, calm interactions
 * - One primary action per card
 */

import React from 'react';
import { Pressable, View, ViewStyle, StyleProp, PressableProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { ExploreSpacing, ExploreBorderRadius, ExploreShadows } from '@/constants/explore/designSystem';

interface ExploreCardProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'outlined';
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  testID?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Base card component for all Explore content
 * Follows UI/UX spec: 16px radius, 20px padding, warm shadows
 */
export function ExploreCard({
  children,
  onPress,
  variant = 'default',
  style,
  disabled = false,
  testID,
  ...pressableProps
}: ExploreCardProps) {
  const scale = useSharedValue(1);
  const isInteractive = !!onPress && !disabled;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (isInteractive) {
      scale.value = withSpring(0.98, {
        damping: 15,
        stiffness: 300,
      });
    }
  };

  const handlePressOut = () => {
    if (isInteractive) {
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 300,
      });
    }
  };

  const cardStyle: ViewStyle = {
    borderRadius: ExploreBorderRadius.card,
    padding: ExploreSpacing.cardPadding,
    backgroundColor: '#FFFFFF',
    ...(variant === 'elevated' && {
      ...ExploreShadows.level1,
    }),
    ...(variant === 'outlined' && {
      borderWidth: 1,
      borderColor: '#E5E5E5',
    }),
    ...(variant === 'default' && {
      // Warm shadow for default variant
      shadowColor: 'rgba(139, 69, 19, 0.08)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 2,
    }),
    ...(disabled && {
      opacity: 0.6,
    }),
  };

  if (!isInteractive) {
    return (
      <View style={[cardStyle, style]} testID={testID}>
        {children}
      </View>
    );
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[cardStyle, style, animatedStyle]}
      testID={testID}
      accessible
      accessibilityRole="button"
      {...pressableProps}
    >
      {children}
    </AnimatedPressable>
  );
}

/**
 * Dark mode variant of ExploreCard
 */
export function ExploreCardDark({
  children,
  style,
  ...props
}: ExploreCardProps) {
  const darkCardStyle: ViewStyle = {
    backgroundColor: '#1A1A1A',
    borderColor: '#333333',
  };

  return (
    <ExploreCard style={[darkCardStyle, style]} {...props}>
      {children}
    </ExploreCard>
  );
}
