/**
 * Verse Actions Bottom Sheet
 *
 * Persistent bottom sheet that shows actions for selected verses:
 * - Highlight/Remove highlight
 * - Copy to clipboard
 * - Share
 *
 * Stays visible while user selects multiple verses
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { Highlight, Copy, Share as ShareIcon } from 'lucide-react-native';
import GorhomBottomSheet, { BottomSheetBackdrop as GorhomBackdrop } from '@gorhom/bottom-sheet';

import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { HStack } from '@/components/ui/hstack';
import { colors } from '@/constants/theme';

interface VerseActionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVerses: number[];
  hasHighlightedVerse: boolean;
  selectedReference: string;
  onHighlight: () => void;
  onCopy: () => void;
  onShare: () => void;
}

export function VerseActionsSheet({
  isOpen,
  onClose,
  selectedVerses,
  hasHighlightedVerse,
  selectedReference,
  onHighlight,
  onCopy,
  onShare,
}: VerseActionsSheetProps) {
  const bottomSheetRef = useRef<GorhomBottomSheet>(null);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Calculate bottom inset - sit above tab bar
  const TAB_BAR_HEIGHT = 64 + (insets.bottom > 0 ? 20 : 8);
  const bottomInset = TAB_BAR_HEIGHT;

  // Control bottom sheet based on isOpen prop
  useEffect(() => {
    if (isOpen && selectedVerses.length > 0) {
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isOpen, selectedVerses.length]);

  // Backdrop component - transparent to allow verse tapping
  const renderBackdrop = useCallback(
    (props: any) => (
      <GorhomBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.3}
        pressBehavior="none" // Don't close on backdrop press - allow verse selection through it
      />
    ),
    []
  );

  return (
    <GorhomBottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={[180]} // Fixed height for actions
      enablePanDownToClose
      bottomInset={bottomInset}
      detached={false}
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
      }}
    >
      <View className="px-4 pb-4">
        {/* Header - Compact */}
        <View className="flex-row items-center justify-between mb-3 pt-2">
          <Text className="text-gray-600 text-xs font-medium">
            {selectedReference} • {selectedVerses.length}{' '}
            {selectedVerses.length === 1 ? 'verse' : 'verses'}
          </Text>
          <Pressable
            onPress={onClose}
            className="p-2 -mr-2"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text className="text-primary-600 text-sm font-semibold">Done</Text>
          </Pressable>
        </View>

        {/* Actions in One Row */}
        <HStack className="items-center justify-around">
          {/* Highlight */}
          <Pressable
            onPress={onHighlight}
            className="items-center active:opacity-60 flex-1"
          >
            <View
              className="p-3 rounded-full mb-1"
              style={{
                backgroundColor: hasHighlightedVerse
                  ? colors.warning[100]
                  : colors.gray[100],
              }}
            >
              <Icon
                as={Highlight}
                size="lg"
                style={{
                  color: hasHighlightedVerse ? colors.warning[600] : colors.gray[600],
                }}
              />
            </View>
            <Text className="text-gray-700 text-xs">
              {hasHighlightedVerse ? t('bible.removeHighlight') : t('bible.highlight')}
            </Text>
          </Pressable>

          {/* Copy */}
          <Pressable
            onPress={onCopy}
            className="items-center active:opacity-60 flex-1"
          >
            <View
              className="p-3 rounded-full mb-1"
              style={{ backgroundColor: colors.gray[100] }}
            >
              <Icon as={Copy} size="lg" className="text-gray-600" />
            </View>
            <Text className="text-gray-700 text-xs">{t('bible.copy')}</Text>
          </Pressable>

          {/* Share */}
          <Pressable
            onPress={onShare}
            className="items-center active:opacity-60 flex-1"
          >
            <View
              className="p-3 rounded-full mb-1"
              style={{ backgroundColor: colors.gray[100] }}
            >
              <Icon as={ShareIcon} size="lg" className="text-gray-600" />
            </View>
            <Text className="text-gray-700 text-xs">{t('bible.share')}</Text>
          </Pressable>
        </HStack>
      </View>
    </GorhomBottomSheet>
  );
}
