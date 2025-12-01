/**
 * BibleFigureCard - Premium card component for Bible figures
 *
 * Design: World-class UI with character-focused imagery
 * - Full-bleed image with gradient overlay
 * - Fallback avatar for missing images
 * - Premium shadows and typography
 *
 * Styling: NativeWind-first with inline style for shadows/dynamic values
 */

import React, { memo } from 'react';
import { View, ImageBackground, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ExploreColors, ExploreShadows } from '@/constants/explore/designSystem';
import type { BibleFigureOfTheDay } from '@/types/explore';
import { User, BookOpen, ChevronRight } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';

const CARD_HEIGHT = 200;

interface BibleFigureCardProps {
  figure: BibleFigureOfTheDay;
  language: 'en' | 'id';
  onPress: () => void;
  variant?: 'compact' | 'full';
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Default placeholder for figures without images
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&q=80';

export const BibleFigureCard = memo(function BibleFigureCard({
  figure,
  language,
  onPress,
  variant = 'full',
}: BibleFigureCardProps) {
  const scale = useSharedValue(1);

  const name = figure.name[language] || figure.name.en;
  const summary = figure.summary[language] || figure.summary.en;
  const title = figure.title?.[language] || figure.title?.en;
  const imageUrl = figure.image_url || DEFAULT_IMAGE;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  // Compact variant for lists
  if (variant === 'compact') {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        className="flex-row items-center gap-4 bg-white rounded-2xl p-4"
        style={[{ ...ExploreShadows.level1 }, animatedStyle]}
        testID="bible-figure-card-compact"
      >
        {/* Avatar */}
        <View className="w-14 h-14 rounded-[28px] overflow-hidden">
          {figure.image_url ? (
            <ImageBackground
              source={{ uri: figure.image_url }}
              className="w-full h-full"
              imageStyle={{ borderRadius: 28 }}
            />
          ) : (
            <View
              className="w-full h-full justify-center items-center rounded-[28px]"
              style={{ backgroundColor: ExploreColors.primary[50] }}
            >
              <User size={24} color={ExploreColors.primary[500]} />
            </View>
          )}
        </View>

        {/* Content */}
        <View className="flex-1 gap-0.5">
          <Text
            className="text-base font-semibold"
            style={{ color: ExploreColors.neutral[900] }}
            numberOfLines={1}
          >
            {name}
          </Text>
          {title && (
            <Text
              className="text-[13px] font-medium"
              style={{ color: ExploreColors.neutral[500] }}
              numberOfLines={1}
            >
              {title}
            </Text>
          )}
        </View>

        {/* Arrow */}
        <ChevronRight size={20} color={ExploreColors.neutral[400]} />
      </AnimatedPressable>
    );
  }

  // Full variant with image
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      className="rounded-2xl overflow-hidden"
      style={[{ ...ExploreShadows.level2 }, animatedStyle]}
      testID="bible-figure-card"
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
          colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.9)']}
          locations={[0, 0.5, 1]}
          className="absolute inset-0 rounded-2xl"
        />

        {/* Content Overlay */}
        <View className="p-5 gap-2">
          {/* Name & Title */}
          <View>
            <Text
              className="text-2xl font-extrabold text-white"
              style={{
                textShadowColor: 'rgba(0,0,0,0.3)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
              }}
            >
              {name}
            </Text>
            {title && (
              <Text
                className="text-sm font-semibold mt-0.5"
                style={{ color: ExploreColors.secondary[300] }}
              >
                {title}
              </Text>
            )}
          </View>

          {/* Summary */}
          <Text
            className="text-sm font-normal text-white/85 leading-5"
            numberOfLines={2}
          >
            {summary}
          </Text>

          {/* Read More Hint */}
          <View className="flex-row items-center gap-1.5 mt-1">
            <BookOpen size={14} color="rgba(255,255,255,0.8)" />
            <Text className="text-xs font-medium text-white/70">
              {language === 'en' ? 'Tap to read full story' : 'Ketuk untuk baca cerita lengkap'}
            </Text>
          </View>
        </View>
      </ImageBackground>
    </AnimatedPressable>
  );
});
