/**
 * BibleFigureCard - Premium card component for Bible figures
 *
 * Design: World-class UI with character-focused imagery
 * - Full-bleed image with gradient overlay
 * - Fallback avatar for missing images
 * - Premium shadows and typography
 */

import React, { memo } from 'react';
import { View, Text, ImageBackground, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ExploreColors, ExploreSpacing, ExploreBorderRadius, ExploreShadows } from '@/constants/explore/designSystem';
import type { BibleFigureOfTheDay } from '@/types/explore';
import { User, BookOpen, ChevronRight } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

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
        style={[styles.compactContainer, animatedStyle]}
        testID="bible-figure-card-compact"
      >
        {/* Avatar */}
        <View style={styles.compactAvatar}>
          {figure.image_url ? (
            <ImageBackground
              source={{ uri: figure.image_url }}
              style={styles.compactAvatarImage}
              imageStyle={{ borderRadius: 28 }}
            />
          ) : (
            <View style={styles.compactAvatarFallback}>
              <User size={24} color={ExploreColors.primary[500]} />
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.compactContent}>
          <Text style={styles.compactName} numberOfLines={1}>{name}</Text>
          {title && <Text style={styles.compactTitle} numberOfLines={1}>{title}</Text>}
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
      style={[styles.container, animatedStyle]}
      testID="bible-figure-card"
    >
      <ImageBackground
        source={{ uri: imageUrl }}
        style={styles.imageBackground}
        imageStyle={styles.image}
        resizeMode="cover"
      >
        {/* Gradient Overlay */}
        <LinearGradient
          colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.9)']}
          locations={[0, 0.5, 1]}
          style={styles.gradient}
        />

        {/* Content Overlay */}
        <View style={styles.content}>
          {/* Name & Title */}
          <View>
            <Text style={styles.name}>{name}</Text>
            {title && <Text style={styles.title}>{title}</Text>}
          </View>

          {/* Summary */}
          <Text style={styles.summary} numberOfLines={2}>
            {summary}
          </Text>

          {/* Read More Hint */}
          <View style={styles.readMoreContainer}>
            <BookOpen size={14} color="rgba(255,255,255,0.8)" />
            <Text style={styles.readMoreText}>
              {language === 'en' ? 'Tap to read full story' : 'Ketuk untuk baca cerita lengkap'}
            </Text>
          </View>
        </View>
      </ImageBackground>
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  // Full variant
  container: {
    borderRadius: ExploreBorderRadius.card,
    overflow: 'hidden',
    ...ExploreShadows.level2,
  },
  imageBackground: {
    width: '100%',
    height: CARD_HEIGHT,
    justifyContent: 'flex-end',
  },
  image: {
    borderRadius: ExploreBorderRadius.card,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: ExploreBorderRadius.card,
  },
  content: {
    padding: ExploreSpacing.lg,
    gap: 8,
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: ExploreColors.secondary[300],
    marginTop: 2,
  },
  summary: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
  },
  readMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  readMoreText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },

  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ExploreSpacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: ExploreBorderRadius.card,
    padding: ExploreSpacing.md,
    ...ExploreShadows.level1,
  },
  compactAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  compactAvatarImage: {
    width: '100%',
    height: '100%',
  },
  compactAvatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: ExploreColors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 28,
  },
  compactContent: {
    flex: 1,
    gap: 2,
  },
  compactName: {
    fontSize: 16,
    fontWeight: '600',
    color: ExploreColors.neutral[900],
  },
  compactTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: ExploreColors.neutral[500],
  },
});
