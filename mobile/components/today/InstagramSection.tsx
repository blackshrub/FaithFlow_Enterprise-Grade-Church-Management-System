/**
 * InstagramSection - Social Media Grid Preview
 *
 * Premium Instagram grid showing church's latest posts.
 * Features:
 * - 3-column square grid (Instagram native feel)
 * - Deep links to Instagram app or web
 * - Church handle with Follow button
 * - HIDES section if no instagram_handle configured
 *
 * Styling: NativeWind-first with inline styles for shadows/animations
 */

import React, { memo, useCallback } from 'react';
import {
  View,
  Pressable,
  Image,
  Dimensions,
  StyleSheet,
  Linking,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { useTranslation } from 'react-i18next';
import { Instagram, ExternalLink } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';

import { PMotion } from '@/components/motion/premium-motion';
import type { InstagramPost, ChurchInstagram } from '@/mock/staticMedia';

// Dimensions
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PADDING_HORIZONTAL = 20;
const GRID_GAP = 4;
const GRID_WIDTH = SCREEN_WIDTH - PADDING_HORIZONTAL * 2;
const CELL_SIZE = (GRID_WIDTH - GRID_GAP * 2) / 3;

// Colors
const Colors = {
  accent: {
    primary: '#C9A962',
    light: '#E8D5A8',
  },
  instagram: {
    pink: '#E1306C',
    purple: '#833AB4',
    orange: '#F77737',
    yellow: '#FCAF45',
  },
  neutral: {
    100: '#F5F5F5',
    400: '#A3A3A3',
    600: '#525252',
    800: '#262626',
  },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface InstagramSectionProps {
  posts: InstagramPost[];
  church: ChurchInstagram;
  focusKey?: number | string;
}

export const InstagramSection = memo(function InstagramSection({
  posts,
  church,
  focusKey = 0,
}: InstagramSectionProps) {
  const { t } = useTranslation();

  // Don't render if no posts or no church handle
  if (!posts || posts.length === 0 || !church?.handle) {
    return null;
  }

  // Limit to 3 posts (one row)
  const displayPosts = posts.slice(0, 3);

  const handleFollow = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Try to open Instagram app first
      const instagramUrl = `instagram://user?username=${church.handle.replace('@', '')}`;
      const canOpen = await Linking.canOpenURL(instagramUrl);

      if (canOpen) {
        await Linking.openURL(instagramUrl);
      } else {
        // Fallback to web
        await WebBrowser.openBrowserAsync(church.profile_url);
      }
    } catch (error) {
      console.error('Failed to open Instagram:', error);
      await WebBrowser.openBrowserAsync(church.profile_url);
    }
  }, [church]);

  return (
    <Animated.View
      key={`instagram-${focusKey}`}
      entering={PMotion.sectionStagger(5)}
      className="mb-6 px-5"
    >
      {/* Section Header */}
      <View className="flex-row items-center gap-2 mb-3">
        <Instagram size={16} color={Colors.instagram.pink} />
        <Text
          className="text-[13px] font-semibold text-typography-500 uppercase"
          style={{ letterSpacing: 1 }}
        >
          {t('today.instagram.title', 'Follow Us on Instagram')}
        </Text>
      </View>

      {/* Grid Container */}
      <View style={styles.gridContainer}>
        {displayPosts.map((post, index) => (
          <InstagramCell
            key={post.id}
            post={post}
            index={index}
          />
        ))}
      </View>

      {/* Footer: Handle + Follow Button */}
      <View style={styles.footer}>
        <Text style={styles.handleText}>{church.handle}</Text>

        <Pressable
          onPress={handleFollow}
          style={styles.followButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Follow ${church.handle} on Instagram`}
        >
          <Text style={styles.followButtonText}>
            {t('today.instagram.follow', 'Follow')}
          </Text>
          <ExternalLink size={12} color="#FFFFFF" />
        </Pressable>
      </View>
    </Animated.View>
  );
});

// =============================================================================
// INSTAGRAM CELL COMPONENT
// =============================================================================

interface InstagramCellProps {
  post: InstagramPost;
  index: number;
}

const InstagramCell = memo(function InstagramCell({
  post,
  index,
}: InstagramCellProps) {
  const scale = useSharedValue(1);
  const overlayOpacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
    overlayOpacity.value = withSpring(0.4, { damping: 15, stiffness: 300 });
  }, [scale, overlayOpacity]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    overlayOpacity.value = withSpring(0, { damping: 15, stiffness: 300 });
  }, [scale, overlayOpacity]);

  const handlePress = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // Try to open Instagram app
      const canOpen = await Linking.canOpenURL(post.permalink);
      if (canOpen) {
        await Linking.openURL(post.permalink);
      } else {
        await WebBrowser.openBrowserAsync(post.permalink);
      }
    } catch (error) {
      console.error('Failed to open Instagram post:', error);
      await WebBrowser.openBrowserAsync(post.permalink);
    }
  }, [post.permalink]);

  // Staggered entry animation delay
  const staggerDelay = index * 100;

  return (
    <Animated.View
      entering={FadeIn.delay(staggerDelay).duration(300)}
    >
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.cell, animatedStyle]}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Open Instagram post"
      >
        <Image
          source={{ uri: post.image_url }}
          style={styles.cellImage}
          resizeMode="cover"
        />

        {/* Press Overlay */}
        <Animated.View style={[styles.cellOverlay, overlayStyle]} />
      </AnimatedPressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: 'row',
    gap: GRID_GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Colors.neutral[100],
  },
  cellImage: {
    width: '100%',
    height: '100%',
  },
  cellOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  handleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[600],
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.instagram.pink,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  followButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
