/**
 * Bible Chapter Reader Component
 *
 * YouVersion-style reading experience:
 * - FlashList for smooth scrolling
 * - Tap verse to select
 * - Long press for actions (highlight, copy, share, note)
 * - Clean, readable typography
 * - Optimized for long-form reading
 */

import React, { useCallback, useRef, useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { HStack } from '@/components/ui/hstack';
import { useBibleStore, type VerseRef, isSameVerse } from '@/stores/bibleStore';
import { useLatinBibleFont } from '@/stores/bibleFontStore';
import { getAppliedBibleFont } from '@/utils/fonts';
import { colors, spacing, readingThemes, shadows } from '@/constants/theme';
import type { BibleVerse } from '@/types/bible';

interface ChapterReaderProps {
  verses: BibleVerse[];
  version: string;
  book: string;
  chapter: number;
  scrollToVerse?: number | null;
  totalChapters: number;
  onPreviousChapter?: () => void;
  onNextChapter?: () => void;
  onScroll?: (event: { nativeEvent: { contentOffset: { y: number } } }) => void;
}

export function ChapterReader({
  verses,
  version,
  book,
  chapter,
  scrollToVerse,
  totalChapters,
  onPreviousChapter,
  onNextChapter,
  onScroll,
}: ChapterReaderProps) {
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
  const latinFont = useLatinBibleFont(); // Get Latin Bible font selection
  const flashListRef = useRef<FlashList<BibleVerse>>(null);

  // Get appropriate font based on Bible version
  // Latin Bibles: use selected custom font
  // Chinese Bibles: use system font automatically
  const appliedFont = getAppliedBibleFont(version, latinFont);

  // Scroll to top when chapter changes (unless scrollToVerse is set)
  useEffect(() => {
    if (verses.length > 0 && !scrollToVerse) {
      // Scroll to top for new chapter
      setTimeout(() => {
        flashListRef.current?.scrollToOffset({
          offset: 0,
          animated: false,
        });
      }, 100);
    }
  }, [chapter, verses.length]);

  // Scroll to specific verse when requested (from search or bookmarks)
  useEffect(() => {
    if (scrollToVerse && verses.length > 0) {
      const verseIndex = verses.findIndex((v) => v.verse === scrollToVerse);

      if (verseIndex !== -1) {
        setTimeout(() => {
          // Use centered position (0.5) for better visibility, especially for end verses
          // This ensures the verse is always visible without manual scrolling
          flashListRef.current?.scrollToIndex({
            index: verseIndex,
            animated: true,
            viewPosition: 0.3, // Center the verse for better visibility
          });

          // Don't enter selection mode - flash highlights are handled separately by parent
          // Flash highlights will automatically show for bookmarked verses
        }, 300);
      }
    }
  }, [scrollToVerse, verses]);

  // Get font size based on preference (now numeric 10-24)
  const getFontSize = () => {
    return preferences.fontSize;
  };

  // Get line height based on preference
  const getLineHeight = () => {
    const heights = {
      compact: 1.4,
      normal: 1.6,
      relaxed: 1.8,
    };
    return heights[preferences.lineHeight];
  };

  // Get word spacing based on preference
  const getWordSpacing = () => {
    const spacings = {
      normal: 0,
      wide: 2,
      wider: 4,
    };
    return spacings[preferences.wordSpacing];
  };

  // Get verse spacing based on user preference
  const getVerseSpacing = () => {
    const spacings = {
      none: 0,    // No extra spacing - same as line spacing
      small: 6,   // Comfortable spacing (default)
      large: 12,  // Generous spacing
    };
    return spacings[preferences.verseSpacing];
  };

  /**
   * Handle verse tap - YouVersion-style multi-selection
   * - If not in selection mode -> enter selection mode with this verse
   * - If already in selection mode -> toggle this verse
   */
  const handleVerseTap = useCallback(
    (verseNumber: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const verseRef: VerseRef = { version, book, chapter, verse: verseNumber };

      if (!isSelecting) {
        // Enter selection mode with this verse
        enterSelectionMode(verseRef);
      } else {
        // Toggle selection
        toggleVerseSelection(verseRef);
      }
    },
    [version, book, chapter, isSelecting, enterSelectionMode, toggleVerseSelection]
  );


  // Render verse item
  const renderVerse = useCallback(
    ({ item }: { item: BibleVerse }) => {
      const highlight = getHighlight(version, book, chapter, item.verse);
      const verseRef: VerseRef = { version, book, chapter, verse: item.verse };
      // Check if this verse is currently selected
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
        <Pressable onPress={() => handleVerseTap(item.verse)}>
          <View
            style={[
              styles.verseContainer,
              {
                backgroundColor, // Flash highlight > Regular highlight > Transparent
                paddingVertical: getVerseSpacing(),
                paddingHorizontal: spacing.md,
                marginBottom: getVerseSpacing() * 0.5,
                // Add left border for selected verses (YouVersion-style)
                ...(isSelected && {
                  borderLeftWidth: 3,
                  borderLeftColor: colors.primary[500],
                }),
              },
            ]}
          >
            {/* Verse number - conditionally shown */}
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

            {/* Verse text with dotted underline when selected */}
            <Text
              style={[
                styles.verseText,
                {
                  fontFamily: appliedFont, // Latin: custom font, Chinese: system font
                  fontSize: getFontSize(),
                  lineHeight: getFontSize() * getLineHeight(),
                  color: currentTheme.text,
                  textDecorationLine: isSelected ? 'underline' : 'none',
                  textDecorationStyle: isSelected ? 'dotted' : 'solid',
                  textDecorationColor: isSelected ? colors.primary[500] : 'transparent',
                  // Apply text alignment
                  textAlign: preferences.textAlign,
                  // Apply word spacing
                  letterSpacing: getWordSpacing(),
                },
              ]}
            >
              {item.text}
            </Text>
          </View>
        </Pressable>
      );
    },
    [
      version,
      book,
      chapter,
      preferences,
      appliedFont,
      getHighlight,
      highlights, // CRITICAL: Add highlights to trigger re-render when highlights change
      isVerseSelected,
      handleVerseTap,
      selectedVerses, // CRITICAL: Add selectedVerses to trigger re-render when selection changes
      flashHighlights, // CRITICAL: Add flashHighlights to trigger re-render for bookmark navigation feedback
    ]
  );

  const hasPrevious = chapter > 1;
  const hasNext = chapter < totalChapters;

  return (
    <>
      <FlashList
        ref={flashListRef}
        data={verses}
        renderItem={renderVerse}
        estimatedItemSize={100}
        keyExtractor={(item) => `${item.verse}`}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        initialScrollIndex={0}
        drawDistance={500}
        estimatedListSize={{ height: 800, width: 400 }}
        ListFooterComponent={
          /* Chapter Navigation Buttons */
          preferences.readingMode === 'paged' ? (
          /* Paged Mode: Show Previous & Next buttons side-by-side */
          <View style={{ paddingTop: spacing.lg, paddingBottom: spacing.xl, alignItems: 'center', justifyContent: 'center' }}>
            <HStack space="sm" className="items-center justify-center">
              {/* Previous Chapter */}
              <Pressable
                onPress={() => {
                  if (hasPrevious && onPreviousChapter) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onPreviousChapter();
                  }
                }}
                disabled={!hasPrevious}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  backgroundColor: 'transparent',
                  borderWidth: 1,
                  borderColor: hasPrevious ? colors.gray[300] : colors.gray[200],
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: hasPrevious ? 1 : 0.4,
                  minWidth: 100,
                }}
              >
                <Icon
                  as={ChevronLeft}
                  size="sm"
                  style={{ color: hasPrevious ? colors.gray[700] : colors.gray[400] }}
                />
                <Text
                  style={{
                    color: hasPrevious ? colors.gray[700] : colors.gray[400],
                    fontWeight: '500',
                    marginLeft: 4,
                    fontSize: 14,
                  }}
                >
                  Previous
                </Text>
              </Pressable>

              {/* Chapter Indicator */}
              <View style={{ minWidth: 60, alignItems: 'center' }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '500',
                    color: colors.gray[500],
                  }}
                >
                  Ch {chapter}/{totalChapters}
                </Text>
              </View>

              {/* Next Chapter */}
              <Pressable
                onPress={() => {
                  if (hasNext && onNextChapter) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onNextChapter();
                  }
                }}
                disabled={!hasNext}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  backgroundColor: 'transparent',
                  borderWidth: 1,
                  borderColor: hasNext ? colors.gray[300] : colors.gray[200],
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: hasNext ? 1 : 0.4,
                  minWidth: 100,
                }}
              >
                <Text
                  style={{
                    color: hasNext ? colors.gray[700] : colors.gray[400],
                    fontWeight: '500',
                    marginRight: 4,
                    fontSize: 14,
                  }}
                >
                  Next
                </Text>
                <Icon
                  as={ChevronRight}
                  size="sm"
                  style={{ color: hasNext ? colors.gray[700] : colors.gray[400] }}
                />
              </Pressable>
            </HStack>
          </View>
          ) : (
          /* Scroll Mode: Show "Continue Reading" button at the end */
          hasNext && onNextChapter ? (
            <View style={{ paddingTop: spacing.xl, paddingBottom: spacing.xl, alignItems: 'center', justifyContent: 'center' }}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onNextChapter();
                }}
                style={{
                  paddingVertical: 16,
                  paddingHorizontal: 32,
                  borderRadius: 12,
                  backgroundColor: colors.primary[500],
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 200,
                  ...shadows.lg,
                }}
              >
                <Text
                  style={{
                    color: '#ffffff',
                    fontWeight: '600',
                    fontSize: 16,
                    marginRight: 8,
                  }}
                >
                  Continue Reading
                </Text>
                <Icon
                  as={ChevronRight}
                  size="md"
                  style={{ color: '#ffffff' }}
                />
              </Pressable>
              <Text
                style={{
                  marginTop: 12,
                  fontSize: 13,
                  color: colors.gray[500],
                  fontWeight: '500',
                }}
              >
                Next: {book} {chapter + 1}
              </Text>
            </View>
          ) : (
            // End of book - show completion message
            <View style={{ paddingTop: spacing.xl, paddingBottom: spacing.xl, alignItems: 'center', justifyContent: 'center' }}>
              <Icon
                as={require('lucide-react-native').BookCheck}
                size="xl"
                style={{ color: colors.primary[500], marginBottom: 12 }}
              />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: colors.gray[900],
                  marginBottom: 4,
                }}
              >
                End of {book}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: colors.gray[500],
                }}
              >
                Select another book to continue
              </Text>
            </View>
          )
          )
        }
        contentContainerStyle={{
          paddingTop: spacing.md,
          paddingBottom: 160, // Space for verse selection bar
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  verseContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    // marginBottom is dynamic based on font size
  },
  verseNumber: {
    fontWeight: '700',
    marginRight: spacing.sm,
    marginTop: 2,
    minWidth: 24,
  },
  verseText: {
    flex: 1,
    // fontFamily is dynamic based on user preference
  },
});
