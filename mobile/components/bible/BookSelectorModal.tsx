/**
 * Bible Book & Chapter Selector Bottom Sheet
 *
 * YouVersion-style navigation:
 * - Testament tabs (OT/NT)
 * - Book grid
 * - Chapter selector
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ArrowDownAZ, ListOrdered, LayoutGrid, List } from 'lucide-react-native';
import GorhomBottomSheet, { BottomSheetBackdrop as GorhomBackdrop } from '@gorhom/bottom-sheet';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { BottomSheetScrollView } from '@/components/ui/bottomsheet';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Card } from '@/components/ui/card';

import { colors } from '@/constants/theme';
import type { BibleBook } from '@/types/api';
import { useBibleStore } from '@/stores/bibleStore';

type SortOrder = 'original' | 'alphabetical';
type ViewLayout = 'grid' | 'list';

interface BookSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: BibleBook[];
  onSelectChapter: (book: string, chapter: number, verse?: number) => void;
}

export function BookSelectorModal({
  isOpen,
  onClose,
  books,
  onSelectChapter,
}: BookSelectorModalProps) {
  const bottomSheetRef = useRef<GorhomBottomSheet>(null);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { preferences } = useBibleStore();
  const [selectedTestament, setSelectedTestament] = useState<'OT' | 'NT'>('OT');
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('original');
  const [viewLayout, setViewLayout] = useState<ViewLayout>('grid');

  // Calculate insets to prevent covering status bar
  const bottomInset = insets.bottom;
  const topInset = insets.top || 20; // Ensure minimum 20px from top (status bar)

  // Control bottom sheet based on isOpen prop
  useEffect(() => {
    if (isOpen) {
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isOpen]);

  // Filter and sort books
  const filteredBooks = useMemo(() => {
    const filtered = books.filter((book) => book.testament === selectedTestament);

    if (sortOrder === 'alphabetical') {
      return [...filtered].sort((a, b) => {
        const nameA = a.name_local || a.name;
        const nameB = b.name_local || b.name;
        return nameA.localeCompare(nameB);
      });
    }

    // Original order (by book_number)
    return [...filtered].sort((a, b) => a.book_number - b.book_number);
  }, [books, selectedTestament, sortOrder]);

  const handleBookSelect = (book: BibleBook) => {
    setSelectedBook(book);
  };

  const handleChapterSelect = (chapter: number) => {
    if (selectedBook) {
      // If verse selector is enabled, show verse selection
      if (preferences.showVerseSelector) {
        setSelectedChapter(chapter);
      } else {
        // Otherwise, directly navigate to chapter (verse 1 by default)
        const bookName = selectedBook.name_local || selectedBook.name;
        onSelectChapter(bookName, chapter);
        onClose();
        setSelectedBook(null);
      }
    }
  };

  const handleVerseSelect = (verse: number) => {
    if (selectedBook && selectedChapter) {
      const bookName = selectedBook.name_local || selectedBook.name;
      onSelectChapter(bookName, selectedChapter, verse);
      onClose();
      setSelectedBook(null);
      setSelectedChapter(null);
    }
  };

  const handleBack = () => {
    if (selectedChapter) {
      setSelectedChapter(null);
    } else if (selectedBook) {
      setSelectedBook(null);
    } else {
      onClose();
    }
  };

  // Backdrop component
  const renderBackdrop = useCallback(
    (props: any) => (
      <GorhomBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        onPress={handleBack}
      />
    ),
    [handleBack]
  );

  return (
    <GorhomBottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={['90%']}
      enablePanDownToClose
      bottomInset={bottomInset}
      topInset={topInset}
      detached={false}
      onClose={() => {
        setSelectedBook(null);
        setSelectedChapter(null);
        onClose();
      }}
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
            {(selectedBook || selectedChapter) && (
              <Pressable onPress={handleBack} className="p-2 -ml-2">
                <Icon as={ChevronLeft} size="lg" className="text-gray-600" />
              </Pressable>
            )}
            <Heading size="xl" className="text-gray-900">
              {selectedChapter
                ? `${selectedBook?.name_local || selectedBook?.name} ${selectedChapter}`
                : selectedBook
                ? (selectedBook.name_local || selectedBook.name)
                : t('bible.selectBook')}
            </Heading>
          </HStack>
        </View>

        {!selectedBook ? (
          /* Book Selection */
          <VStack space="md" className="p-6">
            {/* Testament Tabs */}
            <HStack space="sm" className="items-center">
              <Pressable
                onPress={() => setSelectedTestament('OT')}
                className="flex-1"
              >
                <View
                  className="py-3 px-4 rounded-lg items-center"
                  style={{
                    backgroundColor:
                      selectedTestament === 'OT'
                        ? colors.primary[500]
                        : colors.gray[100],
                  }}
                >
                  <Text
                    className={`font-semibold ${
                      selectedTestament === 'OT'
                        ? 'text-white'
                        : 'text-gray-600'
                    }`}
                  >
                    {t('bible.oldTestament')}
                  </Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => setSelectedTestament('NT')}
                className="flex-1"
              >
                <View
                  className="py-3 px-4 rounded-lg items-center"
                  style={{
                    backgroundColor:
                      selectedTestament === 'NT'
                        ? colors.primary[500]
                        : colors.gray[100],
                  }}
                >
                  <Text
                    className={`font-semibold ${
                      selectedTestament === 'NT'
                        ? 'text-white'
                        : 'text-gray-600'
                    }`}
                  >
                    {t('bible.newTestament')}
                  </Text>
                </View>
              </Pressable>
            </HStack>

            {/* Sort and View Options */}
            <HStack className="items-center justify-between">
              {/* Sort Toggle */}
              <HStack space="xs" className="items-center">
                <Pressable
                  onPress={() => setSortOrder('original')}
                  className="p-2"
                >
                  <HStack space="xs" className="items-center">
                    <Icon
                      as={ListOrdered}
                      size="sm"
                      style={{
                        color: sortOrder === 'original' ? colors.primary[500] : colors.gray[400],
                      }}
                    />
                    <Text
                      className={`text-xs ${
                        sortOrder === 'original' ? 'text-primary-500 font-semibold' : 'text-gray-500'
                      }`}
                    >
                      {t('bible.originalOrder')}
                    </Text>
                  </HStack>
                </Pressable>

                <View className="w-px h-4 bg-gray-300" />

                <Pressable
                  onPress={() => setSortOrder('alphabetical')}
                  className="p-2"
                >
                  <HStack space="xs" className="items-center">
                    <Icon
                      as={ArrowDownAZ}
                      size="sm"
                      style={{
                        color: sortOrder === 'alphabetical' ? colors.primary[500] : colors.gray[400],
                      }}
                    />
                    <Text
                      className={`text-xs ${
                        sortOrder === 'alphabetical' ? 'text-primary-500 font-semibold' : 'text-gray-500'
                      }`}
                    >
                      {t('bible.alphabetical')}
                    </Text>
                  </HStack>
                </Pressable>
              </HStack>

              {/* View Layout Toggle */}
              <HStack space="xs" className="items-center">
                <Pressable
                  onPress={() => setViewLayout('grid')}
                  className="p-2"
                >
                  <Icon
                    as={LayoutGrid}
                    size="sm"
                    style={{
                      color: viewLayout === 'grid' ? colors.primary[500] : colors.gray[400],
                    }}
                  />
                </Pressable>

                <Pressable
                  onPress={() => setViewLayout('list')}
                  className="p-2"
                >
                  <Icon
                    as={List}
                    size="sm"
                    style={{
                      color: viewLayout === 'list' ? colors.primary[500] : colors.gray[400],
                    }}
                  />
                </Pressable>
              </HStack>
            </HStack>

            {/* Books Grid/List */}
            <View className={viewLayout === 'grid' ? 'flex-row flex-wrap gap-2' : ''}>
              {filteredBooks.map((book, index) => (
                <MotiView
                  key={book.id}
                  from={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    type: 'spring',
                    delay: index * 30,
                  }}
                  style={viewLayout === 'grid' ? { width: '48%' } : { width: '100%', marginBottom: 8 }}
                >
                  <Pressable
                    onPress={() => handleBookSelect(book)}
                    className="active:opacity-70"
                  >
                    <Card className="p-4">
                      {viewLayout === 'grid' ? (
                        <>
                          <Text className="text-gray-900 font-semibold text-center">
                            {book.name_local || book.name}
                          </Text>
                          <Text className="text-gray-500 text-xs text-center mt-1">
                            {book.chapter_count} {t('bible.chapters' as any) || 'chapters'}
                          </Text>
                        </>
                      ) : (
                        <HStack className="items-center justify-between">
                          <Text className="text-gray-900 font-semibold flex-1">
                            {book.name_local || book.name}
                          </Text>
                          <Text className="text-gray-500 text-sm">
                            {book.chapter_count} {t('bible.chapters' as any) || 'chapters'}
                          </Text>
                        </HStack>
                      )}
                    </Card>
                  </Pressable>
                </MotiView>
              ))}
            </View>
          </VStack>
        ) : selectedChapter ? (
          /* Verse Selection */
          <MotiView
            from={{ opacity: 0, translateX: -20 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{
              type: 'timing',
              duration: 150, // Ultra-snappy: 200ms → 150ms
            }}
          >
            <View className="p-6">
              {/* Section Title */}
              <Text className="text-gray-600 text-sm font-medium mb-4 text-center">
                {t('bible.selectVerse')}
              </Text>

              <View className="flex-row flex-wrap gap-2">
                {/* Using 200 as max verse count, which covers all Bible chapters (longest is Psalm 119 with 176) */}
                {Array.from({ length: 200 }, (_, i) => i + 1).map(
                  (verse, index) => (
                    <MotiView
                      key={`verse-${verse}`}
                      from={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        type: 'spring',
                        delay: index * 5, // Ultra-snappy: instant start (0ms) + 5ms stagger
                      }}
                      style={{ width: '18%' }}
                    >
                      <Pressable
                        onPress={() => handleVerseSelect(verse)}
                        className="active:opacity-70"
                      >
                        <View
                          className="p-4 items-center justify-center rounded-lg"
                          style={{
                            backgroundColor: colors.gray[100],
                            aspectRatio: 1,
                          }}
                        >
                          <Text className="text-gray-900 font-bold text-lg">
                            {verse}
                          </Text>
                        </View>
                      </Pressable>
                    </MotiView>
                  )
                )}
              </View>
            </View>
          </MotiView>
        ) : (
          /* Chapter Selection */
          <MotiView
            from={{ opacity: 0, translateX: -20 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{
              type: 'timing',
              duration: 150, // Ultra-snappy: 200ms → 150ms
            }}
          >
            <View className="p-6">
              {/* Section Title */}
              <Text className="text-gray-600 text-sm font-medium mb-4 text-center">
                {t('bible.selectChapter')}
              </Text>

              <View className="flex-row flex-wrap gap-2">
                {Array.from({ length: selectedBook.chapter_count }, (_, i) => i + 1).map(
                  (chapter, index) => (
                    <MotiView
                      key={`chapter-${chapter}`}
                      from={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        type: 'spring',
                        delay: index * 5, // Ultra-snappy: instant start (0ms) + 5ms stagger
                      }}
                      style={{ width: '18%' }}
                    >
                      <Pressable
                        onPress={() => handleChapterSelect(chapter)}
                        className="active:opacity-70"
                      >
                        <View
                          className="p-4 items-center justify-center rounded-lg"
                          style={{
                            backgroundColor: colors.gray[100],
                            aspectRatio: 1,
                          }}
                        >
                          <Text className="text-gray-900 font-bold text-lg">
                            {chapter}
                          </Text>
                        </View>
                      </Pressable>
                    </MotiView>
                  )
                )}
              </View>
            </View>
          </MotiView>
        )}
      </BottomSheetScrollView>
    </GorhomBottomSheet>
  );
}
