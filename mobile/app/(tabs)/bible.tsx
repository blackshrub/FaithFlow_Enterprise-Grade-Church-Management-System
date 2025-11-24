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

import React, { useState, useEffect } from 'react';
import { View, Pressable, ActivityIndicator, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { BookOpen, Languages, Search, Type } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';

import { ChapterReader } from '@/components/bible/ChapterReader';
import { BookSelectorModal } from '@/components/bible/BookSelectorModal';
import { ReadingPreferencesModal } from '@/components/bible/ReadingPreferencesModal';
import { BibleVersionSelector } from '@/components/bible/BibleVersionSelector';
import { BibleSearchModal } from '@/components/bible/BibleSearchModal';
import { VerseSelectionBar } from '@/components/bible/VerseSelectionBar';
import { HighlightColorPicker } from '@/components/bible/HighlightColorPicker';
import { useBibleChapterOffline, useBibleBooksOffline } from '@/hooks/useBibleOffline';
import { useBibleStore, type VerseRef, type Highlight } from '@/stores/bibleStore';
import { colors, touchTargets, readingThemes } from '@/constants/theme';
import { BIBLE_TRANSLATIONS, type BibleTranslation } from '@/types/bible';
import { useToast, Toast, ToastTitle, ToastDescription } from '@/components/ui/toast';

export default function BibleScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const [isBookSelectorOpen, setIsBookSelectorOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isVersionSelectorOpen, setIsVersionSelectorOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [scrollToVerseNumber, setScrollToVerseNumber] = useState<number | null>(null);

  // NEW: Color picker state for highlight selection
  const [showColorPicker, setShowColorPicker] = useState(false);

  const {
    currentVersion,
    currentBook,
    currentChapter,
    setCurrentPosition,
    preferences,
    getHighlight,
    addHighlight,
    removeHighlight,
    // NEW: Verse selection from store
    isSelecting,
    selectedVerses,
    clearSelection,
    // Bookmark functions
    getBookmark,
    addBookmark,
    removeBookmark,
  } = useBibleStore();

  // Cast version to BibleTranslation type
  const version = currentVersion as BibleTranslation;

  // Fetch current chapter (offline)
  const { data: verses, isLoading: isLoadingChapter } = useBibleChapterOffline(
    version,
    currentBook,
    currentChapter
  );

  // Fetch books for navigation (offline)
  const { data: books = [], isLoading: isLoadingBooks, error: booksError } = useBibleBooksOffline(version);

  // Bible versions are now hardcoded since they're offline
  const versions = Object.values(BIBLE_TRANSLATIONS);

  // Debug logging
  console.log('Bible Screen (Offline) - currentVersion:', currentVersion);
  console.log('Bible Screen (Offline) - books length:', books?.length);
  console.log('Bible Screen (Offline) - isLoadingBooks:', isLoadingBooks);
  console.log('Bible Screen (Offline) - booksError:', booksError);
  console.log('Bible Screen (Offline) - books sample:', books?.[0]);

  // Get current book info for chapter navigation
  const currentBookInfo = books.find(
    (b) => b.name === currentBook || b.englishName === currentBook
  );
  const totalChapters = currentBookInfo?.chapters || 1;

  // Get localized book name (for display in header)
  const displayBookName = currentBookInfo?.name || currentBook;

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
    // When switching versions, go to first book (Genesis)
    // Use English name since the loader will convert it to book number
    setCurrentPosition(versionCode, 'Genesis', 1);
  };

  const handleSearchVerseSelect = (book: string, chapter: number, verse: number) => {
    console.log('[Bible Screen] Search verse selected:', { book, chapter, verse });
    setScrollToVerseNumber(verse);
    setCurrentPosition(currentVersion, book, chapter);
    console.log('[Bible Screen] scrollToVerseNumber set to:', verse);
  };

  /**
   * NEW: Handle highlight button tap - show color picker
   * Design choice: Show color picker instead of toggle, allowing user to select color.
   * This matches YouVersion's UX where you pick a color to highlight.
   */
  const handleHighlightTap = () => {
    setShowColorPicker(!showColorPicker);
  };

  /**
   * NEW: Handle color selection from picker
   * Apply the selected color to all selected verses
   * Keep selection active so user can perform more actions
   */
  const handleColorSelect = (color: Highlight['color']) => {
    selectedVerses.forEach((verseRef) => {
      const existing = getHighlight(
        verseRef.version,
        verseRef.book,
        verseRef.chapter,
        verseRef.verse
      );

      if (existing) {
        // Update existing highlight color
        removeHighlight(existing.id);
      }

      // Add new highlight with selected color
      addHighlight({
        version: verseRef.version,
        book: verseRef.book,
        chapter: verseRef.chapter,
        verse: verseRef.verse,
        color,
      });
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowColorPicker(false);
    // Keep selection active - don't clear
  };

  /**
   * NEW: Handle clear highlight - remove highlights from selected verses
   * Keep selection active so user can perform more actions
   */
  const handleClearHighlight = () => {
    selectedVerses.forEach((verseRef) => {
      const existing = getHighlight(
        verseRef.version,
        verseRef.book,
        verseRef.chapter,
        verseRef.verse
      );

      if (existing) {
        removeHighlight(existing.id);
      }
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowColorPicker(false);
    // Keep selection active - don't clear
  };

  /**
   * NEW: Handle copy verses
   * Format: "{Reference}\n\n{Verse 1}\n{Verse 2}..."
   * Keep selection active so user can perform more actions
   */
  const handleCopyVerses = async () => {
    if (selectedVerses.length === 0 || !verses) return;

    // Sort by verse number
    const sortedRefs = [...selectedVerses].sort((a, b) => a.verse - b.verse);

    const selectedTexts = sortedRefs
      .map((verseRef) => {
        const verse = verses.find((v) => v.verse === verseRef.verse);
        return verse ? `${verseRef.verse}. ${verse.text}` : '';
      })
      .filter(Boolean)
      .join('\n\n');

    const reference = getSelectedReference();
    const fullText = `${reference} (${currentVersion})\n\n${selectedTexts}`;

    await Clipboard.setStringAsync(fullText);

    // Show toast notification
    const verseCount = selectedVerses.length;
    const verseText = verseCount === 1 ? t('bible.verse') : t('bible.verses');

    toast.show({
      placement: 'bottom',
      duration: 3000,
      render: ({ id }) => (
        <Toast action="success" variant="solid" nativeID={`toast-${id}`}>
          <ToastTitle>{t('bible.verseCopied')}</ToastTitle>
          <ToastDescription>
            {reference} - {verseCount} {verseText}
          </ToastDescription>
        </Toast>
      ),
    });

    // Keep selection active - don't clear
  };

  /**
   * NEW: Handle share verses
   * Keep selection active so user can perform more actions
   */
  const handleShareVerses = async () => {
    if (selectedVerses.length === 0 || !verses) return;

    const sortedRefs = [...selectedVerses].sort((a, b) => a.verse - b.verse);

    const selectedTexts = sortedRefs
      .map((verseRef) => {
        const verse = verses.find((v) => v.verse === verseRef.verse);
        return verse ? `${verseRef.verse}. ${verse.text}` : '';
      })
      .filter(Boolean)
      .join('\n\n');

    const reference = getSelectedReference();
    const fullText = `${reference} (${currentVersion})\n\n${selectedTexts}`;

    try {
      await Share.share({ message: fullText });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Keep selection active - don't clear
    } catch (error) {
      console.error('Error sharing verses:', error);
    }
  };

  /**
   * NEW: Get formatted reference string from selected verses
   * Examples: "Genesis 1:3" or "Genesis 1:3-5"
   * Uses localized book name from currentBookInfo if available
   */
  const getSelectedReference = (): string => {
    if (selectedVerses.length === 0) return '';

    const sortedVerses = [...selectedVerses].sort((a, b) => a.verse - b.verse);
    // Use localized book name if available, otherwise fall back to currentBook
    const bookName = displayBookName || currentBook;

    if (sortedVerses.length === 1) {
      return `${bookName} ${currentChapter}:${sortedVerses[0].verse}`;
    }

    return `${bookName} ${currentChapter}:${sortedVerses[0].verse}-${
      sortedVerses[sortedVerses.length - 1].verse
    }`;
  };

  /**
   * NEW: Check if any selected verse is already highlighted
   */
  const hasHighlightedVerse = selectedVerses.some((verseRef) =>
    getHighlight(verseRef.version, verseRef.book, verseRef.chapter, verseRef.verse)
  );

  /**
   * NEW: Check if any selected verse is already bookmarked
   */
  const hasBookmarkedVerse = selectedVerses.some((verseRef) =>
    getBookmark(verseRef.version, verseRef.book, verseRef.chapter, verseRef.verse)
  );

  /**
   * NEW: Handle bookmark verses
   * If selected verses are bookmarked, remove bookmarks. Otherwise, add bookmarks.
   * Keep selection active so user can perform more actions
   */
  const handleBookmarkVerses = () => {
    const allBookmarked = selectedVerses.every((verseRef) =>
      getBookmark(verseRef.version, verseRef.book, verseRef.chapter, verseRef.verse)
    );

    if (allBookmarked) {
      // Remove all bookmarks
      selectedVerses.forEach((verseRef) => {
        const existing = getBookmark(
          verseRef.version,
          verseRef.book,
          verseRef.chapter,
          verseRef.verse
        );
        if (existing) {
          removeBookmark(existing.id);
        }
      });
      toast.show({
        placement: 'bottom',
        duration: 2000,
        render: ({ id }) => (
          <Toast action="info" variant="solid" nativeID={`toast-${id}`}>
            <ToastTitle>Bookmark Removed</ToastTitle>
          </Toast>
        ),
      });
    } else {
      // Add bookmarks for all selected verses
      selectedVerses.forEach((verseRef) => {
        // Remove existing bookmark if any
        const existing = getBookmark(
          verseRef.version,
          verseRef.book,
          verseRef.chapter,
          verseRef.verse
        );
        if (existing) {
          removeBookmark(existing.id);
        }

        // Add new bookmark
        addBookmark({
          version: verseRef.version,
          book: verseRef.book,
          chapter: verseRef.chapter,
          verse: verseRef.verse,
        });
      });

      const verseCount = selectedVerses.length;
      const verseText = verseCount === 1 ? t('bible.verse') : t('bible.verses');

      toast.show({
        placement: 'bottom',
        duration: 2000,
        render: ({ id }) => (
          <Toast action="success" variant="solid" nativeID={`toast-${id}`}>
            <ToastTitle>Bookmark Added</ToastTitle>
            <ToastDescription>
              {verseCount} {verseText} bookmarked
            </ToastDescription>
          </Toast>
        ),
      });
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Keep selection active - don't clear
  };

  // Reset scroll target when chapter changes ONLY if no target verse was set
  // This prevents clearing the scroll target when navigating from search results
  useEffect(() => {
    // Don't reset if we just set a scroll target
    const timer = setTimeout(() => {
      setScrollToVerseNumber(null);
    }, 500); // Give ChapterReader time to process the scroll

    return () => clearTimeout(timer);
  }, [currentBook, currentChapter]);

  // NEW: Clear selection when chapter changes
  useEffect(() => {
    clearSelection();
    setShowColorPicker(false);
  }, [currentBook, currentChapter, clearSelection]);

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
                {displayBookName} {currentChapter}
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
          scrollToVerse={scrollToVerseNumber}
          totalChapters={totalChapters}
          onPreviousChapter={handlePreviousChapter}
          onNextChapter={handleNextChapter}
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
        version={currentVersion}
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

      {/* NEW: Verse Selection Bar - Compact bottom action bar (YouVersion-style) */}
      {isSelecting && (
        <VerseSelectionBar
          selectedVerses={selectedVerses}
          onHighlight={handleHighlightTap}
          onCopy={handleCopyVerses}
          onShare={handleShareVerses}
          onBookmark={handleBookmarkVerses}
          onDone={clearSelection}
          hasHighlightedVerse={hasHighlightedVerse}
          hasBookmarkedVerse={hasBookmarkedVerse}
        />
      )}

      {/* NEW: Highlight Color Picker - Appears above action bar when highlight is tapped */}
      {isSelecting && showColorPicker && (
        <HighlightColorPicker
          selectedColor={undefined} // Could track last used color
          onSelectColor={handleColorSelect}
          onClearHighlight={handleClearHighlight}
        />
      )}
    </SafeAreaView>
  );
}
