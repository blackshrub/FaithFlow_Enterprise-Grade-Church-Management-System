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

/**
 * Helper: Get verse of the day (random verse)
 * For demo purposes, returns John 3:16
 */
export function useVerseOfTheDay() {
  return useQuery({
    queryKey: ['verse-of-the-day', new Date().toDateString()],
    queryFn: async () => {
      // TODO: Implement actual verse of the day logic
      const response = await api.get<BibleVerse[]>(
        API_ENDPOINTS.BIBLE_CHAPTER('TB', 'John', 3)
      );
      const verses = response.data;
      const verse16 = verses.find((v) => v.verse === 16);
      return verse16 || verses[0];
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
