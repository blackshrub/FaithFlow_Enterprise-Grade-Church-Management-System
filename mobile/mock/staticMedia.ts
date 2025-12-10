/**
 * Static Media Mock Data
 *
 * Temporary hardcoded data for YouTube (Latest Sermon) and Instagram sections
 * until backend integrations are ready.
 *
 * These will be replaced with actual API calls when:
 * - YouTube API integration is implemented
 * - Instagram Basic Display API is connected
 */

// =============================================================================
// TYPES
// =============================================================================

export interface LatestSermon {
  id: string;
  title: string;
  youtube_url: string;
  thumbnail_url: string;
  date: string; // ISO date string
  duration_minutes: number;
}

export interface InstagramPost {
  id: string;
  image_url: string;
  permalink: string;
  caption?: string;
}

export interface ChurchInstagram {
  handle: string;
  profile_url: string;
}

// =============================================================================
// LATEST SERMON (YOUTUBE)
// =============================================================================

export const STATIC_SERMON: LatestSermon = {
  id: 'sermon-latest',
  title: 'Sunday Service - Walking in Faith',
  youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  thumbnail_url:
    'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=800&q=80',
  date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Yesterday
  duration_minutes: 75,
};

// Demo mode: Multiple sermons for testing
export const DEMO_SERMONS: LatestSermon[] = [
  STATIC_SERMON,
  {
    id: 'sermon-2',
    title: 'Christmas Eve Special Service - Joy to the World',
    youtube_url: 'https://www.youtube.com/watch?v=example2',
    thumbnail_url:
      'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=800&q=80',
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    duration_minutes: 90,
  },
  {
    id: 'sermon-3',
    title: 'The Power of Prayer',
    youtube_url: 'https://www.youtube.com/watch?v=example3',
    thumbnail_url:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
    date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    duration_minutes: 65,
  },
];

// =============================================================================
// INSTAGRAM
// =============================================================================

export const STATIC_INSTAGRAM_POSTS: InstagramPost[] = [
  {
    id: 'ig-1',
    image_url:
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=400&fit=crop',
    permalink: 'https://www.instagram.com/p/post1',
    caption: 'Community gathering at our annual picnic! 🌳',
  },
  {
    id: 'ig-2',
    image_url:
      'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=400&h=400&fit=crop',
    permalink: 'https://www.instagram.com/p/post2',
    caption: 'Youth group worship night 🎵',
  },
  {
    id: 'ig-3',
    image_url:
      'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=400&h=400&fit=crop',
    permalink: 'https://www.instagram.com/p/post3',
    caption: 'Sunday morning service vibes ☀️',
  },
  {
    id: 'ig-4',
    image_url:
      'https://images.unsplash.com/photo-1519834785169-98be25ec3f84?w=400&h=400&fit=crop',
    permalink: 'https://www.instagram.com/p/post4',
    caption: 'Baptism celebration! 💧',
  },
  {
    id: 'ig-5',
    image_url:
      'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=400&h=400&fit=crop',
    permalink: 'https://www.instagram.com/p/post5',
    caption: 'Community outreach program 🤝',
  },
  {
    id: 'ig-6',
    image_url:
      'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=400&h=400&fit=crop',
    permalink: 'https://www.instagram.com/p/post6',
    caption: 'Small group Bible study 📖',
  },
];

export const CHURCH_INSTAGRAM: ChurchInstagram = {
  handle: '@gracechurch',
  profile_url: 'https://www.instagram.com/gracechurch',
};

// =============================================================================
// DEMO MODE HELPERS
// =============================================================================

/**
 * Get sermon based on demo mode or production
 */
export function getLatestSermon(isDemoMode: boolean): LatestSermon | null {
  if (isDemoMode) {
    return STATIC_SERMON;
  }
  // In production, this would return null if no sermon is configured
  // The actual data would come from church settings or YouTube API
  return STATIC_SERMON; // For now, always return static
}

/**
 * Get Instagram posts based on demo mode or production
 */
export function getInstagramPosts(
  isDemoMode: boolean,
  limit: number = 3
): InstagramPost[] {
  if (isDemoMode) {
    return STATIC_INSTAGRAM_POSTS.slice(0, limit);
  }
  // In production, this would fetch from Instagram API
  return STATIC_INSTAGRAM_POSTS.slice(0, limit);
}

/**
 * Check if Instagram is configured for this church
 */
export function isInstagramConfigured(
  churchSettings: { instagram_handle?: string } | null
): boolean {
  return !!(churchSettings?.instagram_handle);
}

/**
 * Check if YouTube/sermon is configured for this church
 */
export function isSermonConfigured(
  churchSettings: { latest_sermon_url?: string } | null
): boolean {
  return !!(churchSettings?.latest_sermon_url);
}
