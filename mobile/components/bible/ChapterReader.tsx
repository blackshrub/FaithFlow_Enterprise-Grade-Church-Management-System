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

import React, { useState, useCallback, useRef } from 'react';
import { View, Pressable, StyleSheet, Share, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

import { Text } from '@/components/ui/text';
import { VerseActionsSheet } from './VerseActionsSheet';
import { useBibleStore } from '@/stores/bibleStore';
import { useBibleFont } from '@/stores/bibleFontStore';
import { colors, typography, spacing, readingThemes } from '@/constants/theme';
import type { BibleVerse } from '@/types/bible';

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
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { preferences, getHighlight, addHighlight, removeHighlight } = useBibleStore();
  const bibleFontFamily = useBibleFont(); // Get custom Bible font
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [showActionSheet, setShowActionSheet] = useState(false);

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

  // Get verse spacing based on font size
  const getVerseSpacing = () => {
    // Smaller fonts need less spacing, larger fonts need more
    // Font size range: 10-24
    // Spacing range: 4-12
    const fontSize = getFontSize();
    return Math.max(4, Math.min(12, fontSize * 0.4));
  };

  // Handle verse tap - toggle selection and show/hide action sheet
  const handleVerseTap = useCallback(
    (verseNumber: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      setSelectedVerses((prev) => {
        const isSelected = prev.includes(verseNumber);
        if (isSelected) {
          // Deselect verse
          const newSelection = prev.filter((v) => v !== verseNumber);
          // Hide action sheet if no verses selected
          if (newSelection.length === 0) {
            setShowActionSheet(false);
          }
          return newSelection;
        } else {
          // Add to selection and show action sheet
          setShowActionSheet(true);
          return [...prev, verseNumber];
        }
      });
    },
    []
  );

  // Copy selected verses to clipboard
  const handleCopyVerse = useCallback(async () => {
    if (selectedVerses.length === 0) return;

    const selectedVerseObjects = verses.filter((v) => selectedVerses.includes(v.verse));
    const verseText =
      selectedVerses.length === 1
        ? `"${selectedVerseObjects[0].text}"\n${book} ${chapter}:${selectedVerses[0]} (${version})`
        : `"${selectedVerseObjects.map((v) => v.text).join(' ')}"\n${book} ${chapter}:${Math.min(...selectedVerses)}-${Math.max(...selectedVerses)} (${version})`;

    await Clipboard.setStringAsync(verseText);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSelectedVerses([]);
    setShowActionSheet(false);

    // TODO: Show toast: "Verse copied to clipboard"
    Alert.alert(t('bible.verseCopied'), verseText);
  }, [selectedVerses, verses, book, chapter, version, t]);

  // Share selected verses
  const handleShareVerse = useCallback(async () => {
    if (selectedVerses.length === 0) return;

    const selectedVerseObjects = verses.filter((v) => selectedVerses.includes(v.verse));
    const verseText =
      selectedVerses.length === 1
        ? `"${selectedVerseObjects[0].text}"\n${book} ${chapter}:${selectedVerses[0]} (${version})`
        : `"${selectedVerseObjects.map((v) => v.text).join(' ')}"\n${book} ${chapter}:${Math.min(...selectedVerses)}-${Math.max(...selectedVerses)} (${version})`;

    try {
      await Share.share({
        message: verseText,
        title:
          selectedVerses.length === 1
            ? `${book} ${chapter}:${selectedVerses[0]}`
            : `${book} ${chapter}:${Math.min(...selectedVerses)}-${Math.max(...selectedVerses)}`,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error sharing verse:', error);
    }

    setSelectedVerses([]);
    setShowActionSheet(false);
  }, [selectedVerses, verses, book, chapter, version]);

  // Toggle highlight for selected verses
  const handleToggleHighlight = useCallback(() => {
    if (selectedVerses.length === 0) return;

    selectedVerses.forEach((verseNumber) => {
      const existing = getHighlight(version, book, chapter, verseNumber);

      if (existing) {
        removeHighlight(existing.id);
      } else {
        addHighlight({
          version,
          book,
          chapter,
          verse: verseNumber,
          color: 'yellow',
        });
      }
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSelectedVerses([]);
    setShowActionSheet(false);
  }, [selectedVerses, version, book, chapter, getHighlight, addHighlight, removeHighlight]);

  // Render verse item
  const renderVerse = useCallback(
    ({ item }: { item: BibleVerse }) => {
      const highlight = getHighlight(version, book, chapter, item.verse);
      const isSelected = selectedVerses.includes(item.verse);
      const currentTheme = readingThemes[preferences.theme];

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

              {/* Verse text with dotted underline when selected */}
              <Text
                style={[
                  styles.verseText,
                  {
                    fontFamily: bibleFontFamily, // Custom Bible font from store
                    fontSize: getFontSize(),
                    lineHeight: getFontSize() * getLineHeight(),
                    color: currentTheme.text,
                    textDecorationLine: isSelected ? 'underline' : 'none',
                    textDecorationStyle: isSelected ? 'dotted' : 'solid',
                    textDecorationColor: isSelected ? colors.primary[500] : 'transparent',
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
    [version, book, chapter, selectedVerses, preferences, bibleFontFamily, getHighlight, handleVerseTap]
  );

  // Check if any selected verse is highlighted
  const hasHighlightedVerse = selectedVerses.some((verseNum) =>
    getHighlight(version, book, chapter, verseNum)
  );

  // Get selected verse reference string
  const getSelectedReference = () => {
    if (selectedVerses.length === 0) return '';
    if (selectedVerses.length === 1) {
      return `${book} ${chapter}:${selectedVerses[0]}`;
    }
    const sorted = [...selectedVerses].sort((a, b) => a - b);
    return `${book} ${chapter}:${sorted[0]}-${sorted[sorted.length - 1]}`;
  };

  return (
    <>
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

      {/* Verse Actions Bottom Sheet - Persistent */}
      <VerseActionsSheet
        isOpen={showActionSheet}
        onClose={() => {
          setSelectedVerses([]);
          setShowActionSheet(false);
        }}
        selectedVerses={selectedVerses}
        hasHighlightedVerse={hasHighlightedVerse}
        selectedReference={getSelectedReference()}
        onHighlight={handleToggleHighlight}
        onCopy={handleCopyVerse}
        onShare={handleShareVerse}
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
