/**
 * ChurchNewsSection - Articles/News Horizontal Carousel
 *
 * Premium carousel showing church news and articles.
 * Features:
 * - 65% width cards (shows 1.5 cards visible)
 * - 16:9 thumbnail images
 * - Reading time badge
 * - "See all" link to articles list
 * - HIDES section if no articles
 *
 * Styling: NativeWind-first with inline styles for shadows/animations
 */

import React, { memo, useCallback } from 'react';
import {
  View,
  Pressable,
  FlatList,
  Image,
  Dimensions,
  StyleSheet,
  ListRenderItemInfo,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { useTranslation } from 'react-i18next';
import { Newspaper, Clock, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { PMotion } from '@/components/motion/premium-motion';
import { formatPublishDate } from '@/hooks/useArticles';
import type { Article } from '@/types/articles';

// Dimensions
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.65;
const CARD_GAP = 12;
const PADDING_HORIZONTAL = 20;
const IMAGE_HEIGHT = (CARD_WIDTH * 9) / 16; // 16:9 aspect ratio

// Colors
const Colors = {
  accent: {
    primary: '#C9A962',
    light: '#E8D5A8',
  },
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    400: '#A3A3A3',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ChurchNewsSectionProps {
  articles: Article[];
  focusKey?: number | string;
}

export const ChurchNewsSection = memo(function ChurchNewsSection({
  articles,
  focusKey = 0,
}: ChurchNewsSectionProps) {
  const { t } = useTranslation();
  const router = useRouter();

  // Don't render if no articles
  if (!articles || articles.length === 0) {
    return null;
  }

  // Limit to 5 articles
  const displayArticles = articles.slice(0, 5);

  const handleSeeAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/articles');
  }, [router]);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Article>) => (
      <ArticleCard
        article={item}
        index={index}
        isLast={index === displayArticles.length - 1}
      />
    ),
    [displayArticles.length]
  );

  const keyExtractor = useCallback((item: Article) => item.id, []);

  return (
    <Animated.View
      key={`news-${focusKey}`}
      entering={PMotion.sectionStagger(4)}
      className="mb-6"
    >
      {/* Section Header */}
      <View className="flex-row items-center justify-between mb-3 px-5">
        <View className="flex-row items-center gap-2">
          <Newspaper size={16} color={Colors.accent.primary} />
          <Text
            className="text-[13px] font-semibold text-typography-500 uppercase"
            style={{ letterSpacing: 1 }}
          >
            {t('today.churchNews', 'Church News')}
          </Text>
        </View>

        <Pressable
          onPress={handleSeeAll}
          className="flex-row items-center gap-1"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessible
          accessibilityRole="button"
          accessibilityLabel="See all church news articles"
        >
          <Text className="text-[13px] font-medium text-primary-500">
            {t('common.seeAll', 'See all')}
          </Text>
          <ChevronRight size={14} color="#3B82F6" />
        </Pressable>
      </View>

      {/* Carousel */}
      <FlatList
        data={displayArticles}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        bounces={false}
      />
    </Animated.View>
  );
});

// =============================================================================
// ARTICLE CARD COMPONENT
// =============================================================================

interface ArticleCardProps {
  article: Article;
  index: number;
  isLast: boolean;
}

const ArticleCard = memo(function ArticleCard({
  article,
  index,
  isLast,
}: ArticleCardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/articles/${article.slug}`);
  }, [router, article.slug]);

  // Format date
  const formattedDate = formatPublishDate(article.publish_date);

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card,
        {
          width: CARD_WIDTH,
          marginLeft: index === 0 ? PADDING_HORIZONTAL : CARD_GAP / 2,
          marginRight: isLast ? PADDING_HORIZONTAL : CARD_GAP / 2,
        },
        animatedStyle,
      ]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Read article: ${article.title}`}
    >
      {/* Thumbnail */}
      <View style={styles.imageContainer}>
        {article.featured_image ? (
          <Image
            source={{ uri: article.featured_image }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Newspaper size={32} color={Colors.neutral[400]} />
          </View>
        )}

        {/* Gradient Overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)']}
          style={styles.gradient}
        />

        {/* Reading Time Badge */}
        <View style={styles.readingTimeBadge}>
          <Clock size={10} color="#FFFFFF" />
          <Text style={styles.readingTimeText}>
            {article.reading_time} {t('articles.minRead', 'min read')}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {article.title}
        </Text>

        {/* Meta Row */}
        <View style={styles.metaRow}>
          <Text style={styles.dateText}>{formattedDate}</Text>
          {article.views_count > 0 && (
            <Text style={styles.viewsText}>
              {article.views_count.toLocaleString()} views
            </Text>
          )}
        </View>

        {/* Excerpt */}
        {article.excerpt && (
          <Text style={styles.excerpt} numberOfLines={2}>
            {article.excerpt}
          </Text>
        )}
      </View>
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  listContent: {
    alignItems: 'stretch',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  imageContainer: {
    width: '100%',
    height: IMAGE_HEIGHT,
    backgroundColor: Colors.neutral[100],
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.neutral[100],
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  readingTimeBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  readingTimeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.neutral[800],
    lineHeight: 20,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  dateText: {
    fontSize: 12,
    color: Colors.neutral[600],
  },
  viewsText: {
    fontSize: 12,
    color: Colors.neutral[400],
  },
  excerpt: {
    fontSize: 13,
    color: Colors.neutral[600],
    lineHeight: 18,
  },
});
