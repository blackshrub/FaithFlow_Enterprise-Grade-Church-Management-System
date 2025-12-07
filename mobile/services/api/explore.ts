/**
 * Explore Features API Service
 *
 * Handles API calls for:
 * - User spiritual profile and onboarding
 * - Life stage journeys
 * - Contextual companion
 */

import { api } from '../api';

// ==================== TYPES ====================

// Profile Types
export interface OnboardingQuestion {
  id: string;
  question: { en: string; id: string };
  description?: { en: string; id: string };
  question_type: 'single_choice' | 'multiple_choice' | 'slider' | 'text';
  options?: Array<{ en: string; id: string }>;
  option_values?: string[];
  min_value?: number;
  max_value?: number;
  slider_labels?: { min: { en: string; id: string }; max: { en: string; id: string } };
  required: boolean;
  order: number;
  category: string;
}

export interface OnboardingResponse {
  question_id: string;
  value: string | string[] | number;
}

export interface UserProfile {
  id: string;
  onboarding_completed: boolean;
  onboarding_skipped: boolean;
  life_situation: {
    age_range?: string;
    life_stage?: string;
    current_challenges: string[];
    faith_journey?: string;
  };
  explicit_interests: string[];
  preferred_content_types: string[];
  preferred_translation: string;
  notification_enabled: boolean;
  priority_topics: string[];
  recommended_difficulty: string;
  growth_indicators: {
    consistency_score: number;
    depth_score: number;
    breadth_score: number;
    current_streak: number;
    longest_streak: number;
    computed_maturity: string;
  };
  active_journeys: string[];
  last_activity?: string;
}

// Journey Types
export interface JourneyWeek {
  title: { en: string; id: string };
  description: { en: string; id: string };
  days: Array<{
    day_number: number;
    title: { en: string; id: string };
  }>;
}

export interface Journey {
  id: string;
  slug: string;
  title: { en: string; id: string };
  subtitle?: { en: string; id: string };
  description: { en: string; id: string };
  duration_weeks: number;
  total_days: number;
  category: string;
  difficulty: string;
  icon: string;
  color: string;
  cover_image_url?: string;
  thumbnail_url?: string;
  enrollments_count: number;
  completions_count: number;
  average_rating: number;
}

export interface JourneyRecommendation {
  journey_id: string;
  journey_slug: string;
  relevance_score: number;
  reason: { en: string; id: string };
  matched_factors: string[];
}

export interface JourneyEnrollment {
  id: string;
  journey_slug: string;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  current_week: number;
  current_day: number;
  start_date: string;
  scheduled_completion_date?: string;
  total_days_completed: number;
  streak_current: number;
  journey_title?: { en: string; id: string };
  journey_cover_image?: string;
  journey_icon?: string;
  journey_color?: string;
}

export interface JourneyDayContent {
  day_number: number;
  title: { en: string; id: string };
  focus: { en: string; id: string };
  main_scripture: { book: string; chapter: number; verses: string };
  scripture_text?: { en: string; id: string };
  devotion_content: { en: string; id: string };
  reflection_questions: { en: string[]; id: string[] };
  application: { en: string; id: string };
  prayer_prompt: { en: string; id: string };
  companion_prompt?: { en: string; id: string };
  estimated_minutes: number;
}

export interface TodayContent {
  journey_slug: string;
  journey_title: { en: string; id: string };
  week_number: number;
  week_title: { en: string; id: string };
  day_number: number;
  content: JourneyDayContent;
  progress: {
    total_weeks: number;
    current_week: number;
    total_days: number;
    days_completed: number;
  };
}

// Contextual Companion Types
export type ContextType =
  | 'devotion_reflection'
  | 'bible_study_lesson'
  | 'journey_day'
  | 'verse_meditation'
  | 'quiz_explanation';

export interface ContextualPromptRequest {
  context_type: ContextType;
  content_id: string;
  language?: string;
  lesson_number?: number;
  week_number?: number;
  day_number?: number;
}

export interface ContextualPromptResponse {
  context_type: ContextType;
  content_id: string;
  system_prompt: string;
  context_data: Record<string, any>;
}

// ==================== PROFILE API ====================

export const profileApi = {
  /**
   * Get onboarding questions
   */
  getOnboardingQuestions: async (): Promise<OnboardingQuestion[]> => {
    const response = await api.get('/api/explore/profile/onboarding/questions');
    return response.data.data.questions;
  },

  /**
   * Submit onboarding responses
   */
  submitOnboarding: async (
    responses: OnboardingResponse[],
    skipped: boolean = false
  ): Promise<{ profile_id: string; onboarding_completed: boolean }> => {
    const response = await api.post('/api/explore/profile/onboarding/submit', {
      responses,
      skipped,
    });
    return response.data.data;
  },

  /**
   * Skip onboarding
   */
  skipOnboarding: async (): Promise<{ profile_id: string }> => {
    const response = await api.post('/api/explore/profile/onboarding/skip');
    return response.data.data;
  },

  /**
   * Get current user's profile
   */
  getMyProfile: async (): Promise<UserProfile> => {
    const response = await api.get('/api/explore/profile/me');
    return response.data.data;
  },

  /**
   * Get growth indicators
   */
  getGrowthIndicators: async (): Promise<UserProfile['growth_indicators']> => {
    const response = await api.get('/api/explore/profile/me/growth');
    return response.data.data;
  },

  /**
   * Update life situation
   */
  updateLifeSituation: async (data: {
    age_range?: string;
    life_stage?: string;
    current_challenges?: string[];
    faith_journey?: string;
  }): Promise<void> => {
    await api.patch('/api/explore/profile/me/life-situation', data);
  },

  /**
   * Update preferences
   */
  updatePreferences: async (data: {
    preferred_translation?: string;
    preferred_devotion_time?: string;
    notification_enabled?: boolean;
    explicit_interests?: string[];
  }): Promise<void> => {
    await api.patch('/api/explore/profile/me/preferences', data);
  },

  /**
   * Track content view
   */
  trackContentView: async (
    content_id: string,
    content_type: string,
    topics?: string[],
    bible_reference?: { book: string; chapter: number }
  ): Promise<void> => {
    await api.post('/api/explore/profile/track/view', {
      content_id,
      content_type,
      topics,
      bible_reference,
    });
  },

  /**
   * Track content completion
   */
  trackContentCompletion: async (
    content_id: string,
    completion_percentage: number,
    time_spent_seconds: number
  ): Promise<void> => {
    await api.post('/api/explore/profile/track/completion', {
      content_id,
      completion_percentage,
      time_spent_seconds,
    });
  },

  /**
   * Track content action (bookmark, favorite, etc.)
   */
  trackContentAction: async (
    content_id: string,
    action: 'bookmark' | 'favorite' | 'share' | 'companion',
    value: boolean = true
  ): Promise<void> => {
    await api.post('/api/explore/profile/track/action', {
      content_id,
      action,
      value,
    });
  },
};

