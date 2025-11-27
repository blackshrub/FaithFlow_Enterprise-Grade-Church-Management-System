/**
 * Offline Bible Hooks - INSTANT, ZERO-LATENCY
 *
 * React Query hooks for offline Bible data using optimized loaders
 * Key optimization: Bible data NEVER changes, so we use:
 * - staleTime: Infinity (never refetch)
 * - gcTime: Infinity (never garbage collect)
 * - initialData: Synchronous data from loader (no loading state)
 */

import { useQuery } from '@tanstack/react-query';
import { getBibleLoader, preloadBibles } from '@/lib/bibleLoaderOptimized';
import { getBookNumber, getBookName } from '@/lib/bibleBookLookup';
import type { BibleTranslation } from '@/types/bible';
import type { BibleBook, BibleVerse, BibleSearchResult } from '@/lib/bibleLoaderOptimized';

// Bible data NEVER changes - cache forever
const CACHE_TIMES = {
  BIBLE: Infinity, // Never expires - Bible text is immutable
};

/**
 * Transform books to API-compatible schema (pure function for initialData)
 */
function transformBooks(version: BibleTranslation, books: BibleBook[]) {
  return books.map((book) => {
    const englishName = getBookName(book.number) || book.name;
    return {
      number: book.number,
      name: book.name,
      chapters: book.chapters,
      englishName,
      id: `${version}-${book.number}`,
      book_number: book.number,
      name_local: book.name,
      chapter_count: book.chapters,
      testament: (book.number <= 39 ? 'OT' : 'NT') as 'OT' | 'NT',
    };
  });
}

/**
 * Get all Bible books for a version (offline) - INSTANT
 * Uses initialData for zero loading state
 */
export function useBibleBooksOffline(version: BibleTranslation) {
  const loader = getBibleLoader(version);

  return useQuery({
    queryKey: ['bible-books-offline', version],
    queryFn: () => {
      // Synchronous - loader auto-loads if needed
      return transformBooks(version, loader.getBooks());
    },
    // INSTANT: Provide data synchronously, never show loading
    initialData: () => transformBooks(version, loader.getBooks()),
    // Bible NEVER changes - cache forever
    staleTime: CACHE_TIMES.BIBLE,
    gcTime: CACHE_TIMES.BIBLE,
  });
}

/**
 * Get a specific chapter with all verses (offline) - INSTANT
 * Uses initialData for zero loading state - critical for smooth navigation
 */
export function useBibleChapterOffline(
  version: BibleTranslation,
  bookNameOrNumber: string | number,
  chapter: number,
  options?: { enabled?: boolean }
) {
  // Convert book name to number if string
  const bookNumber =
    typeof bookNameOrNumber === 'string'
      ? getBookNumber(bookNameOrNumber)
      : bookNameOrNumber;

  const loader = getBibleLoader(version);
  const isValid = !!version && !!bookNumber && bookNumber > 0 && chapter > 0;

  return useQuery({
    queryKey: ['bible-chapter-offline', version, bookNumber, chapter],
    queryFn: () => {
      if (!bookNumber) return [];
      // Synchronous - loader auto-loads if needed
      return loader.getChapter(bookNumber, chapter);
    },
    // INSTANT: Provide chapter data synchronously
    initialData: () => {
      if (!isValid || !bookNumber) return undefined;
      return loader.getChapter(bookNumber, chapter);
    },
    // Bible NEVER changes - cache forever
    staleTime: CACHE_TIMES.BIBLE,
    gcTime: CACHE_TIMES.BIBLE,
    enabled: options?.enabled !== false && isValid,
  });
}

/**
 * Search Bible verses (offline) - INSTANT after first search
 * Search is computationally heavier, but still synchronous
 */
export function useBibleSearchOffline(
  version: BibleTranslation,
  query: string,
  options?: { limit?: number; enabled?: boolean }
) {
  const limit = options?.limit || 500;
  const isValid = !!query && query.trim().length >= 3;

  return useQuery({
    queryKey: ['bible-search-offline', version, query, limit],
    queryFn: () => {
      if (!isValid) return [];
      const loader = getBibleLoader(version);
      return loader.search(query.trim(), limit);
    },
    // Search results are deterministic - cache forever
    staleTime: CACHE_TIMES.BIBLE,
    gcTime: CACHE_TIMES.BIBLE,
    enabled: options?.enabled !== false && isValid,
  });
}

/**
 * Get a single verse (offline) - INSTANT
 */
export function useBibleVerseOffline(
  version: BibleTranslation,
  bookNumber: number,
  chapter: number,
  verse: number,
  options?: { enabled?: boolean }
) {
  const loader = getBibleLoader(version);
  const isValid = bookNumber > 0 && chapter > 0 && verse > 0;

  return useQuery({
    queryKey: ['bible-verse-offline', version, bookNumber, chapter, verse],
    queryFn: () => {
      const verseText = loader.getVerse(bookNumber, chapter, verse);
      if (!verseText) return null;
      return { book: bookNumber, chapter, verse, text: verseText };
    },
    // INSTANT: Provide verse synchronously
    initialData: () => {
      if (!isValid) return undefined;
      const verseText = loader.getVerse(bookNumber, chapter, verse);
      if (!verseText) return null;
      return { book: bookNumber, chapter, verse, text: verseText };
    },
    staleTime: CACHE_TIMES.BIBLE,
    gcTime: CACHE_TIMES.BIBLE,
    enabled: options?.enabled !== false && isValid,
  });
}

/**
 * Get Bible metadata (offline) - INSTANT
 */
export function useBibleMetadataOffline(version: BibleTranslation) {
  const loader = getBibleLoader(version);

  return useQuery({
    queryKey: ['bible-metadata-offline', version],
    queryFn: () => loader.getMetadata(),
    initialData: () => loader.getMetadata(),
    staleTime: CACHE_TIMES.BIBLE,
    gcTime: CACHE_TIMES.BIBLE,
  });
}

/**
 * Preload Bible SYNCHRONOUSLY on app startup
 * This ensures instant Bible access from the very first navigation
 * Called in _layout.tsx before any screen renders
 */
export function preloadBiblesOffline(versions: BibleTranslation[]): void {
  preloadBibles(versions);
}

/**
 * Helper: Get verse of the day - INSTANT
 * For demo purposes, returns John 3:16
 */
export function useVerseOfTheDayOffline(version: BibleTranslation = 'NIV') {
  const loader = getBibleLoader(version);

  return useQuery({
    queryKey: ['verse-of-the-day-offline', version, new Date().toDateString()],
    queryFn: () => {
      // John 3:16 (Book 43, Chapter 3, Verse 16)
      const verseText = loader.getVerse(43, 3, 16);
      if (!verseText) return null;
      return { book: 43, chapter: 3, verse: 16, text: verseText };
    },
    initialData: () => {
      const verseText = loader.getVerse(43, 3, 16);
      if (!verseText) return null;
      return { book: 43, chapter: 3, verse: 16, text: verseText };
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}
