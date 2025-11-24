import Constants from "expo-constants";

// API Configuration
export const API_BASE_URL = __DEV__
  ? "http://localhost:8000" // Development
  : "https://flow.gkbj.org"; // Production

export const API_ENDPOINTS = {
  // Member Authentication
  AUTH_SEND_OTP: "/api/member-auth/send-otp",
  AUTH_VERIFY_OTP: "/api/member-auth/verify-otp",

  // Giving
  GIVING_FUNDS: "/api/giving/funds",
  GIVING_SUBMIT: "/api/giving/submit",
  GIVING_HISTORY: "/api/giving/my-history",

  // Bible (Public)
  BIBLE_VERSIONS: "/api/bible/versions",
  BIBLE_BOOKS: "/api/bible/books",
  BIBLE_CHAPTER: (version: string, book: string, chapter: number) =>
    `/api/bible/${version}/${book}/${chapter}`,

  // Events
  EVENTS_LIST: "/api/events/",
  EVENT_DETAILS: (id: string) => `/api/events/${id}`,
  EVENT_RSVP: (id: string) => `/api/events/${id}/rsvp`,
  EVENT_CANCEL_RSVP: (id: string, memberId: string) =>
    `/api/events/${id}/rsvp/${memberId}`,

  // Groups (Public)
  GROUPS_LIST: "/api/public/groups/",
  GROUP_DETAILS: (id: string) => `/api/public/groups/${id}`,
  GROUP_JOIN_REQUEST: (id: string) => `/api/public/groups/${id}/join-request`,

  // Prayer Requests
  PRAYERS_LIST: "/api/prayers/",
  PRAYER_CREATE: "/api/prayers/create",
  PRAYER_UPDATE: (id: string) => `/api/prayers/${id}`,

  // Counseling (Public)
  COUNSELING_CREATE: "/api/public/counseling/",

  // Devotions & Articles (Public)
  DEVOTIONS_LIST: "/api/public/devotions/",
  DEVOTION_DETAILS: (slug: string) => `/api/public/devotions/${slug}`,
  ARTICLES_LIST: "/api/public/articles/",
  ARTICLE_DETAILS: (slug: string) => `/api/public/articles/${slug}`,

  // Notifications
  NOTIFICATIONS_REGISTER_DEVICE: "/api/notifications/register-device",
  NOTIFICATIONS_UNREGISTER_DEVICE: (tokenId: string) =>
    `/api/notifications/unregister-device/${tokenId}`,
  NOTIFICATIONS_PREFERENCES: "/api/notifications/preferences",
  NOTIFICATIONS_HISTORY: "/api/notifications/history",
  NOTIFICATION_MARK_READ: (notificationId: string) =>
    `/api/notifications/history/${notificationId}/read`,
};

// App Configuration
export const APP_NAME = "FaithFlow";
export const APP_VERSION = Constants.expoConfig?.version || "1.0.0";

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: "auth_token",
  AUTH_MEMBER: "auth_member",
  BIBLE_VERSION: "bible_version",
  BIBLE_FONT_SIZE: "bible_font_size",
  BIBLE_FONT_FAMILY: "bible_font_family",
  THEME: "theme",
  LANGUAGE: "language",
};

// Colors (matches Tailwind config)
export const COLORS = {
  primary: "#6366F1",
  secondary: "#EC4899",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  background: "#FFFFFF",
  backgroundDark: "#1F2937",
  text: "#111827",
  textDark: "#F9FAFB",
};

// Font Sizes
export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
};

// Spacing
export const SPACING = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
};