// ==================== JOURNEY API ====================

export const journeyApi = {
  /**
   * Get available journeys
   */
  getAvailableJourneys: async (
    category?: string,
    difficulty?: string
  ): Promise<Journey[]> => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (difficulty) params.append('difficulty', difficulty);

    const response = await api.get(`/api/explore/journeys/available?${params.toString()}`);
    return response.data.data.journeys;
  },

  /**
   * Get recommended journeys based on profile
   */
  getRecommendedJourneys: async (limit: number = 3): Promise<JourneyRecommendation[]> => {
    const response = await api.get(`/api/explore/journeys/recommended?limit=${limit}`);
    return response.data.data.recommendations;
  },

  /**
   * Get journey categories
   */
  getCategories: async (): Promise<
    Array<{ id: string; name: { en: string; id: string }; icon: string }>
  > => {
    const response = await api.get('/api/explore/journeys/categories');
    return response.data.data.categories;
  },

  /**
   * Get journey details
   */
  getJourneyDetails: async (slug: string): Promise<Journey & { weeks: JourneyWeek[] }> => {
    const response = await api.get(`/api/explore/journeys/${slug}`);
    return response.data.data;
  },

  /**
   * Enroll in a journey
   */
  enroll: async (
    journey_slug: string,
    start_date?: string
  ): Promise<{
    enrollment_id: string;
    journey_slug: string;
    start_date: string;
    scheduled_completion: string;
  }> => {
    const response = await api.post('/api/explore/journeys/enroll', {
      journey_slug,
      start_date,
    });
    return response.data.data;
  },

  /**
   * Get user's enrollments
   */
  getMyEnrollments: async (status?: string): Promise<JourneyEnrollment[]> => {
    const params = status ? `?status=${status}` : '';
    const response = await api.get(`/api/explore/journeys/my/enrollments${params}`);
    return response.data.data.enrollments;
  },

  /**
   * Get specific enrollment
   */
  getEnrollment: async (
    slug: string
  ): Promise<{ enrollment: JourneyEnrollment; journey: Journey }> => {
    const response = await api.get(`/api/explore/journeys/my/${slug}`);
    return response.data.data;
  },

  /**
   * Get today's content for a journey
   */
  getTodayContent: async (slug: string): Promise<TodayContent> => {
    const response = await api.get(`/api/explore/journeys/my/${slug}/today`);
    return response.data.data;
  },

  /**
   * Complete today's journey day
   */
  completeDay: async (
    slug: string,
    data: {
      time_spent_seconds: number;
      scripture_read: boolean;
      devotion_read: boolean;
      reflection_answered: boolean;
      prayer_completed: boolean;
      notes?: string;
      reflection_responses?: string[];
      rating?: number;
    }
  ): Promise<{
    week_completed: boolean;
    journey_completed: boolean;
    next_week: number;
    next_day: number;
    milestone_badge?: string;
  }> => {
    const response = await api.post(`/api/explore/journeys/my/${slug}/complete-day`, data);
    return response.data.data;
  },

  /**
   * Pause a journey
   */
  pause: async (slug: string, reason?: string): Promise<void> => {
    await api.post(`/api/explore/journeys/my/${slug}/pause`, { reason });
  },

  /**
   * Resume a paused journey
   */
  resume: async (slug: string): Promise<void> => {
    await api.post(`/api/explore/journeys/my/${slug}/resume`);
  },

  /**
   * Abandon a journey
   */
  abandon: async (slug: string): Promise<void> => {
    await api.post(`/api/explore/journeys/my/${slug}/abandon`);
  },

  /**
   * Submit completion feedback
   */
  submitFeedback: async (slug: string, rating: number, testimony?: string): Promise<void> => {
    await api.post(`/api/explore/journeys/my/${slug}/feedback`, { rating, testimony });
  },
};

// ==================== CONTEXTUAL COMPANION API ====================

export const contextualCompanionApi = {
  /**
   * Get contextual system prompt for companion
   */
  getContext: async (request: ContextualPromptRequest): Promise<ContextualPromptResponse> => {
    const response = await api.post('/api/explore/companion/context', request);
    return response.data.data;
  },

  /**
   * Get conversation starters for a context
   */
  getStarters: async (
    context_type: ContextType,
    language: string = 'en'
  ): Promise<string[]> => {
    const response = await api.get(
      `/api/explore/companion/starters/${context_type}?language=${language}`
    );
    return response.data.data.starters;
  },
};

// ==================== EXPORT ====================

export default {
  profile: profileApi,
  journey: journeyApi,
  contextualCompanion: contextualCompanionApi,
};
