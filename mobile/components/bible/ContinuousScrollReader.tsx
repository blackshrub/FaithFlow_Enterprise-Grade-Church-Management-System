/**
 * Continuous Scroll Bible Reader
 *
 * YouVersion-style infinite scroll reader:
 * - Continuous multi-chapter loading
 * - Automatic chapter detection from scroll position
 * - Long press for multi-verse selection
 * - Tap single verse for quick actions
 * - FlashList with item type detection
 * - Smooth animations with Moti
 */

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { View, Pressable, StyleSheet, ViewToken } from 'react-native';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { useBibleStore, type VerseRef, isSameVerse } from '@/stores/bibleStore';
import { useLatinBibleFont } from '@/stores/bibleFontStore';
import { getAppliedBibleFont } from '@/utils/fonts';
import { colors, spacing, readingThemes } from '@/constants/theme';
import {
  ChapterStreamLoader,
  type StreamItem,
  type ChapterHeaderItem,
  type VerseItem,
} from '@/lib/ChapterStreamLoader';
import type { BibleTranslation } from '@/types/bible';

interface ContinuousScrollReaderProps {
  version: BibleTranslation;
  initialBook: number;
  initialChapter: number;
  scrollToVerse?: number | null; // Verse to scroll to (triggers navigation)
  onChapterChange?: (book: number, chapter: number) => void;
  onScroll?: (event: { nativeEvent: { contentOffset: { y: number } } }) => void;
}

