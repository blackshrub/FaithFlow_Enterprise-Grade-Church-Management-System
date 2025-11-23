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

import React, { useState, useCallback } from 'react';
import { View, Pressable, StyleSheet, Share, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Highlight, Copy, Share as ShareIcon, FileText } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicatorWrapper,
  ActionsheetDragIndicator,
  ActionsheetItem,
  ActionsheetItemText,
} from '@/components/ui/actionsheet';
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
  const { preferences, getHighlight, addHighlight, removeHighlight } = useBibleStore();
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [actionSheetVerse, setActionSheetVerse] = useState<BibleVerse | null>(null);

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

  // Handle verse long press - show action sheet
  const handleVerseLongPress = useCallback(
    (verse: BibleVerse) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setActionSheetVerse(verse);
      setShowActionSheet(true);
    },
    []
  );

  // Copy verse to clipboard
  const handleCopyVerse = useCallback(async () => {
    if (!actionSheetVerse) return;

    const verseText = `"${actionSheetVerse.text}"\n${book} ${chapter}:${actionSheetVerse.verse} (${version})`;
    await Clipboard.setStringAsync(verseText);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowActionSheet(false);

    // TODO: Show toast: "Verse copied to clipboard"
    Alert.alert(t('bible.verseCopied'), verseText);
  }, [actionSheetVerse, book, chapter, version, t]);

  // Share verse
  const handleShareVerse = useCallback(async () => {
    if (!actionSheetVerse) return;

    const verseText = `"${actionSheetVerse.text}"\n${book} ${chapter}:${actionSheetVerse.verse} (${version})`;

    try {
      await Share.share({
        message: verseText,
        title: `${book} ${chapter}:${actionSheetVerse.verse}`,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error sharing verse:', error);
    }

    setShowActionSheet(false);
  }, [actionSheetVerse, book, chapter, version]);

  // Toggle highlight
  const handleToggleHighlight = useCallback(() => {
    if (!actionSheetVerse) return;

    const existing = getHighlight(version, book, chapter, actionSheetVerse.verse);

    if (existing) {
      removeHighlight(existing.id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // TODO: Show toast: "Highlight removed"
    } else {
      addHighlight({
        version,
        book,
        chapter,
        verse: actionSheetVerse.verse,
        color: 'yellow',
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // TODO: Show toast: "Verse highlighted"
    }

    setShowActionSheet(false);
  }, [actionSheetVerse, version, book, chapter, getHighlight, addHighlight, removeHighlight]);

  // Add note (placeholder)
  const handleAddNote = useCallback(() => {
    if (!actionSheetVerse) return;

    // TODO: Implement note functionality
    Alert.alert(t('bible.addNote'), t('bible.noteComingSoon'));
    setShowActionSheet(false);
  }, [actionSheetVerse, t]);

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
            onLongPress={() => handleVerseLongPress(item)}
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

  const isHighlighted = actionSheetVerse
    ? !!getHighlight(version, book, chapter, actionSheetVerse.verse)
    : false;

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

      {/* Verse Actions Sheet */}
      <Actionsheet isOpen={showActionSheet} onClose={() => setShowActionSheet(false)}>
        <ActionsheetBackdrop />
        <ActionsheetContent>
          <ActionsheetDragIndicatorWrapper>
            <ActionsheetDragIndicator />
          </ActionsheetDragIndicatorWrapper>

          {/* Header */}
          {actionSheetVerse && (
            <View className="px-4 py-3 border-b border-gray-200 w-full">
              <Text className="text-gray-900 font-semibold text-base">
                {book} {chapter}:{actionSheetVerse.verse}
              </Text>
              <Text className="text-gray-600 text-sm mt-1" numberOfLines={2}>
                "{actionSheetVerse.text.substring(0, 80)}..."
              </Text>
            </View>
          )}

          {/* Actions */}
          <ActionsheetItem onPress={handleToggleHighlight}>
            <HStack space="md" className="items-center">
              <Icon
                as={Highlight}
                size="lg"
                style={{ color: isHighlighted ? colors.warning[500] : colors.gray[600] }}
              />
              <ActionsheetItemText className="text-base">
                {isHighlighted ? t('bible.removeHighlight') : t('bible.highlight')}
              </ActionsheetItemText>
            </HStack>
          </ActionsheetItem>

          <ActionsheetItem onPress={handleCopyVerse}>
            <HStack space="md" className="items-center">
              <Icon as={Copy} size="lg" className="text-gray-600" />
              <ActionsheetItemText className="text-base">{t('bible.copy')}</ActionsheetItemText>
            </HStack>
          </ActionsheetItem>

          <ActionsheetItem onPress={handleShareVerse}>
            <HStack space="md" className="items-center">
              <Icon as={ShareIcon} size="lg" className="text-gray-600" />
              <ActionsheetItemText className="text-base">{t('bible.share')}</ActionsheetItemText>
            </HStack>
          </ActionsheetItem>

          <ActionsheetItem onPress={handleAddNote}>
            <HStack space="md" className="items-center">
              <Icon as={FileText} size="lg" className="text-gray-600" />
              <ActionsheetItemText className="text-base">{t('bible.addNote')}</ActionsheetItemText>
            </HStack>
          </ActionsheetItem>
        </ActionsheetContent>
      </Actionsheet>
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
