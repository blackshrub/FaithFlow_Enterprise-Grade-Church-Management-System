/**
 * Notification Center Screen
 *
 * In-app notification history with pull-to-refresh,
 * mark as read, and deep linking to relevant content.
 *
 * Styling: NativeWind-first with Gluestack Button
 */

import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, RefreshControl, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import Animated from 'react-native-reanimated';
import { withPremiumMotionV10 } from '@/hoc';
import { PMotionV10 } from '@/components/motion/premium-motion';
import {
  Bell,
  Calendar,
  Users,
  HandHeart,
  BookOpen,
  Megaphone,
  Gift,
  ChevronLeft,
  CheckCheck,
  Image as ImageIcon,
} from 'lucide-react-native';

import { Button, ButtonText } from '@/components/ui/button';
import {
  useNotificationHistory,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  type PushNotification,
} from '@/hooks/useNotifications';
import { showSuccessToast, showErrorToast } from '@/components/ui/Toast';

// Premium color palette
const Colors = {
  primary: '#3B82F6',
  secondary: '#6366F1',
  gradient: {
    start: '#1e3a5f',
    end: '#2d5a87',
  },
  white: '#FFFFFF',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  unread: '#EEF2FF',
  accent: {
    event: '#F59E0B',
    group: '#10B981',
    prayer: '#EC4899',
    devotion: '#8B5CF6',
    announcement: '#3B82F6',
    giving: '#14B8A6',
    general: '#6B7280',
  },
};

// Notification type icon mapping
const notificationTypeConfig: Record<
  string,
  { icon: any; color: string; label: string }
> = {
  event: { icon: Calendar, color: Colors.accent.event, label: 'Event' },
  group: { icon: Users, color: Colors.accent.group, label: 'Group' },
  prayer: { icon: HandHeart, color: Colors.accent.prayer, label: 'Prayer' },
  devotion: { icon: BookOpen, color: Colors.accent.devotion, label: 'Devotion' },
  announcement: { icon: Megaphone, color: Colors.accent.announcement, label: 'Announcement' },
  giving: { icon: Gift, color: Colors.accent.giving, label: 'Giving' },
  general: { icon: Bell, color: Colors.accent.general, label: 'General' },
};

function NotificationCenterScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Queries
  const {
    data: notifications,
    isLoading,
    refetch,
    isRefetching,
  } = useNotificationHistory(100);

  // Mutations
  const { mutate: markAsRead } = useMarkNotificationAsRead();
  const { mutate: markAllAsRead, isPending: isMarkingAll } = useMarkAllNotificationsAsRead();

  // Unread count
  const unreadCount = useMemo(() => {
    return notifications?.filter((n) => !n.is_read).length || 0;
  }, [notifications]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    router.back();
  }, []);

  // Handle refresh
  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
  }, [refetch]);

  // Handle mark all as read
  const handleMarkAllAsRead = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    markAllAsRead(undefined, {
      onSuccess: () => {
        showSuccessToast('Done', 'All notifications marked as read');
      },
      onError: () => {
        showErrorToast('Error', 'Unable to mark notifications as read');
      },
    });
  }, [markAllAsRead]);

  // Handle notification tap
  const handleNotificationTap = useCallback(
    (notification: PushNotification) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Mark as read if not already
      if (!notification.is_read) {
        markAsRead(notification.id);
      }

      // Navigate based on action_type
      if (notification.action_type && notification.action_type !== 'none') {
        const actionData = notification.action_data || {};

        switch (notification.action_type) {
          case 'article':
            if (actionData.article_id) {
              router.push(`/articles/${actionData.article_id}`);
            }
            break;
          case 'event':
            if (actionData.event_id) {
              router.push(`/events/${actionData.event_id}`);
            }
            break;
          case 'url':
            // External URL - could use Linking
            break;
          case 'screen':
            const screenMap: Record<string, Href> = {
              home: '/(tabs)' as Href,
              events: '/(tabs)/events' as Href,
              give: '/(tabs)/give' as Href,
              profile: '/(tabs)/profile' as Href,
              prayer: '/prayer' as Href,
              explore: '/(tabs)/explore' as Href,
            };
            const targetScreen = screenMap[actionData.screen || ''];
            if (targetScreen) {
              router.push(targetScreen);
            }
            break;
        }
      }
    },
    [markAsRead]
  );

  // Format date
  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);

  // Render notification item
  const renderNotificationItem = useCallback(
    ({ item, index }: { item: PushNotification; index: number }) => {
      const typeConfig = notificationTypeConfig[item.notification_type] || notificationTypeConfig.general;
      const Icon = typeConfig.icon;

      return (
        <Animated.View
          entering={PMotionV10.listItemStagger(index)}
        >
          <Pressable
            onPress={() => handleNotificationTap(item)}
            className={`flex-row p-4 border-b border-gray-100 ${
              !item.is_read ? 'bg-indigo-50/50' : 'bg-white'
            }`}
            accessible
            accessibilityRole="button"
            accessibilityLabel={`${item.title}. ${item.body}`}
          >
            {/* Icon */}
            <View
              className="w-11 h-11 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: typeConfig.color + '20' }}
            >
              <Icon size={22} color={typeConfig.color} />
            </View>

            {/* Content */}
            <View className="flex-1">
              <View className="flex-row items-start justify-between mb-1">
                <Text
                  className={`text-base flex-1 mr-2 ${
                    !item.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                  }`}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text className="text-xs text-gray-600">{formatDate(item.sent_at)}</Text>
              </View>
              <Text
                className={`text-sm ${!item.is_read ? 'text-gray-700' : 'text-gray-500'}`}
                numberOfLines={2}
              >
                {item.body}
              </Text>

              {/* Image indicator if notification has image */}
              {item.image_url && (
                <View className="flex-row items-center mt-2">
                  <ImageIcon size={14} color={Colors.gray[400]} />
                  <Text className="text-xs text-gray-600 ml-1">Image attached</Text>
                </View>
              )}

              {/* Type badge */}
              <View className="flex-row items-center mt-2">
                <View
                  className="px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: typeConfig.color + '15' }}
                >
                  <Text className="text-xs font-medium" style={{ color: typeConfig.color }}>
                    {typeConfig.label}
                  </Text>
                </View>
                {!item.is_read && (
                  <View className="w-2 h-2 rounded-full bg-blue-500 ml-2" />
                )}
              </View>
            </View>
          </Pressable>
        </Animated.View>
      );
    },
    [formatDate, handleNotificationTap]
  );

  // Render empty state
  const renderEmpty = () => (
    <Animated.View
      entering={PMotionV10.sharedAxisYEnter}
      className="items-center py-20 px-10"
    >
      <View className="w-24 h-24 rounded-full bg-gray-100 items-center justify-center mb-6">
        <Bell size={48} color={Colors.gray[400]} />
      </View>
      <Text className="text-xl font-bold text-gray-800 mb-2">
        {t('notifications.empty.title', 'No Notifications Yet')}
      </Text>
      <Text className="text-base text-gray-500 text-center leading-6">
        {t(
          'notifications.empty.description',
          "When you receive notifications, they'll appear here"
        )}
      </Text>
    </Animated.View>
  );

  // Render loading skeleton
  const renderLoading = () => (
    <View className="p-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} className="flex-row p-4 border-b border-gray-100">
          <View className="w-11 h-11 rounded-full bg-gray-200 mr-3" />
          <View className="flex-1">
            <View className="w-3/4 h-4 rounded bg-gray-200 mb-2" />
            <View className="w-full h-3 rounded bg-gray-200 mb-1" />
            <View className="w-2/3 h-3 rounded bg-gray-200" />
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View
        className="bg-white border-b border-gray-200"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row items-center justify-between px-4 py-3">
          {/* Back button */}
          <Pressable
            onPress={handleBack}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
            accessible
            accessibilityRole="button"
            accessibilityLabel={t('common.back', 'Go back')}
          >
            <ChevronLeft size={24} color={Colors.gray[700]} />
          </Pressable>

          {/* Title */}
          <View className="flex-1 items-center">
            <Text className="text-lg font-bold text-gray-900">
              {t('notifications.title', 'Notifications')}
            </Text>
            {unreadCount > 0 && (
              <Text className="text-xs text-gray-500">
                {unreadCount} {t('notifications.unread', 'unread')}
              </Text>
            )}
          </View>

          {/* Mark all as read button */}
          {unreadCount > 0 ? (
            <Pressable
              onPress={handleMarkAllAsRead}
              disabled={isMarkingAll}
              className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center"
              accessible
              accessibilityRole="button"
              accessibilityLabel={t('notifications.markAllAsRead', 'Mark all as read')}
            >
              <CheckCheck size={20} color={Colors.primary} />
            </Pressable>
          ) : (
            <View className="w-10" />
          )}
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        renderLoading()
      ) : !notifications || notifications.length === 0 ? (
        renderEmpty()
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotificationItem}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        />
      )}
    </View>
  );
}

export default withPremiumMotionV10(NotificationCenterScreen);
