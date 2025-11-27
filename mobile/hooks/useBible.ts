/**
 * Bible API Hooks
 *
 * React Query hooks for Bible data with offline caching
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { API_ENDPOINTS, QUERY_KEYS, CACHE_TIMES } from '@/constants/api';
import type {
  BibleVersion,
  BibleBook,
  BibleVerse,
  BibleChapterResponse,
} from '@/types/api';

/**
 * Get all available Bible versions
 */
export function useBibleVersions() {
  return useQuery({
    queryKey: QUERY_KEYS.BIBLE_VERSIONS,
    queryFn: async () => {
      const response = await api.get<BibleVersion[]>(
        API_ENDPOINTS.BIBLE_VERSIONS
      );
      return response.data;
    },
    staleTime: CACHE_TIMES.BIBLE, // Cache for 1 week
    gcTime: CACHE_TIMES.BIBLE,
  });
}

/**
 * Get all Bible books for a version
 */
export function useBibleBooks(version: string = 'TB') {
  return useQuery({
    queryKey: QUERY_KEYS.BIBLE_BOOKS(version),
    queryFn: async () => {
      const response = await api.get<BibleBook[]>(
        `${API_ENDPOINTS.BIBLE_BOOKS}?version=${version}`
      );
      return response.data;
    },
    staleTime: CACHE_TIMES.BIBLE,
    gcTime: CACHE_TIMES.BIBLE,
  });
}

/**
 * Get a specific chapter with all verses
 */
export function useBibleChapter(
  version: string,
  book: string,
  chapter: number,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: QUERY_KEYS.BIBLE_CHAPTER(version, book, chapter),
    queryFn: async () => {
      const response = await api.get<BibleVerse[]>(
        API_ENDPOINTS.BIBLE_CHAPTER(version, book, chapter)
      );
      return response.data;
    },
    staleTime: CACHE_TIMES.BIBLE,
    gcTime: CACHE_TIMES.BIBLE,
    enabled: options?.enabled !== false && !!version && !!book && chapter > 0,
  });
}

// Popular verses for daily rotation (book, chapter, verse)
const DAILY_VERSES = [
  { book: 'John', chapter: 3, verse: 16 },
  { book: 'Philippians', chapter: 4, verse: 13 },
  { book: 'Jeremiah', chapter: 29, verse: 11 },
  { book: 'Proverbs', chapter: 3, verse: 5 },
  { book: 'Romans', chapter: 8, verse: 28 },
  { book: 'Isaiah', chapter: 41, verse: 10 },
  { book: 'Psalms', chapter: 23, verse: 1 },
  { book: 'Matthew', chapter: 11, verse: 28 },
  { book: 'Joshua', chapter: 1, verse: 9 },
  { book: 'Romans', chapter: 12, verse: 2 },
  { book: 'Psalms', chapter: 46, verse: 10 },
  { book: 'Philippians', chapter: 4, verse: 6 },
  { book: 'Hebrews', chapter: 11, verse: 1 },
  { book: '1 Corinthians', chapter: 10, verse: 13 },
  { book: 'Galatians', chapter: 5, verse: 22 },
  { book: 'Psalms', chapter: 119, verse: 105 },
  { book: 'Matthew', chapter: 6, verse: 33 },
  { book: 'Romans', chapter: 5, verse: 8 },
  { book: 'Ephesians', chapter: 2, verse: 8 },
  { book: 'Psalms', chapter: 37, verse: 4 },
  { book: '2 Timothy', chapter: 1, verse: 7 },
  { book: 'Isaiah', chapter: 40, verse: 31 },
  { book: 'Psalms', chapter: 27, verse: 1 },
  { book: 'Proverbs', chapter: 18, verse: 10 },
  { book: 'Matthew', chapter: 28, verse: 20 },
  { book: 'John', chapter: 14, verse: 6 },
  { book: 'Romans', chapter: 10, verse: 9 },
  { book: 'Psalms', chapter: 91, verse: 1 },
  { book: 'Lamentations', chapter: 3, verse: 22 },
  { book: 'John', chapter: 16, verse: 33 },
  { book: 'Colossians', chapter: 3, verse: 23 },
];

/**
 * Helper: Get verse of the day (rotates daily through curated list)
 * Uses day of year to select verse for consistent daily display
 */
export function useVerseOfTheDay() {
  return useQuery({
    queryKey: ['verse-of-the-day', new Date().toDateString()],
    queryFn: async () => {
      // Get day of year (0-365) and use it to select verse
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 0);
      const diff = now.getTime() - start.getTime();
      const oneDay = 1000 * 60 * 60 * 24;
      const dayOfYear = Math.floor(diff / oneDay);

      // Select verse based on day of year (cycles through list)
      const verseIndex = dayOfYear % DAILY_VERSES.length;
      const selectedVerse = DAILY_VERSES[verseIndex];

      // Fetch the verse from API
      const response = await api.get<BibleVerse[]>(
        API_ENDPOINTS.BIBLE_CHAPTER('TB', selectedVerse.book, selectedVerse.chapter)
      );
      const verses = response.data;
      const verse = verses.find((v) => v.verse === selectedVerse.verse);
      return verse || verses[0];
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

/**
 * Helper: Prefetch next chapter for smooth navigation
 */
export function usePrefetchNextChapter(
  version: string,
  book: string,
  currentChapter: number,
  totalChapters: number
) {
  // Fix: Use useQueryClient() hook instead of api.defaults.baseURL
  const queryClient = useQueryClient();

  const prefetchNext = () => {
    if (currentChapter < totalChapters) {
      // Prefetch next chapter for smooth navigation
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.BIBLE_CHAPTER(version, book, currentChapter + 1),
        queryFn: async () => {
          const response = await api.get<BibleVerse[]>(
            API_ENDPOINTS.BIBLE_CHAPTER(version, book, currentChapter + 1)
          );
          return response.data;
        },
        staleTime: CACHE_TIMES.BIBLE,
      });
    }
  };

  return { prefetchNext };
}
