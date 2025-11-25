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
}

export interface MultilingualText {
  en: string;
  id: string;
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

  // Multilingual commentary
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

// ==================== QUIZ ====================

export interface QuizQuestion {
  id: string;
  question: MultilingualText;
  options: MultilingualText[];
  correct_answer_index: number;
  explanation: MultilingualText;
  difficulty: QuizDifficulty;
  related_verse?: BibleReference;
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

export interface BibleStudy {
  id: string;
  scope: ContentScope;
  church_id?: string;

  // Study info
  title: MultilingualText;
  subtitle?: MultilingualText;
  description: MultilingualText;
  full_content: MultilingualText;

  // Study structure
  sections: Array<{
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
  difficulty: DifficultyLevel;
  series_id?: string;
  series_order?: number;

  // Visual
  cover_image_url?: string;

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

export interface DevotionPlan {
  id: string;
  scope: ContentScope;
  church_id?: string;

  // Plan info
  title: MultilingualText;
  description: MultilingualText;
  duration_days: number;

  // Days
  days: string[]; // DailyDevotion IDs

  // Categorization
  categories: string[];
  difficulty: DifficultyLevel;

  // Visual
  cover_image_url?: string;

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
  | DailyQuiz
  | BibleStudy
  | TopicalCategory
  | TopicalVerse
  | DevotionPlan
  | ShareableImage;
