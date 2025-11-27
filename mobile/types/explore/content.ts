/**
 * Explore Content Types
 *
 * TypeScript interfaces matching backend Pydantic models
 */

// ==================== ENUMS ====================

export type ContentScope = 'global' | 'church';
export type ContentStatus = 'draft' | 'scheduled' | 'published' | 'archived';
export type ContentType =
  | 'daily_devotion'
  | 'verse_of_the_day'
  | 'bible_figure_of_the_day'
  | 'daily_quiz'
  | 'bible_study'
  | 'bible_figure'
  | 'topical_category'
  | 'topical_verse'
  | 'devotion_plan'
  | 'practice_quiz'
  | 'knowledge_resource'
  | 'shareable_image';

export type Language = 'en' | 'id';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type QuizDifficulty = 'easy' | 'medium' | 'hard';

// ==================== BASE TYPES ====================

export interface BibleReference {
  book: string;
  chapter: number;
  verse_start: number;
  verse_end?: number;
  translation: string;
  // Optional pre-fetched verse text for display (string for single language, MultilingualText for multilingual)
  text?: string | MultilingualText;
}

export interface MultilingualText {
  en: string;
  id: string;
  [key: string]: string; // Allow dynamic language key access
}

export interface AIGenerationMetadata {
  generated_by: 'anthropic' | 'openai' | 'stability_ai';
  model: string;
  prompt_version: string;
  generated_at: string;
  reviewed: boolean;
  reviewed_by?: string;
  reviewed_at?: string;
}

// ==================== DAILY CONTENT ====================

export interface DailyDevotion {
  id: string;
  scope: ContentScope;
  church_id?: string;

  // Multilingual content
  title: MultilingualText;
  content: MultilingualText;
  author?: MultilingualText;
  summary?: MultilingualText;

  // Bible references
  main_verse: BibleReference;
  additional_verses: BibleReference[];

  // Metadata
  reading_time_minutes: number;
  tags: string[];
  image_url?: string;

  // AI generation
  ai_generated: boolean;
  ai_metadata?: AIGenerationMetadata;

  // Status
  status: ContentStatus;
  version: number;
  previous_version_id?: string;
  scheduled_for?: string;
  published_at?: string;

  // Audit
  created_by: string;
  created_at: string;
  updated_by?: string;
  updated_at?: string;
  deleted: boolean;
  deleted_at?: string;
}

export interface VerseOfTheDay {
  id: string;
  scope: ContentScope;
  church_id?: string;

  // Bible reference
  verse: BibleReference;

  // Multilingual verse text (the actual Scripture)
  verse_text?: MultilingualText;

  // Multilingual commentary (theological explanation)
  commentary?: MultilingualText;
  reflection_prompt?: MultilingualText;

  // Visual
  background_image_url?: string;
  background_color?: string;

  // AI generation
  ai_generated: boolean;
  ai_metadata?: AIGenerationMetadata;

  // Status
  status: ContentStatus;
  scheduled_for?: string;
  published_at?: string;

  // Audit
  created_by: string;
  created_at: string;
  updated_by?: string;
  updated_at?: string;
  deleted: boolean;
  deleted_at?: string;
}

export interface BibleFigureOfTheDay {
  id: string;
  scope: ContentScope;
  church_id?: string;

  // Figure info
  name: MultilingualText;
  title: MultilingualText;
  summary: MultilingualText;
  full_story: MultilingualText;

  // Key information
  key_verses: BibleReference[];
  key_lessons: MultilingualText;
  time_period?: MultilingualText;

  // Visual
  image_url?: string;
  image_attribution?: string;

  // Related content
  related_figure_ids: string[];
  related_study_ids: string[];

  // AI generation
  ai_generated: boolean;
  ai_metadata?: AIGenerationMetadata;

  // Status
  status: ContentStatus;
  scheduled_for?: string;
  published_at?: string;

  // Audit
  created_by: string;
  created_at: string;
  updated_by?: string;
  updated_at?: string;
  deleted: boolean;
  deleted_at?: string;
}

/**
 * Bible Figure (for figures library)
 * Extended type with biography and timeline for detailed figure screens
 */
export interface BibleFigure extends BibleFigureOfTheDay {
  // Extended biography content
  biography?: MultilingualText;

  // Timeline events
  timeline?: Array<{
    date?: string;
    event: MultilingualText;
    verse?: BibleReference;
  }>;

  // Testament categorization
  testament?: 'old' | 'new';

