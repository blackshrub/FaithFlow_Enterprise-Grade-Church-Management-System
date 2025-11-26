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
 * Get Bible Studies (Mock) - INSTANT
 */
export function useBibleStudies() {
  return useQuery({
    queryKey: ['bibleStudies', 'mock'],
    queryFn: () => mockData.bibleStudies,
    initialData: mockData.bibleStudies,
    staleTime: Infinity, // Mock data never becomes stale
  });
}

/**
 * Get Daily Devotions (Mock) - INSTANT
 */
export function useDailyDevotions() {
  return useQuery({
    queryKey: ['dailyDevotions', 'mock'],
    queryFn: () => mockData.dailyDevotions,
    initialData: mockData.dailyDevotions,
    staleTime: Infinity,
  });
}

/**
 * Get Devotion Plans (Mock) - INSTANT
 */
export function useDevotionPlans() {
  return useQuery({
    queryKey: ['devotionPlans', 'mock'],
    queryFn: () => mockData.devotionPlans,
    initialData: mockData.devotionPlans,
    staleTime: Infinity,
  });
}

/**
 * Get Single Devotion Plan by ID (Mock) - INSTANT
 */
export function useDevotionPlan(planId: string) {
  return useQuery({
    queryKey: ['devotionPlan', 'mock', planId],
    queryFn: () => {
      const plan = mockData.devotionPlans.find((p) => p.id === planId);
      if (!plan) {
        throw new Error(`Devotion plan not found: ${planId}`);
      }
      return plan;
    },
    initialData: () => {
      if (!planId) return undefined;
      return mockData.devotionPlans.find((p) => p.id === planId);
    },
    enabled: !!planId,
    staleTime: Infinity,
  });
}

/**
 * Get Single Daily Devotion by ID (Mock) - INSTANT
 */
export function useDailyDevotion(devotionId: string) {
  return useQuery({
    queryKey: ['dailyDevotion', 'mock', devotionId],
    queryFn: () => {
      const devotion = mockData.dailyDevotions.find((d) => d.id === devotionId);
      if (!devotion) {
        throw new Error(`Daily devotion not found: ${devotionId}`);
      }
      return devotion;
    },
    initialData: () => {
      if (!devotionId) return undefined;
      return mockData.dailyDevotions.find((d) => d.id === devotionId);
    },
    enabled: !!devotionId,
    staleTime: Infinity,
  });
}

/**
 * Get Verses of the Day (Mock) - INSTANT
 */
export function useVersesOfTheDay() {
  return useQuery({
    queryKey: ['versesOfTheDay', 'mock'],
    queryFn: () => mockData.versesOfTheDay,
    initialData: mockData.versesOfTheDay,
    staleTime: Infinity,
  });
}

/**
 * Get Bible Figures (Mock) - INSTANT
 */
export function useBibleFigures() {
  return useQuery({
    queryKey: ['bibleFigures', 'mock'],
    queryFn: () => mockData.bibleFigures,
    initialData: mockData.bibleFigures,
    staleTime: Infinity,
  });
}

/**
 * Get Daily Quizzes (Mock) - INSTANT
 */
export function useDailyQuizzes() {
  return useQuery({
    queryKey: ['dailyQuizzes', 'mock'],
    queryFn: () => mockData.dailyQuizzes,
    initialData: mockData.dailyQuizzes,
    staleTime: Infinity,
  });
}

/**
 * Get Topical Categories (Mock) - INSTANT
 */
export function useTopicalCategories() {
  return useQuery({
    queryKey: ['topicalCategories', 'mock'],
    queryFn: () => mockData.topicalCategories,
    initialData: mockData.topicalCategories,
    staleTime: Infinity,
  });
}

/**
 * Get Topical Category by ID (Mock) - INSTANT
 */
export function useTopicalCategory(categoryId: string) {
  return useQuery({
    queryKey: ['topicalCategory', 'mock', categoryId],
    queryFn: () => {
      const category = mockData.topicalCategories.find((c) => c.id === categoryId);
      if (!category) {
        throw new Error(`Category not found: ${categoryId}`);
      }
      return category;
    },
    initialData: () => {
      if (!categoryId) return undefined;
      return mockData.topicalCategories.find((c) => c.id === categoryId);
    },
    enabled: !!categoryId,
    staleTime: Infinity,
  });
}

/**
 * Get Topical Verses by Category ID (Mock) - INSTANT
 * Transforms VerseOfTheDay data to TopicalVerse format
 */
