/**
 * VerseOfTheDayCard - Premium card component for daily verse
 *
 * Design: World-class UI with elegant Scripture display
 * - Large, beautiful verse text as the star
 * - Subtle gradient background
 * - Premium shadows and typography
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ExploreColors, ExploreSpacing, ExploreBorderRadius, ExploreShadows } from '@/constants/explore/designSystem';
import { formatBibleReference } from '@/constants/explore/bibleBooks';
import type { VerseOfTheDay } from '@/types/explore';
import { Share2, BookOpen } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { AudioPlayButton } from './AudioPlayButton';

interface VerseOfTheDayCardProps {
  verse: VerseOfTheDay;
  language: 'en' | 'id';
  onPress: () => void;
  onShare?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const VerseOfTheDayCard = memo(function VerseOfTheDayCard({
  verse,
  language,
  onPress,
  onShare,
}: VerseOfTheDayCardProps) {
  const scale = useSharedValue(1);

  // Null safety
  if (!verse) return null;

  const reference = verse.verse;
  if (!reference) return null;

  // Get the actual Scripture text (verse_text) - this is the star of the show
  const verseText = verse.verse_text
    ? (verse.verse_text[language] || verse.verse_text.en || '')
    : '';

  // Format reference string with localized book name and translation
  const referenceText = formatBibleReference(reference, language);

  // Build text for TTS
  const ttsText = verseText ? `${verseText} ${referenceText}` : '';

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.container, animatedStyle]}
      testID="verse-of-the-day-card"
    >
      {/* Gradient Background */}
      <LinearGradient
        colors={['#EFF6FF', '#DBEAFE', '#BFDBFE']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />

      {/* Decorative Quote Mark */}
      <View style={styles.quoteMarkContainer}>
        <Text style={styles.quoteMark}>"</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Scripture Text - The Star */}
        {verseText ? (
          <Text style={styles.verseText} numberOfLines={5}>
            {verseText}
          </Text>
        ) : (
          <Text style={styles.verseText} numberOfLines={5}>
            <Text style={styles.placeholderText}>Tap to read today's verse</Text>
          </Text>
        )}

        {/* Reference Badge */}
        <View style={styles.referenceContainer}>
          <View style={styles.referenceBadge}>
            <BookOpen size={14} color={ExploreColors.spiritual[600]} />
            <Text style={styles.referenceText}>{referenceText}</Text>
          </View>

          <View style={styles.actionButtons}>
            {/* Audio Play Button */}
            {ttsText && (
              <AudioPlayButton
                text={ttsText}
                variant="icon"
                size={36}
                color={ExploreColors.spiritual[600]}
                backgroundColor="rgba(255, 255, 255, 0.8)"
              />
            )}

            {/* Share Button */}
            {onShare && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation?.();
                  onShare();
                }}
                style={styles.shareButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Share2 size={18} color={ExploreColors.spiritual[500]} />
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* Accent Line */}
      <View style={styles.accentLine} />
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: ExploreBorderRadius.card,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    ...ExploreShadows.level1,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
  quoteMarkContainer: {
    position: 'absolute',
    top: 8,
    left: 16,
    opacity: 0.15,
  },
  quoteMark: {
    fontSize: 80,
    fontWeight: '700',
    color: ExploreColors.spiritual[600],
    lineHeight: 80,
  },
  content: {
    padding: ExploreSpacing.lg + 4,
    paddingTop: ExploreSpacing.xl,
  },
  verseText: {
    fontSize: 19,
    fontWeight: '500',
    lineHeight: 30,
    color: ExploreColors.neutral[800],
    fontStyle: 'italic',
    marginBottom: ExploreSpacing.lg,
  },
  placeholderText: {
    fontStyle: 'normal',
    color: ExploreColors.neutral[500],
  },
  referenceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  referenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  referenceText: {
    fontSize: 14,
    fontWeight: '600',
    color: ExploreColors.spiritual[700],
  },
  shareButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
  },
  accentLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: ExploreColors.spiritual[500],
  },
});
