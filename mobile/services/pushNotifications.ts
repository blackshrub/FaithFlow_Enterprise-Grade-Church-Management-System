/**
 * Push Notification Service
 *
 * Handles FCM (Firebase Cloud Messaging) push notifications.
 * Features:
 * - Device token registration
 * - Notification permission handling
 * - Foreground/background notification handling
 * - Deep linking from notifications
 * - Token refresh handling
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { api } from '@/services/api';
import { isViewingChat } from '@/stores/navigation';

// =============================================================================
// TYPES
// =============================================================================

export interface PushNotificationPayload {
  type:
    | 'new_message'
    | 'mention'
    | 'reaction'
    | 'community_invite'
    | 'event_reminder'
    | 'prayer_request'
    | 'announcement'
    | 'incoming_call'
    | 'missed_call';
  communityId?: string;
  subgroupId?: string;
  messageId?: string;
  eventId?: string;
  callId?: string;
  callType?: 'voice' | 'video';
  callerId?: string;
  callerName?: string;
  callerAvatar?: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface NotificationChannels {
  messages: string;
  communities: string;
  events: string;
  announcements: string;
  calls: string;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as unknown as PushNotificationPayload | undefined;

    // Check if user is currently viewing the chat this message belongs to
    // If so, don't show the notification (WhatsApp behavior)
    let shouldShowNotification = true;

    if (data?.type === 'new_message' || data?.type === 'mention' || data?.type === 'reaction') {
      // Suppress notification if user is viewing the same chat
      shouldShowNotification = !isViewingChat(data.communityId, data.subgroupId);
    }

    // Incoming calls should always show with high priority
    if (data?.type === 'incoming_call') {
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      };
    }

    return {
      shouldShowAlert: shouldShowNotification,
      shouldPlaySound: shouldShowNotification,
      shouldSetBadge: true,
      shouldShowBanner: shouldShowNotification,
      shouldShowList: shouldShowNotification,
    };
  },
});

// =============================================================================
// CHANNEL CONFIGURATION (Android)
// =============================================================================

export const NOTIFICATION_CHANNELS: NotificationChannels = {
  messages: 'messages',
  communities: 'communities',
  events: 'events',
  announcements: 'announcements',
  calls: 'calls',
};

async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  // Messages channel (high priority for chat)
  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.messages, {
    name: 'Messages',
    description: 'New messages from communities',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#128C7E',
    sound: 'notification.wav',
    enableVibrate: true,
    enableLights: true,
  });

  // Communities channel
  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.communities, {
    name: 'Communities',
    description: 'Community updates and invites',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'notification.wav',
  });

  // Events channel
  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.events, {
    name: 'Events',
    description: 'Event reminders and updates',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'notification.wav',
  });

  // Announcements channel
  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.announcements, {
    name: 'Announcements',
    description: 'Church announcements',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'notification.wav',
  });

  // Calls channel (highest priority for incoming calls)
  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.calls, {
    name: 'Calls',
    description: 'Voice and video calls',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 200, 500, 200, 500],
    lightColor: '#25D366',
    sound: 'ringtone.wav',
    enableVibrate: true,
    enableLights: true,
    bypassDnd: true, // Bypass Do Not Disturb for calls
  });
}

// =============================================================================
// PERMISSION HANDLING
// =============================================================================

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return false;
  }

  // Check current permission status
  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  if (existingStatus === 'granted') {
    return true;
  }

  // Request permission
  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
      allowDisplayInCarPlay: true,
      allowCriticalAlerts: false,
      provideAppNotificationSettings: true,
    },
  });

  return status === 'granted';
}

export async function getNotificationPermissionStatus(): Promise<string> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

// =============================================================================
// TOKEN MANAGEMENT
// =============================================================================

export async function getExpoPushToken(): Promise<string | null> {
  try {
    // Setup channels first (Android)
    await setupNotificationChannels();

    // Get the Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });

    return tokenData.data;
  } catch (error) {
    console.error('Failed to get push token:', error);
    return null;
  }
}

export async function registerPushToken(
  memberId: string,
  churchId: string
): Promise<boolean> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.warn('Notification permission not granted');
      return false;
    }

    const pushToken = await getExpoPushToken();
    if (!pushToken) {
      console.warn('Failed to get push token');
      return false;
    }

    // Register token with backend
    await api.post('/api/notifications/register-device', {
      member_id: memberId,
      church_id: churchId,
      push_token: pushToken,
      device_type: Platform.OS,
      device_name: Device.deviceName,
    });

    console.log('Push token registered successfully');
    return true;
  } catch (error) {
    console.error('Failed to register push token:', error);
    return false;
  }
}

export async function unregisterPushToken(): Promise<boolean> {
  try {
    const pushToken = await getExpoPushToken();
    if (!pushToken) return true;

    await api.post('/api/notifications/unregister-device', {
      push_token: pushToken,
    });

    return true;
  } catch (error) {
    console.error('Failed to unregister push token:', error);
    return false;
  }
}

// =============================================================================
// NOTIFICATION HANDLING
// =============================================================================

function handleNotificationNavigation(data: PushNotificationPayload): void {
  switch (data.type) {
    case 'new_message':
    case 'mention':
    case 'reaction':
      if (data.communityId) {
        if (data.subgroupId) {
          router.push(`/community/${data.communityId}/subgroups/${data.subgroupId}` as any);
        } else {
          router.push(`/community/${data.communityId}/chat` as any);
        }
      }
      break;

    case 'community_invite':
      if (data.communityId) {
        router.push(`/community/${data.communityId}` as any);
      }
      break;

    case 'event_reminder':
      if (data.eventId) {
        router.push(`/events/${data.eventId}` as any);
      }
      break;

    case 'announcement':
      router.push('/(tabs)/home' as any);
      break;

    case 'prayer_request':
      router.push('/(tabs)/home' as any);
      break;

    case 'incoming_call':
      // Incoming call handled by IncomingCallOverlay via call store
      // Navigation to call screen happens after accepting
      if (data.callId) {
        router.push(`/call/${data.callId}` as any);
      }
      break;

    case 'missed_call':
      // Navigate to call history
      router.push('/call-history' as any);
      break;

    default:
      router.push('/(tabs)/home' as any);
  }
}

// =============================================================================
// LISTENERS
// =============================================================================

let notificationReceivedListener: Notifications.Subscription | null = null;
let notificationResponseListener: Notifications.Subscription | null = null;

export function setupNotificationListeners(): () => void {
  // Handle notifications received while app is in foreground
  notificationReceivedListener = Notifications.addNotificationReceivedListener(
    (notification) => {
      const data = notification.request.content.data as unknown as PushNotificationPayload | undefined;
      console.log('Notification received in foreground:', data);

      // You can emit events here to update UI (e.g., increment unread count)
    }
  );

  // Handle user tapping on notification
  notificationResponseListener = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content
        .data as unknown as PushNotificationPayload;
      console.log('Notification tapped:', data);

      // Navigate to appropriate screen
      handleNotificationNavigation(data);
    }
  );

  // Return cleanup function
  return () => {
    if (notificationReceivedListener) {
      notificationReceivedListener.remove();
    }
    if (notificationResponseListener) {
      notificationResponseListener.remove();
    }
  };
}

// =============================================================================
// LOCAL NOTIFICATIONS
// =============================================================================

export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
  trigger?: Notifications.NotificationTriggerInput
): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'notification.wav',
    },
    trigger: trigger || null, // null = immediate
  });

  return id;
}

export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// =============================================================================
// BADGE MANAGEMENT
// =============================================================================

export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

// =============================================================================
// NOTIFICATION PREFERENCES
// =============================================================================

export interface NotificationPreferences {
  messages: boolean;
  mentions: boolean;
  reactions: boolean;
  communityUpdates: boolean;
  eventReminders: boolean;
  announcements: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  messages: true,
  mentions: true,
  reactions: true,
  communityUpdates: true,
  eventReminders: true,
  announcements: true,
  soundEnabled: true,
  vibrationEnabled: true,
};

export async function updateNotificationPreferences(
  memberId: string,
  preferences: Partial<NotificationPreferences>
): Promise<boolean> {
  try {
    await api.patch(`/api/members/${memberId}/notification-preferences`, preferences);
    return true;
  } catch (error) {
    console.error('Failed to update notification preferences:', error);
    return false;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  requestNotificationPermissions,
  getNotificationPermissionStatus,
  getExpoPushToken,
  registerPushToken,
  unregisterPushToken,
  setupNotificationListeners,
  scheduleLocalNotification,
  cancelNotification,
  cancelAllNotifications,
  setBadgeCount,
  getBadgeCount,
  clearBadge,
  updateNotificationPreferences,
  NOTIFICATION_CHANNELS,
};
