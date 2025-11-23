/**
 * Bible Chapter Reader Component
 *
 * YouVersion-style reading experience:
 * - FlashList for smooth scrolling
 * - Tap verse to highlight/bookmark
 * - Clean, readable typography
 * - Optimized for long-form reading
 */

import React, { useState, useCallback } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/text';
import { useBibleStore } from '@/stores/bibleStore';
import { colors, typography, spacing, readingThemes } from '@/constants/theme';
import type { BibleVerse } from '@/types/api';

interface ChapterReaderProps {
  verses: BibleVerse[];
  version: string;
  book: string;
  chapter: number;
}

export function ChapterReader({
  verses,
  version,
  book,
  chapter,
}: ChapterReaderProps) {
  const { preferences, getHighlight, addHighlight, removeHighlight } = useBibleStore();
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);

  // Get font size based on preference
  const getFontSize = () => {
    const sizes = {
      small: 16,
      medium: 18,
      large: 20,
      xlarge: 24,
    };
    return sizes[preferences.fontSize];
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

  // Handle verse tap
  const handleVerseTap = useCallback(
    (verseNumber: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedVerse(verseNumber === selectedVerse ? null : verseNumber);
    },
    [selectedVerse]
  );

  // Handle verse long press for highlight
  const handleVerseLongPress = useCallback(
    (verseNumber: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const existing = getHighlight(version, book, chapter, verseNumber);

      if (existing) {
        removeHighlight(existing.id);
      } else {
        addHighlight({
          version,
          book,
          chapter,
          verse: verseNumber,
          color: 'yellow', // Default color
        });
      }
    },
    [version, book, chapter, getHighlight, addHighlight, removeHighlight]
  );

  // Render verse item
  const renderVerse = useCallback(
    ({ item }: { item: BibleVerse }) => {
      const highlight = getHighlight(version, book, chapter, item.verse);
      const isSelected = selectedVerse === item.verse;
      const currentTheme = readingThemes[preferences.theme];

      const backgroundColor = highlight
        ? currentTheme.highlight[highlight.color]
        : isSelected
        ? currentTheme.verseNumber + '20'
        : 'transparent';

      return (
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 200, delay: item.verse * 20 }}
        >
          <Pressable
            onPress={() => handleVerseTap(item.verse)}
            onLongPress={() => handleVerseLongPress(item.verse)}
            delayLongPress={300}
          >
            <View
              style={[
                styles.verseContainer,
                {
                  backgroundColor,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                },
              ]}
            >
              {/* Verse number */}
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

              {/* Verse text */}
              <Text
                style={[
                  styles.verseText,
                  {
                    fontSize: getFontSize(),
                    lineHeight: getFontSize() * getLineHeight(),
                    color: currentTheme.text,
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
      selectedVerse,
      preferences,
      getHighlight,
      handleVerseTap,
      handleVerseLongPress,
    ]
  );

  return (
    <FlashList
      data={verses}
      renderItem={renderVerse}
      estimatedItemSize={100}
      keyExtractor={(item) => `${item.verse}`}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingTop: spacing.md,
        paddingBottom: 120, // Space for tab bar
      }}
    />
  );
}

const styles = StyleSheet.create({
  verseContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  verseNumber: {
    fontWeight: '700',
    marginRight: spacing.sm,
    marginTop: 2,
    minWidth: 24,
  },
  verseText: {
    flex: 1,
    fontFamily: typography.fonts.body,
  },
});
