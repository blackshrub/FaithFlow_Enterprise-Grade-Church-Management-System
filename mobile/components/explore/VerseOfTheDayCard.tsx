/**
 * VerseOfTheDayCard - Card component for daily verse
 *
 * Design: Spiritual blue accent with elegant typography
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ExploreCard } from './ExploreCard';
import { ExploreColors, ExploreTypography, ExploreSpacing } from '@/constants/explore/designSystem';
import type { VerseOfTheDay } from '@/types/explore';
import { Share2 } from 'lucide-react-native';

interface VerseOfTheDayCardProps {
  verse: VerseOfTheDay;
  language: 'en' | 'id';
  onPress: () => void;
  onShare?: () => void;
}

export function VerseOfTheDayCard({
  verse,
  language,
  onPress,
  onShare,
}: VerseOfTheDayCardProps) {
  const verseText = verse.verse_text[language] || verse.verse_text.en;
  const reflection = verse.reflection?.[language] || verse.reflection?.en;

  return (
    <ExploreCard onPress={onPress} variant="elevated" testID="verse-of-the-day-card">
      {/* Accent Bar */}
      <View style={styles.accentBar} />

      {/* Content */}
      <View style={styles.content}>
        {/* Verse Text */}
        <Text style={styles.verseText}>
          "{verseText}"
        </Text>

        {/* Reference */}
        <Text style={styles.reference}>
          {verse.reference.book} {verse.reference.chapter}:
          {verse.reference.verse_start}
          {verse.reference.verse_end && verse.reference.verse_end !== verse.reference.verse_start
            ? `-${verse.reference.verse_end}`
            : ''}
        </Text>

        {/* Reflection Preview */}
        {reflection && (
          <Text style={styles.reflection} numberOfLines={2}>
            {reflection}
          </Text>
        )}

        {/* Share Icon */}
        {onShare && (
          <View style={styles.shareContainer}>
            <Share2 size={20} color={ExploreColors.spiritual[500]} />
          </View>
        )}
      </View>
    </ExploreCard>
  );
}

const styles = StyleSheet.create({
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: ExploreColors.spiritual[500],
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  content: {
    paddingLeft: ExploreSpacing.md,
    gap: ExploreSpacing.sm,
  },
  verseText: {
    ...ExploreTypography.h4,
    color: ExploreColors.neutral[900],
    lineHeight: 28,
    fontStyle: 'italic',
  },
  reference: {
    ...ExploreTypography.body,
    color: ExploreColors.spiritual[600],
    fontWeight: '600',
  },
  reflection: {
    ...ExploreTypography.body,
    color: ExploreColors.neutral[600],
    marginTop: ExploreSpacing.xs,
  },
  shareContainer: {
    alignSelf: 'flex-end',
    marginTop: ExploreSpacing.xs,
  },
});
