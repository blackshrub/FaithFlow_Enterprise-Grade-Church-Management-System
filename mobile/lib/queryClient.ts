/**
 * Optimized React Query Configuration for FaithFlow Mobile
 * Phase 9.1.1 - Performance Optimization
 */

import { QueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';

/**
 * Network status detector for React Query
 * Prevents unnecessary refetches when offline
 */
const onlineManager = {
  isOnline: () => {
    return NetInfo.fetch().then(state => state.isConnected ?? true);
  },
};

/**
 * Optimized Query Client with performance-focused configuration
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry configuration
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        // Retry up to 2 times for server errors or network issues
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => {
        // Exponential backoff: 1s, 2s, 4s
        return Math.min(1000 * 2 ** attemptIndex, 30000);
      },

      // Cache configuration
      // Default stale time: 5 minutes (data considered fresh)
      staleTime: 1000 * 60 * 5,
      // Garbage collection time: 10 minutes (how long unused data stays in cache)
      gcTime: 1000 * 60 * 10,

      // Refetch configuration
      refetchOnWindowFocus: false, // Disable for mobile (no concept of window focus)
      refetchOnReconnect: true, // Refetch when internet reconnects
      refetchOnMount: true, // Refetch on mount when data is stale

      // Network mode
      networkMode: 'online', // Only fetch when online

      // Query deduplication
      // React Query automatically deduplicates identical queries within a short timeframe
      // This prevents multiple components from triggering duplicate requests
    },

    mutations: {
      // Retry mutations once on network errors
      retry: (failureCount, error: any) => {
        // Only retry on network errors, not validation errors
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 1;
      },
      retryDelay: 1000, // Wait 1 second before retry

      networkMode: 'online', // Only mutate when online
    },
  },
});

/**
 * Custom query key factory for Explore feature
 * Provides consistent query keys across the app
 */
export const exploreKeys = {
  // Daily content
  today: () => ['explore', 'today'] as const,
  dailyDevotion: (date: string) => ['explore', 'devotion', 'daily', date] as const,
  dailyVerse: (date: string) => ['explore', 'verse', 'daily', date] as const,
  dailyFigure: (date: string) => ['explore', 'figure', 'daily', date] as const,
  dailyQuiz: (date: string) => ['explore', 'quiz', 'daily', date] as const,

  // Self-paced content
  studies: (params?: any) => ['explore', 'studies', params] as const,
  study: (id: string) => ['explore', 'study', id] as const,
  figures: (params?: any) => ['explore', 'figures', params] as const,
  figure: (id: string) => ['explore', 'figure', id] as const,
  topicalCategories: () => ['explore', 'topical', 'categories'] as const,
  topicalVerses: (categoryId: string) => ['explore', 'topical', 'verses', categoryId] as const,

  // Progress
  userProgress: () => ['explore', 'progress'] as const,
  userStreak: () => ['explore', 'streak'] as const,
  userStats: () => ['explore', 'stats'] as const,

  // Settings
  settings: () => ['explore', 'settings'] as const,
} as const;

/**
 * Configure stale times for different types of data
 * More aggressive caching for stable data, shorter for dynamic data
 */
export const staleTimes = {
  // Static/rarely changing data - cache aggressively
  settings: 1000 * 60 * 30, // 30 minutes
  categories: 1000 * 60 * 30, // 30 minutes
  figures: 1000 * 60 * 15, // 15 minutes

  // Daily content - cache until end of day
  dailyContent: 1000 * 60 * 60 * 24, // 24 hours (refreshed once per day)

  // Self-paced content - moderate caching
  studies: 1000 * 60 * 10, // 10 minutes
  topical: 1000 * 60 * 10, // 10 minutes

  // User progress - short cache (frequently updated)
  progress: 1000 * 30, // 30 seconds
  streak: 1000 * 30, // 30 seconds

  // Real-time data - minimal cache
  realtime: 0, // Always considered stale
} as const;

/**
 * Prefetch helper for navigation optimization
 * Prefetch content before user navigates to it
 */
export const prefetchHelpers = {
  /**
   * Prefetch daily content for tomorrow
   * Call this in the evening to preload next day's content
   */
  prefetchTomorrow: async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: exploreKeys.dailyDevotion(dateStr),
        // Query function would be provided by the hook
        staleTime: staleTimes.dailyContent,
      }),
      queryClient.prefetchQuery({
        queryKey: exploreKeys.dailyVerse(dateStr),
        staleTime: staleTimes.dailyContent,
      }),
      queryClient.prefetchQuery({
        queryKey: exploreKeys.dailyFigure(dateStr),
        staleTime: staleTimes.dailyContent,
      }),
      queryClient.prefetchQuery({
        queryKey: exploreKeys.dailyQuiz(dateStr),
        staleTime: staleTimes.dailyContent,
      }),
    ]);
  },

  /**
   * Prefetch figure details when hovering/pressing figure card
   */
  prefetchFigure: async (id: string, queryFn: any) => {
    await queryClient.prefetchQuery({
      queryKey: exploreKeys.figure(id),
      queryFn,
      staleTime: staleTimes.figures,
    });
  },

  /**
   * Prefetch study details
   */
  prefetchStudy: async (id: string, queryFn: any) => {
    await queryClient.prefetchQuery({
      queryKey: exploreKeys.study(id),
      queryFn,
      staleTime: staleTimes.studies,
    });
  },
};

