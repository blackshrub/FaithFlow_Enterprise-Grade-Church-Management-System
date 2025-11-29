/**
 * DailyDevotionCard - Premium card component for daily devotions
 *
 * Design: World-class UI with full-bleed image and gradient overlay
 * - Instagram/Pinterest style image card
 * - Text overlaid on image with gradient
 * - Premium shadows and typography
 */

import React, { memo } from 'react';
import { View, Text, ImageBackground, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ExploreColors, ExploreSpacing, ExploreBorderRadius, ExploreShadows } from '@/constants/explore/designSystem';
import type { DailyDevotion } from '@/types/explore';
import { Clock, BookOpen, CheckCircle } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

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
      testID="daily-devotion-card"
    >
      <ImageBackground
        source={{ uri: imageUrl }}
        style={styles.imageBackground}
        imageStyle={styles.image}
        resizeMode="cover"
      >
        {/* Gradient Overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']}
          locations={[0, 0.4, 1]}
          style={styles.gradient}
        />

        {/* Completed Badge */}
        {completed && (
          <View style={styles.completedBadge}>
            <CheckCircle size={14} color="#FFFFFF" fill={ExploreColors.success[500]} />
            <Text style={styles.completedText}>Completed</Text>
          </View>
        )}

        {/* Content Overlay */}
        <View style={styles.content}>
          {/* Title */}
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>

          {/* Meta Row */}
          <View style={styles.metaRow}>
            {devotion.reading_time_minutes != null && (
              <View style={styles.metaItem}>
                <Clock size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.metaText}>{devotion.reading_time_minutes} min</Text>
              </View>
            )}

            {verseRef && (
              <View style={styles.metaItem}>
                <BookOpen size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.metaText}>{verseRef}</Text>
              </View>
            )}
          </View>
        </View>
      </ImageBackground>
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
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
  completedBadge: {
    position: 'absolute',
    top: ExploreSpacing.md,
    right: ExploreSpacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    padding: ExploreSpacing.lg,
    gap: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 28,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  metaRow: {
    flexDirection: 'row',
    gap: ExploreSpacing.md,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
});
