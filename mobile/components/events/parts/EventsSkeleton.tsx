/**
 * EventsSkeleton - Loading Skeleton for Events
 *
 * Memoized loading skeleton component for events list.
 */

import React, { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { spacing, radius } from '@/constants/spacing';

// =============================================================================
// COLORS
// =============================================================================

const Colors = {
  neutral: {
    200: '#e5e5e5',
  },
  white: '#ffffff',
};

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
    <View style={styles.container}>
      {items.map((i) => (
        <View key={i} style={styles.card}>
          <View style={styles.image} />
          <View style={styles.content}>
            <View style={[styles.line, styles.lineShort]} />
            <View style={[styles.line, styles.lineLong]} />
            <View style={[styles.line, styles.lineMedium]} />
          </View>
        </View>
      ))}
    </View>
  );
});

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    gap: spacing.m,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  image: {
    height: 160,
    backgroundColor: Colors.neutral[200],
  },
  content: {
    padding: spacing.m,
  },
  line: {
    height: 14,
    backgroundColor: Colors.neutral[200],
    borderRadius: 7,
  },
  lineShort: {
    width: '40%',
    marginBottom: 8,
  },
  lineLong: {
    width: '80%',
    marginBottom: 12,
  },
  lineMedium: {
    width: '60%',
  },
});

export default EventsSkeleton;
