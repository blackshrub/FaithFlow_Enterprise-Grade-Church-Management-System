/**
 * BibleFigureCard - Card component for Bible figures
 *
 * Design: Character-focused with rich imagery
 */

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { ExploreCard } from './ExploreCard';
import { ExploreColors, ExploreTypography, ExploreSpacing } from '@/constants/explore/designSystem';
import type { BibleFigureOfTheDay } from '@/types/explore';

interface BibleFigureCardProps {
  figure: BibleFigureOfTheDay;
  language: 'en' | 'id';
  onPress: () => void;
  variant?: 'compact' | 'full';
}

export function BibleFigureCard({
  figure,
  language,
  onPress,
  variant = 'full',
}: BibleFigureCardProps) {
  const name = figure.name[language] || figure.name.en;
  const summary = figure.summary[language] || figure.summary.en;
  const title = figure.title?.[language] || figure.title?.en;

  if (variant === 'compact') {
    return (
      <ExploreCard onPress={onPress} testID="bible-figure-card-compact">
        <View style={styles.compactContainer}>
          {figure.image_url && (
            <Image
              source={{ uri: figure.image_url }}
              style={styles.compactImage}
              resizeMode="cover"
            />
          )}
          <View style={styles.compactContent}>
            <Text style={styles.compactName} numberOfLines={1}>
              {name}
            </Text>
            {title && (
              <Text style={styles.compactTitle} numberOfLines={1}>
                {title}
              </Text>
            )}
          </View>
        </View>
      </ExploreCard>
    );
  }

  return (
    <ExploreCard onPress={onPress} testID="bible-figure-card">
      {/* Image Header */}
      {figure.image_url && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: figure.image_url }}
            style={styles.image}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay} />
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {/* Name */}
        <Text style={styles.name}>{name}</Text>

        {/* Title */}
        {title && <Text style={styles.title}>{title}</Text>}

        {/* Summary */}
        <Text style={styles.summary} numberOfLines={3}>
          {summary}
        </Text>

        {/* Key Events Count */}
        {figure.key_events && figure.key_events.length > 0 && (
          <View style={styles.eventsBadge}>
            <Text style={styles.eventsText}>
              {figure.key_events.length} key events
            </Text>
          </View>
        )}
      </View>
    </ExploreCard>
  );
}

const styles = StyleSheet.create({
  // Full variant
  imageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: ExploreSpacing.md,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  content: {
    gap: ExploreSpacing.sm,
  },
  name: {
    ...ExploreTypography.h3,
    color: ExploreColors.neutral[900],
  },
  title: {
    ...ExploreTypography.body,
    color: ExploreColors.spiritual[600],
    fontWeight: '600',
  },
  summary: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[600],
    lineHeight: 22,
  },
  eventsBadge: {
    alignSelf: 'flex-start',
    backgroundColor: ExploreColors.primary[50],
    paddingHorizontal: ExploreSpacing.sm,
    paddingVertical: ExploreSpacing.xs,
    borderRadius: 12,
    marginTop: ExploreSpacing.xs,
  },
  eventsText: {
    ...ExploreTypography.caption,
    color: ExploreColors.primary[700],
    fontWeight: '600',
  },

  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    gap: ExploreSpacing.md,
    alignItems: 'center',
  },
  compactImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  compactContent: {
    flex: 1,
    gap: ExploreSpacing.xs,
  },
  compactName: {
    ...ExploreTypography.h4,
    color: ExploreColors.neutral[900],
  },
  compactTitle: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[600],
  },
});
