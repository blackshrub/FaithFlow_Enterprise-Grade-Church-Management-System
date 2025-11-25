/**
 * Explore React Query Hooks
 *
 * Data fetching and caching for Explore feature using TanStack Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { exploreApi } from '@/services/explore/exploreApi';
import { useExploreStore } from '@/stores/explore/exploreStore';
import type {
  ContentType,
  Language,
  ExploreHomeData,
  UserExploreProgress,
} from '@/types/explore';

// ==================== QUERY KEYS ====================

export const exploreKeys = {
  all: ['explore'] as const,
  home: (language: Language) => [...exploreKeys.all, 'home', language] as const,
  daily: (type: ContentType, date?: string, language?: Language) =>
    [...exploreKeys.all, 'daily', type, date, language] as const,
  content: (type: ContentType) => [...exploreKeys.all, 'content', type] as const,
  contentList: (type: ContentType, filters: any) =>
    [...exploreKeys.content(type), 'list', filters] as const,
  contentDetail: (type: ContentType, id: string, language: Language) =>
    [...exploreKeys.content(type), 'detail', id, language] as const,
  progress: () => [...exploreKeys.all, 'progress'] as const,
  topicalCategories: (language: Language) =>
    [...exploreKeys.all, 'topical', 'categories', language] as const,
  topicalVerses: (categoryId: string, page: number, language: Language) =>
    [...exploreKeys.all, 'topical', 'verses', categoryId, page, language] as const,
};

// ==================== HOME & DAILY CONTENT ====================

/**
 * Get today's Explore content
 */
export function useExploreHome() {
  const contentLanguage = useExploreStore((state) => state.contentLanguage);

  return useQuery({
    queryKey: exploreKeys.home(contentLanguage),
    queryFn: () => exploreApi.getHome(contentLanguage),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get specific daily content
 */
export function useDailyContent(
  contentType: ContentType,
  date?: string,
  enabled: boolean = true
) {
  const contentLanguage = useExploreStore((state) => state.contentLanguage);

  return useQuery({
    queryKey: exploreKeys.daily(contentType, date, contentLanguage),
    queryFn: () => exploreApi.getDailyContent(contentType, date, contentLanguage),
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// ==================== SELF-PACED CONTENT ====================

/**
 * Browse content with filters
 */
export function useBrowseContent<T>(
  contentType: ContentType,
  options?: {
    skip?: number;
    limit?: number;
    categories?: string[];
    difficulty?: string;
    search?: string;
    enabled?: boolean;
  }
) {
  const contentLanguage = useExploreStore((state) => state.contentLanguage);

  const filters = {
    skip: options?.skip || 0,
    limit: options?.limit || 20,
    language: contentLanguage,
    categories: options?.categories,
    difficulty: options?.difficulty,
    search: options?.search,
  };

  return useQuery({
    queryKey: exploreKeys.contentList(contentType, filters),
    queryFn: () => exploreApi.browseContent<T>(contentType, filters),
    enabled: options?.enabled !== false,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Get specific content by ID
 */
export function useContentById<T>(
  contentType: ContentType,
  contentId: string,
  enabled: boolean = true
) {
  const contentLanguage = useExploreStore((state) => state.contentLanguage);

  return useQuery({
    queryKey: exploreKeys.contentDetail(contentType, contentId, contentLanguage),
    queryFn: () => exploreApi.getContentById<T>(contentType, contentId, contentLanguage),
    enabled: enabled && !!contentId,
    staleTime: 15 * 60 * 1000,
  });
}

// ==================== PROGRESS TRACKING ====================

/**
 * Get user progress
 */
export function useUserProgress() {
  return useQuery({
    queryKey: exploreKeys.progress(),
    queryFn: () => exploreApi.getUserProgress(),
    staleTime: 30 * 1000, // 30 seconds - frequently updated
  });
}

/**
 * Track content start
 */
export function useTrackContentStart() {
  const queryClient = useQueryClient();
  const { startReading } = useExploreStore();

  return useMutation({
    mutationFn: ({ contentId, contentType }: { contentId: string; contentType: ContentType }) =>
      exploreApi.trackContentStart(contentId, contentType),
    onSuccess: () => {
      // Invalidate progress queries
      queryClient.invalidateQueries({ queryKey: exploreKeys.progress() });
      // Start reading timer
      startReading();
    },
  });
}

/**
 * Track content complete
 */
export function useTrackContentComplete() {
  const queryClient = useQueryClient();
  const { endReading, triggerCelebration } = useExploreStore();

  return useMutation({
    mutationFn: ({ contentId, contentType }: { contentId: string; contentType: ContentType }) =>
      exploreApi.trackContentComplete(contentId, contentType),
    onSuccess: (data) => {
      // Invalidate progress queries
      queryClient.invalidateQueries({ queryKey: exploreKeys.progress() });
      queryClient.invalidateQueries({ queryKey: exploreKeys.home('en') });
      queryClient.invalidateQueries({ queryKey: exploreKeys.home('id') });

      // End reading timer
      endReading();

      // Check for streak milestone
      const progress = data?.progress;
      if (progress?.streak) {
        const currentStreak = progress.streak.current_streak;
        const milestones = [3, 7, 14, 30, 50, 100];

        if (milestones.includes(currentStreak)) {
          triggerCelebration('streak', { streak: currentStreak });
        }
      }
    },
  });
}

/**
 * Submit quiz
 */
export function useSubmitQuiz() {
  const queryClient = useQueryClient();
  const { triggerCelebration } = useExploreStore();

  return useMutation({
    mutationFn: ({
      quizId,
      quizType,
      answers,
      score,
      timeTakenSeconds,
    }: {
      quizId: string;
      quizType: string;
      answers: Array<{ question_id: string; answer_index: number; correct: boolean }>;
      score: number;
      timeTakenSeconds?: number;
    }) => exploreApi.submitQuiz(quizId, quizType, answers, score, timeTakenSeconds),
    onSuccess: (data, variables) => {
      // Invalidate progress queries
      queryClient.invalidateQueries({ queryKey: exploreKeys.progress() });
      queryClient.invalidateQueries({ queryKey: exploreKeys.home('en') });
      queryClient.invalidateQueries({ queryKey: exploreKeys.home('id') });

      // Trigger celebration for perfect score
      if (variables.score === 100) {
        triggerCelebration('quiz_perfect', { score: variables.score });
      }
    },
  });
}

/**
 * Bookmark content
 */
export function useBookmarkContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contentId, bookmarked }: { contentId: string; bookmarked: boolean }) =>
      exploreApi.bookmarkContent(contentId, bookmarked),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exploreKeys.progress() });
    },
  });
}

/**
 * Favorite content
 */
export function useFavoriteContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contentId, favorited }: { contentId: string; favorited: boolean }) =>
      exploreApi.favoriteContent(contentId, favorited),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exploreKeys.progress() });
    },
  });
}