/**
 * Cache invalidation helpers
 * Simplify invalidating related queries
 */
export const invalidateHelpers = {
  /**
   * Invalidate all daily content for a specific date
   */
  invalidateDailyContent: (date: string) => {
    queryClient.invalidateQueries({ queryKey: ['explore', 'devotion', 'daily', date] });
    queryClient.invalidateQueries({ queryKey: ['explore', 'verse', 'daily', date] });
    queryClient.invalidateQueries({ queryKey: ['explore', 'figure', 'daily', date] });
    queryClient.invalidateQueries({ queryKey: ['explore', 'quiz', 'daily', date] });
    queryClient.invalidateQueries({ queryKey: ['explore', 'today'] });
  },

  /**
   * Invalidate user progress (after completing content)
   */
  invalidateProgress: () => {
    queryClient.invalidateQueries({ queryKey: ['explore', 'progress'] });
    queryClient.invalidateQueries({ queryKey: ['explore', 'streak'] });
    queryClient.invalidateQueries({ queryKey: ['explore', 'stats'] });
  },

  /**
   * Invalidate all Explore content
   */
  invalidateAllExplore: () => {
    queryClient.invalidateQueries({ queryKey: ['explore'] });
  },
};

/**
 * Optimistic update helpers
 * Update UI immediately while mutation is in progress
 */
export const optimisticHelpers = {
  /**
   * Optimistically mark content as completed
   */
  markCompleted: (contentType: string, contentId: string) => {
    // Update progress cache optimistically
    queryClient.setQueryData(exploreKeys.userProgress(), (old: any) => {
      if (!old) return old;

      return {
        ...old,
        [contentType]: {
          ...old[contentType],
          [contentId]: {
            ...old[contentType]?.[contentId],
            completed: true,
            completed_at: new Date().toISOString(),
          },
        },
      };
    });
  },

  /**
   * Optimistically update streak
   */
  updateStreak: (newStreak: number) => {
    queryClient.setQueryData(exploreKeys.userStreak(), (old: any) => {
      if (!old) return { current_streak: newStreak, longest_streak: newStreak };

      return {
        ...old,
        current_streak: newStreak,
        longest_streak: Math.max(old.longest_streak ?? 0, newStreak),
      };
    });
  },
};

/**
 * Clear cache on logout
 */
export const clearCache = () => {
  queryClient.clear();
};

/**
 * Get cache statistics for debugging
 */
export const getCacheStats = () => {
  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();

  return {
    totalQueries: queries.length,
    activeQueries: queries.filter((q) => q.state.fetchStatus !== 'idle').length,
    staleQueries: queries.filter((q) => q.isStale()).length,
    cacheSize: JSON.stringify(queries).length, // Rough estimate in bytes
  };
};

/**
 * Performance monitoring helper
 * Log slow queries for optimization
 */
export const enableQueryLogging = () => {
  if (__DEV__) {
    queryClient.getQueryCache().subscribe((event) => {
      if (event?.type === 'observerResultsUpdated') {
        const query = event.query;
        if (query.state.fetchStatus === 'fetching') {
          console.log(`🔄 Fetching: ${JSON.stringify(query.queryKey)}`);
        }
      }
    });
  }
};
