/**
 * React Query Hooks for Notifications
 *
 * Provides hooks for fetching notification history and managing preferences.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as notificationsApi from '@/services/api/notifications';
import type { PushNotification, NotificationPreferences, NotificationPreferencesUpdate } from '@/services/api/notifications';

// Query keys
export const notificationKeys = {
  all: ['notifications'] as const,
  history: (limit?: number, offset?: number) => [...notificationKeys.all, 'history', { limit, offset }] as const,
  preferences: () => [...notificationKeys.all, 'preferences'] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
};

/**
 * Hook to fetch notification history
 */
export function useNotificationHistory(limit: number = 50, offset: number = 0) {
  return useQuery({
    queryKey: notificationKeys.history(limit, offset),
    queryFn: () => notificationsApi.getNotificationHistory(limit, offset),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to get unread notification count
 */
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: notificationsApi.getUnreadCount,
    staleTime: 30 * 1000,
    // Poll every 60 seconds for unread count
    refetchInterval: 60 * 1000,
  });
}

/**
 * Hook to mark notification as read
 */
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => notificationsApi.markNotificationAsRead(notificationId),
    onSuccess: () => {
      // Invalidate notification queries to refetch
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Hook to mark all notifications as read
 */
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationsApi.markAllNotificationsAsRead,
    onSuccess: () => {
      // Invalidate notification queries to refetch
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Hook to fetch notification preferences
 */
export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: notificationsApi.getNotificationPreferences,
  });
}

/**
 * Hook to update notification preferences
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (prefs: NotificationPreferencesUpdate) => notificationsApi.updateNotificationPreferences(prefs),
    onSuccess: (data) => {
      // Update the preferences in cache
      queryClient.setQueryData(notificationKeys.preferences(), data);
    },
  });
}

export type { PushNotification, NotificationPreferences, NotificationPreferencesUpdate };
