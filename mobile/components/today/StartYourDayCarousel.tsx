/**
 * StartYourDayCarousel - Devotion + Verse Horizontal Carousel
 *
 * Premium carousel showing daily devotion and verse of the day.
 * Features:
 * - 88% width cards with peek effect (shows next card edge)
 * - Snap-to-card scrolling with spring physics
 * - Animated pagination dots
 * - Reuses existing DailyDevotionCard and VerseOfTheDayCard
 *
 * Styling: NativeWind-first with inline styles for animations
 */

import React, { memo, useCallback, useMemo, useRef } from 'react';
import { View, Dimensions, StyleSheet, FlatList, ListRenderItemInfo, Share, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { useTranslation } from 'react-i18next';
import { Sun } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';

import { PMotion } from '@/components/motion/premium-motion';
import { PaginationDots } from './PaginationDots';
import { DailyDevotionCard } from '@/components/explore/DailyDevotionCard';
import { VerseOfTheDayCard } from '@/components/explore/VerseOfTheDayCard';
import { useExploreStore } from '@/stores/explore/exploreStore';
import type { DailyDevotion, VerseOfTheDay } from '@/types/explore';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

// Dimensions
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.88;
const CARD_GAP = 12;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;
const PADDING_HORIZONTAL = 20;

// Colors
const Colors = {
  accent: {
    primary: '#C9A962',
    light: '#E8D5A8',
  },
};

type CarouselItem =
  | { type: 'devotion'; data: DailyDevotion }
  | { type: 'verse'; data: VerseOfTheDay };

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<CarouselItem>);

interface StartYourDayCarouselProps {
  devotion: DailyDevotion | null;
  verse: VerseOfTheDay | null;
  focusKey?: number | string;
}

export const StartYourDayCarousel = memo(function StartYourDayCarousel({
  devotion,
  verse,
  focusKey = 0,
}: StartYourDayCarouselProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const contentLanguage = useExploreStore((state) => state.contentLanguage);
  const flatListRef = useRef<FlatList>(null);

  // Animation value for scroll position
  const scrollX = useSharedValue(0);

  // Build carousel items
  const items = useMemo<CarouselItem[]>(() => {
    const result: CarouselItem[] = [];
    if (devotion) {
      result.push({ type: 'devotion', data: devotion });
    }
    if (verse) {
      result.push({ type: 'verse', data: verse });
    }
    return result;
  }, [devotion, verse]);

  // Don't render if no items
  if (items.length === 0) {
    return null;
  }

  // Scroll handler
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  // Navigation handlers
  const handleDevotionPress = useCallback(() => {
    if (!devotion) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/explore/devotion/${devotion.id}`);
  }, [devotion, router]);

  const handleVersePress = useCallback(() => {
    if (!verse) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/explore/verse/${verse.id}`);
  }, [verse, router]);

  const handleVerseShare = useCallback(async () => {
    if (!verse) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Get verse text from verse_text multilingual object
    const verseText = verse.verse_text?.[contentLanguage] || verse.verse_text?.en || '';
    // Get reference from verse.verse (BibleReference)
    const reference = verse.verse
      ? `${verse.verse.book} ${verse.verse.chapter}:${verse.verse.verse_start}${verse.verse.verse_end ? `-${verse.verse.verse_end}` : ''}`
      : '';
    const shareMessage = `"${verseText}"\n\n— ${reference}\n\n🙏 Shared from FaithFlow`;

    try {
      await Share.share({
        message: shareMessage,
        ...(Platform.OS === 'ios' ? { title: `Verse of the Day: ${reference}` } : {}),
      });
    } catch (error) {
      // User cancelled or share failed - no action needed
    }
  }, [verse, contentLanguage]);

  // Render carousel item
  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<CarouselItem>) => {
      const isFirst = index === 0;
      const isLast = index === items.length - 1;

      return (
        <View
          style={[
            styles.cardContainer,
            {
              width: CARD_WIDTH,
              marginLeft: isFirst ? PADDING_HORIZONTAL : CARD_GAP / 2,
              marginRight: isLast ? PADDING_HORIZONTAL : CARD_GAP / 2,
            },
          ]}
        >
          {item.type === 'devotion' ? (
            <DailyDevotionCard
              devotion={item.data}
              language={contentLanguage}
              onPress={handleDevotionPress}
              completed={false}
            />
          ) : (
            <VerseOfTheDayCard
              verse={item.data}
              language={contentLanguage}
              onPress={handleVersePress}
              onShare={handleVerseShare}
            />
          )}
        </View>
      );
    },
    [items.length, contentLanguage, handleDevotionPress, handleVersePress, handleVerseShare]
  );

  // Key extractor
  const keyExtractor = useCallback(
    (item: CarouselItem) => `${item.type}-${item.data.id}`,
    []
  );

  // Get item layout for performance
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: CARD_WIDTH + CARD_GAP,
      offset: (CARD_WIDTH + CARD_GAP) * index,
      index,
    }),
    []
  );

  return (
    <Animated.View
      key={`start-day-${focusKey}`}
      entering={PMotion.sectionStagger(1)}
      className="mb-6"
    >
      {/* Section Header */}
      <View className="flex-row items-center gap-2 mb-3 px-5">
        <Sun size={16} color={Colors.accent.primary} />
        <Text
          className="text-[13px] font-semibold text-typography-500 uppercase"
          style={{ letterSpacing: 1 }}
        >
          {t('today.startYourDay', 'Start Your Day')}
        </Text>
      </View>

      {/* Carousel */}
      <AnimatedFlatList
        ref={flatListRef}
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        getItemLayout={getItemLayout}
        bounces={false}
      />

      {/* Pagination Dots */}
      {items.length > 1 && (
        <PaginationDots
          total={items.length}
          scrollX={scrollX}
          itemWidth={SNAP_INTERVAL}
          className="mt-4"
        />
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  listContent: {
    alignItems: 'stretch',
  },
  cardContainer: {
    // Card container styles handled inline
  },
});
