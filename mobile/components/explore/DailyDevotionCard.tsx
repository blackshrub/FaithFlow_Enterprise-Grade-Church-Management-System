/**
 * DailyDevotionCard - Premium card component for daily devotions
 *
 * Design: World-class UI with full-bleed image and gradient overlay
 * - Instagram/Pinterest style image card
 * - Text overlaid on image with gradient
 * - Premium shadows and typography
 *
 * Styling: NativeWind-first with inline style for shadows/dynamic values
 */

import React, { memo } from 'react';
import { View, ImageBackground, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ExploreColors, ExploreShadows } from '@/constants/explore/designSystem';
import type { DailyDevotion } from '@/types/explore';
import { Clock, BookOpen, CheckCircle } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { AudioPlayButton } from './AudioPlayButton';
import { Text } from '@/components/ui/text';

const CARD_HEIGHT = 220;

interface DailyDevotionCardProps {
  devotion: DailyDevotion;
  language: 'en' | 'id';
  onPress: () => void;
  completed?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Default image for when none is provided
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80';

export const DailyDevotionCard = memo(function DailyDevotionCard({
  devotion,
  language,
  onPress,
  completed = false,
}: DailyDevotionCardProps) {
  const scale = useSharedValue(1);

  const title = devotion.title?.[language] || devotion.title?.en || 'Untitled';
  const imageUrl = devotion.image_url || DEFAULT_IMAGE;

  // Format verse reference
  const verseRef = devotion.main_verse
    ? `${devotion.main_verse.book} ${devotion.main_verse.chapter}:${devotion.main_verse.verse_start}${
        devotion.main_verse.verse_end ? `-${devotion.main_verse.verse_end}` : ''
      }`
    : null;

  // Build text for TTS (title + verse text for preview)
  const ttsText = [
    title,
    devotion.main_verse?.text?.[language] || devotion.main_verse?.text?.en,
  ].filter(Boolean).join('. ');

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
      className="rounded-2xl overflow-hidden"
      style={[{ ...ExploreShadows.level2 }, animatedStyle]}
      testID="daily-devotion-card"
    >
      <ImageBackground
        source={{ uri: imageUrl }}
        className="w-full justify-end"
        style={{ height: CARD_HEIGHT }}
        imageStyle={{ borderRadius: 16 }}
        resizeMode="cover"
      >
        {/* Gradient Overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']}
          locations={[0, 0.4, 1]}
          className="absolute inset-0 rounded-2xl"
        />

        {/* Completed Badge */}
        {completed && (
          <View className="absolute top-3 right-3 flex-row items-center gap-1 bg-black/50 px-2.5 py-1.5 rounded-[20px]">
            <CheckCircle size={14} color="#FFFFFF" fill={ExploreColors.success[500]} />
            <Text className="text-xs font-semibold text-white">Completed</Text>
          </View>
        )}

        {/* Content Overlay */}
        <View className="p-5 gap-1.5">
          {/* Title */}
          <Text
            className="text-[22px] font-bold text-white leading-7"
            style={{
              textShadowColor: 'rgba(0,0,0,0.3)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 3,
            }}
            numberOfLines={2}
          >
            {title}
          </Text>

          {/* Meta Row */}
          <View className="flex-row items-center gap-4 mt-1">
            {devotion.reading_time_minutes != null && (
              <View className="flex-row items-center gap-1">
                <Clock size={14} color="rgba(255,255,255,0.8)" />
                <Text className="text-[13px] font-medium text-white/80">
                  {devotion.reading_time_minutes} min
                </Text>
              </View>
            )}

            {verseRef && (
              <View className="flex-row items-center gap-1">
                <BookOpen size={14} color="rgba(255,255,255,0.8)" />
                <Text className="text-[13px] font-medium text-white/80">{verseRef}</Text>
              </View>
            )}

            {/* Audio Play Button */}
            {ttsText && (
              <View className="ml-auto">
                <AudioPlayButton
                  text={ttsText}
                  variant="icon"
                  size={32}
                  color="#FFFFFF"
                  backgroundColor="rgba(255,255,255,0.2)"
                />
              </View>
            )}
          </View>
        </View>
      </ImageBackground>
    </AnimatedPressable>
  );
});
