/**
 * Event Card Loading Skeleton
 *
 * Animated skeleton loader for event cards
 * Provides visual feedback during data fetching
 */

import React from 'react';
import { View } from 'react-native';
import { MotiView } from 'moti';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';

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
        {/* Date Badge Skeleton */}
        <MotiView
          from={{ opacity: 0.4 }}
          animate={{ opacity: 1 }}
          transition={{
            type: 'timing',
            duration: 1000,
            loop: true,
          }}
          style={{
            width: 80,
            height: 24,
            backgroundColor: colors.gray[200],
            borderRadius: borderRadius.full,
          }}
        />

        {/* Status Badge Skeleton */}
        <MotiView
          from={{ opacity: 0.4 }}
          animate={{ opacity: 1 }}
          transition={{
            type: 'timing',
            duration: 1000,
            loop: true,
            delay: 100,
          }}
          style={{
            width: 60,
            height: 24,
            backgroundColor: colors.gray[200],
            borderRadius: borderRadius.full,
          }}
        />
      </View>

      {/* Title Skeleton */}
      <MotiView
        from={{ opacity: 0.4 }}
        animate={{ opacity: 1 }}
        transition={{
          type: 'timing',
          duration: 1000,
          loop: true,
          delay: 200,
        }}
        style={{
          width: '80%',
          height: 24,
          backgroundColor: colors.gray[200],
          borderRadius: borderRadius.md,
          marginBottom: spacing.sm,
        }}
      />

      {/* Description Skeleton */}
      <MotiView
        from={{ opacity: 0.4 }}
        animate={{ opacity: 1 }}
        transition={{
          type: 'timing',
          duration: 1000,
          loop: true,
          delay: 300,
        }}
        style={{
          width: '100%',
          height: 16,
          backgroundColor: colors.gray[200],
          borderRadius: borderRadius.md,
          marginBottom: spacing.xs,
        }}
      />
      <MotiView
        from={{ opacity: 0.4 }}
        animate={{ opacity: 1 }}
        transition={{
          type: 'timing',
          duration: 1000,
          loop: true,
          delay: 400,
        }}
        style={{
          width: '60%',
          height: 16,
          backgroundColor: colors.gray[200],
          borderRadius: borderRadius.md,
          marginBottom: spacing.lg,
        }}
      />

      {/* Info Row Skeleton */}
      <View className="flex-row justify-between items-center mb-4">
        <MotiView
          from={{ opacity: 0.4 }}
          animate={{ opacity: 1 }}
          transition={{
            type: 'timing',
            duration: 1000,
            loop: true,
            delay: 500,
          }}
          style={{
            width: 100,
            height: 14,
            backgroundColor: colors.gray[200],
            borderRadius: borderRadius.md,
          }}
        />
        <MotiView
          from={{ opacity: 0.4 }}
          animate={{ opacity: 1 }}
          transition={{
            type: 'timing',
            duration: 1000,
            loop: true,
            delay: 600,
          }}
          style={{
            width: 80,
            height: 14,
            backgroundColor: colors.gray[200],
            borderRadius: borderRadius.md,
          }}
        />
      </View>

      {/* Button Skeleton */}
      <MotiView
        from={{ opacity: 0.4 }}
        animate={{ opacity: 1 }}
        transition={{
          type: 'timing',
          duration: 1000,
          loop: true,
          delay: 700,
        }}
        style={{
          width: '100%',
          height: 44,
          backgroundColor: colors.gray[200],
          borderRadius: borderRadius.xl,
        }}
      />
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
