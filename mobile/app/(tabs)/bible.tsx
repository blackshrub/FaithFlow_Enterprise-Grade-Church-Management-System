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

import React, { useState, useEffect, useRef } from 'react';
import { View, Pressable, ActivityIndicator, Share, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { BookOpen, Languages, Search, Type, Bookmark as BookmarkIcon } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';

import { ChapterReader, MemoizedChapterReader } from '@/components/bible/ChapterReader';
import { ContinuousScrollReader } from '@/components/bible/ContinuousScrollReader';
import { BookSelectorModal } from '@/components/bible/BookSelectorModal';
import { ReadingPreferencesModal } from '@/components/bible/ReadingPreferencesModal';
import { BibleVersionSelector } from '@/components/bible/BibleVersionSelector';
import { BibleSearchModal } from '@/components/bible/BibleSearchModal';
import { VerseSelectionBar } from '@/components/bible/VerseSelectionBar';
import { HighlightColorPicker } from '@/components/bible/HighlightColorPicker';
import { BookmarksModal } from '@/components/bible/BookmarksModal';
import { useBibleChapterOffline, useBibleBooksOffline } from '@/hooks/useBibleOffline';
import { useBibleStore, type VerseRef, type Highlight, type Bookmark } from '@/stores/bibleStore';
import { useBibleUIStore } from '@/stores/bibleUIStore';
import { colors, readingThemes } from '@/constants/theme';
import { BIBLE_TRANSLATIONS, type BibleTranslation } from '@/types/bible';
import { showSuccessToast, showErrorToast, showInfoToast } from '@/components/ui/Toast';
import { useQueryClient } from '@tanstack/react-query';
import { getBibleLoader } from '@/lib/bibleLoaderOptimized';
import { getBookNumber } from '@/lib/bibleBookLookup';

export default function BibleScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isBookSelectorOpen, setIsBookSelectorOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isVersionSelectorOpen, setIsVersionSelectorOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [scrollToVerseNumber, setScrollToVerseNumber] = useState<number | null>(null);

  // Global note editor store
  const { openNoteEditor } = useBibleUIStore();

  // NEW: Color picker state for highlight selection
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Focus mode: animated header and tab bar visibility
  const headerHeight = useRef(new Animated.Value(1)).current; // 1 = visible, 0 = hidden
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const lastScrollY = useRef(0);

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
    // Flash highlights for bookmark navigation
    setFlashHighlights,
    clearFlashHighlights,
  } = useBibleStore();

  // Cast version to BibleTranslation type
  const version = currentVersion as BibleTranslation;

  // Fetch current chapter (offline)
  // Use isFetching instead of isLoading to avoid showing loader for cached data
  const { data: verses, isLoading: isLoadingChapter, isFetching: isFetchingChapter } = useBibleChapterOffline(
    version,
    currentBook,
    currentChapter
  );

  // Only show loading if we have no data AND we're loading
  // This prevents loading indicator when switching between cached chapters
  const shouldShowLoading = isLoadingChapter && !verses;

  // Fetch books for navigation (offline)
  const { data: books = [], isLoading: isLoadingBooks, error: booksError } = useBibleBooksOffline(version);

  // Bible versions are now hardcoded since they're offline
  const versions = Object.values(BIBLE_TRANSLATIONS);

  // Get current book info for chapter navigation
  const currentBookInfo = books.find(
    (b) => b.name === currentBook || b.englishName === currentBook
  );
  const totalChapters = currentBookInfo?.chapters || 1;

  // Get localized book name (for display in header)
  const displayBookName = currentBookInfo?.name || currentBook;

  /**
   * Handle scroll for focus mode auto-hide behavior
   * Scroll down = hide header completely, Scroll up = show header
   * Also communicates with parent to hide tab bar
   */
  const handleScroll = (event: { nativeEvent: { contentOffset: { y: number } } }) => {
    if (!preferences?.focusMode) return;

    const currentScrollY = event.nativeEvent.contentOffset.y;
    const scrollDelta = currentScrollY - lastScrollY.current;

    // Only hide/show if scrolled more than threshold
    const threshold = 5;

    if (scrollDelta > threshold && currentScrollY > 50) {
      // Scrolling down - hide header completely
      Animated.parallel([
        Animated.timing(headerOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false, // Use false for both to avoid conflicts
        }),
        Animated.timing(headerHeight, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
        }),
      ]).start();
    } else if (scrollDelta < -threshold) {
      // Scrolling up - show header
      Animated.parallel([
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: false, // Use false for both to avoid conflicts
        }),
        Animated.timing(headerHeight, {
          toValue: 1,
          duration: 250,
          useNativeDriver: false,
        }),
      ]).start();
    }

    lastScrollY.current = currentScrollY;
  };

  // Reset header visibility when focus mode is toggled off
  useEffect(() => {
    if (!preferences?.focusMode) {
      Animated.parallel([
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: false, // Use false for both to avoid conflicts
        }),
        Animated.timing(headerHeight, {
          toValue: 1,
          duration: 250,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [preferences?.focusMode, headerOpacity, headerHeight]);

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

  const handleSelectChapter = (book: string, chapter: number, verse?: number) => {
    // First, navigate to the chapter
    setCurrentPosition(currentVersion, book, chapter);

    // If verse is specified, scroll to it after chapter loads
    if (verse && preferences.showVerseSelector) {
      // Reset scroll state first to ensure effect re-triggers
      setScrollToVerseNumber(null);

      // Then set target verse after brief delay to ensure chapter is rendered
      // Increased from 300ms to 400ms to match ChapterReader's 500ms scroll delay
      setTimeout(() => {
        setScrollToVerseNumber(verse);
      }, 400);

      // Set flash highlight for selected verse (3 seconds) - visual feedback for verse selector navigation
      const flashVerseRef: VerseRef = {
        version: currentVersion,
        book,
        chapter,
        verse,
      };
      setFlashHighlights([flashVerseRef]);

      // Clear flash highlight after 3 seconds
      setTimeout(() => {
        clearFlashHighlights();
      }, 3000);
    }
  };

  const handleSelectVersion = (versionCode: string) => {
    // When switching versions, go to first book (Genesis)
    // Use English name since the loader will convert it to book number
    setCurrentPosition(versionCode, 'Genesis', 1);
  };

  const handleSearchVerseSelect = (book: string, chapter: number, verse: number) => {
    setScrollToVerseNumber(verse);
    setCurrentPosition(currentVersion, book, chapter);
  };

  const handleBookmarkSelect = (bookmark: Bookmark) => {
    // If bookmark is from a different version, switch to that version
    if (bookmark.version !== currentVersion) {
      setCurrentPosition(bookmark.version, bookmark.book, bookmark.chapter);
    } else {
      setCurrentPosition(currentVersion, bookmark.book, bookmark.chapter);
    }

    // Reset scrollToVerseNumber first to ensure the effect re-triggers
    // even if we're scrolling to the same verse again
    setScrollToVerseNumber(null);

    // Then set the target verse after a brief delay
    setTimeout(() => {
      setScrollToVerseNumber(bookmark.verse);
    }, 50);

    // Set flash highlights for bookmarked verses (3 seconds)
    const versesToHighlight = bookmark.verses || [bookmark.verse];
    const flashVersesRefs: VerseRef[] = versesToHighlight.map(v => ({
      version: bookmark.version,
      book: bookmark.book,
      chapter: bookmark.chapter,
      verse: v,
    }));
    setFlashHighlights(flashVersesRefs);

    // Clear flash highlights after 3 seconds
    setTimeout(() => {
      clearFlashHighlights();
    }, 3000);
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

    // Show success toast with haptic feedback
    const verseCount = selectedVerses.length;
    const verseText = verseCount === 1 ? t('bible.verse') : t('bible.verses');

    showSuccessToast(
      `✓ ${t('bible.verseCopied')}`,
      `${reference} - ${verseCount} ${verseText}`
    );

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
      const result = await Share.share({ message: fullText });

      // Show feedback if share succeeded (not cancelled)
      if (result.action === Share.sharedAction) {
        const verseCount = selectedVerses.length;
        const verseText = verseCount === 1 ? t('bible.verse') : t('bible.verses');

        showSuccessToast(
          '✓ Shared Successfully',
          `${verseCount} ${verseText} shared`
        );
      }
      // Keep selection active - don't clear
    } catch (error) {
      console.error('Error sharing verses:', error);
      showErrorToast('Share Failed', 'Could not share verses');
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
   * For multiple verses, combine them into a single bookmark with verse range.
   * Keep selection active so user can perform more actions
   */
  const handleBookmarkVerses = () => {
    const allBookmarked = selectedVerses.every((verseRef) =>
      getBookmark(verseRef.version, verseRef.book, verseRef.chapter, verseRef.verse)
    );

    if (allBookmarked) {
      // Remove all bookmarks that overlap with selected verses
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
      showInfoToast('Bookmark Removed');
    } else {
      // Combine selected verses into a single bookmark with verse range
      if (selectedVerses.length === 0) return;

      // Get the first verse for version/book/chapter (all selected verses should be from the same chapter)
      const firstVerse = selectedVerses[0];

      // Find min and max verse numbers
      const verseNumbers = selectedVerses.map((v) => v.verse);
      const minVerse = Math.min(...verseNumbers);
      const maxVerse = Math.max(...verseNumbers);

      // Remove any existing bookmarks that overlap with this range
      for (let v = minVerse; v <= maxVerse; v++) {
        const existing = getBookmark(
          firstVerse.version,
          firstVerse.book,
          firstVerse.chapter,
          v
        );
        if (existing) {
          removeBookmark(existing.id);
        }
      }

      // Add single combined bookmark with verse array for smart formatting
      addBookmark({
        version: firstVerse.version,
        book: firstVerse.book,
        chapter: firstVerse.chapter,
        verse: minVerse,
        endVerse: maxVerse > minVerse ? maxVerse : undefined, // Only set endVerse if it's a range
        verses: verseNumbers.sort((a, b) => a - b), // Store sorted array for smart range formatting
      });

      const verseCount = selectedVerses.length;
      const verseText = verseCount === 1 ? t('bible.verse') : t('bible.verses');

      showSuccessToast(
        'Bookmark Added',
        `${verseCount} ${verseText} bookmarked`
      );
    }
    // Keep selection active - don't clear
  };

  /**
   * NEW: Handle note button tap - open note editor for selected verses
   * For single verse: edit existing note or create new note
   * For multiple verses: create note for first verse (YouVersion-style)
   *
   * FIX: Removed animation conflicts that were preventing modal from opening
   * - Changed all header animations to useNativeDriver: false
   * - Changed height animation to maxHeight (supported property)
   */
  const handleNoteVerses = () => {
    if (selectedVerses.length === 0) return;

    // Haptic feedback when opening note editor
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    openNoteEditor({
      verseReference: getSelectedReference(),
      initialNote: getSelectedVerseNote(),
      onSave: handleSaveNote,
    });
  };

  /**
   * NEW: Save note to bookmark
   * If bookmark doesn't exist, create it with the note
   * If bookmark exists, update the note
   */
  const handleSaveNote = (note: string) => {
    if (selectedVerses.length === 0) return;

    const firstVerse = selectedVerses[0];

    // Remove existing bookmark if any
    const existing = getBookmark(
      firstVerse.version,
      firstVerse.book,
      firstVerse.chapter,
      firstVerse.verse
    );
    if (existing) {
      removeBookmark(existing.id);
    }

    // Add bookmark with note
    addBookmark({
      version: firstVerse.version,
      book: firstVerse.book,
      chapter: firstVerse.chapter,
      verse: firstVerse.verse,
      note: note.trim() || undefined,
    });

    showSuccessToast('Note Saved');
  };

  /**
   * Get note from first selected verse's bookmark (if exists)
   */
  const getSelectedVerseNote = (): string => {
    if (selectedVerses.length === 0) return '';

    const firstVerse = selectedVerses[0];
    const bookmark = getBookmark(
      firstVerse.version,
      firstVerse.book,
      firstVerse.chapter,
      firstVerse.verse
    );

    return bookmark?.note || '';
  };

  /**
   * INSTANT NAVIGATION: Prefetch adjacent chapters
   * Preload next and previous chapters so navigation is instant with zero delay
   */
  useEffect(() => {
    const prefetchAdjacentChapters = async () => {
      const bookNum = getBookNumber(currentBook);
      if (!bookNum) return;

      const loader = getBibleLoader(version);

      // Ensure Bible is loaded
      if (!loader.isLoaded()) {
        await loader.load();
      }

      // Prefetch previous chapter
      if (currentChapter > 1) {
        const prevChapterKey = ['bible-chapter-offline', version, bookNum, currentChapter - 1];
        queryClient.prefetchQuery({
          queryKey: prevChapterKey,
          queryFn: async () => loader.getChapter(bookNum, currentChapter - 1),
          staleTime: 1000 * 60 * 60 * 24 * 7, // 1 week
        });
      }

      // Prefetch next chapter
      if (currentChapter < totalChapters) {
        const nextChapterKey = ['bible-chapter-offline', version, bookNum, currentChapter + 1];
        queryClient.prefetchQuery({
          queryKey: nextChapterKey,
          queryFn: async () => loader.getChapter(bookNum, currentChapter + 1),
          staleTime: 1000 * 60 * 60 * 24 * 7, // 1 week
        });
      }
    };

    prefetchAdjacentChapters();
  }, [version, currentBook, currentChapter, totalChapters, queryClient]);

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
      {/* Header - Minimal Design - Animated for focus mode */}
      <Animated.View
        className="px-4"
        style={{
          borderBottomWidth: 0.5,
          borderBottomColor: currentTheme.verseNumber + '20',
          opacity: headerOpacity,
          maxHeight: headerHeight.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 100], // Max 100px to accommodate content
          }),
          overflow: 'hidden',
        }}
      >
        <View className="py-2">
        <HStack className="items-center justify-between">
          {/* Left Button Group */}
          <HStack space="xs" className="items-center">
            {/* Book/Chapter Selector */}
            <Pressable
              onPress={() => {
                clearSelection();
                setIsBookSelectorOpen(true);
              }}
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
              onPress={() => {
                clearSelection();
                setIsVersionSelectorOpen(true);
              }}
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
              onPress={() => {
                clearSelection();
                setIsSearchOpen(true);
              }}
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

            {/* Bookmarks Button */}
            <Pressable
              onPress={() => {
                clearSelection();
                setIsBookmarksOpen(true);
              }}
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
              <Icon as={BookmarkIcon} size="sm" className="text-gray-700" />
            </Pressable>

            {/* Readability Settings (Aa) */}
            <Pressable
              onPress={() => {
                clearSelection();
                setIsPreferencesOpen(true);
              }}
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
      </Animated.View>

      {/* Chapter Content */}
      {shouldShowLoading ? (
        <View
          className="flex-1 items-center justify-center"
          style={{ backgroundColor: currentTheme.background }}
        >
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text className="mt-4" style={{ color: currentTheme.verseNumber }}>
            Loading chapter...
          </Text>
        </View>
      ) : preferences.readingMode === 'scroll' || preferences.readingMode === 'continuous' ? (
        // Continuous scroll mode - infinite scroll across chapters
        <ContinuousScrollReader
          version={version}
          initialBook={getBookNumber(currentBook) || 1}
          initialChapter={currentChapter}
          scrollToVerse={scrollToVerseNumber}
          onChapterChange={(book, chapter) => {
            // Update header to show current visible chapter
            // NOTE: We DO NOT call setCurrentPosition here to avoid refresh loop
            // The header will update automatically when scrolling
          }}
          onScroll={handleScroll}
        />
      ) : verses && verses.length > 0 ? (
        // Paged mode - chapter by chapter navigation (memoized for performance)
        <MemoizedChapterReader
          verses={verses}
          version={currentVersion}
          book={currentBook}
          chapter={currentChapter}
          scrollToVerse={scrollToVerseNumber}
          totalChapters={totalChapters}
          onPreviousChapter={handlePreviousChapter}
          onNextChapter={handleNextChapter}
          onScroll={handleScroll}
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

      {/* Bookmarks Modal */}
      <BookmarksModal
        isOpen={isBookmarksOpen}
        onClose={() => setIsBookmarksOpen(false)}
        onNavigateToBookmark={handleBookmarkSelect}
      />

      {/* NEW: Verse Selection Bar - Compact bottom action bar (YouVersion-style) */}
      {isSelecting && (
        <VerseSelectionBar
          selectedVerses={selectedVerses}
          onHighlight={handleHighlightTap}
          onCopy={handleCopyVerses}
          onShare={handleShareVerses}
          onBookmark={handleBookmarkVerses}
          onNote={handleNoteVerses}
          onDone={clearSelection}
          hasHighlightedVerse={hasHighlightedVerse}
          hasBookmarkedVerse={hasBookmarkedVerse}
        />
      )}

      {/* Note Editor Modal is now rendered at root level in _layout.tsx */}

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
