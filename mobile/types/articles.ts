/**
 * Article Types
 *
 * TypeScript types for church articles/news system
 * Matches backend API structure from /backend/models/article.py
 */

// =============================================================================
// CORE TYPES
// =============================================================================

/**
 * Published article for display
 */
export interface Article {
  /** Unique identifier */
  id: string;
  /** Article title */
  title: string;
  /** URL-friendly slug */
  slug: string;
  /** Full HTML content */
  content: string;
  /** Short preview text */
  excerpt?: string;
  /** Main image URL */
  featured_image?: string;
  /** Associated category IDs */
  category_ids: string[];
  /** Associated tag IDs */
  tag_ids: string[];
  /** Publication date (ISO 8601) */
  publish_date: string;
  /** Estimated reading time in minutes */
  reading_time: number;
  /** Number of views */
  views_count: number;
  /** Whether comments are enabled */
  allow_comments: boolean;
}

/**
 * Article category
 */
export interface ArticleCategory {
  id: string;
  church_id: string;
  name: string;
  description?: string;
}

/**
 * Article tag
 */
export interface ArticleTag {
  id: string;
  church_id: string;
  name: string;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Paginated articles list response
 */
export interface ArticlesListResponse {
  data: Article[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

/**
 * Single article response
 */
export interface ArticleDetailResponse {
  article: Article;
  related_articles?: Article[];
}

// =============================================================================
// FILTER & QUERY TYPES
// =============================================================================

/**
 * Options for fetching articles
 */
export interface ArticlesQueryOptions {
  /** Maximum number of articles to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Filter by category ID */
  categoryId?: string;
  /** Filter by tag ID */
  tagId?: string;
  /** Only return featured articles (with images) */
  featured?: boolean;
  /** Search query */
  search?: string;
}

// =============================================================================
// CARD COMPONENT PROPS
// =============================================================================

/**
 * Props for article card components
 */
export interface ArticleCardProps {
  article: Article;
  onPress: (article: Article) => void;
  /** Card style variant */
  variant?: 'default' | 'compact' | 'featured';
  /** Whether to show reading time */
  showReadingTime?: boolean;
  /** Whether to show excerpt */
  showExcerpt?: boolean;
}
