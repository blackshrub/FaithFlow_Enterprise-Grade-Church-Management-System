/**
 * Notifications API Service
 *
 * Handles notification history, marking as read, and preferences.
 */

import api from './index';

export interface PushNotification {
  id: string;
  church_id: string;
  member_id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  notification_type: 'event' | 'group' | 'prayer' | 'devotion' | 'announcement' | 'giving' | 'general';
  sent_at: string;
  read_at?: string;
  is_read: boolean;
  // Campaign reference (if from broadcast)
  campaign_id?: string;
  image_url?: string;
  action_type?: 'none' | 'article' | 'event' | 'url' | 'screen';
  action_data?: Record<string, any>;
}

export interface NotificationPreferences {
  id: string;
  member_id: string;
  church_id: string;
  events_enabled: boolean;
  groups_enabled: boolean;
  prayers_enabled: boolean;
  devotions_enabled: boolean;
  announcements_enabled: boolean;
  giving_receipts_enabled: boolean;
  push_enabled: boolean;
  whatsapp_enabled: boolean;
  updated_at: string;
}

export interface NotificationPreferencesUpdate {
  events_enabled?: boolean;
  groups_enabled?: boolean;
  prayers_enabled?: boolean;
  devotions_enabled?: boolean;
  announcements_enabled?: boolean;
  giving_receipts_enabled?: boolean;
  push_enabled?: boolean;
  whatsapp_enabled?: boolean;
}

/**
 * Get notification history for the current member
 * Handles 204 No Content response (empty notifications)
 */
export async function getNotificationHistory(
  limit: number = 50,
  offset: number = 0
): Promise<PushNotification[]> {
  const response = await api.get<PushNotification[]>('/api/notifications/history', {
    params: { limit, offset },
  });
  // Handle 204 No Content response - return empty array
  if (response.status === 204 || !response.data) {
    return [];
  }
  return Array.isArray(response.data) ? response.data : [];
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  await api.patch(`/api/notifications/history/${notificationId}/read`);
}

/**
 * Mark all notifications as read
 *
 * DATA FIX: Using POST instead of PATCH for action endpoints (REST convention)
 */
export async function markAllNotificationsAsRead(): Promise<void> {
  await api.post('/api/notifications/history/mark-all-read');
}

/**
 * Get notification preferences
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const response = await api.get<NotificationPreferences>('/api/notifications/preferences');
  return response.data;
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  prefs: NotificationPreferencesUpdate
): Promise<NotificationPreferences> {
  const response = await api.patch<NotificationPreferences>('/api/notifications/preferences', prefs);
  return response.data;
}

/**
 * Get unread notification count
 * Handles 204 No Content response (no notifications)
 */
export async function getUnreadCount(): Promise<number> {
  const response = await api.get<{ count: number }>('/api/notifications/unread-count');
  // Handle 204 No Content or missing data
  if (response.status === 204 || !response.data) {
    return 0;
  }
  return response.data.count ?? 0;
}
