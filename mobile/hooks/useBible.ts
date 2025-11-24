/**
 * Bible API Hooks
 *
 * React Query hooks for Bible data with offline caching
 * Supports demo mode with mock data when backend is unavailable
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { API_ENDPOINTS, QUERY_KEYS, CACHE_TIMES } from '@/constants/api';
import { useAuthStore } from '@/stores/auth';
import {
  mockBibleVersions,
  mockBibleBooks,
  getMockBibleChapter,
} from '@/lib/mockBibleData';
import type {
  BibleVersion,
  BibleBook,
  BibleVerse,
  BibleChapterResponse,
} from '@/types/api';

/**
 * Check if we're in demo mode (using demo token)
 */
function isDemoMode(): boolean {
  const { token } = useAuthStore.getState();
  return token === 'demo-jwt-token-for-testing';
}

/**
 * Get all available Bible versions
 */
export function useBibleVersions() {
  return useQuery({
    queryKey: QUERY_KEYS.BIBLE_VERSIONS,
    queryFn: async () => {
      // Use mock data in demo mode
      if (isDemoMode()) {
        return mockBibleVersions;
      }

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
      // Use mock data in demo mode
      if (isDemoMode()) {
        return mockBibleBooks;
      }

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
      // Use mock data in demo mode
      if (isDemoMode()) {
        const mockData = getMockBibleChapter(version, book, chapter);
        if (mockData.length > 0) {
          return mockData;
        }
        // Return empty array if no mock data available for this chapter
        return [];
      }

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
      // Use mock data in demo mode - John 3:16
      if (isDemoMode()) {
        const mockData = getMockBibleChapter('TB', 'JHN', 3);
        const verse16 = mockData.find((v) => v.verse === 16);
        return verse16 || mockData[0];
      }

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
  const queryClient = api.defaults.baseURL; // Access query client

  const prefetchNext = () => {
    if (currentChapter < totalChapters) {
      // Prefetch next chapter
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.BIBLE_CHAPTER(version, book, currentChapter + 1),
        queryFn: async () => {
          const response = await api.get<BibleVerse[]>(
            API_ENDPOINTS.BIBLE_CHAPTER(version, book, currentChapter + 1)
          );
          return response.data;
        },
      });
    }
  };

  return { prefetchNext };
}
