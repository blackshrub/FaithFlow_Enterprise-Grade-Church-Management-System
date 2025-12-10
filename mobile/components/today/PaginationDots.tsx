/**
 * PaginationDots - Animated Carousel Pagination
 *
 * Premium animated pagination dots for carousels.
 * Features:
 * - Active dot expands to pill shape (24×8)
 * - Inactive dots are circles (8×8)
 * - Spring physics for smooth transitions
 * - Customizable colors (default: gold accent)
 *
 * Styling: NativeWind-first with inline styles for animations
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  interpolate,
  interpolateColor,
  SharedValue,
} from 'react-native-reanimated';

// Default colors (Gold accent from design system)
const DEFAULT_ACTIVE_COLOR = '#C9A962';
const DEFAULT_INACTIVE_COLOR = 'rgba(201, 169, 98, 0.4)';

// Dot dimensions
const DOT_SIZE = 8;
const ACTIVE_WIDTH = 24;

interface PaginationDotsProps {
  /** Total number of pages */
  total: number;
  /** Animated scroll position (0 to total-1) */
  scrollX: SharedValue<number>;
  /** Width of each item (for calculating current index) */
  itemWidth: number;
  /** Active dot color */
  activeColor?: string;
  /** Inactive dot color */
  inactiveColor?: string;
  /** Additional className for container */
  className?: string;
}

export const PaginationDots = memo(function PaginationDots({
  total,
  scrollX,
  itemWidth,
  activeColor = DEFAULT_ACTIVE_COLOR,
  inactiveColor = DEFAULT_INACTIVE_COLOR,
  className = '',
}: PaginationDotsProps) {
  if (total <= 1) {
    return null;
  }

  return (
    <View className={`flex-row items-center justify-center gap-2 ${className}`}>
      {Array.from({ length: total }).map((_, index) => (
        <Dot
          key={index}
          index={index}
          scrollX={scrollX}
          itemWidth={itemWidth}
          activeColor={activeColor}
          inactiveColor={inactiveColor}
        />
      ))}
    </View>
  );
});

interface DotProps {
  index: number;
  scrollX: SharedValue<number>;
  itemWidth: number;
  activeColor: string;
  inactiveColor: string;
}

const Dot = memo(function Dot({
  index,
  scrollX,
  itemWidth,
  activeColor,
  inactiveColor,
}: DotProps) {
  const animatedStyle = useAnimatedStyle(() => {
    // Calculate current page based on scroll position
    const currentIndex = scrollX.value / itemWidth;

    // Input range for this dot (becomes active at its index)
    const inputRange = [index - 1, index, index + 1];

    // Interpolate width: circle → pill → circle
    const width = interpolate(
      currentIndex,
      inputRange,
      [DOT_SIZE, ACTIVE_WIDTH, DOT_SIZE],
      'clamp'
    );

    // Interpolate opacity
    const opacity = interpolate(
      currentIndex,
      inputRange,
      [0.4, 1, 0.4],
      'clamp'
    );

    // Interpolate background color
    const backgroundColor = interpolateColor(
      currentIndex,
      inputRange,
      [inactiveColor, activeColor, inactiveColor]
    );

    return {
      width: withSpring(width, {
        damping: 15,
        stiffness: 200,
      }),
      opacity: withSpring(opacity, {
        damping: 15,
        stiffness: 200,
      }),
      backgroundColor,
    };
  });

  return <Animated.View style={[styles.dot, animatedStyle]} />;
});

const styles = StyleSheet.create({
  dot: {
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});
