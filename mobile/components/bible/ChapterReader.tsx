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

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Pressable, StyleSheet, Share, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Highlight, Copy, Share as ShareIcon } from 'lucide-react-native';
import GorhomBottomSheet, { BottomSheetBackdrop as GorhomBackdrop } from '@gorhom/bottom-sheet';

import { Text } from '@/components/ui/text';
import { BottomSheetScrollView } from '@/components/ui/bottomsheet';
import { Icon } from '@/components/ui/icon';
import { HStack } from '@/components/ui/hstack';
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
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<GorhomBottomSheet>(null);
  const { preferences, getHighlight, addHighlight, removeHighlight } = useBibleStore();
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [showActionSheet, setShowActionSheet] = useState(false);

  // Calculate bottom inset - account for tab bar height
  // Tab bar is ~64px + safe area bottom
  const TAB_BAR_HEIGHT = 64;
  const bottomInset = insets.bottom + TAB_BAR_HEIGHT;

  // Control bottom sheet
  useEffect(() => {
    console.log('Bottom sheet control:', { showActionSheet, selectedVersesCount: selectedVerses.length });
    if (showActionSheet && selectedVerses.length > 0) {
      console.log('Opening bottom sheet...');
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      console.log('Closing bottom sheet...');
      bottomSheetRef.current?.close();
    }
  }, [showActionSheet, selectedVerses.length]);

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

  // Handle verse tap - toggle selection and show bottom sheet
  const handleVerseTap = useCallback(
    (verseNumber: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      setSelectedVerses((prev) => {
        const isSelected = prev.includes(verseNumber);
        if (isSelected) {
          // Deselect verse
          const newSelection = prev.filter((v) => v !== verseNumber);
          if (newSelection.length === 0) {
            setShowActionSheet(false);
          }
          return newSelection;
        } else {
          // Select verse and show action sheet
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

              {/* Verse text with dotted underline when selected */}
              <Text
                style={[
                  styles.verseText,
                  {
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
    [version, book, chapter, selectedVerses, preferences, getHighlight, handleVerseTap]
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

      {/* Verse Actions Bottom Sheet - Compact */}
      <GorhomBottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={[160]}
        enablePanDownToClose
        bottomInset={bottomInset}
        detached={false}
        enableOverDrag={false}
        onClose={() => {
          setSelectedVerses([]);
          setShowActionSheet(false);
        }}
        backdropComponent={() => null}
        backgroundStyle={{
          backgroundColor: '#ffffff',
        }}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 5,
        }}
      >
        <View className="px-4 py-3">
          {/* Header - Compact */}
          <Text className="text-gray-600 text-xs font-medium mb-3 text-center">
            {getSelectedReference()} • {selectedVerses.length}{' '}
            {selectedVerses.length === 1 ? 'verse' : 'verses'}
          </Text>

          {/* Actions in One Row */}
          <HStack className="items-center justify-around">
            {/* Highlight */}
            <Pressable
              onPress={handleToggleHighlight}
              className="items-center active:opacity-60 flex-1"
            >
              <View
                className="p-3 rounded-full mb-1"
                style={{ backgroundColor: hasHighlightedVerse ? colors.warning[100] : colors.gray[100] }}
              >
                <Icon
                  as={Highlight}
                  size="lg"
                  style={{ color: hasHighlightedVerse ? colors.warning[600] : colors.gray[600] }}
                />
              </View>
              <Text className="text-gray-700 text-xs">
                {hasHighlightedVerse ? t('bible.removeHighlight') : t('bible.highlight')}
              </Text>
            </Pressable>

            {/* Copy */}
            <Pressable
              onPress={handleCopyVerse}
              className="items-center active:opacity-60 flex-1"
            >
              <View className="p-3 rounded-full mb-1" style={{ backgroundColor: colors.gray[100] }}>
                <Icon as={Copy} size="lg" className="text-gray-600" />
              </View>
              <Text className="text-gray-700 text-xs">{t('bible.copy')}</Text>
            </Pressable>

            {/* Share */}
            <Pressable
              onPress={handleShareVerse}
              className="items-center active:opacity-60 flex-1"
            >
              <View className="p-3 rounded-full mb-1" style={{ backgroundColor: colors.gray[100] }}>
                <Icon as={ShareIcon} size="lg" className="text-gray-600" />
              </View>
              <Text className="text-gray-700 text-xs">{t('bible.share')}</Text>
            </Pressable>
          </HStack>
        </View>
      </GorhomBottomSheet>
    </>
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
