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
import { View, Pressable, StyleSheet, Share, Alert, Modal, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Highlight, Copy, Share as ShareIcon, X } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { BottomSheetScrollView } from '@/components/ui/bottomsheet';
import { Icon } from '@/components/ui/icon';
import { HStack } from '@/components/ui/hstack';
import { useBibleStore } from '@/stores/bibleStore';
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

  // Get font family
  const getFontFamily = () => {
    const fontMap = {
      System: 'System',
      Serif: 'serif',
      Monospace: 'monospace',
    };
    return fontMap[preferences.fontFamily] || 'System';
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
                    fontFamily: getFontFamily(),
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

      {/* Verse Actions Modal - Simple Modal at Bottom */}
      <Modal
        visible={showActionSheet && selectedVerses.length > 0}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setSelectedVerses([]);
          setShowActionSheet(false);
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {
            setSelectedVerses([]);
            setShowActionSheet(false);
          }}
          style={styles.modalOverlay}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalContent, { paddingBottom: insets.bottom + 80 }]}>
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
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
});