export function useTopicalVerses(categoryId: string) {
  // Transform versesOfTheDay to TopicalVerse format
  const transformedVerses = mockData.versesOfTheDay.map((verse) => ({
    id: verse.id,
    text: verse.verse_text, // verse_text -> text
    reference: verse.verse, // verse -> reference (same structure)
    application_note: verse.reflection_prompt, // Use reflection as application note
    translation: verse.verse.translation || 'NIV',
  }));

  return useQuery({
    queryKey: ['topicalVerses', 'mock', categoryId],
    queryFn: () => transformedVerses,
    initialData: transformedVerses,
    enabled: !!categoryId,
    staleTime: Infinity,
  });
}

// Pre-computed explore home data for instant access
const EXPLORE_HOME_DATA = (() => {
  const devotion = mockData.dailyDevotions[0];
  const quiz = mockData.dailyQuizzes[0];
  return {
    daily_devotion: devotion ? { ...devotion, completed: false } : null,
    verse_of_the_day: mockData.versesOfTheDay[0] ?? null,
    bible_figure: mockData.bibleFigures[0] ?? null,
    daily_quiz: quiz ? { ...quiz, completed: false, score: null } : null,
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
})();

/**
 * Get Today's Explore Home Data (Mock) - INSTANT
 */
export function useExploreHomeMock() {
  const contentLanguage = useExploreStore((state) => state.contentLanguage);

  return useQuery({
    queryKey: ['exploreHome', 'mock', contentLanguage],
    queryFn: () => EXPLORE_HOME_DATA,
    initialData: EXPLORE_HOME_DATA,
    staleTime: Infinity, // Mock data never changes
  });
}

// Pre-computed study progress for instant access
const STUDY_PROGRESS_DATA = {
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

/**
 * Get Study Progress (Mock) - INSTANT
 */
export function useStudyProgress() {
  return useQuery({
    queryKey: ['studyProgress', 'mock'],
    queryFn: () => STUDY_PROGRESS_DATA,
    initialData: STUDY_PROGRESS_DATA,
    staleTime: Infinity,
  });
}

// Helper to find content by type and ID - synchronous
function findContentByTypeAndId(contentType: string, contentId: string): any {
  switch (contentType) {
    case 'daily_devotion':
    case 'devotion':
      return mockData.dailyDevotions.find((d) => d.id === contentId);
    case 'verse_of_the_day':
    case 'verse':
      return mockData.versesOfTheDay.find((v) => v.id === contentId);
    case 'bible_figure':
    case 'figure':
      return mockData.bibleFigures.find((f) => f.id === contentId);
    case 'daily_quiz':
    case 'quiz':
      return mockData.dailyQuizzes.find((q) => q.id === contentId);
    case 'bible_study':
    case 'study':
      return mockData.bibleStudies.find((s) => s.id === contentId);
    case 'devotion_plan':
    case 'plan':
      return mockData.devotionPlans.find((p) => p.id === contentId);
    default:
      return null;
  }
}

/**
 * Get Content by ID (Mock) - INSTANT
 */
export function useContentByIdMock<T>(contentType: string, contentId: string) {
  return useQuery({
    queryKey: ['content', 'mock', contentType, contentId],
    queryFn: () => {
      const content = findContentByTypeAndId(contentType, contentId);
      if (!content) {
        throw new Error(`Content not found: ${contentId}`);
      }
      return content as T;
    },
    initialData: () => {
      if (!contentId) return undefined;
      return findContentByTypeAndId(contentType, contentId) as T | undefined;
    },
    enabled: !!contentId,
    staleTime: Infinity,
  });
}

// Pre-computed user progress for instant access
const USER_PROGRESS_DATA = {
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

/**
 * Get User Progress (Mock) - INSTANT
 */
export function useUserProgressMock() {
  return useQuery({
    queryKey: ['userProgress', 'mock'],
    queryFn: () => USER_PROGRESS_DATA,
    initialData: USER_PROGRESS_DATA,
    staleTime: Infinity,
  });
}

/**
 * Get Verses by Category (Mock) - INSTANT
 */
export function useVersesByCategoryMock(categoryId: string) {
  return useQuery({
    queryKey: ['versesByCategory', 'mock', categoryId],
    queryFn: () => ({
      verses: mockData.versesOfTheDay,
      total: mockData.versesOfTheDay.length,
      category: mockData.topicalCategories.find((c) => c.id === categoryId),
    }),
    initialData: () => {
      if (!categoryId) return undefined;
      return {
        verses: mockData.versesOfTheDay,
        total: mockData.versesOfTheDay.length,
        category: mockData.topicalCategories.find((c) => c.id === categoryId),
      };
    },
    enabled: !!categoryId,
    staleTime: Infinity,
  });
}

// ==================== HELPER HOOKS ====================

/**
 * Check if content is completed (Mock)
 */
export function useIsCompletedMock(contentId: string): boolean {
  const { data } = useUserProgressMock();
  const isContentCompleted = useExploreStore((state) => state.isContentCompleted);

  // Check store first (for runtime completions)
  if (isContentCompleted(contentId)) return true;

  // Fall back to mock data
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
 * Track content start (Mock) - No-op for instant performance
 */
export function useTrackContentStart() {
  const { startReading } = useExploreStore();

  return {
    mutate: (_: { contentId: string; contentType: string }) => {
      startReading();
    },
    mutateAsync: async (_: { contentId: string; contentType: string }) => {
      startReading();
      return Promise.resolve();
    },
    isPending: false,
    isError: false,
    isSuccess: true,
  };
}

/**
 * Track content complete (Mock) - Instant with celebration
 */
export function useTrackContentComplete() {
  const { endReading, triggerCelebration, markContentComplete } = useExploreStore();

  return {
    mutate: ({ contentId, contentType }: { contentId: string; contentType: string }) => {
      endReading();
      markContentComplete(contentId);
      triggerCelebration('milestone', { contentType });
    },
    mutateAsync: async ({ contentId, contentType }: { contentId: string; contentType: string }) => {
      endReading();
      markContentComplete(contentId);
      triggerCelebration('milestone', { contentType });
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
 * Bookmark content (Mock) - No-op for instant performance
 */
export function useBookmarkContent() {
  return {
    mutate: (_: { contentId: string; bookmarked: boolean }) => {},
    mutateAsync: async (_: { contentId: string; bookmarked: boolean }) => Promise.resolve(),
    isPending: false,
    isError: false,
    isSuccess: true,
  };
}

/**
 * Favorite content (Mock) - No-op for instant performance
 */
export function useFavoriteContent() {
  return {
    mutate: (_: { contentId: string; favorited: boolean }) => {},
    mutateAsync: async (_: { contentId: string; favorited: boolean }) => Promise.resolve(),
    isPending: false,
    isError: false,
    isSuccess: true,
  };
}

/**
 * Submit quiz (Mock) - Instant with celebration
 */
export function useSubmitQuiz() {
  const { triggerCelebration } = useExploreStore();

  return {
    mutate: ({ score }: { quizId: string; quizType: string; answers: any[]; score: number; timeTakenSeconds?: number }) => {
      if (score === 100) {
        triggerCelebration('quiz_perfect', { score });
      }
    },
    mutateAsync: async ({ score }: { quizId: string; quizType: string; answers: any[]; score: number; timeTakenSeconds?: number }) => {
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
 * Submit quiz answer (Mock) - Instant tracking per question
 */
export function useSubmitQuizAnswer() {
  return {
    mutate: (_: { quizId: string; questionId: string; selectedAnswer: number; isCorrect: boolean }) => {
      // Mock: tracking per-question answer
    },
    mutateAsync: async (_: { quizId: string; questionId: string; selectedAnswer: number; isCorrect: boolean }) => {
      return Promise.resolve({ success: true });
    },
    isPending: false,
    isError: false,
    isSuccess: true,
  };
}

/**
 * Bookmark verse (Mock) - No-op for instant performance
 */
export function useBookmarkVerse() {
  return {
    mutate: (_: { verseId: string; bookmarked: boolean }) => {},
    mutateAsync: async (_: { verseId: string; bookmarked: boolean }) => Promise.resolve(),
    isPending: false,
    isError: false,
    isSuccess: true,
  };
}

// ==================== BIBLE STUDY LESSON HOOKS (Mock) ====================

/**
 * Track lesson start (Mock) - No-op for instant performance
 */
export function useTrackLessonStart() {
  return {
    mutate: (_: { studyId: string; lessonId: string; lessonIndex: number }) => {
      // Mock: tracking lesson start
    },
    mutateAsync: async (_: { studyId: string; lessonId: string; lessonIndex: number }) => {
      return Promise.resolve({ success: true });
    },
    isPending: false,
    isError: false,
    isSuccess: true,
  };
}

/**
 * Track lesson complete (Mock) - Instant with celebration
 */
export function useTrackLessonComplete() {
  const { triggerCelebration } = useExploreStore();

  return {
    mutate: (_: { studyId: string; lessonId: string; lessonIndex: number }) => {
      triggerCelebration('complete', { contentType: 'lesson' });
    },
    mutateAsync: async (_: { studyId: string; lessonId: string; lessonIndex: number }) => {
      triggerCelebration('complete', { contentType: 'lesson' });
      return Promise.resolve({ success: true });
    },
    isPending: false,
    isError: false,
    isSuccess: true,
  };
}

/**
 * Get lesson progress for a study (Mock) - Returns mock progress data
 */
export function useLessonProgress(studyId: string) {
  // Return mock progress data
  if (!studyId) return null;

  // Mock: Return progress for the study
  const mockProgress: Record<string, {
    lessons_completed: number;
    completed_lesson_ids: string[];
    total_lessons: number;
  }> = {
    'study_001': {
      lessons_completed: 3,
      completed_lesson_ids: ['lesson-0', 'lesson-1', 'lesson-2'],
      total_lessons: 7,
    },
    'study_002': {
      lessons_completed: 0,
      completed_lesson_ids: [],
      total_lessons: 8,
    },
    'study_003': {
      lessons_completed: 10,
      completed_lesson_ids: ['lesson-0', 'lesson-1', 'lesson-2', 'lesson-3', 'lesson-4', 'lesson-5', 'lesson-6', 'lesson-7', 'lesson-8', 'lesson-9'],
      total_lessons: 10,
    },
  };

  return mockProgress[studyId] || {
    lessons_completed: 0,
    completed_lesson_ids: [],
    total_lessons: 7,
  };
}

// ==================== DEVOTION PLAN HOOKS (Mock) ====================

// Pre-computed devotion plan progress
const PLAN_PROGRESS_DATA: Record<string, {
  subscribed: boolean;
  started_at?: string;
  current_day: number;
  completed_days: number[];
  total_days: number;
  completed: boolean;
  completed_at?: string;
}> = {
  'plan_001': {
    subscribed: true,
    started_at: '2025-01-10',
    current_day: 3,
    completed_days: [1, 2],
    total_days: 5,
    completed: false,
  },
  'plan_002': {
    subscribed: true,
    started_at: '2025-01-01',
    current_day: 7,
    completed_days: [1, 2, 3, 4, 5, 6, 7],
    total_days: 7,
    completed: true,
    completed_at: '2025-01-08',
  },
  'plan_003': {
    subscribed: false,
    current_day: 0,
    completed_days: [],
    total_days: 3,
    completed: false,
  },
};

/**
 * Get Devotion Plan Progress (Mock) - Returns mock progress for all subscribed plans
 */
export function useDevotionPlanProgress() {
  return useQuery({
    queryKey: ['devotionPlanProgress', 'mock'],
    queryFn: () => PLAN_PROGRESS_DATA,
    initialData: PLAN_PROGRESS_DATA,
    staleTime: Infinity,
  });
}

/**
 * Get Single Devotion Plan Progress (Mock)
 */
export function useSinglePlanProgress(planId: string) {
  return useQuery({
    queryKey: ['planProgress', 'mock', planId],
    queryFn: () => PLAN_PROGRESS_DATA[planId] || {
      subscribed: false,
      current_day: 0,
      completed_days: [],
      total_days: 0,
      completed: false,
    },
    initialData: PLAN_PROGRESS_DATA[planId] || {
      subscribed: false,
      current_day: 0,
      completed_days: [],
      total_days: 0,
      completed: false,
    },
    enabled: !!planId,
    staleTime: Infinity,
  });
}

/**
 * Subscribe to a Devotion Plan (Mock)
 */
export function useSubscribeToPlan() {
  return {
    mutate: (_: { planId: string }) => {
      // Mock: would update subscription status
    },
    mutateAsync: async (_: { planId: string }) => {
      return Promise.resolve({ success: true, started_at: new Date().toISOString() });
    },
    isPending: false,
    isError: false,
    isSuccess: true,
  };
}

/**
 * Complete a Devotion Plan Day (Mock)
 */
export function useCompletePlanDay() {
  const { triggerCelebration, markContentComplete } = useExploreStore();

  return {
    mutate: ({ planId, dayNumber }: { planId: string; dayNumber: number }) => {
      markContentComplete(`${planId}_day_${dayNumber}`);
      triggerCelebration('complete', { contentType: 'plan_day' });
    },
    mutateAsync: async ({ planId, dayNumber }: { planId: string; dayNumber: number }) => {
      markContentComplete(`${planId}_day_${dayNumber}`);
      triggerCelebration('complete', { contentType: 'plan_day' });
      return Promise.resolve({ success: true });
    },
    isPending: false,
    isError: false,
    isSuccess: true,
  };
}

/**
 * Check if a plan day is completed (Mock)
 */
export function useIsPlanDayCompleted(planId: string, dayNumber: number): boolean {
  const progress = PLAN_PROGRESS_DATA[planId];
  const isContentCompleted = useExploreStore((state) => state.isContentCompleted);

  // Check store first (for runtime completions)
  if (isContentCompleted(`${planId}_day_${dayNumber}`)) return true;

  // Fall back to mock data
  return progress?.completed_days?.includes(dayNumber) ?? false;
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
  useDevotionPlans,
  useDevotionPlan,
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
  useSubmitQuizAnswer,
  useBookmarkVerse,
  useTrackLessonStart,
  useTrackLessonComplete,
  useLessonProgress,
  useDevotionPlanProgress,
  useSinglePlanProgress,
  useSubscribeToPlan,
  useCompletePlanDay,
  useIsPlanDayCompleted,
};
