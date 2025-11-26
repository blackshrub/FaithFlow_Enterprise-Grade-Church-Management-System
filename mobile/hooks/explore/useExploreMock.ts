/**
 * Explore Mock Data Hooks
 *
 * Temporary hooks that return mock data from explore-mockdata.ts
 * This allows UI development and testing before backend is fully connected
 *
 * USAGE: Import from here instead of useExplore.ts until backend is ready
 */

import { useQuery } from '@tanstack/react-query';
import mockData from '@/mock/explore-mockdata';
import { useExploreStore } from '@/stores/explore/exploreStore';

// ==================== MOCK DATA HOOKS ====================

/**
 * Get Bible Studies (Mock)
 */
export function useBibleStudies() {
  return useQuery({
    queryKey: ['bibleStudies', 'mock'],
    queryFn: async () => {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 300));
      return mockData.bibleStudies;
    },
    staleTime: Infinity, // Mock data never becomes stale
  });
}

/**
 * Get Daily Devotions (Mock)
 */
export function useDailyDevotions() {
  return useQuery({
    queryKey: ['dailyDevotions', 'mock'],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return mockData.dailyDevotions;
    },
    staleTime: Infinity,
  });
}

/**
 * Get Verses of the Day (Mock)
 */
export function useVersesOfTheDay() {
  return useQuery({
    queryKey: ['versesOfTheDay', 'mock'],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return mockData.versesOfTheDay;
    },
    staleTime: Infinity,
  });
}

/**
 * Get Bible Figures (Mock)
 */
export function useBibleFigures() {
  return useQuery({
    queryKey: ['bibleFigures', 'mock'],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return mockData.bibleFigures;
    },
    staleTime: Infinity,
  });
}

/**
 * Get Daily Quizzes (Mock)
 */
export function useDailyQuizzes() {
  return useQuery({
    queryKey: ['dailyQuizzes', 'mock'],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return mockData.dailyQuizzes;
    },
    staleTime: Infinity,
  });
}

/**
 * Get Topical Categories (Mock)
 */
export function useTopicalCategories() {
  return useQuery({
    queryKey: ['topicalCategories', 'mock'],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return mockData.topicalCategories;
    },
    staleTime: Infinity,
  });
}

/**
 * Get Topical Category by ID (Mock)
 */
export function useTopicalCategory(categoryId: string) {
  return useQuery({
    queryKey: ['topicalCategory', 'mock', categoryId],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const category = mockData.topicalCategories.find((c) => c.id === categoryId);
      if (!category) {
        throw new Error(`Category not found: ${categoryId}`);
      }
      return category;
    },
    enabled: !!categoryId,
    staleTime: Infinity,
  });
}

/**
 * Get Topical Verses by Category ID (Mock)
 */
export function useTopicalVerses(categoryId: string) {
  return useQuery({
    queryKey: ['topicalVerses', 'mock', categoryId],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      // For mock, return verses of the day as sample topical verses
      // In real app, these would be filtered by category
      return mockData.versesOfTheDay;
    },
    enabled: !!categoryId,
    staleTime: Infinity,
  });
}

/**
 * Get Today's Explore Home Data (Mock)
 */
