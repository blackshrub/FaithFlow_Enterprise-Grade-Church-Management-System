/**
 * EventsSkeleton - Loading Skeleton for Events
 *
 * Memoized loading skeleton component for events list.
 * Styling: NativeWind-first with inline style for spacing constants
 */

import React, { memo, useMemo } from 'react';
import { View } from 'react-native';
import { spacing, radius } from '@/constants/spacing';

// =============================================================================
// COMPONENT
// =============================================================================

interface EventsSkeletonProps {
  /** Number of skeleton items to show (default: 3) */
  count?: number;
}

export const EventsSkeleton = memo(function EventsSkeleton({ count = 3 }: EventsSkeletonProps) {
  // Memoize skeleton items array
  const items = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);

  return (
    <View style={{ gap: spacing.m }}>
      {items.map((i) => (
        <View
          key={i}
          className="bg-white overflow-hidden"
          style={{ borderRadius: radius.card }}
        >
          <View className="h-40 bg-neutral-200" />
          <View style={{ padding: spacing.m }}>
            <View className="h-3.5 bg-neutral-200 rounded-[7px] w-[40%] mb-2" />
            <View className="h-3.5 bg-neutral-200 rounded-[7px] w-[80%] mb-3" />
            <View className="h-3.5 bg-neutral-200 rounded-[7px] w-[60%]" />
          </View>
        </View>
      ))}
    </View>
  );
});

export default EventsSkeleton;
