/**
 * Explore Settings Types
 *
 * Church adoption settings and user progress
 */

// ==================== FEATURE CONFIGURATION ====================

export interface FeatureConfiguration {
  enabled: boolean;
  custom_label?: {
    en: string;
    id: string;
  };
  sort_order: number;
  visible: boolean;
}

export interface ChurchExploreSettings {
  id: string;
  church_id: string;

  // Master toggle
  explore_enabled: boolean;

  // Feature toggles
  features: {
    // Daily content
    daily_devotion: FeatureConfiguration;
    verse_of_the_day: FeatureConfiguration;
    bible_figure_of_the_day: FeatureConfiguration;
    daily_quiz: FeatureConfiguration;
    // Self-paced content
    bible_studies: FeatureConfiguration;
    bible_figures: FeatureConfiguration;
    topical_verses: FeatureConfiguration;
    devotion_plans: FeatureConfiguration;
    practice_quiz: FeatureConfiguration;
    knowledge_resources: FeatureConfiguration;
    shareable_images: FeatureConfiguration;
    // Features
    streak_tracking: FeatureConfiguration;
    progress_tracking: FeatureConfiguration;
    celebrations: FeatureConfiguration;
    offline_mode: FeatureConfiguration;
  };

  // Content preferences
  preferred_bible_translation: string;
  content_language: string;

  // Church-specific content
  allow_church_content: boolean;
  prioritize_church_content: boolean;

  // Takeover mechanism
  takeover_enabled: boolean;
  takeover_content_types: string[];

  // Schedule customization
  daily_content_release_time?: string;
  timezone: string;

  // UI customization
  primary_color?: string;
  show_church_branding: boolean;
  custom_welcome_message?: {
    en: string;
    id: string;
  };

  // Audit
  created_by: string;
  created_at: string;
  updated_by?: string;
  updated_at?: string;
  deleted: boolean;
  deleted_at?: string;
}

// ==================== USER PROGRESS ====================

export interface ContentProgress {
  content_id: string;
  content_type: string;
  started_at: string;
  completed_at?: string;
  progress_percentage: number;
  bookmarked: boolean;
  favorited: boolean;
  notes?: string;
}

export interface QuizAttempt {
  quiz_id: string;
  quiz_type: 'daily_quiz' | 'practice_quiz';
  attempted_at: string;
  completed_at?: string;
  score?: number;
  answers: Array<{
    question_id: string;
    answer_index: number;
    correct: boolean;
  }>;
  time_taken_seconds?: number;
}

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_activity_date?: string;
  total_days_active: number;
  streak_milestones: number[];
}

export interface UserExploreProgress {
  id: string;
  church_id: string;
  user_id: string;

  // Content progress
  content_progress: ContentProgress[];

  // Quiz history
  quiz_attempts: QuizAttempt[];

  // Streak tracking
  streak: StreakData;

  // Statistics
  total_devotions_read: number;
  total_studies_completed: number;
  total_quizzes_completed: number;
  total_verses_read: number;
  total_figures_learned: number;

  // Achievements
  achievements: string[];

  // Preferences
  notification_enabled: boolean;
  daily_reminder_time?: string;

  // Audit
  created_at: string;
  updated_at?: string;
  deleted: boolean;
  deleted_at?: string;
}

// ==================== API RESPONSES ====================

export interface ExploreHomeData {
  // Today's daily content
  daily_devotion?: any;
  verse_of_the_day?: any;
  bible_figure_of_the_day?: any;
  daily_quiz?: any;

  // User's current progress
  user_progress: UserExploreProgress;

  // Church settings
  church_settings: ChurchExploreSettings;

  // Quick stats
  stats: {
    streak: number;
    devotions_completed: number;
    quizzes_completed: number;
  };
}

export interface ContentListResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface AnalyticsData {
  period: 'week' | 'month' | 'year' | 'all';
  total_content_views: number;
  total_completions: number;
  avg_time_spent_minutes: number;
  streak_info: StreakData;
  top_categories: Array<{
    category: string;
    count: number;
  }>;
  recent_activity: Array<{
    date: string;
    content_type: string;
    content_title: string;
  }>;
}
