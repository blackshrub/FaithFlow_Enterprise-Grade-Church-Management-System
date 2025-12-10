/**
 * Navigation Utilities
 *
 * Type-safe navigation helpers for expo-router.
 * These helpers allow dynamic route strings without `as any` casts.
 */

import { router, Href } from 'expo-router';

/**
 * Navigate to a route with proper typing
 * Use this instead of `router.push(path as any)`
 */
export function navigateTo(path: string): void {
  router.push(path as Href);
}

/**
 * Replace current route with proper typing
 * Use this instead of `router.replace(path as any)`
 */
export function replaceTo(path: string): void {
  router.replace(path as Href);
}

/**
 * Prefetch a route for faster navigation
 * Use this instead of `router.prefetch(path as any)`
 */
export function prefetchRoute(path: string): void {
  router.prefetch(path as Href);
}

/**
 * Go back to the previous screen
 */
export function goBack(): void {
  router.back();
}

/**
 * Navigate to a route with query parameters
 * Use this for routes like `/community/123/search?query=hello`
 */
export function navigateToWithParams(
  path: string,
  params?: Record<string, string | number | boolean>
): void {
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.set(key, String(value));
    });
    router.push(`${path}?${searchParams.toString()}` as Href);
  } else {
    router.push(path as Href);
  }
}

/**
 * Type-safe route builder for common patterns
 */
export const routes = {
  // Events
  event: (id: string) => `/events/${id}` as const,

  // Community
  community: (id: string) => `/community/${id}` as const,
  communityChat: (id: string) => `/community/${id}/chat` as const,
  communityInfo: (id: string) => `/community/${id}/info` as const,
  communitySettings: (id: string) => `/community/${id}/settings` as const,
  communityAnnouncements: (id: string) => `/community/${id}/announcements` as const,
  communitySubgroups: (id: string) => `/community/${id}/subgroups` as const,
  communitySubgroup: (communityId: string, subgroupId: string) =>
    `/community/${communityId}/subgroups/${subgroupId}` as const,
  communityMembers: (id: string) => `/community/${id}/members` as const,
  communityLeaders: (id: string) => `/community/${id}/leaders` as const,
  communityRequests: (id: string) => `/community/${id}/requests` as const,
  communityMedia: (id: string) => `/community/${id}/media` as const,
  communitySearch: (id: string) => `/community/${id}/search` as const,
  communityPreview: (id: string) => `/community/${id}/preview` as const,
  communityAnnouncement: (communityId: string, announcementId: string) =>
    `/community/${communityId}/announcement/${announcementId}` as const,
  communityDiscover: () => '/community/discover' as const,

  // Explore
  devotion: (id: string) => `/explore/devotion/${id}` as const,
  quiz: (id: string) => `/explore/quiz/${id}` as const,
  figure: (id: string) => `/explore/figure/${id}` as const,
  studies: (id: string) => `/explore/studies/${id}` as const,

  // Call
  call: (id: string) => `/call/${id}` as const,
  callHistory: () => '/call-history' as const,

  // Prayer
  prayer: () => '/prayer' as const,

  // Notifications
  notifications: () => '/notifications' as const,

  // Settings
  settingsPrivacy: () => '/settings/privacy' as const,
  settingsNotifications: () => '/settings/notifications' as const,
  settingsLanguage: () => '/settings/language' as const,
  settingsAppearance: () => '/settings/appearance' as const,

  // Auth
  login: () => '/(auth)/login' as const,

  // Tabs
  home: () => '/(tabs)/home' as const,

  // Profile
  profileEdit: () => '/profile/edit' as const,
} as const;
