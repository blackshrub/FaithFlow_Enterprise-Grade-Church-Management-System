/**
 * Explore API Client
 *
 * Handles all API calls to the Explore backend endpoints
 */

import api from '../api';
import type {
  ExploreHomeData,
  ContentListResponse,
  UserExploreProgress,
  DailyDevotion,
  VerseOfTheDay,
  BibleFigureOfTheDay,
  DailyQuiz,
  BibleStudy,
  TopicalCategory,
  TopicalVerse,
  DevotionPlan,
  ShareableImage,
  ContentType,
  Language,
} from '@/types/explore';

// ==================== HOME & DAILY CONTENT ====================

export const exploreApi = {
  /**
   * Get today's Explore content for home screen
   */
  getHome: async (language: Language = 'en'): Promise<ExploreHomeData> => {
    const { data } = await api.get('/public/explore/home', {
      params: { language },
    });
    return data;
  },

  /**
   * Get specific daily content for a date
   */
  getDailyContent: async (
    contentType: ContentType,
    date?: string,
    language: Language = 'en'
  ) => {
    const { data } = await api.get(`/public/explore/daily/${contentType}`, {
      params: { date, language },
    });
    return data;
  },

  // ==================== SELF-PACED CONTENT ====================

  /**
   * Browse self-paced content
   */
  browseContent: async <T>(
    contentType: ContentType,
    options?: {
      skip?: number;
      limit?: number;
      language?: Language;
      categories?: string[];
      difficulty?: string;
      search?: string;
    }
  ): Promise<ContentListResponse<T>> => {
    const params: any = {
      skip: options?.skip || 0,
      limit: options?.limit || 20,
      language: options?.language || 'en',
    };

    if (options?.categories) {
      params.categories = options.categories.join(',');
    }
    if (options?.difficulty) {
      params.difficulty = options.difficulty;
    }
    if (options?.search) {
      params.search = options.search;
    }

    const { data } = await api.get(`/public/explore/${contentType}`, { params });
    return data;
  },

  /**
   * Get specific content by ID
   */
  getContentById: async <T>(
    contentType: ContentType,
    contentId: string,
    language: Language = 'en'
  ): Promise<T> => {
    const { data } = await api.get(
      `/public/explore/${contentType}/${contentId}`,
      {
        params: { language },
      }
    );
    return data;
  },

  // ==================== PROGRESS TRACKING ====================

  /**
   * Track when user starts consuming content
   */
  trackContentStart: async (contentId: string, contentType: ContentType) => {
    const { data } = await api.post('/public/explore/progress/start', {
      content_id: contentId,
      content_type: contentType,
    });
    return data;
  },

  /**
   * Track when user completes content
   */
  trackContentComplete: async (contentId: string, contentType: ContentType) => {
    const { data } = await api.post('/public/explore/progress/complete', {
      content_id: contentId,
      content_type: contentType,
    });
    return data;
  },

  /**
   * Submit quiz attempt
   */
  submitQuiz: async (
    quizId: string,
    quizType: string,
    answers: Array<{ question_id: string; answer_index: number; correct: boolean }>,
    score: number,
    timeTakenSeconds?: number
  ) => {
    const { data } = await api.post('/public/explore/quiz/submit', {
      quiz_id: quizId,
      quiz_type: quizType,
      answers,
      score,
      time_taken_seconds: timeTakenSeconds,
    });
    return data;
  },

  /**
   * Get user's progress and statistics
   */
  getUserProgress: async (): Promise<{
    progress: UserExploreProgress;
    stats: any;
  }> => {
    const { data } = await api.get('/public/explore/progress');
    return data;
  },

  /**
   * Bookmark content
   */
  bookmarkContent: async (contentId: string, bookmarked: boolean) => {
    const { data } = await api.post('/public/explore/bookmark', {
      content_id: contentId,
      bookmarked,
    });
    return data;
  },

  /**
   * Favorite content
   */
  favoriteContent: async (contentId: string, favorited: boolean) => {
    const { data } = await api.post('/public/explore/favorite', {
      content_id: contentId,
      favorited,
    });
    return data;
  },

  // ==================== TOPICAL VERSES ====================

  /**
   * Get all topical categories (hierarchical)
   */
  getTopicalCategories: async (
    language: Language = 'en'
  ): Promise<{ categories: TopicalCategory[] }> => {
    const { data } = await api.get('/public/explore/topical/categories', {
      params: { language },
    });
    return data;
  },

  /**
   * Get verses for a specific topical category
   */
  getVersesByCategory: async (
    categoryId: string,
    skip: number = 0,
    limit: number = 20,
    language: Language = 'en'
  ): Promise<ContentListResponse<TopicalVerse>> => {
    const { data } = await api.get(
      `/public/explore/topical/verses/${categoryId}`,
      {
        params: { skip, limit, language },
      }
    );
    return data;
  },
};

export default exploreApi;
