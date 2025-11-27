/**
 * LoadingSkeleton - Skeleton loading states for Explore content
 *
 * Design: Smooth shimmer animation with warm colors
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { ExploreColors, ExploreSpacing, ExploreBorderRadius } from '@/constants/explore/designSystem';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Base skeleton component with shimmer animation
 */
export function Skeleton({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1500 }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0.3, 0.5, 0.3]),
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: ExploreColors.neutral[200],
        },
        animatedStyle,
        style,
      ] as any}
    />
  );
}

/**
 * Devotion card skeleton
 */
export function DailyDevotionSkeleton() {
  return (
    <View style={styles.card}>
      {/* Image */}
      <Skeleton height={160} borderRadius={12} style={{ marginBottom: ExploreSpacing.md }} />

      {/* Title */}
      <Skeleton height={24} width="80%" style={{ marginBottom: ExploreSpacing.sm }} />
      <Skeleton height={24} width="60%" style={{ marginBottom: ExploreSpacing.md }} />

      {/* Author */}
      <Skeleton height={16} width="40%" style={{ marginBottom: ExploreSpacing.md }} />

      {/* Meta row */}
      <View style={{ flexDirection: 'row', gap: ExploreSpacing.md }}>
        <Skeleton height={16} width={80} />
        <Skeleton height={16} width={100} />
      </View>
    </View>
  );
}

/**
 * Verse card skeleton
 */
export function VerseOfTheDaySkeleton() {
  return (
    <View style={styles.card}>
      {/* Accent bar */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          backgroundColor: ExploreColors.spiritual[200],
          borderTopLeftRadius: 16,
          borderBottomLeftRadius: 16,
        }}
      />

      {/* Content */}
      <View style={{ paddingLeft: ExploreSpacing.md }}>
        {/* Verse text */}
        <Skeleton height={20} width="100%" style={{ marginBottom: ExploreSpacing.xs }} />
        <Skeleton height={20} width="90%" style={{ marginBottom: ExploreSpacing.xs }} />
        <Skeleton height={20} width="70%" style={{ marginBottom: ExploreSpacing.md }} />

        {/* Reference */}
        <Skeleton height={18} width="50%" style={{ marginBottom: ExploreSpacing.md }} />

        {/* Reflection */}
        <Skeleton height={16} width="100%" style={{ marginBottom: ExploreSpacing.xs }} />
        <Skeleton height={16} width="80%" />
      </View>
    </View>
  );
}

/**
 * Bible figure card skeleton
 */
export function BibleFigureSkeleton() {
  return (
    <View style={styles.card}>
      {/* Image */}
      <Skeleton height={200} borderRadius={12} style={{ marginBottom: ExploreSpacing.md }} />

      {/* Name */}
      <Skeleton height={24} width="60%" style={{ marginBottom: ExploreSpacing.sm }} />

      {/* Title */}
      <Skeleton height={18} width="50%" style={{ marginBottom: ExploreSpacing.md }} />

      {/* Summary */}
      <Skeleton height={16} width="100%" style={{ marginBottom: ExploreSpacing.xs }} />
      <Skeleton height={16} width="90%" style={{ marginBottom: ExploreSpacing.xs }} />
      <Skeleton height={16} width="70%" />
    </View>
  );
}

/**
 * Quiz card skeleton
 */
export function DailyQuizSkeleton() {
  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={{ flexDirection: 'row', gap: ExploreSpacing.md, marginBottom: ExploreSpacing.md }}>
        <Skeleton width={48} height={48} borderRadius={24} />
        <View style={{ flex: 1, gap: ExploreSpacing.xs }}>
          <Skeleton height={20} width="70%" />
          <Skeleton height={16} width="90%" />
        </View>
      </View>

      {/* Meta row */}
      <View
        style={{
          flexDirection: 'row',
          gap: ExploreSpacing.lg,
          paddingVertical: ExploreSpacing.sm,
          marginBottom: ExploreSpacing.md,
        }}
      >
        <Skeleton height={16} width={80} />
        <Skeleton height={16} width={60} />
        <Skeleton height={20} width={70} borderRadius={8} />
      </View>

      {/* CTA */}
      <Skeleton height={44} borderRadius={12} />
    </View>
  );
}

