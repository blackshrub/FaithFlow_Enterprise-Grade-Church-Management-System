/**
 * Event Card Loading Skeleton
 *
 * Animated skeleton loader for event cards
 * Provides visual feedback during data fetching
 */

import React from 'react';
import { View } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';

// Simplified skeleton using static opacity
const SkeletonBox = ({ width, height, style }: { width: number | string; height: number; style?: object }) => (
  <View
    style={[
      {
        width,
        height,
        backgroundColor: colors.gray[200],
        borderRadius: borderRadius.md,
        opacity: 0.7,
      },
      style,
    ]}
  />
);

export function EventCardSkeleton() {
  return (
    <View
      className="mb-4 p-5 rounded-2xl"
      style={{
        backgroundColor: colors.white,
        ...shadows.md,
      }}
    >
      {/* Header Skeleton */}
      <View className="flex-row justify-between items-start mb-4">
        <SkeletonBox width={80} height={24} style={{ borderRadius: borderRadius.full }} />
        <SkeletonBox width={60} height={24} style={{ borderRadius: borderRadius.full }} />
      </View>

      {/* Title Skeleton */}
      <SkeletonBox width="80%" height={24} style={{ marginBottom: spacing.sm }} />

      {/* Description Skeleton */}
      <SkeletonBox width="100%" height={16} style={{ marginBottom: spacing.xs }} />
      <SkeletonBox width="60%" height={16} style={{ marginBottom: spacing.lg }} />

      {/* Info Row Skeleton */}
      <View className="flex-row justify-between items-center mb-4">
        <SkeletonBox width={100} height={14} />
        <SkeletonBox width={80} height={14} />
      </View>

      {/* Button Skeleton */}
      <SkeletonBox width="100%" height={44} style={{ borderRadius: borderRadius.xl }} />
    </View>
  );
}

/**
 * Multiple Event Card Skeletons
 * Shows 3 skeleton cards for list loading state
 */
export function EventCardSkeletonList() {
  return (
    <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
      <EventCardSkeleton />
      <EventCardSkeleton />
      <EventCardSkeleton />
    </View>
  );
}
