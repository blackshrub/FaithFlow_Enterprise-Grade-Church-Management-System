/**
 * VerseOfTheDayCard - Premium card component for daily verse
 *
 * Design: World-class UI with elegant Scripture display
 * - Large, beautiful verse text as the star
 * - Subtle gradient background
 * - Premium shadows and typography
 *
 * Styling: NativeWind-first with inline style for shadows/dynamic values
 */

import React, { memo } from 'react';
import { View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ExploreColors, ExploreShadows } from '@/constants/explore/designSystem';
import { formatBibleReference } from '@/constants/explore/bibleBooks';
import type { VerseOfTheDay } from '@/types/explore';
import { Share2, BookOpen } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { AudioPlayButton } from './AudioPlayButton';
import { Text } from '@/components/ui/text';

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
      className="rounded-2xl overflow-hidden bg-white"
      style={[{ ...ExploreShadows.level1 }, animatedStyle]}
      testID="verse-of-the-day-card"
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Verse of the Day: ${verseText ? `${verseText} ${referenceText}` : 'Tap to read today\'s verse'}`}
    >
      {/* Gradient Background */}
      <LinearGradient
        colors={['#EFF6FF', '#DBEAFE', '#BFDBFE']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="absolute inset-0"
        style={{ opacity: 0.9 }}
      />

      {/* Decorative Quote Mark */}
      <View className="absolute top-2 left-4 opacity-[0.15]">
        <Text
          className="text-[80px] font-bold leading-[80px]"
          style={{ color: ExploreColors.spiritual[600] }}
        >
          "
        </Text>
      </View>

      {/* Content */}
      <View className="p-5 pt-8">
        {/* Scripture Text - The Star */}
        {verseText ? (
          <Text
            className="text-[19px] font-medium leading-[30px] italic mb-5"
            style={{ color: ExploreColors.neutral[800] }}
            numberOfLines={5}
          >
            {verseText}
          </Text>
        ) : (
          <Text
            className="text-[19px] font-medium leading-[30px] mb-5"
            style={{ color: ExploreColors.neutral[500] }}
            numberOfLines={5}
          >
            Tap to read today's verse
          </Text>
        )}

        {/* Reference Badge */}
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center gap-1.5 bg-white/80 px-3 py-1.5 rounded-[20px]">
            <BookOpen size={14} color={ExploreColors.spiritual[600]} />
            <Text
              className="text-sm font-semibold"
              style={{ color: ExploreColors.spiritual[700] }}
            >
              {referenceText}
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
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
                className="p-2 bg-white/80 rounded-[20px]"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Share verse of the day"
              >
                <Share2 size={18} color={ExploreColors.spiritual[500]} />
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* Accent Line */}
      <View
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: ExploreColors.spiritual[500] }}
      />
    </AnimatedPressable>
  );
});
