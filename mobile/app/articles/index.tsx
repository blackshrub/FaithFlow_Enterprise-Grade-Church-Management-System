/**
 * Articles List Screen
 *
 * Displays all church news articles in a premium grid layout.
 * Features:
 * - Pull-to-refresh
 * - Category filter chips
 * - Search functionality
 * - Staggered card animations
 * - 16:9 thumbnail images
 *
 * Styling: NativeWind-first
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  View,
  FlatList,
  Pressable,
  Image,
  RefreshControl,
  TextInput,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {
  ChevronLeft,
  Search,
  X,
  Clock,
  Newspaper,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useArticles, formatPublishDate } from '@/hooks/useArticles';
import type { Article } from '@/types/articles';

// Dimensions
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48 - 12) / 2; // 2 columns with gap
const IMAGE_HEIGHT = (CARD_WIDTH * 9) / 16;

// Colors
const Colors = {
  primary: '#3B82F6',
  accent: '#C9A962',
  background: '#F5F5F5',
  card: '#FFFFFF',
  text: {
    primary: '#111827',
    secondary: '#6B7280',
    tertiary: '#9CA3AF',
  },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ArticlesListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch articles
  const { data: articles = [], refetch } = useArticles({ limit: 50 });

  // Filter articles by search
  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    const query = searchQuery.toLowerCase();
    return articles.filter(
      (article) =>
        article.title.toLowerCase().includes(query) ||
        article.excerpt?.toLowerCase().includes(query)
    );
  }, [articles, searchQuery]);

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Navigation
  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleArticlePress = useCallback(
    (article: Article) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/articles/${article.slug}`);
    },
    [router]
  );

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  // Render article card
  const renderArticle = useCallback(
    ({ item, index }: { item: Article; index: number }) => (
      <ArticleCard
        article={item}
        index={index}
        onPress={() => handleArticlePress(item)}
      />
    ),
    [handleArticlePress]
  );

  const keyExtractor = useCallback((item: Article) => item.id, []);

  return (
    <View className="flex-1 bg-background-100">
      {/* Header */}
      <LinearGradient
        colors={['#FFFFFF', '#F9FAFB']}
        style={{ paddingTop: insets.top }}
      >
        <View className="px-4 pb-4">
          {/* Top row */}
          <View className="flex-row items-center justify-between h-14">
            <Pressable
              onPress={handleBack}
              className="w-10 h-10 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessible
              accessibilityRole="button"
              accessibilityLabel={t('common.back', 'Go back')}
            >
              <ChevronLeft size={24} color={Colors.text.primary} />
            </Pressable>

            <View className="flex-row items-center gap-2">
              <Newspaper size={20} color={Colors.accent} />
              <Text className="text-lg font-semibold text-typography-900">
                {t('articles.title', 'Church News')}
              </Text>
            </View>

            <View className="w-10" />
          </View>

          {/* Search bar */}
          <View
            className="flex-row items-center rounded-xl px-4 h-11 mt-2"
            style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
          >
            <Search size={18} color={Colors.text.tertiary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('articles.searchPlaceholder', 'Search articles...')}
              placeholderTextColor={Colors.text.tertiary}
              className="flex-1 ml-3 text-base text-typography-900"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={clearSearch}
                hitSlop={10}
                accessible
                accessibilityRole="button"
                accessibilityLabel={t('common.clearSearch', 'Clear search')}
              >
                <X size={18} color={Colors.text.tertiary} />
              </Pressable>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Articles Grid */}
      <FlatList
        data={filteredArticles}
        renderItem={renderArticle}
        keyExtractor={keyExtractor}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Newspaper size={48} color={Colors.text.tertiary} />
            <Text className="text-typography-500 mt-4 text-center">
              {searchQuery
                ? t('articles.noResults', 'No articles found')
                : t('articles.empty', 'No articles yet')}
            </Text>
          </View>
        }
      />
    </View>
  );
}

// =============================================================================
// ARTICLE CARD COMPONENT
// =============================================================================

interface ArticleCardProps {
  article: Article;
  index: number;
  onPress: () => void;
}

const ArticleCard = memo(function ArticleCard({
  article,
  index,
  onPress,
}: ArticleCardProps) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [scale]);

  const formattedDate = formatPublishDate(article.publish_date);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.card, animatedStyle]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${article.title}. ${article.excerpt || ''}`}
    >
      <Animated.View
        entering={FadeInUp.delay(index * 50).springify()}
        className="overflow-hidden rounded-xl bg-white"
        style={styles.cardShadow}
      >
        {/* Thumbnail */}
        <View style={{ height: IMAGE_HEIGHT }}>
          {article.featured_image ? (
            <Image
              source={{ uri: article.featured_image }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View
              className="w-full h-full items-center justify-center"
              style={{ backgroundColor: '#F3F4F6' }}
            >
              <Newspaper size={32} color={Colors.text.tertiary} />
            </View>
          )}

          {/* Reading time badge */}
          {article.reading_time && (
            <View
              className="absolute top-2 right-2 flex-row items-center gap-1 px-2 py-1 rounded-md"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            >
              <Clock size={10} color="#FFFFFF" />
              <Text className="text-[10px] text-white font-medium">
                {article.reading_time} {t('articles.minRead', 'min')}
              </Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View className="p-3">
          <Text
            className="text-sm font-semibold text-typography-900 mb-1"
            numberOfLines={2}
          >
            {article.title}
          </Text>

          {article.excerpt && (
            <Text
              className="text-xs text-typography-500 mb-2"
              numberOfLines={2}
            >
              {article.excerpt}
            </Text>
          )}

          <Text className="text-[11px] text-typography-400">
            {formattedDate}
          </Text>
        </View>
      </Animated.View>
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  columnWrapper: {
    paddingHorizontal: 16,
    gap: 12,
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  card: {
    width: CARD_WIDTH,
    marginBottom: 12,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
});
