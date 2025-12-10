/**
 * Static Media Hooks
 *
 * React Query hooks for YouTube (Latest Sermon) and Instagram data.
 * Fetches from backend API with fallback to static/mock data.
 *
 * Data sources:
 * - Church settings API for configured YouTube/Instagram URLs
 * - Falls back to static mock data for demo mode
 */

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';
import { logError } from '@/utils/errorHelpers';
import {
  STATIC_SERMON,
  STATIC_INSTAGRAM_POSTS,
  CHURCH_INSTAGRAM,
  type LatestSermon,
  type InstagramPost,
  type ChurchInstagram,
} from '@/mock/staticMedia';

// =============================================================================
// CONSTANTS
// =============================================================================

const QUERY_KEYS = {
  LATEST_SERMON: ['latest-sermon'] as const,
  INSTAGRAM_POSTS: ['instagram-posts'] as const,
};

// Static data doesn't change, so infinite stale time
const STATIC_STALE_TIME = Infinity;

// =============================================================================
// YOUTUBE / SERMON HOOKS
// =============================================================================

/**
 * Get the latest sermon video
 *
 * Currently returns static data.
 * In production, this would fetch from:
 * - Church settings (if admin manually sets latest sermon URL)
 * - YouTube Data API (if channel ID is configured)
 *
 * @returns Latest sermon data or null if not configured
 */
export function useLatestSermon() {
  const { token } = useAuthStore();
  const isDemoMode = token === 'demo-jwt-token-for-testing';

  return useQuery<LatestSermon | null>({
    queryKey: QUERY_KEYS.LATEST_SERMON,
    queryFn: async () => {
      // In demo mode, always return mock sermon
      if (isDemoMode) {
        return STATIC_SERMON;
      }

      try {
        // Fetch from church settings API for manually configured sermon
        const response = await api.get('/api/mobile/church/latest-sermon');
        const data = response.data;

        if (data && data.youtube_url) {
          const sermon: LatestSermon = {
            id: data.id || 'latest-sermon',
            title: data.title || '',
            youtube_url: data.youtube_url,
            thumbnail_url: data.thumbnail_url || getYouTubeThumbnail(
              extractYouTubeVideoId(data.youtube_url) || ''
            ),
            duration_minutes: data.duration_minutes || 0,
            date: data.date || data.published_at || new Date().toISOString(),
          };
          return sermon;
        }

        // No sermon configured, return null
        return null;
      } catch (error) {
        // Log error but don't fail - fall back to static data
        logError('useLatestSermon', 'fetchSermon', error);
        return STATIC_SERMON;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes for API data
  });
}

/**
 * Check if sermon/YouTube section should be visible
 *
 * @param sermon - Latest sermon data
 * @returns boolean indicating visibility
 */
export function shouldShowSermonSection(sermon: LatestSermon | null | undefined): boolean {
  return !!(sermon?.youtube_url);
}

// =============================================================================
// INSTAGRAM HOOKS
// =============================================================================

interface InstagramData {
  posts: InstagramPost[];
  church: ChurchInstagram;
}

/**
 * Get Instagram posts for the church
 *
 * Currently returns static data.
 * In production, this would fetch from Instagram Basic Display API.
 *
 * @param limit - Maximum number of posts to return (default: 3)
 * @returns Instagram posts and church profile info
 */
export function useInstagramPosts(limit: number = 3) {
  const { token } = useAuthStore();
  const isDemoMode = token === 'demo-jwt-token-for-testing';

  return useQuery<InstagramData>({
    queryKey: [...QUERY_KEYS.INSTAGRAM_POSTS, limit],
    queryFn: async () => {
      // In demo mode, return mock data
      if (isDemoMode) {
        return {
          posts: STATIC_INSTAGRAM_POSTS.slice(0, limit),
          church: CHURCH_INSTAGRAM,
        };
      }

      try {
        // Fetch Instagram posts from backend API
        const response = await api.get('/api/mobile/church/instagram', {
          params: { limit },
        });
        const data = response.data;

        if (data && data.posts && data.posts.length > 0) {
          return {
            posts: data.posts.slice(0, limit).map((post: any) => ({
              id: post.id,
              image_url: post.image_url || post.media_url,
              permalink: post.permalink,
              caption: post.caption || '',
              timestamp: post.timestamp,
              media_type: post.media_type || 'IMAGE',
            })),
            church: {
              handle: data.handle || data.church?.handle || '',
              profile_url: data.profile_url || data.church?.profile_url ||
                `https://instagram.com/${data.handle || ''}`,
            },
          };
        }

        // No Instagram configured, return empty
        return {
          posts: [],
          church: { handle: '', profile_url: '' },
        };
      } catch (error) {
        // Log error but don't fail - fall back to static data
        logError('useInstagramPosts', 'fetchPosts', error);
        return {
          posts: STATIC_INSTAGRAM_POSTS.slice(0, limit),
          church: CHURCH_INSTAGRAM,
        };
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes for Instagram data
  });
}

/**
 * Check if Instagram section should be visible
 *
 * @param instagramHandle - Church's Instagram handle from settings
 * @returns boolean indicating visibility
 */
export function shouldShowInstagramSection(
  instagramHandle: string | null | undefined
): boolean {
  return !!(instagramHandle && instagramHandle.length > 0);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Extract YouTube video ID from various URL formats
 *
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 *
 * @param url - YouTube URL
 * @returns Video ID or null if not found
 */
export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Get YouTube thumbnail URL from video ID
 *
 * @param videoId - YouTube video ID
 * @param quality - Thumbnail quality
 * @returns Thumbnail URL
 */
export function getYouTubeThumbnail(
  videoId: string,
  quality: 'default' | 'medium' | 'high' | 'maxres' = 'maxres'
): string {
  const qualityMap = {
    default: 'default',
    medium: 'mqdefault',
    high: 'hqdefault',
    maxres: 'maxresdefault',
  };

  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

/**
 * Format duration in minutes to human-readable string
 *
 * @param minutes - Duration in minutes
 * @returns Formatted string (e.g., "1h 15m")
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}