  // Life lessons learned from this figure
  life_lessons?: MultilingualText[];

  // Legacy compatibility fields
  key_events?: Array<{
    date?: string;
    event: MultilingualText;
    verse?: BibleReference;
    // Alternative field names used in some contexts
    title?: MultilingualText | string;
    description?: MultilingualText | string;
    scripture_reference?: BibleReference | string;
  }>;
  related_scriptures?: BibleReference[];
  tags?: string[];
}

// ==================== QUIZ ====================

export interface QuizQuestion {
  id: string;
  question: MultilingualText;
  options: MultilingualText[];
  correct_answer_index: number;
  explanation: MultilingualText;
  difficulty: QuizDifficulty;
  related_verse?: BibleReference;
  // Alternative field names
  correct_answer?: number | string;
  scripture_reference?: BibleReference | string;
}

export interface DailyQuiz {
  id: string;
  scope: ContentScope;
  church_id?: string;

  // Quiz info
  title: MultilingualText;
  description?: MultilingualText;
  theme?: MultilingualText;

  // Questions
  questions: QuizQuestion[];
  time_limit_seconds?: number;
  passing_score_percentage: number;

  // Quiz-level difficulty (derived from questions or set explicitly)
  difficulty?: QuizDifficulty;

  // AI generation
  ai_generated: boolean;
  ai_metadata?: AIGenerationMetadata;

  // Status
  status: ContentStatus;
  scheduled_for?: string;
  published_at?: string;

  // Audit
  created_by: string;
  created_at: string;
  updated_by?: string;
  updated_at?: string;
  deleted: boolean;
  deleted_at?: string;
}

// ==================== SELF-PACED CONTENT ====================

/**
 * Individual lesson within a Bible Study
 * E-learning style with comprehensive content for each lesson
 */
export interface StudyLesson {
  id: string;
  title: MultilingualText;
  content: MultilingualText;
  summary?: MultilingualText;

  // Scripture references for this lesson (with verse text)
  scripture_references?: Array<BibleReference & { text?: string }>;

  // Legacy field name (for backwards compatibility)
  verses?: BibleReference[];

  // Discussion/reflection questions for this lesson
  discussion_questions?: {
    en?: string[];
    id?: string[];
  };

  // Legacy field name
  questions?: MultilingualText[];

  // Practical application section
  application?: MultilingualText;

  // Key takeaways/bullet points
  key_takeaways?: MultilingualText[];

  // Prayer prompt for the lesson
  prayer?: MultilingualText;

  // Lesson duration in minutes
  duration_minutes?: number;

  // Order within the study
  order: number;

  // Visual (optional lesson-specific image)
  image_url?: string;

  // Video content (optional)
  video_url?: string;
}

export interface BibleStudy {
  id: string;
  scope: ContentScope;
  church_id?: string;

  // Study info
  title: MultilingualText;
  subtitle?: MultilingualText;
  description: MultilingualText;
  full_content: MultilingualText;

  // Introduction (what users will learn)
  introduction?: MultilingualText;

  // Learning objectives/outcomes
  learning_objectives?: MultilingualText[];

  // Target audience
  target_audience?: MultilingualText;

  // Study structure - lessons for the reader
  lessons: StudyLesson[];

  // Computed fields from lessons
  lesson_count?: number;

  // Legacy: sections (for backwards compatibility)
  sections?: Array<{
    title: string;
    content: string;
    verses?: BibleReference[];
  }>;
  estimated_duration_minutes: number;

  // Bible references
  main_passage: BibleReference;
  supporting_verses: BibleReference[];

  // Categorization
  categories: string[];
  category?: string; // Primary category (old_testament, new_testament, topical)
  difficulty: DifficultyLevel;
  series_id?: string;
  series_order?: number;

  // Visual
  cover_image_url?: string;
  thumbnail_url?: string;

  // Instructor/Author info
  author?: MultilingualText;
  author_title?: MultilingualText;
  author_image_url?: string;

  // Engagement metrics
  completion_count?: number;
  average_rating?: number;
  ratings_count?: number;

  // Prerequisites
  prerequisites?: string[]; // IDs of studies that should be completed first

  // AI generation
  ai_generated: boolean;
  ai_metadata?: AIGenerationMetadata;

  // Status
  status: ContentStatus;
  published_at?: string;

  // Audit
  created_by: string;
  created_at: string;
  updated_by?: string;
  updated_at?: string;
  deleted: boolean;
  deleted_at?: string;
}

