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
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { HStack } from '@/components/ui/hstack';
import { useBibleStore, type VerseRef } from '@/stores/bibleStore';
import { useLatinBibleFont } from '@/stores/bibleFontStore';
import { getAppliedBibleFont } from '@/utils/fonts';
import { colors, spacing, readingThemes } from '@/constants/theme';
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
  } = useBibleStore();
  const latinFont = useLatinBibleFont(); // Get Latin Bible font selection
  const flashListRef = useRef<FlashList<BibleVerse>>(null);

  // Get appropriate font based on Bible version
  // Latin Bibles: use selected custom font
  // Chinese Bibles: use system font automatically
  const appliedFont = getAppliedBibleFont(version, latinFont);

  // Scroll to specific verse when requested (from search)
  useEffect(() => {
    if (scrollToVerse && verses.length > 0) {
      const verseIndex = verses.findIndex((v) => v.verse === scrollToVerse);

      if (verseIndex !== -1) {
        setTimeout(() => {
          flashListRef.current?.scrollToIndex({
            index: verseIndex,
            animated: true,
            viewPosition: 0.2,
          });

          // Briefly enter selection mode for the search result verse
          const verseRef: VerseRef = { version, book, chapter, verse: scrollToVerse };
          enterSelectionMode(verseRef);

          // Clear selection after 2 seconds
          setTimeout(() => {
            if (selectedVerses.length === 1 && isVerseSelected(verseRef)) {
              useBibleStore.getState().clearSelection();
            }
          }, 2000);
        }, 300);
      }
    }
  }, [scrollToVerse, verses, version, book, chapter]);

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

  // Get verse spacing based on font size
  const getVerseSpacing = () => {
    // Smaller fonts need less spacing, larger fonts need more
    // Font size range: 10-24
    // Spacing range: 4-12
    const fontSize = getFontSize();
    return Math.max(4, Math.min(12, fontSize * 0.4));
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
      const currentTheme = readingThemes[preferences.theme];

      // Background color: ONLY show highlight color if verse is highlighted
      // Selected but not highlighted verses have NO background (just dotted underline + left border)
      const backgroundColor = highlight
        ? currentTheme.highlight[highlight.color]
        : 'transparent';

      return (
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 200, delay: item.verse * 20 }}
        >
          <Pressable onPress={() => handleVerseTap(item.verse)}>
            <View
              style={[
                styles.verseContainer,
                {
                  backgroundColor,
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
                    // Red letter words for Jesus (placeholder - needs markup data)
                    // color: preferences.redLetterWords ? colors.error[600] : currentTheme.text,
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
      book,
      chapter,
      preferences,
      appliedFont,
      getHighlight,
      highlights, // CRITICAL: Add highlights to trigger re-render when highlights change
      isVerseSelected,
      handleVerseTap,
      selectedVerses, // CRITICAL: Add selectedVerses to trigger re-render when selection changes
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
        contentContainerStyle={{
          paddingTop: spacing.md,
          paddingBottom: 200, // Space for navigation buttons + verse selection bar
        }}
      />

      {/* Chapter Navigation Buttons - Fixed at bottom */}
      <View
        style={{
          position: 'absolute',
          bottom: 90, // Above tab bar
          left: 0,
          right: 0,
          paddingHorizontal: spacing.lg,
        }}
      >
        <HStack space="md" className="items-center justify-center">
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
              paddingVertical: 12,
              paddingHorizontal: 20,
              borderRadius: 12,
              backgroundColor: hasPrevious ? colors.primary[500] : colors.gray[200],
              flexDirection: 'row',
              alignItems: 'center',
              opacity: hasPrevious ? 1 : 0.5,
            }}
          >
            <Icon
              as={ChevronLeft}
              size="sm"
              style={{ color: hasPrevious ? '#ffffff' : colors.gray[400] }}
            />
            <Text
              style={{
                color: hasPrevious ? '#ffffff' : colors.gray[400],
                fontWeight: '600',
                marginLeft: 4,
              }}
            >
              Previous
            </Text>
          </Pressable>

          {/* Chapter Indicator */}
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: colors.gray[600],
            }}
          >
            Ch {chapter}
          </Text>

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
              paddingVertical: 12,
              paddingHorizontal: 20,
              borderRadius: 12,
              backgroundColor: hasNext ? colors.primary[500] : colors.gray[200],
              flexDirection: 'row',
              alignItems: 'center',
              opacity: hasNext ? 1 : 0.5,
            }}
          >
            <Text
              style={{
                color: hasNext ? '#ffffff' : colors.gray[400],
                fontWeight: '600',
                marginRight: 4,
              }}
            >
              Next
            </Text>
            <Icon
              as={ChevronRight}
              size="sm"
              style={{ color: hasNext ? '#ffffff' : colors.gray[400] }}
            />
          </Pressable>
        </HStack>
      </View>
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