// ==================== TOPICAL VERSES ====================

/**
 * Get topical categories
 */
export function useTopicalCategories() {
  const contentLanguage = useExploreStore((state) => state.contentLanguage);

  return useQuery({
    queryKey: exploreKeys.topicalCategories(contentLanguage),
    queryFn: () => exploreApi.getTopicalCategories(contentLanguage),
    staleTime: 60 * 60 * 1000, // 1 hour - rarely changes
  });
}

/**
 * Get verses by category
 */
export function useVersesByCategory(
  categoryId: string,
  page: number = 0,
  limit: number = 20,
  enabled: boolean = true
) {
  const contentLanguage = useExploreStore((state) => state.contentLanguage);

  return useQuery({
    queryKey: exploreKeys.topicalVerses(categoryId, page, contentLanguage),
    queryFn: () =>
      exploreApi.getVersesByCategory(categoryId, page * limit, limit, contentLanguage),
    enabled: enabled && !!categoryId,
    staleTime: 15 * 60 * 1000,
  });
}

// ==================== HELPER HOOKS ====================

/**
 * Check if content is bookmarked
 */
export function useIsBookmarked(contentId: string): boolean {
  const { data } = useUserProgress();
  if (!data?.progress?.content_progress) return false;

  const contentProgress = data.progress.content_progress.find(
    (cp) => cp.content_id === contentId
  );

  return contentProgress?.bookmarked || false;
}

/**
 * Check if content is favorited
 */
export function useIsFavorited(contentId: string): boolean {
  const { data } = useUserProgress();
  if (!data?.progress?.content_progress) return false;

  const contentProgress = data.progress.content_progress.find(
    (cp) => cp.content_id === contentId
  );

  return contentProgress?.favorited || false;
}

/**
 * Check if content is completed
 */
export function useIsCompleted(contentId: string): boolean {
  const { data } = useUserProgress();
  if (!data?.progress?.content_progress) return false;

  const contentProgress = data.progress.content_progress.find(
    (cp) => cp.content_id === contentId
  );

  return !!contentProgress?.completed_at;
}

/**
 * Get current streak
 */
export function useCurrentStreak(): number {
  const { data } = useUserProgress();
  return data?.progress?.streak?.current_streak || 0;
}
