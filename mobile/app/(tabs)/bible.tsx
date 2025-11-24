/**
 * Bible Reader Screen
 *
 * YouVersion-inspired reading experience:
 * - Clean, distraction-free reading
 * - Smooth scrolling with FlashList
 * - Tap to highlight verses
 * - Quick book/chapter navigation
 * - Reading preferences (font size, theme)
 */

import React, { useState } from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { BookOpen, ChevronLeft, ChevronRight, Settings } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';

import { ChapterReader } from '@/components/bible/ChapterReader';
import { BookSelectorModal } from '@/components/bible/BookSelectorModal';
import { ReadingPreferencesModal } from '@/components/bible/ReadingPreferencesModal';
import { useBibleChapter, useBibleBooks } from '@/hooks/useBible';
import { useBibleStore } from '@/stores/bibleStore';
import { colors, touchTargets, readingThemes } from '@/constants/theme';

export default function BibleScreen() {
  const { t } = useTranslation();
  const [isBookSelectorOpen, setIsBookSelectorOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  const { currentVersion, currentBook, currentChapter, setCurrentPosition, preferences } =
    useBibleStore();

  // Fetch current chapter
  const { data: verses, isLoading: isLoadingChapter } = useBibleChapter(
    currentVersion,
    currentBook,
    currentChapter
  );

  // Fetch books for navigation
  const { data: books = [] } = useBibleBooks(currentVersion);

  // Get current book info for chapter navigation
  const currentBookInfo = books.find(
    (b) => b.name === currentBook || b.name_local === currentBook
  );
  const totalChapters = currentBookInfo?.chapter_count || 1;

  // Navigation handlers
  const handlePreviousChapter = () => {
    if (currentChapter > 1) {
      setCurrentPosition(currentVersion, currentBook, currentChapter - 1);
    }
  };

  const handleNextChapter = () => {
    if (currentChapter < totalChapters) {
      setCurrentPosition(currentVersion, currentBook, currentChapter + 1);
    }
  };

  const handleSelectChapter = (book: string, chapter: number) => {
    setCurrentPosition(currentVersion, book, chapter);
  };

  const currentTheme = readingThemes[preferences.theme];

  return (
    <SafeAreaView
      className="flex-1"
      edges={['top']}
      style={{ backgroundColor: currentTheme.background }}
    >
      {/* Header */}
      <View
        className="px-4 py-3 border-b"
        style={{ borderBottomColor: currentTheme.verseNumber + '40' }}
      >
        <HStack className="items-center justify-between">
          {/* Book & Chapter */}
          <Pressable
            onPress={() => setIsBookSelectorOpen(true)}
            className="flex-1 active:opacity-60"
          >
            <HStack space="sm" className="items-center">
              <Icon as={BookOpen} size="md" className="text-primary-500" />
              <View className="flex-1">
                <Heading size="md" style={{ color: currentTheme.text }}>
                  {currentBook} {currentChapter}
                </Heading>
                <Text size="xs" style={{ color: currentTheme.verseNumber }}>
                  {currentVersion} • {totalChapters} chapters
                </Text>
              </View>
            </HStack>
          </Pressable>

          {/* Navigation */}
          <HStack space="xs">
            {/* Previous Chapter */}
            <Pressable
              onPress={handlePreviousChapter}
              disabled={currentChapter <= 1}
              className="active:opacity-60"
              style={{
                width: touchTargets.comfortable,
                height: touchTargets.comfortable,
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: touchTargets.comfortable / 2,
                backgroundColor: currentChapter <= 1 ? colors.gray[100] : colors.primary[50],
              }}
            >
              <Icon
                as={ChevronLeft}
                size="lg"
                className={currentChapter <= 1 ? 'text-gray-300' : 'text-primary-500'}
              />
            </Pressable>

            {/* Next Chapter */}
            <Pressable
              onPress={handleNextChapter}
              disabled={currentChapter >= totalChapters}
              className="active:opacity-60"
              style={{
                width: touchTargets.comfortable,
                height: touchTargets.comfortable,
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: touchTargets.comfortable / 2,
                backgroundColor:
                  currentChapter >= totalChapters ? colors.gray[100] : colors.primary[50],
              }}
            >
              <Icon
                as={ChevronRight}
                size="lg"
                className={
                  currentChapter >= totalChapters ? 'text-gray-300' : 'text-primary-500'
                }
              />
            </Pressable>

            {/* Settings */}
            <Pressable
              onPress={() => setIsPreferencesOpen(true)}
              className="active:opacity-60"
              style={{
                width: touchTargets.comfortable,
                height: touchTargets.comfortable,
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: touchTargets.comfortable / 2,
                backgroundColor: colors.gray[100],
              }}
            >
              <Icon as={Settings} size="lg" className="text-gray-600" />
            </Pressable>
          </HStack>
        </HStack>
      </View>

      {/* Chapter Content */}
      {isLoadingChapter ? (
        <View
          className="flex-1 items-center justify-center"
          style={{ backgroundColor: currentTheme.background }}
        >
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text className="mt-4" style={{ color: currentTheme.verseNumber }}>
            Loading chapter...
          </Text>
        </View>
      ) : verses && verses.length > 0 ? (
        <ChapterReader
          verses={verses}
          version={currentVersion}
          book={currentBook}
          chapter={currentChapter}
        />
      ) : (
        <View
          className="flex-1 items-center justify-center px-6"
          style={{ backgroundColor: currentTheme.background }}
        >
          <Text className="text-center" style={{ color: currentTheme.verseNumber }}>
            Chapter not found. Please select another chapter.
          </Text>
        </View>
      )}

      {/* Book Selector Modal */}
      <BookSelectorModal
        isOpen={isBookSelectorOpen}
        onClose={() => setIsBookSelectorOpen(false)}
        books={books}
        onSelectChapter={handleSelectChapter}
      />

      {/* Reading Preferences Modal */}
      <ReadingPreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
      />
    </SafeAreaView>
  );
}
