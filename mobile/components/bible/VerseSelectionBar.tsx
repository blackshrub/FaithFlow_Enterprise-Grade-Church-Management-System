/**
 * Verse Selection Bar Component
 *
 * YouVersion-style compact bottom action bar that appears when verses are selected.
 * - NO modal overlay (allows continuous verse tapping)
 * - Fixed position at bottom above tab bar
 * - Slide up/down animation
 * - Shows: verse count, Highlight, Copy, Share, Done buttons
 */

import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Highlighter, Copy, Share as ShareIcon, X, Bookmark, FileText } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { HStack } from '@/components/ui/hstack';
import { colors } from '@/constants/theme';
import type { VerseRef } from '@/stores/bibleStore';

interface VerseSelectionBarProps {
  /** Currently selected verses */
  selectedVerses: VerseRef[];
  /** Callback when highlight button is tapped */
  onHighlight: () => void;
  /** Callback when copy button is tapped */
  onCopy: () => void;
  /** Callback when share button is tapped */
  onShare: () => void;
  /** Callback when bookmark button is tapped */
  onBookmark: () => void;
  /** Callback when note button is tapped */
  onNote: () => void;
  /** Callback when done/close button is tapped */
  onDone: () => void;
  /** Whether any selected verse is already highlighted */
  hasHighlightedVerse?: boolean;
  /** Whether any selected verse is already bookmarked */
  hasBookmarkedVerse?: boolean;
}

export function VerseSelectionBar({
  selectedVerses,
  onHighlight,
  onCopy,
  onShare,
  onBookmark,
  onNote,
  onDone,
  hasHighlightedVerse = false,
  hasBookmarkedVerse = false,
}: VerseSelectionBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Calculate bottom position - above tab bar and FAB (Give button)
  // TAB_BAR_HEIGHT includes the FAB which extends above the bar
  const TAB_BAR_HEIGHT = 64; // Main tab bar height
  const FAB_EXTRA_HEIGHT = 24; // FAB extends 24px above tab bar
  const SPACING = 16; // Extra spacing for comfortable tapping
  const bottomOffset = TAB_BAR_HEIGHT + FAB_EXTRA_HEIGHT + SPACING + (insets.bottom > 0 ? 8 : 0);

  const verseCount = selectedVerses.length;
  const verseText = verseCount === 1 ? t('bible.verse') || 'verse' : t('bible.verses') || 'verses';

  return (
    <Animated.View
      entering={SlideInDown.duration(250)}
      exiting={SlideOutDown.duration(200)}
      style={[
        styles.container,
        {
          bottom: bottomOffset,
          // Shadow for iOS
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          // Elevation for Android
          elevation: 8,
        },
      ]}
    >
      <View style={styles.content}>
        {/* Left: Verse count */}
        <View style={styles.leftSection}>
          <Text style={styles.countText}>
            {verseCount} {verseText}
          </Text>
        </View>

        {/* Right: Action buttons */}
        <HStack space="sm" className="items-center">
          {/* Highlight button */}
          <Pressable
            onPress={onHighlight}
            style={[
              styles.actionButton,
              hasHighlightedVerse && {
                backgroundColor: colors.warning[100],
              },
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon
              as={Highlighter}
              size="md"
              style={{
                color: hasHighlightedVerse ? colors.warning[600] : colors.gray[700],
              }}
            />
          </Pressable>

          {/* Bookmark button */}
          <Pressable
            onPress={onBookmark}
            style={[
              styles.actionButton,
              hasBookmarkedVerse && {
                backgroundColor: colors.primary[100],
              },
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon
              as={Bookmark}
              size="md"
              style={{
                color: hasBookmarkedVerse ? colors.primary[600] : colors.gray[700],
              }}
            />
          </Pressable>

          {/* Note button */}
          <Pressable
            onPress={onNote}
            style={styles.actionButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon as={FileText} size="md" className="text-gray-700" />
          </Pressable>

          {/* Copy button */}
          <Pressable
            onPress={onCopy}
            style={styles.actionButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon as={Copy} size="md" className="text-gray-700" />
          </Pressable>

          {/* Share button */}
          <Pressable
            onPress={onShare}
            style={styles.actionButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon as={ShareIcon} size="md" className="text-gray-700" />
          </Pressable>

          {/* Done button */}
          <Pressable
            onPress={onDone}
            style={[styles.actionButton, styles.doneButton]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon as={X} size="md" className="text-white" />
          </Pressable>
        </HStack>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  leftSection: {
    flex: 1,
  },
  countText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.gray[900],
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneButton: {
    backgroundColor: colors.primary[500],
  },
});