/**
 * Home screen skeleton with multiple cards
 */
export function ExploreHomeSkeleton() {
  return (
    <View style={{ gap: ExploreSpacing.lg }}>
      <DailyDevotionSkeleton />
      <VerseOfTheDaySkeleton />
      <BibleFigureSkeleton />
      <DailyQuizSkeleton />
    </View>
  );
}

/**
 * Compact list item skeleton
 */
export function CompactListItemSkeleton() {
  return (
    <View style={[styles.card, { flexDirection: 'row', gap: ExploreSpacing.md }]}>
      <Skeleton width={64} height={64} borderRadius={32} />
      <View style={{ flex: 1, gap: ExploreSpacing.xs }}>
        <Skeleton height={20} width="70%" />
        <Skeleton height={16} width="50%" />
      </View>
    </View>
  );
}

/**
 * Bible figure list skeleton (for figure list screen)
 */
export function BibleFigureListSkeleton() {
  return (
    <View style={{ gap: ExploreSpacing.md }}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={[styles.card, { flexDirection: 'row', gap: ExploreSpacing.md }]}>
          <Skeleton width={80} height={80} borderRadius={12} />
          <View style={{ flex: 1, gap: ExploreSpacing.xs }}>
            <Skeleton height={20} width="70%" />
            <Skeleton height={16} width="50%" />
            <Skeleton height={14} width="90%" />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Bible study card skeleton
 */
export function BibleStudySkeleton() {
  return (
    <View style={styles.card}>
      {/* Image */}
      <Skeleton height={160} borderRadius={12} style={{ marginBottom: ExploreSpacing.md }} />

      {/* Title */}
      <Skeleton height={24} width="80%" style={{ marginBottom: ExploreSpacing.sm }} />

      {/* Description */}
      <Skeleton height={16} width="100%" style={{ marginBottom: ExploreSpacing.xs }} />
      <Skeleton height={16} width="90%" style={{ marginBottom: ExploreSpacing.md }} />

      {/* Meta row */}
      <View style={{ flexDirection: 'row', gap: ExploreSpacing.md }}>
        <Skeleton height={16} width={80} />
        <Skeleton height={16} width={60} />
      </View>
    </View>
  );
}

/**
 * Bible study list skeleton
 */
export function BibleStudyListSkeleton() {
  return (
    <View style={{ gap: ExploreSpacing.md }}>
      {[1, 2, 3].map((i) => (
        <BibleStudySkeleton key={i} />
      ))}
    </View>
  );
}

/**
 * Topical verses skeleton
 */
export function TopicalVersesSkeleton() {
  return (
    <View style={{ gap: ExploreSpacing.md }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={styles.card}>
          <Skeleton height={18} width="100%" style={{ marginBottom: ExploreSpacing.xs }} />
          <Skeleton height={18} width="90%" style={{ marginBottom: ExploreSpacing.sm }} />
          <Skeleton height={14} width="40%" />
        </View>
      ))}
    </View>
  );
}

/**
 * Topical categories skeleton
 */
export function TopicalCategoriesSkeleton() {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: ExploreSpacing.md }}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <View key={i} style={[styles.card, { width: '47%', minHeight: 100 }]}>
          <Skeleton width={40} height={40} borderRadius={20} style={{ marginBottom: ExploreSpacing.sm }} />
          <Skeleton height={18} width="80%" style={{ marginBottom: ExploreSpacing.xs }} />
          <Skeleton height={14} width="50%" />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: ExploreBorderRadius.card,
    padding: ExploreSpacing.cardPadding,
    shadowColor: 'rgba(139, 69, 19, 0.08)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
});
