/**
 * Article Detail Screen
 *
 * Displays a single article with full content.
 * Features:
 * - Hero image with parallax scroll
 * - Reading progress indicator
 * - Share functionality
 * - Related articles (future)
 *
 * Styling: NativeWind-first
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Image,
  Share,
  Dimensions,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import {
  ChevronLeft,
  Share2,
  Clock,
  Calendar,
  Newspaper,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import RenderHtml from 'react-native-render-html';

import { useArticle, formatPublishDate } from '@/hooks/useArticles';

// Dimensions
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 280;

// Colors
const Colors = {
  primary: '#3B82F6',
  accent: '#C9A962',
  background: '#FFFFFF',
  text: {
    primary: '#111827',
    secondary: '#4B5563',
    tertiary: '#9CA3AF',
  },
};

export default function ArticleDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { width: contentWidth } = useWindowDimensions();

  // Fetch article
  const { data: article, isLoading } = useArticle(slug || '');

  // HTML rendering configuration for article content
  const htmlContentWidth = contentWidth - 40; // Padding on both sides
  const htmlTagsStyles = useMemo(() => ({
    body: {
      color: Colors.text.secondary,
      fontSize: 16,
      lineHeight: 28,
    },
    p: {
      marginBottom: 16,
      lineHeight: 28,
    },
    h1: {
      fontSize: 24,
      fontWeight: 'bold' as const,
      color: Colors.text.primary,
      marginTop: 24,
      marginBottom: 12,
    },
    h2: {
      fontSize: 20,
      fontWeight: 'bold' as const,
      color: Colors.text.primary,
      marginTop: 20,
      marginBottom: 10,
    },
    h3: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: Colors.text.primary,
      marginTop: 16,
      marginBottom: 8,
    },
    a: {
      color: Colors.primary,
      textDecorationLine: 'underline' as const,
    },
    ul: {
      marginBottom: 16,
    },
    ol: {
      marginBottom: 16,
    },
    li: {
      marginBottom: 8,
    },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: Colors.accent,
      paddingLeft: 16,
      fontStyle: 'italic' as const,
      marginVertical: 16,
    },
    img: {
      borderRadius: 8,
      marginVertical: 16,
    },
  }), []);

  // Scroll animation
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Header animation - becomes opaque as user scrolls
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, HERO_HEIGHT - 100],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  // Hero parallax effect
  const heroAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [-100, 0, HERO_HEIGHT],
      [-50, 0, HERO_HEIGHT * 0.5],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      scrollY.value,
      [-100, 0],
      [1.2, 1],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ translateY }, { scale }],
    };
  });

  // Navigation
  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  // Share
  const handleShare = useCallback(async () => {
    if (!article) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        title: article.title,
        message: `${article.title}\n\n${article.excerpt || ''}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  }, [article]);

  // Format date
  const formattedDate = useMemo(() => {
    if (!article?.publish_date) return '';
    return formatPublishDate(article.publish_date);
  }, [article?.publish_date]);

  // Loading state
  if (isLoading || !article) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Newspaper size={48} color={Colors.text.tertiary} />
        <Text className="text-typography-500 mt-4">
          {t('common.loading', 'Loading...')}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Fixed Header - appears on scroll */}
      <Animated.View
        style={[
          styles.fixedHeader,
          { paddingTop: insets.top },
          headerAnimatedStyle,
        ]}
      >
        <View className="flex-row items-center justify-between px-4 h-14">
          <Pressable
            onPress={handleBack}
            className="w-10 h-10 items-center justify-center rounded-full bg-white"
            style={styles.headerButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessible
            accessibilityRole="button"
            accessibilityLabel={t('common.back', 'Go back')}
          >
            <ChevronLeft size={24} color={Colors.text.primary} />
          </Pressable>

          <Text
            className="flex-1 text-center text-base font-semibold text-typography-900 mx-4"
            numberOfLines={1}
          >
            {article.title}
          </Text>

          <Pressable
            onPress={handleShare}
            className="w-10 h-10 items-center justify-center rounded-full bg-white"
            style={styles.headerButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessible
            accessibilityRole="button"
            accessibilityLabel={t('common.share', 'Share article')}
          >
            <Share2 size={20} color={Colors.text.primary} />
          </Pressable>
        </View>
      </Animated.View>

      {/* Floating back button - visible when header is transparent */}
      <View
        style={[styles.floatingHeader, { paddingTop: insets.top }]}
        pointerEvents="box-none"
      >
        <View className="flex-row items-center justify-between px-4 h-14">
          <Pressable
            onPress={handleBack}
            className="w-10 h-10 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessible
            accessibilityRole="button"
            accessibilityLabel={t('common.back', 'Go back')}
          >
            <ChevronLeft size={24} color="#FFFFFF" />
          </Pressable>

          <Pressable
            onPress={handleShare}
            className="w-10 h-10 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessible
            accessibilityRole="button"
            accessibilityLabel={t('common.share', 'Share article')}
          >
            <Share2 size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Hero Image */}
        <Animated.View style={[styles.heroContainer, heroAnimatedStyle]}>
          {article.featured_image ? (
            <Image
              source={{ uri: article.featured_image }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View
              className="w-full h-full items-center justify-center"
              style={{ backgroundColor: '#F3F4F6' }}
            >
              <Newspaper size={64} color={Colors.text.tertiary} />
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.heroGradient}
          />
        </Animated.View>

        {/* Content */}
        <View className="px-5 -mt-10 relative z-10">
          {/* Title Card */}
          <Animated.View
            entering={FadeInUp.delay(100).springify()}
            className="bg-white rounded-2xl p-5"
            style={styles.titleCard}
          >
            <Text className="text-2xl font-bold text-typography-900 mb-3">
              {article.title}
            </Text>

            {/* Meta row */}
            <View className="flex-row items-center gap-4">
              <View className="flex-row items-center gap-1">
                <Calendar size={14} color={Colors.text.tertiary} />
                <Text className="text-sm text-typography-500">
                  {formattedDate}
                </Text>
              </View>

              {article.reading_time && (
                <View className="flex-row items-center gap-1">
                  <Clock size={14} color={Colors.text.tertiary} />
                  <Text className="text-sm text-typography-500">
                    {article.reading_time} {t('articles.minRead', 'min read')}
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Excerpt */}
          {article.excerpt && (
            <Animated.View
              entering={FadeInUp.delay(200).springify()}
              className="mt-6"
            >
              <Text
                className="text-lg text-typography-600 italic leading-7"
                style={{ fontStyle: 'italic' }}
              >
                {article.excerpt}
              </Text>
            </Animated.View>
          )}

          {/* Content - Render HTML for rich article content */}
          <Animated.View
            entering={FadeInUp.delay(300).springify()}
            className="mt-6"
          >
            {article.content ? (
              <RenderHtml
                contentWidth={htmlContentWidth}
                source={{ html: article.content }}
                tagsStyles={htmlTagsStyles}
                enableExperimentalMarginCollapsing
              />
            ) : (
              <Text
                className="text-base text-typography-700 leading-7"
                style={{ lineHeight: 28 }}
              >
                {t('articles.noContent', 'Content not available.')}
              </Text>
            )}
          </Animated.View>

          {/* Tags */}
          {article.tag_ids && article.tag_ids.length > 0 && (
            <Animated.View
              entering={FadeIn.delay(400)}
              className="mt-8 flex-row flex-wrap gap-2"
            >
              {article.tag_ids.map((tagId) => (
                <View
                  key={tagId}
                  className="px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: '#F3F4F6' }}
                >
                  <Text className="text-xs text-typography-600">
                    #{tagId}
                  </Text>
                </View>
              ))}
            </Animated.View>
          )}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  heroContainer: {
    height: HERO_HEIGHT,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  titleCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
});
