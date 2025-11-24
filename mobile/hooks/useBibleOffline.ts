/**
 * Offline Bible Hooks
 *
 * React Query hooks for offline Bible data using optimized loaders
 * No network required - all data from local JSON files
 */

import { useQuery } from '@tanstack/react-query';
import { getBibleLoader, preloadBible } from '@/lib/bibleLoaderOptimized';
import { getBookNumber, getBookName } from '@/lib/bibleBookLookup';
import type { BibleTranslation } from '@/types/bible';
import type { BibleBook, BibleVerse, BibleSearchResult } from '@/lib/bibleLoaderOptimized';

const CACHE_TIMES = {
  BIBLE: 1000 * 60 * 60 * 24 * 7, // 1 week
};

/**
 * Get all Bible books for a version (offline)
 * Returns books with schema compatible with BookSelectorModal
 */
export function useBibleBooksOffline(version: BibleTranslation) {
  return useQuery({
    queryKey: ['bible-books-offline', version],
    queryFn: async () => {
      const loader = getBibleLoader(version);

      // Ensure Bible is loaded
      if (!loader.isLoaded()) {
        await loader.load();
      }

      const books = loader.getBooks();

      // Transform to API-compatible schema for BookSelectorModal
      return books.map((book) => {
        const englishName = getBookName(book.number) || book.name;
        return {
          // New schema fields
          number: book.number,
          name: book.name,
          chapters: book.chapters,
          englishName,
          // Old API schema fields for backwards compatibility
          id: `${version}-${book.number}`,
          book_number: book.number,
          name_local: book.name, // Use native name from Bible file
          chapter_count: book.chapters,
          testament: book.number <= 39 ? 'OT' : 'NT', // Books 1-39 = OT, 40-66 = NT
        };
      });
    },
    staleTime: CACHE_TIMES.BIBLE,
    gcTime: CACHE_TIMES.BIBLE,
  });
}

/**
 * Get a specific chapter with all verses (offline)
 * Accepts either book name or book number
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

  return useQuery({
    queryKey: ['bible-chapter-offline', version, bookNumber, chapter],
    queryFn: async () => {
      if (!bookNumber) {
        console.warn(`Unknown book: ${bookNameOrNumber}`);
        return [];
      }

      const loader = getBibleLoader(version);

      // Ensure Bible is loaded
      if (!loader.isLoaded()) {
        await loader.load();
      }

      const verses = loader.getChapter(bookNumber, chapter);

      // Return empty array if chapter not found
      return verses;
    },
    staleTime: CACHE_TIMES.BIBLE,
    gcTime: CACHE_TIMES.BIBLE,
    enabled:
      options?.enabled !== false &&
      !!version &&
      !!bookNumber &&
      bookNumber > 0 &&
      chapter > 0,
  });
}

/**
 * Search Bible verses (offline)
 * Default limit increased to 500 to show comprehensive search results
 */
export function useBibleSearchOffline(
  version: BibleTranslation,
  query: string,
  options?: { limit?: number; enabled?: boolean }
) {
  const limit = options?.limit || 500;

  return useQuery({
    queryKey: ['bible-search-offline', version, query, limit],
    queryFn: async () => {
      if (!query || query.trim().length < 3) {
        return [];
      }

      const loader = getBibleLoader(version);

      // Ensure Bible is loaded
      if (!loader.isLoaded()) {
        await loader.load();
      }

      return loader.search(query.trim(), limit);
    },
    staleTime: CACHE_TIMES.BIBLE,
    gcTime: CACHE_TIMES.BIBLE,
    enabled: options?.enabled !== false && !!query && query.trim().length >= 3,
  });
}

/**
 * Get a single verse (offline)
 */
export function useBibleVerseOffline(
  version: BibleTranslation,
  bookNumber: number,
  chapter: number,
  verse: number,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['bible-verse-offline', version, bookNumber, chapter, verse],
    queryFn: async () => {
      const loader = getBibleLoader(version);

      // Ensure Bible is loaded
      if (!loader.isLoaded()) {
        await loader.load();
      }

      const verseText = loader.getVerse(bookNumber, chapter, verse);

      if (!verseText) return null;

      return {
        book: bookNumber,
        chapter,
        verse,
        text: verseText,
      };
    },
    staleTime: CACHE_TIMES.BIBLE,
    gcTime: CACHE_TIMES.BIBLE,
    enabled: options?.enabled !== false && bookNumber > 0 && chapter > 0 && verse > 0,
  });
}

/**
 * Get Bible metadata (offline)
 */
export function useBibleMetadataOffline(version: BibleTranslation) {
  return useQuery({
    queryKey: ['bible-metadata-offline', version],
    queryFn: async () => {
      const loader = getBibleLoader(version);

      // Ensure Bible is loaded
      if (!loader.isLoaded()) {
        await loader.load();
      }

      return loader.getMetadata();
    },
    staleTime: CACHE_TIMES.BIBLE,
    gcTime: CACHE_TIMES.BIBLE,
  });
}

/**
 * Preload Bible in background (offline)
 * Call this on app startup for user's preferred translations
 */
export async function preloadBiblesOffline(versions: BibleTranslation[]): Promise<void> {
  console.log(`📚 Preloading ${versions.length} Bibles...`);

  await Promise.all(versions.map(version => preloadBible(version)));

  console.log(`✅ Preloaded ${versions.length} Bibles successfully`);
}

/**
 * Helper: Get verse of the day (random verse)
 * For demo purposes, returns John 3:16
 */
export function useVerseOfTheDayOffline(version: BibleTranslation = 'NIV') {
  return useQuery({
    queryKey: ['verse-of-the-day-offline', version, new Date().toDateString()],
    queryFn: async () => {
      const loader = getBibleLoader(version);

      // Ensure Bible is loaded
      if (!loader.isLoaded()) {
        await loader.load();
      }

      // John 3:16 (Book 43, Chapter 3, Verse 16)
      const verseText = loader.getVerse(43, 3, 16);

      if (!verseText) return null;

      return {
        book: 43,
        chapter: 3,
        verse: 16,
        text: verseText,
      };
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}
