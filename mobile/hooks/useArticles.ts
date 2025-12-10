/**
 * Articles Hooks
 *
 * React Query hooks for fetching church articles/news.
 * Supports demo mode with mock data.
 *
 * Backend API: GET /public/articles/?church_id=X
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { MOCK_ARTICLES, getMockArticles } from '@/mock/articles';
import type { Article, ArticlesQueryOptions } from '@/types/articles';

// =============================================================================
// CONSTANTS
// =============================================================================

const QUERY_KEYS = {
  ARTICLES: (churchId: string) => ['articles', churchId] as const,
  ARTICLES_FEATURED: (churchId: string) => ['articles', 'featured', churchId] as const,
  ARTICLE_DETAIL: (slug: string) => ['article', slug] as const,
};

// Cache time: 5 minutes
const ARTICLES_CACHE_TIME = 1000 * 60 * 5;

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Fetch published articles for the current church
 *
 * @param options - Query options (limit, category, etc.)
 * @returns React Query result with articles array
 */
export function useArticles(options?: ArticlesQueryOptions) {
  const { churchId, token } = useAuthStore();
  const isDemoMode = token === 'demo-jwt-token-for-testing';

  return useQuery<Article[]>({
    queryKey: [...QUERY_KEYS.ARTICLES(churchId ?? ''), options],
    queryFn: async () => {
      // Demo mode: return mock data
      if (isDemoMode) {
        return getMockArticles({
          limit: options?.limit,
          categoryId: options?.categoryId,
          featured: options?.featured,
        });
      }

      // Production: fetch from API
      const params = new URLSearchParams();
      params.append('church_id', churchId!);

      if (options?.limit) {
        params.append('limit', String(options.limit));
      }
      if (options?.offset) {
        params.append('offset', String(options.offset));
      }
      if (options?.categoryId) {
        params.append('category', options.categoryId);
      }
      if (options?.search) {
        params.append('search', options.search);
      }

      const response = await api.get<{ data: Article[] }>(
        `/public/articles?${params.toString()}`
      );

      return response.data.data ?? response.data ?? [];
    },
    staleTime: ARTICLES_CACHE_TIME,
    gcTime: ARTICLES_CACHE_TIME,
    enabled: !!churchId,
  });
}

/**
 * Fetch featured articles (with images) for carousel display
 *
 * @param limit - Maximum number of articles (default: 5)
 * @returns React Query result with featured articles
 */
export function useFeaturedArticles(limit: number = 5) {
  const { churchId, token } = useAuthStore();
  const isDemoMode = token === 'demo-jwt-token-for-testing';

  return useQuery<Article[]>({
    queryKey: [...QUERY_KEYS.ARTICLES_FEATURED(churchId ?? ''), limit],
    queryFn: async () => {
      // Demo mode: return mock data
      if (isDemoMode) {
        return getMockArticles({ limit, featured: true });
      }

      // Production: fetch from real API
      const response = await api.get<Article[]>(
        `/public/articles/featured?church_id=${churchId}&limit=${limit}`
      );
      return Array.isArray(response.data) ? response.data : [];
    },
    staleTime: ARTICLES_CACHE_TIME,
    gcTime: ARTICLES_CACHE_TIME,
    enabled: !!churchId,
  });
}

/**
 * Fetch a single article by slug
 *
 * @param slug - Article slug
 * @returns React Query result with article detail
 */
export function useArticle(slug: string) {
  const { churchId, token } = useAuthStore();
  const isDemoMode = token === 'demo-jwt-token-for-testing';

  return useQuery<Article | null>({
    queryKey: QUERY_KEYS.ARTICLE_DETAIL(slug),
    queryFn: async () => {
      // Demo mode: find article by slug in mock data
      if (isDemoMode) {
        const article = MOCK_ARTICLES.find((a) => a.slug === slug);
        return article ?? null;
      }

      // Production: fetch from API
      const response = await api.get<Article>(
        `/public/articles/${slug}?church_id=${churchId}`
      );
      return response.data;
    },
    staleTime: ARTICLES_CACHE_TIME,
    enabled: !!slug && !!churchId,
  });
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if articles section should be visible
 *
 * @param articles - Articles array from query
 * @returns boolean indicating visibility
 */
export function shouldShowArticlesSection(
  articles: Article[] | null | undefined
): boolean {
  return !!(articles && articles.length > 0);
}

/**
 * Format publish date for display
 *
 * @param dateString - ISO date string
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted date string
 */
export function formatPublishDate(
  dateString: string,
  locale: string = 'en-US'
): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Within last 7 days: show relative time
  if (diffDays === 0) {
    return 'Today';
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  // Older: show formatted date
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Truncate text to a certain length with ellipsis
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length (default: 100)
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) {
    return text;
  }

  // Find the last space before maxLength
  const lastSpace = text.lastIndexOf(' ', maxLength);
  const truncateAt = lastSpace > 0 ? lastSpace : maxLength;

  return `${text.slice(0, truncateAt)}...`;
}
