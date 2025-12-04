/**
 * API Endpoints for FaithFlow Mobile App
 *
 * Supports two deployment modes:
 * 1. SUBDOMAIN MODE: api.yourdomain.com (API_PREFIX = '')
 * 2. PATH-BASED MODE: yourdomain.com/api (API_PREFIX = '/api')
 *
 * Configure via environment variables in app.config.js:
 * - API_URL: The base URL of your API server
 * - API_PREFIX: '/api' for path-based, '' for subdomain-based
 *
 * For production builds:
 *   API_URL=https://api.yourdomain.com eas build --platform android
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

// =============================================================================
// API CONFIGURATION
// =============================================================================

// Get config from expo-constants (set via app.config.js)
const expoConfig = Constants.expoConfig?.extra;

// Development base URL - handles different platforms:
// - iOS Simulator: localhost works
// - Android Emulator: 10.0.2.2 maps to host localhost
// - Physical devices: Use host machine's local IP
const getDevBaseUrl = () => {
  if (Platform.OS === 'android') {
    // For physical Android device, use your Mac's IP address
    // For Android Emulator, use 10.0.2.2
    // Detect if running on emulator (not 100% reliable, so default to IP)
    return 'http://192.168.0.60:8000';
  }
  // iOS simulator can use localhost
  return 'http://localhost:8000';
};

// Development vs Production base URL
// In development: use platform-appropriate URL
// In production: use API_URL from environment variable (set during build)
export const API_BASE_URL = __DEV__
  ? getDevBaseUrl()
  : (expoConfig?.apiUrl || 'https://api.yourdomain.com');

// API Prefix - empty for subdomain mode, '/api' for path-based mode
export const API_PREFIX = __DEV__
  ? '/api'
  : (expoConfig?.apiPrefix ?? '');

// Helper to build endpoint paths
const endpoint = (path: string) => `${API_PREFIX}${path}`;

// =============================================================================
// API ENDPOINTS
// =============================================================================
export const API_ENDPOINTS = {
  // Authentication
  AUTH_SEND_OTP: endpoint('/public/members/login'),
  AUTH_VERIFY_OTP: endpoint('/public/members/verify-otp'),
  AUTH_REFRESH: endpoint('/member-auth/refresh'),

  // Bible
  BIBLE_VERSIONS: endpoint('/bible/versions'),
  BIBLE_BOOKS: endpoint('/bible/books'),
  BIBLE_CHAPTER: (version: string, book: string, chapter: number) =>
    endpoint(`/bible/${version}/${book}/${chapter}`),
  BIBLE_VERSE: (
    version: string,
    book: string,
    chapter: number,
    verse: number,
    endVerse?: number
  ) =>
    endpoint(`/bible/${version}/${book}/${chapter}/${verse}${
      endVerse ? `?end_verse=${endVerse}` : ''
    }`),
  BIBLE_SEARCH: endpoint('/bible/search'),

  // Giving
  GIVING_CONFIG: endpoint('/giving/config'),
  GIVING_FUNDS: endpoint('/giving/funds'),
  GIVING_SUBMIT: endpoint('/giving/submit'),
  GIVING_HISTORY: endpoint('/giving/my-history'),
  GIVING_TRANSACTION: (id: string) => endpoint(`/giving/transaction/${id}`),

  // Events
  EVENTS_LIST: endpoint('/events'),
  EVENT_DETAIL: (id: string) => endpoint(`/events/${id}`),
  EVENT_RSVP: (id: string) => endpoint(`/events/${id}/rsvp`),
  MY_RSVPS: endpoint('/events/my-rsvps'),

  // Groups (legacy - use Communities instead)
  GROUPS_PUBLIC: endpoint('/public/groups'),
  MY_GROUPS: endpoint('/groups/my-groups'),
  GROUP_DETAIL: (id: string) => endpoint(`/groups/${id}`),
  GROUP_JOIN: (id: string) => endpoint(`/groups/${id}/join`),
  GROUP_LEAVE: (id: string) => endpoint(`/groups/${id}/leave`),
  GROUP_MEMBERS: (id: string) => endpoint(`/groups/${id}/members`),

  // Communities (new - replacing Groups)
  COMMUNITIES_PUBLIC: (churchId: string) => endpoint(`/public/communities/${churchId}`),
  MY_COMMUNITIES: endpoint('/v1/communities/my-communities'),
  COMMUNITY_DETAIL: (id: string) => endpoint(`/v1/communities/${id}`),
  COMMUNITY_JOIN: (communityId: string) => endpoint(`/public/communities/${communityId}/join-request`),
  COMMUNITY_LEAVE: (communityId: string) => endpoint(`/public/communities/${communityId}/leave-request`),
  COMMUNITY_MEMBERS: (churchId: string, communityId: string) => endpoint(`/public/communities/${churchId}/${communityId}/members`),

  // Prayer Requests
  PRAYER_REQUESTS: endpoint('/prayer-requests'),
  PRAYER_REQUEST_DETAIL: (id: string) => endpoint(`/prayer-requests/${id}`),
  PRAYER_REQUEST_CREATE: endpoint('/prayer-requests'),
  PRAYER_REQUEST_PRAY: (id: string) => endpoint(`/prayer-requests/${id}/pray`),
  MY_PRAYER_REQUESTS: endpoint('/prayer-requests/my-requests'),

  // Articles
  ARTICLES_PUBLIC: endpoint('/public/articles'),
  ARTICLE_DETAIL: (id: string) => endpoint(`/public/articles/${id}`),

  // Counseling
  COUNSELING_SLOTS: endpoint('/public/counseling/slots'),
  COUNSELING_BOOK: endpoint('/public/counseling/appointments'),
  MY_COUNSELING: endpoint('/public/counseling/my-appointments'),

  // Profile
  MY_PROFILE: endpoint('/members/me'),
  UPDATE_PROFILE: endpoint('/members/me'),

  // Notifications
  REGISTER_DEVICE: endpoint('/notifications/register-device'),
  NOTIFICATION_PREFERENCES: endpoint('/notifications/preferences'),

  // Explore Content
  EXPLORE_HOME: endpoint('/public/explore/home'),
  EXPLORE_DEVOTION: (id: string) => endpoint(`/public/explore/devotion/${id}`),
  EXPLORE_VERSE: (id: string) => endpoint(`/public/explore/verse/${id}`),
  EXPLORE_FIGURE: (id: string) => endpoint(`/public/explore/figure/${id}`),
  EXPLORE_QUIZ: (id: string) => endpoint(`/public/explore/quiz/${id}`),
  EXPLORE_STUDY: (id: string) => endpoint(`/public/explore/study/${id}`),
  EXPLORE_TOPICAL: (categoryId: string) => endpoint(`/public/explore/topical/${categoryId}`),
};

// Query keys for React Query
export const QUERY_KEYS = {
  // Auth
  USER: ['user'],

  // Bible
  BIBLE_VERSIONS: ['bible', 'versions'],
  BIBLE_BOOKS: (version?: string) => ['bible', 'books', version],
  BIBLE_CHAPTER: (version: string, book: string, chapter: number) => [
    'bible',
    'chapter',
    version,
    book,
    chapter,
  ],

  // Giving
  FUNDS: ['funds'],
  PAYMENT_CONFIG: ['payment', 'config'],
  GIVING_HISTORY: ['giving', 'history'],
  GIVING_SUMMARY: ['giving', 'summary'],
  TRANSACTION_DETAIL: ['transaction', 'detail'],

  // Events
  EVENTS_LIST: ['events', 'list'], // Base query for all events
  EVENT_DETAIL: ['event', 'detail'],
  EVENT_CATEGORIES: ['events', 'categories'],

  // Groups (legacy)
  GROUPS: ['groups'],
  MY_GROUPS: ['groups', 'my'],
  GROUP_DETAIL: ['group', 'detail'],
  GROUP_MEMBERS: ['group', 'members'],

  // Communities (new)
  COMMUNITIES: ['communities'],
  MY_COMMUNITIES: ['communities', 'my'],
  COMMUNITY_DETAIL: (id: string) => ['community', 'detail', id],
  COMMUNITY_MEMBERS: (communityId: string) => ['community', 'members', communityId],
  COMMUNITY_MESSAGES: (communityId: string, channelType: string, subgroupId?: string) =>
    ['community', 'messages', communityId, channelType, subgroupId],

  // Prayer
  PRAYER_REQUESTS: ['prayer', 'requests'],
  MY_PRAYER_REQUESTS: ['prayer', 'my'],
  PRAYER_REQUEST_DETAIL: ['prayer', 'detail'],

  // Articles
  ARTICLES: (churchId: string) => ['articles', churchId],
  ARTICLE: (id: string) => ['article', id],

  // Counseling
  COUNSELING_SLOTS: (churchId: string) => ['counseling', 'slots', churchId],
  MY_COUNSELING: (memberId: string) => ['counseling', 'my', memberId],

  // Profile
  PROFILE: (memberId: string) => ['profile', memberId],
};

// Cache times (staleTime - how long data is considered fresh)
export const CACHE_TIMES = {
  BIBLE: 1000 * 60 * 60 * 24 * 7, // 1 week (rarely changes)
  GIVING: 1000 * 60 * 5, // 5 minutes
  EVENTS: 1000 * 60 * 5, // 5 minutes
  GROUPS: 1000 * 60 * 5, // 5 minutes (legacy)
  COMMUNITIES: 1000 * 60 * 5, // 5 minutes
  COMMUNITY_MESSAGES: 1000 * 30, // 30 seconds (real-time via MQTT)
  PRAYER: 1000 * 60 * 3, // 3 minutes
  PROFILE: 1000 * 60 * 30, // 30 minutes
  MEMBERS: 1000 * 60 * 10, // 10 minutes
  SUBGROUPS: 1000 * 60 * 5, // 5 minutes
  SEARCH: 1000 * 60 * 2, // 2 minutes
};

// GC times (gcTime - how long to keep inactive cache)
export const GC_TIMES = {
  DEFAULT: 1000 * 60 * 30, // 30 minutes
  MESSAGES: 1000 * 60 * 60, // 1 hour (keep longer for offline)
  COMMUNITIES: 1000 * 60 * 60, // 1 hour
  MEMBERS: 1000 * 60 * 60, // 1 hour
};

// Retry configurations
export const RETRY_CONFIG = {
  DEFAULT: 3,
  MUTATIONS: 1, // Don't retry mutations by default
  MESSAGES: 2, // Retry message fetches twice
};

// Refetch intervals (for background refetching)
export const REFETCH_INTERVALS = {
  MESSAGES_ACTIVE: 1000 * 10, // 10s when chat is active (backup for MQTT)
  MESSAGES_BACKGROUND: false, // Disabled when not focused
  COMMUNITIES: 1000 * 60 * 5, // 5 minutes
  TYPING: 1000 * 3, // 3s for typing status
};

// Pagination
export const PAGINATION = {
  MESSAGES_PAGE_SIZE: 50,
  MEMBERS_PAGE_SIZE: 30,
  SEARCH_PAGE_SIZE: 30,
  INFINITE_SCROLL_THRESHOLD: 0.3, // Load more at 30% from bottom
};