export function useExploreHomeMock() {
  const contentLanguage = useExploreStore((state) => state.contentLanguage);

  return useQuery({
    queryKey: ['exploreHome', 'mock', contentLanguage],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Return today's content
      return {
        daily_devotion: mockData.dailyDevotions[0], // First devotion
        verse_of_the_day: mockData.versesOfTheDay[0], // First verse
        bible_figure_of_the_day: mockData.bibleFigures[0], // David
        daily_quiz: mockData.dailyQuizzes[0], // First quiz
        user_progress: {
          streak: {
            current_streak: 5,
            longest_streak: 12,
            total_days_active: 45,
            last_activity_date: new Date().toISOString(),
          },
          total_devotions_read: 23,
          total_verses_read: 34,
          total_quizzes_completed: 12,
          total_studies_completed: 3,
          level: 2,
          points: 450,
        },
        stats: {
          total_content_completed: 72,
          completion_rate: 0.85,
          favorite_category: 'Faith & Trust',
        },
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get Study Progress (Mock)
 *
 * Returns mock progress data for studies
 */
export function useStudyProgress() {
  return useQuery({
    queryKey: ['studyProgress', 'mock'],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Return mock progress for studies
      return {
        'study_001': {
          started: true,
          completed: false,
          current_lesson: 3,
          total_lessons: 7,
          started_at: '2025-01-10',
          last_activity: '2025-01-14',
        },
        'study_002': {
          started: false,
          completed: false,
          current_lesson: 0,
          total_lessons: 8,
        },
        'study_003': {
          started: true,
          completed: true,
          current_lesson: 10,
          total_lessons: 10,
          started_at: '2024-12-01',
          completed_at: '2024-12-15',
        },
      };
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Get Content by ID (Mock)
 *
 * Generic function to get any content type by ID
 */
export function useContentByIdMock<T>(contentType: string, contentId: string) {
  return useQuery({
    queryKey: ['content', 'mock', contentType, contentId],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Find content by ID from mock data
      let content: any = null;

      switch (contentType) {
        case 'daily_devotion':
        case 'devotion':
          content = mockData.dailyDevotions.find((d) => d.id === contentId);
          break;
        case 'verse_of_the_day':
        case 'verse':
          content = mockData.versesOfTheDay.find((v) => v.id === contentId);
          break;
        case 'bible_figure':
        case 'figure':
          content = mockData.bibleFigures.find((f) => f.id === contentId);
          break;
        case 'daily_quiz':
        case 'quiz':
          content = mockData.dailyQuizzes.find((q) => q.id === contentId);
          break;
        case 'bible_study':
        case 'study':
          content = mockData.bibleStudies.find((s) => s.id === contentId);
          break;
        default:
          throw new Error(`Unknown content type: ${contentType}`);
      }

      if (!content) {
        throw new Error(`Content not found: ${contentId}`);
      }

      return content as T;
    },
    enabled: !!contentId,
    staleTime: Infinity,
  });
}

/**
 * Get User Progress (Mock)
 *
 * Overall user progress and stats
 */
export function useUserProgressMock() {
  return useQuery({
    queryKey: ['userProgress', 'mock'],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));

      return {
        streak: {
          current_streak: 5,
          longest_streak: 12,
          total_days_active: 45,
          last_activity_date: new Date().toISOString(),
        },
        total_devotions_read: 23,
        total_verses_read: 34,
        total_quizzes_completed: 12,
        total_studies_completed: 3,
        total_figures_read: 8,
        level: 2,
        points: 450,
        badges_earned: [
          'first_devotion',
          'first_quiz',
          'streak_3',
          'streak_7',
          'perfect_score',
        ],
        content_progress: [
          {
            content_id: 'dev_001',
            completed_at: '2025-01-14T10:30:00Z',
            bookmarked: true,
            favorited: false,
          },
          {
            content_id: 'dev_002',
            completed_at: '2025-01-15T08:15:00Z',
            bookmarked: false,
            favorited: true,
          },
          {
            content_id: 'quiz_001',
            completed_at: '2025-01-14T11:00:00Z',
            bookmarked: false,
            favorited: false,
          },
        ],
      };
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Get Verses by Category (Mock)
 *
 * For topical verse browsing
 */
export function useVersesByCategoryMock(categoryId: string) {
  return useQuery({
    queryKey: ['versesByCategory', 'mock', categoryId],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Return mock verses for the category
      // For now, return the verses of the day as samples
      return {
        verses: mockData.versesOfTheDay,
        total: mockData.versesOfTheDay.length,
        category: mockData.topicalCategories.find((c) => c.id === categoryId),
      };
    },
    enabled: !!categoryId,
    staleTime: 15 * 60 * 1000,
  });
}

// ==================== HELPER HOOKS ====================

/**
 * Check if content is completed (Mock)
 */
export function useIsCompletedMock(contentId: string): boolean {
  const { data } = useUserProgressMock();
  if (!data?.content_progress) return false;

  const progress = data.content_progress.find((cp) => cp.content_id === contentId);
  return !!progress?.completed_at;
}

/**
 * Check if content is bookmarked (Mock)
 */
export function useIsBookmarkedMock(contentId: string): boolean {
  const { data } = useUserProgressMock();
  if (!data?.content_progress) return false;

  const progress = data.content_progress.find((cp) => cp.content_id === contentId);
  return progress?.bookmarked || false;
}

/**
 * Check if content is favorited (Mock)
 */
export function useIsFavoritedMock(contentId: string): boolean {
  const { data } = useUserProgressMock();
  if (!data?.content_progress) return false;

  const progress = data.content_progress.find((cp) => cp.content_id === contentId);
  return progress?.favorited || false;
}

/**
 * Get current streak (Mock)
 */
export function useCurrentStreakMock(): number {
  const { data } = useUserProgressMock();
  return data?.streak?.current_streak || 0;
}

/**
 * Check if verse is bookmarked (Mock)
 */
export function useIsVerseBookmarked(verseId: string): boolean {
  const { data } = useUserProgressMock();
  if (!data?.content_progress) return false;

  const progress = data.content_progress.find((cp) => cp.content_id === verseId);
  return progress?.bookmarked || false;
}

// ==================== MUTATION HOOKS (Mock - no API calls) ====================

/**
 * Track content start (Mock)
 */
export function useTrackContentStart() {
  const { startReading } = useExploreStore();

  return {
    mutate: ({ contentId, contentType }: { contentId: string; contentType: string }) => {
      console.log(`[Mock] Tracking content start: ${contentType} ${contentId}`);
      startReading();
    },
    mutateAsync: async ({ contentId, contentType }: { contentId: string; contentType: string }) => {
      console.log(`[Mock] Tracking content start: ${contentType} ${contentId}`);
      startReading();
      return Promise.resolve();
    },
    isPending: false,
    isError: false,
    isSuccess: true,
  };
}

/**
 * Track content complete (Mock)
 */
export function useTrackContentComplete() {
  const { endReading, triggerCelebration } = useExploreStore();

  return {
    mutate: ({ contentId, contentType }: { contentId: string; contentType: string }) => {
      console.log(`[Mock] Tracking content complete: ${contentType} ${contentId}`);
      endReading();
      // Trigger celebration for demo
      triggerCelebration('complete', { contentType });
    },
    mutateAsync: async ({ contentId, contentType }: { contentId: string; contentType: string }) => {
      console.log(`[Mock] Tracking content complete: ${contentType} ${contentId}`);
      endReading();
      triggerCelebration('complete', { contentType });
      return Promise.resolve({
        progress: {
          streak: { current_streak: 6 },
        },
      });
    },
    isPending: false,
    isError: false,
    isSuccess: true,
  };
}

/**
 * Bookmark content (Mock)
 */
export function useBookmarkContent() {
  return {
    mutate: ({ contentId, bookmarked }: { contentId: string; bookmarked: boolean }) => {
      console.log(`[Mock] Bookmark content: ${contentId} = ${bookmarked}`);
    },
    mutateAsync: async ({ contentId, bookmarked }: { contentId: string; bookmarked: boolean }) => {
      console.log(`[Mock] Bookmark content: ${contentId} = ${bookmarked}`);
      return Promise.resolve();
    },
    isPending: false,
    isError: false,
    isSuccess: true,
  };
}

/**
 * Favorite content (Mock)
 */
export function useFavoriteContent() {
  return {
    mutate: ({ contentId, favorited }: { contentId: string; favorited: boolean }) => {
      console.log(`[Mock] Favorite content: ${contentId} = ${favorited}`);
    },
    mutateAsync: async ({ contentId, favorited }: { contentId: string; favorited: boolean }) => {
      console.log(`[Mock] Favorite content: ${contentId} = ${favorited}`);
      return Promise.resolve();
    },
    isPending: false,
    isError: false,
    isSuccess: true,
  };
}

/**
 * Submit quiz (Mock)
 */
export function useSubmitQuiz() {
  const { triggerCelebration } = useExploreStore();

  return {
    mutate: ({
      quizId,
      quizType,
      answers,
      score,
    }: {
      quizId: string;
      quizType: string;
      answers: any[];
      score: number;
      timeTakenSeconds?: number;
    }) => {
      console.log(`[Mock] Submit quiz: ${quizId}, score: ${score}%`);
      if (score === 100) {
        triggerCelebration('quiz_perfect', { score });
      }
    },
    mutateAsync: async ({
      quizId,
      quizType,
      answers,
      score,
    }: {
      quizId: string;
      quizType: string;
      answers: any[];
      score: number;
      timeTakenSeconds?: number;
    }) => {
      console.log(`[Mock] Submit quiz: ${quizId}, score: ${score}%`);
      if (score === 100) {
        triggerCelebration('quiz_perfect', { score });
      }
      return Promise.resolve({ score, passed: score >= 70 });
    },
    isPending: false,
    isError: false,
    isSuccess: true,
  };
}

/**
 * Bookmark verse (Mock)
 */
export function useBookmarkVerse() {
  return {
    mutate: ({ verseId, bookmarked }: { verseId: string; bookmarked: boolean }) => {
      console.log(`[Mock] Bookmark verse: ${verseId} = ${bookmarked}`);
    },
    mutateAsync: async ({ verseId, bookmarked }: { verseId: string; bookmarked: boolean }) => {
      console.log(`[Mock] Bookmark verse: ${verseId} = ${bookmarked}`);
      return Promise.resolve();
    },
    isPending: false,
    isError: false,
    isSuccess: true,
  };
}

// Aliases for compatibility
export const useContentById = useContentByIdMock;
export const useUserProgress = useUserProgressMock;
export const useVersesByCategory = useVersesByCategoryMock;
export const useIsCompleted = useIsCompletedMock;
export const useIsBookmarked = useIsBookmarkedMock;
export const useIsFavorited = useIsFavoritedMock;
export const useCurrentStreak = useCurrentStreakMock;

// ==================== EXPORT ALL ====================

export default {
  useBibleStudies,
  useDailyDevotions,
  useVersesOfTheDay,
  useBibleFigures,
  useDailyQuizzes,
  useTopicalCategories,
  useTopicalCategory,
  useTopicalVerses,
  useExploreHomeMock,
  useStudyProgress,
  useContentByIdMock,
  useUserProgressMock,
  useVersesByCategoryMock,
  useIsCompletedMock,
  useIsBookmarkedMock,
  useIsFavoritedMock,
  useCurrentStreakMock,
  useIsVerseBookmarked,
  useContentById,
  useUserProgress,
  useVersesByCategory,
  useIsCompleted,
  useIsBookmarked,
  useIsFavorited,
  useCurrentStreak,
  useTrackContentStart,
  useTrackContentComplete,
  useBookmarkContent,
  useFavoriteContent,
  useSubmitQuiz,
  useBookmarkVerse,
};
