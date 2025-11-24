/**
 * Bookmarks List Modal
 *
 * YouVersion-style bookmarks viewer:
 * - Bottom sheet with list of all bookmarks
 * - Shows verse reference, text preview, and optional note
 * - Tap to navigate to bookmarked verse
 * - Swipe to delete bookmark
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { View, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Bookmark as BookmarkIcon, Trash2, ChevronRight } from 'lucide-react-native';
import GorhomBottomSheet, { BottomSheetBackdrop as GorhomBackdrop } from '@gorhom/bottom-sheet';
import { MotiView } from 'moti';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { BottomSheetScrollView } from '@/components/ui/bottomsheet';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';

import { useBibleStore, type Bookmark } from '@/stores/bibleStore';
import { colors } from '@/constants/theme';

interface BookmarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToBookmark: (bookmark: Bookmark) => void;
}

export function BookmarksModal({
  isOpen,
  onClose,
  onNavigateToBookmark,
}: BookmarksModalProps) {
  const bottomSheetRef = useRef<GorhomBottomSheet>(null);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { bookmarks, removeBookmark } = useBibleStore();

  // Calculate insets
  const bottomInset = insets.bottom;
  const topInset = insets.top || 20;

  // Control bottom sheet based on isOpen prop
  useEffect(() => {
    if (isOpen) {
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isOpen]);

  const handleDeleteBookmark = (bookmark: Bookmark) => {
    Alert.alert(
      t('bible.deleteBookmark') || 'Delete Bookmark',
      t('bible.deleteBookmarkConfirm') || 'Are you sure you want to delete this bookmark?',
      [
        {
          text: t('common.cancel') || 'Cancel',
          style: 'cancel',
        },
        {
          text: t('common.delete') || 'Delete',
          style: 'destructive',
          onPress: () => removeBookmark(bookmark.id),
        },
      ]
    );
  };

  const handleBookmarkTap = (bookmark: Bookmark) => {
    onNavigateToBookmark(bookmark);
    onClose();
  };

  // Backdrop component
  const renderBackdrop = useCallback(
    (props: any) => (
      <GorhomBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        onPress={onClose}
      />
    ),
    [onClose]
  );

  return (
    <GorhomBottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={['70%', '90%']}
      enablePanDownToClose
      bottomInset={bottomInset}
      topInset={topInset}
      detached={false}
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: '#ffffff',
      }}
    >
      <BottomSheetScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-6 pt-2 pb-4 border-b border-gray-200">
          <HStack className="items-center gap-2">
            <Icon as={BookmarkIcon} size="lg" className="text-primary-500" />
            <Heading size="xl" className="text-gray-900">
              {t('bible.bookmarks') || 'Bookmarks'}
            </Heading>
          </HStack>
          <Text className="text-gray-500 text-sm mt-1">
            {bookmarks.length} {bookmarks.length === 1 ? 'bookmark' : 'bookmarks'}
          </Text>
        </View>

        {/* Bookmarks List */}
        <VStack space="md" className="p-6">
          {bookmarks.length === 0 ? (
            /* Empty State */
            <View className="py-12 items-center justify-center">
              <Icon as={BookmarkIcon} size="xl" className="text-gray-300 mb-4" />
              <Text className="text-gray-500 text-center text-base">
                {t('bible.noBookmarks') || 'No bookmarks yet'}
              </Text>
              <Text className="text-gray-400 text-center text-sm mt-2">
                {t('bible.tapVerseToBookmark') || 'Tap a verse and select bookmark to save it'}
              </Text>
            </View>
          ) : (
            bookmarks.map((bookmark, index) => (
              <MotiView
                key={bookmark.id}
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{
                  type: 'timing',
                  delay: index * 50,
                  duration: 200,
                }}
              >
                <Pressable
                  onPress={() => handleBookmarkTap(bookmark)}
                  className="active:opacity-70"
                >
                  <View
                    className="p-4 rounded-lg border border-gray-200"
                    style={{
                      backgroundColor: colors.gray[50],
                    }}
                  >
                    <HStack className="items-start justify-between mb-2">
                      {/* Verse Reference */}
                      <VStack space="xs" className="flex-1">
                        <Text className="text-primary-600 font-semibold text-base">
                          {bookmark.book} {bookmark.chapter}:{bookmark.verse}
                        </Text>
                        <Text className="text-gray-500 text-xs">
                          {bookmark.version}
                        </Text>
                      </VStack>

                      {/* Actions */}
                      <HStack space="xs" className="items-center">
                        {/* Delete Button */}
                        <Pressable
                          onPress={() => handleDeleteBookmark(bookmark)}
                          className="p-2 active:opacity-70"
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Icon as={Trash2} size="sm" className="text-red-500" />
                        </Pressable>

                        {/* Navigate Icon */}
                        <Icon as={ChevronRight} size="sm" className="text-gray-400" />
                      </HStack>
                    </HStack>

                    {/* Note (if exists) */}
                    {bookmark.note && (
                      <View
                        className="mt-2 p-3 rounded-lg"
                        style={{
                          backgroundColor: colors.warning[50],
                        }}
                      >
                        <Text className="text-gray-700 text-sm italic">
                          "{bookmark.note}"
                        </Text>
                      </View>
                    )}

                    {/* Date */}
                    <Text className="text-gray-400 text-xs mt-2">
                      {new Date(bookmark.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </Pressable>
              </MotiView>
            ))
          )}
        </VStack>
      </BottomSheetScrollView>
    </GorhomBottomSheet>
  );
}