export function ContinuousScrollReader({
  version,
  initialBook,
  initialChapter,
  scrollToVerse,
  onChapterChange,
  onScroll,
}: ContinuousScrollReaderProps) {
  const {
    preferences,
    getHighlight,
    highlights,
    isSelecting,
    selectedVerses,
    enterSelectionMode,
    toggleVerseSelection,
    isVerseSelected,
    flashHighlights,
  } = useBibleStore();

  const latinFont = useLatinBibleFont();
  const appliedFont = getAppliedBibleFont(version, latinFont);

  const flashListRef = useRef<FlashList<StreamItem>>(null);
  const streamLoaderRef = useRef<ChapterStreamLoader | null>(null);
  const [items, setItems] = useState<StreamItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentVisibleChapter, setCurrentVisibleChapter] = useState({
    book: initialBook,
    chapter: initialChapter,
  });

  // Track if user is near top/bottom for loading more chapters
  const [isNearTop, setIsNearTop] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(false);

  // Initialize stream loader
  // IMPORTANT: Only re-initialize when version changes, NOT when initialBook/initialChapter change
  // This prevents random scrolling back to top when user is reading
  useEffect(() => {
    const initLoader = async () => {
      setIsLoading(true);

      const loader = new ChapterStreamLoader({
        version,
        initialBook,
        initialChapter,
        preloadCount: 2,
        maxLoadedChapters: 10,
      });

      const loadedItems = await loader.initialize();
      streamLoaderRef.current = loader;
      setItems(loadedItems);
      setIsLoading(false);
    };

    initLoader();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]); // Only depend on version - NOT initialBook/initialChapter

  /**
   * Handle intentional navigation (user taps search result, bookmark, or changes book/chapter manually)
   * Only reset and scroll when book/chapter differs significantly from currently visible chapter
   */
  useEffect(() => {
    const handleNavigation = async () => {
      if (!streamLoaderRef.current || isLoading) return;

      const currentChapter = currentVisibleChapter;

      // Check if navigation is significant (different book OR chapter differs by more than preload range)
      const bookChanged = initialBook !== currentChapter.book;
      const chapterDiff = Math.abs(initialChapter - currentChapter.chapter);
      const isSignificantChange = bookChanged || chapterDiff > 3;

      if (isSignificantChange) {
        console.log('🔄 Significant navigation detected - resetting loader');

        // Reset loader to new position
        const newItems = await streamLoaderRef.current.reset(initialBook, initialChapter);
        setItems(newItems);
        setCurrentVisibleChapter({ book: initialBook, chapter: initialChapter });

        // Scroll to specific verse if provided
        if (scrollToVerse) {
          setTimeout(() => {
            const verseIndex = streamLoaderRef.current?.findItemIndex(
              initialBook,
              initialChapter,
              scrollToVerse
            );
            if (verseIndex !== undefined && verseIndex >= 0) {
              flashListRef.current?.scrollToIndex({ index: verseIndex, animated: true });
            }
          }, 100);
        }
      } else if (scrollToVerse) {
        // Same chapter, just scroll to verse
        const verseIndex = streamLoaderRef.current.findItemIndex(
          initialBook,
          initialChapter,
          scrollToVerse
        );
        if (verseIndex >= 0) {
          flashListRef.current?.scrollToIndex({ index: verseIndex, animated: true });
        }
      }
    };

    handleNavigation();
  }, [initialBook, initialChapter, scrollToVerse, isLoading]);

  /**
   * Get font size from preferences
   */
  const getFontSize = () => {
    return preferences.fontSize;
  };

  /**
   * Get line height from preferences
   */
  const getLineHeight = () => {
    const heights = {
      compact: 1.4,
      normal: 1.6,
      relaxed: 1.8,
    };
    return heights[preferences.lineHeight];
  };

  /**
   * Get word spacing from preferences
   */
  const getWordSpacing = () => {
    const spacings = {
      normal: 0,
      wide: 2,
      wider: 4,
    };
    return spacings[preferences.wordSpacing];
  };

  /**
   * Get verse spacing from preferences
   */
  const getVerseSpacing = () => {
    const spacings = {
      none: 0,
      small: 6,
      large: 12,
    };
    return spacings[preferences.verseSpacing];
  };

  /**
   * Handle verse tap - single tap opens bottom sheet, long press enters selection mode
   */
  const handleVerseTap = useCallback(
    (verseItem: VerseItem) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const verseRef: VerseRef = {
        version,
        book: verseItem.bookName,
        chapter: verseItem.chapter,
        verse: verseItem.verse,
      };

      if (!isSelecting) {
        // Single tap - enter selection mode with this verse
        enterSelectionMode(verseRef);
      } else {
        // Already selecting - toggle this verse
        toggleVerseSelection(verseRef);
      }
    },
    [version, isSelecting, enterSelectionMode, toggleVerseSelection]
  );

  /**
   * Handle verse long press - enter selection mode
   */
  const handleVerseLongPress = useCallback(
    (verseItem: VerseItem) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const verseRef: VerseRef = {
        version,
        book: verseItem.bookName,
        chapter: verseItem.chapter,
        verse: verseItem.verse,
      };

      enterSelectionMode(verseRef);
    },
    [version, enterSelectionMode]
  );

  /**
   * Render chapter header
   */
  const renderChapterHeader = useCallback(
    (item: ChapterHeaderItem) => {
      const currentTheme = readingThemes[preferences.theme];

      return (
        <MotiView
          from={{ opacity: 0, translateY: -10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300 }}
        >
          <View style={[styles.chapterHeader, { backgroundColor: currentTheme.background }]}>
            <Heading
              size="xl"
              style={{
                color: currentTheme.text,
                fontWeight: '700',
              }}
            >
              {item.bookName} {item.chapter}
            </Heading>
          </View>
        </MotiView>
      );
    },
    [preferences.theme]
  );

  /**
   * Render verse
   */
  const renderVerse = useCallback(
    (item: VerseItem) => {
      const highlight = getHighlight(version, item.bookName, item.chapter, item.verse);
      const verseRef: VerseRef = {
        version,
        book: item.bookName,
        chapter: item.chapter,
        verse: item.verse,
      };
      const isSelected = isVerseSelected(verseRef);
      // Check if this verse has flash highlight (temporary bookmark navigation feedback)
      const isFlashHighlighted = flashHighlights.some(v => isSameVerse(v, verseRef));
      const currentTheme = readingThemes[preferences.theme];

      // Background color priority: Flash highlight > Regular highlight > Transparent
      // Flash highlights are temporary (3 seconds) to show bookmarked verses
      const backgroundColor = isFlashHighlighted
        ? colors.warning[200]  // Temporary flash highlight (3 seconds) - vibrant amber/yellow
        : highlight
        ? currentTheme.highlight[highlight.color]
        : 'transparent';

      return (
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{
            opacity: 1,
            translateY: 0,
            backgroundColor, // Animate backgroundColor for smooth fade-out
          }}
          transition={{
            type: 'timing',
            duration: 200,
            delay: Math.min(item.verse * 20, 500),
            backgroundColor: {
              type: 'timing',
              duration: 500, // Smooth 500ms fade-out when flash highlight is removed
            },
          }}
        >
          <Pressable
            onPress={() => handleVerseTap(item)}
            onLongPress={() => handleVerseLongPress(item)}
          >
            <View
              style={[
                styles.verseContainer,
                {
                  // backgroundColor moved to MotiView animate prop for smooth transitions
                  paddingVertical: getVerseSpacing(),
                  paddingHorizontal: spacing.md,
                  marginBottom: getVerseSpacing() * 0.5,
                  // Add left border for selected verses
                  ...(isSelected && {
                    borderLeftWidth: 3,
                    borderLeftColor: colors.primary[500],
                  }),
                },
              ]}
            >
              {/* Verse number */}
              {preferences.showVerseNumbers && (
                <Text
                  style={[
                    styles.verseNumber,
                    {
                      fontSize: getFontSize() * 0.7,
                      color: currentTheme.verseNumber,
                    },
                  ]}
                >
                  {item.verse}
                </Text>
              )}

              {/* Verse text */}
              <Text
                style={[
                  styles.verseText,
                  {
                    fontFamily: appliedFont,
                    fontSize: getFontSize(),
                    lineHeight: getFontSize() * getLineHeight(),
                    color: currentTheme.text,
                    textDecorationLine: isSelected ? 'underline' : 'none',
                    textDecorationStyle: isSelected ? 'dotted' : 'solid',
                    textDecorationColor: isSelected ? colors.primary[500] : 'transparent',
                    textAlign: preferences.textAlign,
                    letterSpacing: getWordSpacing(),
                  },
                ]}
              >
                {item.text}
              </Text>
            </View>
          </Pressable>
        </MotiView>
      );
    },
    [
      version,
      preferences,
      appliedFont,
      getHighlight,
      highlights,
      isVerseSelected,
      selectedVerses,
      handleVerseTap,
      handleVerseLongPress,
      flashHighlights,
    ]
  );

  /**
   * Render item based on type
   */
  const renderItem: ListRenderItem<StreamItem> = useCallback(
    ({ item }) => {
      if (item.type === 'chapter-header') {
        return renderChapterHeader(item);
      } else {
        return renderVerse(item);
      }
    },
    [renderChapterHeader, renderVerse]
  );

  /**
   * Get item type for FlashList optimization
   */
  const getItemType = useCallback((item: StreamItem) => {
    return item.type;
  }, []);

  /**
   * Handle viewable items change - detect current chapter
   */
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length === 0) return;

      // Find first chapter header or verse in viewable items
      const firstVisibleItem = viewableItems[0]?.item as StreamItem | undefined;

      if (firstVisibleItem) {
        const chapterInfo = streamLoaderRef.current?.getCurrentChapterFromItem(firstVisibleItem);

        if (chapterInfo && onChapterChange) {
          const { book, chapter } = chapterInfo;

          // Only notify if chapter actually changed
          if (book !== currentVisibleChapter.book || chapter !== currentVisibleChapter.chapter) {
            setCurrentVisibleChapter({ book, chapter });
            onChapterChange(book, chapter);
          }
        }
      }

      // Check if near top or bottom
      const firstIndex = viewableItems[0]?.index || 0;
      const lastIndex = viewableItems[viewableItems.length - 1]?.index || 0;

      setIsNearTop(firstIndex < 3);
      setIsNearBottom(lastIndex > items.length - 5);
    },
    [items.length, currentVisibleChapter, onChapterChange]
  );

  /**
   * Load more chapters when scrolling near boundaries
   */
  useEffect(() => {
    const loadMore = async () => {
      if (!streamLoaderRef.current) return;

      if (isNearBottom) {
        console.log('📖 Loading next chapter...');
        const newItems = await streamLoaderRef.current.loadNextChapter();
        setItems(newItems);
      } else if (isNearTop) {
        console.log('📖 Loading previous chapter...');
        const newItems = await streamLoaderRef.current.loadPreviousChapter();
        setItems(newItems);
      }
    };

    loadMore();
  }, [isNearTop, isNearBottom]);

  const currentTheme = readingThemes[preferences.theme];

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: currentTheme.background }]}>
        <Text style={{ color: currentTheme.text }}>Loading...</Text>
      </View>
    );
  }

  return (
    <FlashList
      ref={flashListRef}
      data={items}
      renderItem={renderItem}
      getItemType={getItemType}
      estimatedItemSize={100}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={{
        itemVisiblePercentThreshold: 50,
      }}
      drawDistance={800}
      contentContainerStyle={{
        paddingTop: spacing.md,
        paddingBottom: 160, // Space for verse selection bar
      }}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chapterHeader: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  verseContainer: {
    flexDirection: 'row',
    borderRadius: 8,
  },
  verseNumber: {
    fontWeight: '700',
    marginRight: spacing.sm,
    marginTop: 2,
    minWidth: 24,
  },
  verseText: {
    flex: 1,
  },
});