export interface TopicalCategory {
  id: string;
  scope: ContentScope;
  church_id?: string;

  // Category info
  name: MultilingualText;
  description: MultilingualText;
  icon: string;
  color: string;

  // Hierarchy
  parent_category_id?: string;
  sort_order: number;

  // Related data
  related_categories?: string[];
  verse_count?: number;
  is_popular?: boolean;

  // Status
  status: ContentStatus;

  // Audit
  created_by: string;
  created_at: string;
  updated_by?: string;
  updated_at?: string;
  deleted: boolean;
  deleted_at?: string;
}

export interface TopicalVerse {
  id: string;
  scope: ContentScope;
  church_id?: string;

  // Verse
  verse: BibleReference;

  // Categories
  category_ids: string[];

  // Commentary
  commentary?: MultilingualText;
  application?: MultilingualText;

  // AI generation
  ai_generated: boolean;
  ai_metadata?: AIGenerationMetadata;

  // Status
  status: ContentStatus;

  // Audit
  created_by: string;
  created_at: string;
  updated_by?: string;
  updated_at?: string;
  deleted: boolean;
  deleted_at?: string;
}

/**
 * Day within a devotion plan
 * Self-contained daily devotion content
 */
export interface DevotionPlanDay {
  day_number: number;
  title: MultilingualText;
  content: MultilingualText;
  summary?: MultilingualText;

  // Scripture for this day
  main_verse?: BibleReference & { text?: string };
  additional_verses?: Array<BibleReference & { text?: string }>;

  // Reflection/prayer
  reflection_questions?: MultilingualText[];
  prayer?: MultilingualText;

  // Visual
  image_url?: string;

  // Reading time
  reading_time_minutes?: number;
}

export interface DevotionPlan {
  id: string;
  scope: ContentScope;
  church_id?: string;

  // Plan info
  title: MultilingualText;
  subtitle?: MultilingualText;
  description: MultilingualText;
  introduction?: MultilingualText;
  duration_days: number;

  // Days - inline devotion content (self-contained)
  plan_days: DevotionPlanDay[];

  // Legacy field for linking to separate devotions
  days?: string[]; // DailyDevotion IDs (for backwards compatibility)

  // Categorization
  categories: string[];
  tags?: string[];
  difficulty: DifficultyLevel;

  // Target audience
  target_audience?: MultilingualText;

  // Visual
  cover_image_url?: string;
  thumbnail_url?: string;

  // Author
  author?: MultilingualText;

  // Engagement metrics
  subscriber_count?: number;
  completion_count?: number;
  average_rating?: number;
  ratings_count?: number;

  // AI generation
  ai_generated?: boolean;
  ai_metadata?: AIGenerationMetadata;

  // Status
  status: ContentStatus;
  published_at?: string;

  // Audit
  created_by: string;
  created_at: string;
  updated_by?: string;
  updated_at?: string;
  deleted: boolean;
  deleted_at?: string;
}

export interface ShareableImage {
  id: string;
  scope: ContentScope;
  church_id?: string;

  // Content
  verse: BibleReference;
  image_url: string;
  overlay_text?: MultilingualText;

  // Design
  template_id?: string;
  font_family: string;
  text_color: string;
  text_position: 'top' | 'center' | 'bottom';

  // AI generation
  ai_generated: boolean;
  ai_metadata?: AIGenerationMetadata;

  // Categorization
  tags: string[];

  // Status
  status: ContentStatus;

  // Audit
  created_by: string;
  created_at: string;
  updated_by?: string;
  updated_at?: string;
  deleted: boolean;
  deleted_at?: string;
}

// ==================== HELPER TYPES ====================

export interface ContentScheduleEntry {
  id: string;
  church_id: string;
  date: string;
  content_type: ContentType;
  content_id: string;
  is_takeover: boolean;
  replaced_content_id?: string;
  published: boolean;
  published_at?: string;
  created_by: string;
  created_at: string;
  updated_by?: string;
  updated_at?: string;
  deleted: boolean;
  deleted_at?: string;
}

// ==================== UNIFIED CONTENT TYPE ====================

export type ExploreContent =
  | DailyDevotion
  | VerseOfTheDay
  | BibleFigureOfTheDay
  | BibleFigure
  | DailyQuiz
  | BibleStudy
  | StudyLesson
  | TopicalCategory
  | TopicalVerse
  | DevotionPlan
  | ShareableImage;
