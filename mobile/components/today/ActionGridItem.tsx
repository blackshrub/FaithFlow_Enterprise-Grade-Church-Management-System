/**
 * ActionGridItem - Single Grid Item for How Can We Help
 *
 * iOS Control Center style action button.
 * Features:
 * - 72×72pt cell size
 * - 44×44pt icon container (min touch target)
 * - Gradient background
 * - Scale animation on press
 * - Haptic feedback
 *
 * Styling: NativeWind-first with inline styles for gradients/shadows
 */

import React, { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import type { HelpGridAction } from './helpGridConfig';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Dimensions
const CELL_SIZE = 72;
const ICON_CONTAINER_SIZE = 44;
const ICON_SIZE = 22;

interface ActionGridItemProps {
  action: HelpGridAction;
  label: string;
}

export const ActionGridItem = memo(function ActionGridItem({
  action,
  label,
}: ActionGridItemProps) {
  const router = useRouter();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Type assertion for dynamic routes - route is validated at definition time
    router.push(action.route as never);
  }, [router, action.route]);

  const Icon = action.icon;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.container, animatedStyle]}
      accessibilityRole="button"
      accessibilityLabel={label.replace('\n', ' ')}
    >
      {/* Icon Container with Gradient */}
      <View style={styles.iconContainer}>
        <LinearGradient
          colors={action.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        />
        <Icon size={ICON_SIZE} color="#FFFFFF" strokeWidth={2} />
      </View>

      {/* Label */}
      <Text
        style={styles.label}
        numberOfLines={2}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  container: {
    width: CELL_SIZE,
    alignItems: 'center',
    gap: 6,
  },
  iconContainer: {
    width: ICON_CONTAINER_SIZE,
    height: ICON_CONTAINER_SIZE,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: '#525252',
    textAlign: 'center',
    lineHeight: 14,
  },
});
