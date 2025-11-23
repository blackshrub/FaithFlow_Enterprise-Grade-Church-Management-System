/**
 * API Endpoints for FaithFlow Mobile App
 */

// Base URL - Update this for production
export const API_BASE_URL = __DEV__
  ? 'http://localhost:8000'
  : 'https://api.faithflow.com';

export const API_ENDPOINTS = {
  // Authentication
  AUTH_SEND_OTP: '/api/public/members/login',
  AUTH_VERIFY_OTP: '/api/public/members/verify-otp',
  AUTH_REFRESH: '/member-auth/refresh',

  // Bible
  BIBLE_VERSIONS: '/api/bible/versions',
  BIBLE_BOOKS: '/api/bible/books',
  BIBLE_CHAPTER: (version: string, book: string, chapter: number) =>
    `/api/bible/${version}/${book}/${chapter}`,
  BIBLE_VERSE: (
    version: string,
    book: string,
    chapter: number,
    verse: number,
    endVerse?: number
  ) =>
    `/api/bible/${version}/${book}/${chapter}/${verse}${
      endVerse ? `?end_verse=${endVerse}` : ''
    }`,

  // Giving
  GIVING_CONFIG: '/api/giving/config',
  GIVING_FUNDS: '/api/giving/funds',
  GIVING_SUBMIT: '/api/giving/submit',
  GIVING_HISTORY: '/api/giving/my-history',
  GIVING_TRANSACTION: (id: string) => `/api/giving/transaction/${id}`,

  // Events
  EVENTS_LIST: '/api/events',
  EVENT_DETAIL: (id: string) => `/api/events/${id}`,
  EVENT_RSVP: (id: string) => `/api/events/${id}/rsvp`,
  MY_RSVPS: '/api/events/my-rsvps',

  // Groups
  GROUPS_PUBLIC: '/api/public/groups',
  MY_GROUPS: '/api/groups/my-groups',
  GROUP_DETAIL: (id: string) => `/api/groups/${id}`,
  GROUP_JOIN: (id: string) => `/api/groups/${id}/join`,
  GROUP_LEAVE: (id: string) => `/api/groups/${id}/leave`,
  GROUP_MEMBERS: (id: string) => `/api/groups/${id}/members`,

  // Prayer Requests
  PRAYER_REQUESTS: '/api/prayer-requests',
  PRAYER_REQUEST_DETAIL: (id: string) => `/api/prayer-requests/${id}`,
  PRAYER_REQUEST_CREATE: '/api/prayer-requests',
  PRAYER_REQUEST_PRAY: (id: string) => `/api/prayer-requests/${id}/pray`,
  MY_PRAYER_REQUESTS: '/api/prayer-requests/my-requests',

  // Articles
  ARTICLES_PUBLIC: '/api/public/articles',
  ARTICLE_DETAIL: (id: string) => `/api/public/articles/${id}`,

  // Counseling
  COUNSELING_SLOTS: '/api/public/counseling/slots',
  COUNSELING_BOOK: '/api/public/counseling/appointments',
  MY_COUNSELING: '/api/public/counseling/my-appointments',

  // Profile
  MY_PROFILE: '/api/members/me',
  UPDATE_PROFILE: '/api/members/me',

  // Notifications
  REGISTER_DEVICE: '/api/notifications/register-device',
  NOTIFICATION_PREFERENCES: '/api/notifications/preferences',
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
  EVENTS_UPCOMING: ['events', 'upcoming'],
  EVENTS_PAST: ['events', 'past'],
  EVENT_DETAIL: ['event', 'detail'],
  MY_RSVPS: (memberId: string) => ['rsvps', memberId],

  // Groups
  GROUPS: ['groups'],
  MY_GROUPS: ['groups', 'my'],
  GROUP_DETAIL: ['group', 'detail'],
  GROUP_MEMBERS: ['group', 'members'],

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

// Cache times
export const CACHE_TIMES = {
  BIBLE: 1000 * 60 * 60 * 24 * 7, // 1 week (rarely changes)
  GIVING: 1000 * 60 * 5, // 5 minutes
  EVENTS: 1000 * 60 * 5, // 5 minutes
  GROUPS: 1000 * 60 * 5, // 5 minutes
  PRAYER: 1000 * 60 * 3, // 3 minutes
  PROFILE: 1000 * 60 * 30, // 30 minutes
};
