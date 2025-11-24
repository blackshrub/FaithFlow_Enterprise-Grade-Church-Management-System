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
import { BookOpen, Languages, Search, Type } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';

import { ChapterReader } from '@/components/bible/ChapterReader';
import { BookSelectorModal } from '@/components/bible/BookSelectorModal';
import { ReadingPreferencesModal } from '@/components/bible/ReadingPreferencesModal';
import { BibleVersionSelector } from '@/components/bible/BibleVersionSelector';
import { BibleSearchModal } from '@/components/bible/BibleSearchModal';
import { useBibleChapter, useBibleBooks, useBibleVersions } from '@/hooks/useBible';
import { useBibleStore } from '@/stores/bibleStore';
import { colors, touchTargets, readingThemes } from '@/constants/theme';

export default function BibleScreen() {
  const { t } = useTranslation();
  const [isBookSelectorOpen, setIsBookSelectorOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isVersionSelectorOpen, setIsVersionSelectorOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const { currentVersion, currentBook, currentChapter, setCurrentPosition, preferences } =
    useBibleStore();

  // Fetch current chapter
  const { data: verses, isLoading: isLoadingChapter } = useBibleChapter(
    currentVersion,
    currentBook,
    currentChapter
  );

  // Fetch books for navigation
  const { data: books = [], isLoading: isLoadingBooks, error: booksError } = useBibleBooks(currentVersion);

  // Fetch Bible versions
  const { data: versions = [] } = useBibleVersions();

  // Debug logging
  console.log('Bible Screen - currentVersion:', currentVersion);
  console.log('Bible Screen - books length:', books?.length);
  console.log('Bible Screen - isLoadingBooks:', isLoadingBooks);
  console.log('Bible Screen - booksError:', booksError);
  console.log('Bible Screen - books sample:', books?.[0]);

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

  const handleSelectVersion = (versionCode: string) => {
    // When switching versions, go to first chapter of first book to avoid missing chapters
    const firstBook = books?.[0];
    if (firstBook) {
      setCurrentPosition(versionCode, firstBook.name, 1);
    } else {
      // Fallback to Genesis if books not loaded yet
      setCurrentPosition(versionCode, 'Genesis', 1);
    }
  };

  const handleSearchVerseSelect = (book: string, chapter: number, verse: number) => {
    setCurrentPosition(currentVersion, book, chapter);
    // TODO: Scroll to specific verse
  };

  const currentTheme = readingThemes[preferences.theme];

  return (
    <SafeAreaView
      className="flex-1"
      edges={['top']}
      style={{ backgroundColor: currentTheme.background }}
    >
      {/* Header - Minimal Design */}
      <View
        className="px-4 py-2"
        style={{ borderBottomWidth: 0.5, borderBottomColor: currentTheme.verseNumber + '20' }}
      >
        <HStack className="items-center justify-between">
          {/* Left Button Group */}
          <HStack space="xs" className="items-center">
            {/* Book/Chapter Selector */}
            <Pressable
              onPress={() => setIsBookSelectorOpen(true)}
              className="active:opacity-60"
              style={{
                paddingVertical: 6,
                paddingHorizontal: 12,
                backgroundColor: colors.gray[100],
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Icon as={BookOpen} size="sm" className="text-gray-700" />
              <Text className="text-gray-900 font-medium text-sm">
                {currentBook} {currentChapter}
              </Text>
            </Pressable>

            {/* Version Selector */}
            <Pressable
              onPress={() => setIsVersionSelectorOpen(true)}
              className="active:opacity-60"
              style={{
                paddingVertical: 6,
                paddingHorizontal: 12,
                backgroundColor: colors.primary[50],
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Icon as={Languages} size="sm" className="text-primary-600" />
              <Text className="text-primary-600 font-medium text-sm">{currentVersion}</Text>
            </Pressable>
          </HStack>

          {/* Right Button Group */}
          <HStack space="xs" className="items-center">
            {/* Search Button */}
            <Pressable
              onPress={() => setIsSearchOpen(true)}
              className="active:opacity-60"
              style={{
                width: 32,
                height: 32,
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: 8,
                backgroundColor: colors.gray[100],
              }}
            >
              <Icon as={Search} size="sm" className="text-gray-700" />
            </Pressable>

            {/* Readability Settings (Aa) */}
            <Pressable
              onPress={() => setIsPreferencesOpen(true)}
              className="active:opacity-60"
              style={{
                width: 32,
                height: 32,
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: 8,
                backgroundColor: colors.gray[100],
              }}
            >
              <Icon as={Type} size="sm" className="text-gray-700" />
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

      {/* Bible Version Selector */}
      <BibleVersionSelector
        isOpen={isVersionSelectorOpen}
        onClose={() => setIsVersionSelectorOpen(false)}
        versions={versions}
        currentVersion={currentVersion}
        onSelectVersion={handleSelectVersion}
      />

      {/* Bible Search Modal */}
      <BibleSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        version={currentVersion}
        onSelectVerse={handleSearchVerseSelect}
      />
    </SafeAreaView>
  );
}
