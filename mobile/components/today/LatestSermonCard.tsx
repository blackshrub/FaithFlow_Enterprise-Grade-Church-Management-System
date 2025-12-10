/**
 * LatestSermonCard - Hero Video Card (YouTube)
 *
 * Netflix/YouTube style hero card for the latest sermon video.
 * Features:
 * - Full-width 16:9 thumbnail with gradient overlay
 * - Centered play button with subtle pulse animation
 * - Title, date, and duration display
 * - Deep links to YouTube app or opens in WebView
 * - HIDES entirely if no sermon URL configured
 *
 * Styling: NativeWind-first with inline styles for shadows/animations
 */

import React, { memo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  Dimensions,
  StyleSheet,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Play, Calendar, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';

import { PMotion } from '@/components/motion/premium-motion';
import type { LatestSermon } from '@/mock/staticMedia';
import { formatDuration, extractYouTubeVideoId, getYouTubeThumbnail } from '@/hooks/useStaticMedia';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = 20;
const CARD_WIDTH = SCREEN_WIDTH - CARD_MARGIN * 2;
const CARD_HEIGHT = (CARD_WIDTH * 9) / 16; // 16:9 aspect ratio
const PLAY_BUTTON_SIZE = 60;

// Colors
const Colors = {
  accent: {
    primary: '#C9A962',
    light: '#E8D5A8',
  },
  overlay: {
    dark: 'rgba(0, 0, 0, 0.6)',
    gradient: ['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)'] as const,
  },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface LatestSermonCardProps {
  sermon: LatestSermon;
  focusKey?: number | string;
}

export const LatestSermonCard = memo(function LatestSermonCard({
  sermon,
  focusKey = 0,
}: LatestSermonCardProps) {
  const { t } = useTranslation();

  // Animation values
  const cardScale = useSharedValue(1);
  const playButtonScale = useSharedValue(1);
  const playButtonGlow = useSharedValue(0);

  // Play button pulse animation
  useEffect(() => {
    // Subtle pulse every 3 seconds
    playButtonGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [playButtonGlow]);

  // Animated styles
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const playButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playButtonScale.value }],
    shadowOpacity: 0.3 + playButtonGlow.value * 0.3,
  }));

  // Press handlers
  const handlePressIn = useCallback(() => {
    cardScale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
    playButtonScale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  }, [cardScale, playButtonScale]);

  const handlePressOut = useCallback(() => {
    cardScale.value = withSpring(1, { damping: 15, stiffness: 300 });
    playButtonScale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [cardScale, playButtonScale]);

  const handlePress = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Try to open YouTube app first
      const canOpen = await Linking.canOpenURL(sermon.youtube_url);
      if (canOpen) {
        await Linking.openURL(sermon.youtube_url);
      } else {
        // Fallback to in-app browser
        await WebBrowser.openBrowserAsync(sermon.youtube_url);
      }
    } catch (error) {
      console.error('Failed to open sermon video:', error);
      // Final fallback: try web browser anyway
      await WebBrowser.openBrowserAsync(sermon.youtube_url);
    }
  }, [sermon.youtube_url]);

  // Format date
  const formattedDate = new Date(sermon.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  // Get thumbnail - prefer API thumbnail, fallback to YouTube auto-thumbnail
  const thumbnailUrl = sermon.thumbnail_url || (() => {
    const videoId = extractYouTubeVideoId(sermon.youtube_url);
    return videoId ? getYouTubeThumbnail(videoId) : null;
  })();

  return (
    <Animated.View
      key={`sermon-${focusKey}`}
      entering={PMotion.sectionStagger(0)}
      className="mb-6 px-5"
    >
      {/* Section Header */}
      <View className="flex-row items-center gap-2 mb-3">
        <Play size={16} color={Colors.accent.primary} fill={Colors.accent.primary} />
        <Text
          className="text-[13px] font-semibold text-typography-500 uppercase"
          style={{ letterSpacing: 1 }}
        >
          {t('today.missedSunday', 'Missed Sunday?')}
        </Text>
      </View>

      {/* Card */}
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.card, cardAnimatedStyle]}
        accessibilityRole="button"
        accessibilityLabel={`Watch ${sermon.title}`}
        accessibilityHint="Opens YouTube to watch the sermon"
      >
        {/* Thumbnail Image */}
        {thumbnailUrl ? (
          <Image
            source={{ uri: thumbnailUrl }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
            <Play size={48} color="#666" />
          </View>
        )}

        {/* Gradient Overlay */}
        <LinearGradient
          colors={Colors.overlay.gradient}
          locations={[0, 0.4, 1]}
          style={styles.gradientOverlay}
        />

        {/* Play Button (Centered) */}
        <View style={styles.playButtonContainer}>
          <Animated.View
            style={[styles.playButton, playButtonAnimatedStyle]}
          >
            <Play
              size={28}
              color="#FFFFFF"
              fill="#FFFFFF"
              style={{ marginLeft: 3 }} // Optical alignment for play icon
            />
          </Animated.View>
        </View>

        {/* Content Overlay (Bottom) */}
        <View style={styles.contentOverlay}>
          {/* Title */}
          <Text
            style={styles.title}
            numberOfLines={2}
          >
            {sermon.title}
          </Text>

          {/* Meta Row */}
          <View style={styles.metaRow}>
            {/* Date */}
            <View style={styles.metaBadge}>
              <Calendar size={12} color="rgba(255,255,255,0.8)" />
              <Text style={styles.metaText}>{formattedDate}</Text>
            </View>

            {/* Duration */}
            <View style={styles.metaBadge}>
              <Clock size={12} color="rgba(255,255,255,0.8)" />
              <Text style={styles.metaText}>
                {formatDuration(sermon.duration_minutes)}
              </Text>
            </View>

            {/* Watch Now CTA */}
            <View style={styles.watchNowBadge}>
              <Text style={styles.watchNowText}>
                {t('today.watchNow', 'Watch Now')}
              </Text>
            </View>
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT + 80, // Extra height for content
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    // Premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  thumbnail: {
    width: '100%',
    height: CARD_HEIGHT,
    backgroundColor: '#2a2a2a',
  },
  thumbnailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    height: CARD_HEIGHT,
  },
  playButtonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: CARD_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: PLAY_BUTTON_SIZE,
    height: PLAY_BUTTON_SIZE,
    borderRadius: PLAY_BUTTON_SIZE / 2,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    // Shadow for glow effect
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 15,
  },
  contentOverlay: {
    padding: 16,
    paddingTop: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 24,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  watchNowBadge: {
    marginLeft: 'auto',
    backgroundColor: Colors.accent.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  watchNowText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
});
