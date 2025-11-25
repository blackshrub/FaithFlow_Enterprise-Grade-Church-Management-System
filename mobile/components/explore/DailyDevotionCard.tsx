/**
 * DailyDevotionCard - Card component for daily devotions
 *
 * Design: Warm, inviting card with sunrise gold accent
 */

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { ExploreCard } from './ExploreCard';
import { ExploreColors, ExploreTypography, ExploreSpacing } from '@/constants/explore/designSystem';
import type { DailyDevotion } from '@/types/explore';
import { Clock, BookOpen } from 'lucide-react-native';

interface DailyDevotionCardProps {
  devotion: DailyDevotion;
  language: 'en' | 'id';
  onPress: () => void;
  completed?: boolean;
}

export function DailyDevotionCard({
  devotion,
  language,
  onPress,
  completed = false,
}: DailyDevotionCardProps) {
  const title = devotion.title[language] || devotion.title.en;
  const author = devotion.author?.[language] || devotion.author?.en;

  return (
    <ExploreCard onPress={onPress} testID="daily-devotion-card">
      {/* Image Header */}
      {devotion.image_url && (
        <Image
          source={{ uri: devotion.image_url }}
          style={styles.image}
          resizeMode="cover"
        />
      )}

      {/* Content */}
      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>

        {/* Author */}
        {author && (
          <Text style={styles.author} numberOfLines={1}>
            {author}
          </Text>
        )}

        {/* Meta Info */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Clock size={16} color={ExploreColors.neutral[500]} />
            <Text style={styles.metaText}>
              {devotion.reading_time_minutes} min
            </Text>
          </View>

          <View style={styles.metaItem}>
            <BookOpen size={16} color={ExploreColors.neutral[500]} />
            <Text style={styles.metaText}>
              {devotion.main_verse.book} {devotion.main_verse.chapter}:
              {devotion.main_verse.verse_start}
            </Text>
          </View>
        </View>

        {/* Completed Badge */}
        {completed && (
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>✓ Completed</Text>
          </View>
        )}
      </View>
    </ExploreCard>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: ExploreSpacing.md,
  },
  content: {
    gap: ExploreSpacing.sm,
  },
  title: {
    ...ExploreTypography.h3,
    color: ExploreColors.neutral[900],
  },
  author: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[600],
    fontStyle: 'italic',
  },
  metaRow: {
    flexDirection: 'row',
    gap: ExploreSpacing.md,
    marginTop: ExploreSpacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ExploreSpacing.xs,
  },
  metaText: {
    ...ExploreTypography.caption,
    color: ExploreColors.neutral[500],
  },
  completedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: ExploreColors.success[50],
    paddingHorizontal: ExploreSpacing.sm,
    paddingVertical: ExploreSpacing.xs,
    borderRadius: 12,
    marginTop: ExploreSpacing.xs,
  },
  completedText: {
    ...ExploreTypography.caption,
    color: ExploreColors.success[600],
    fontWeight: '600',
  },
});
