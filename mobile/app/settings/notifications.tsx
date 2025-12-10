/**
 * Notifications Settings Screen
 *
 * Allows users to configure their notification preferences.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, Bell, MessageSquare, Calendar, Heart } from 'lucide-react-native';
import { useRequireAuth } from '@/hooks/useRequireAuth';

export default function NotificationsSettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // SEC-M7: Route protection
  useRequireAuth();

  // Notification preferences state
  const [pushEnabled, setPushEnabled] = useState(true);
  const [eventReminders, setEventReminders] = useState(true);
  const [prayerUpdates, setPrayerUpdates] = useState(true);
  const [communityMessages, setCommunityMessages] = useState(true);
  const [announcementAlerts, setAnnouncementAlerts] = useState(true);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const toggleWithHaptics = useCallback((setter: (val: boolean) => void, currentVal: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setter(!currentVal);
  }, []);

  const renderToggleItem = (
    icon: React.ReactNode,
    label: string,
    description: string,
    value: boolean,
    onToggle: () => void,
    disabled?: boolean
  ) => (
    <View className="flex-row items-center px-4 py-4 bg-white">
      <View className="w-10 h-10 rounded-full bg-primary-50 items-center justify-center mr-3">
        {icon}
      </View>
      <View className="flex-1 mr-3">
        <Text className="text-base font-medium text-gray-900">{label}</Text>
        <Text className="text-sm text-gray-500 mt-0.5">{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
        thumbColor="#FFFFFF"
        disabled={disabled}
      />
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-4 h-14 bg-white border-b border-gray-100">
        <Pressable
          onPress={handleBack}
          className="w-10 h-10 items-center justify-center -ml-2"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessible
          accessibilityRole="button"
          accessibilityLabel={t('common.back', 'Back')}
        >
          <ChevronLeft size={24} color="#111827" />
        </Pressable>
        <Text className="flex-1 text-lg font-semibold text-gray-900 ml-2">
          {t('settings.notifications.title', 'Notifications')}
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        {/* Push Notifications Master Toggle */}
        <View className="mt-4 mx-4 rounded-xl overflow-hidden bg-white">
          {renderToggleItem(
            <Bell size={20} color="#3B82F6" />,
            t('settings.notifications.push', 'Push Notifications'),
            t('settings.notifications.pushDesc', 'Receive notifications on your device'),
            pushEnabled,
            () => toggleWithHaptics(setPushEnabled, pushEnabled)
          )}
        </View>

        {/* Category Settings */}
        <Text className="text-sm font-medium text-gray-500 px-4 mt-6 mb-2 uppercase">
          {t('settings.notifications.categories', 'Notification Categories')}
        </Text>

        <View className="mx-4 rounded-xl overflow-hidden bg-white divide-y divide-gray-100">
          {renderToggleItem(
            <Calendar size={20} color="#10B981" />,
            t('settings.notifications.events', 'Event Reminders'),
            t('settings.notifications.eventsDesc', 'Reminders for upcoming events'),
            eventReminders,
            () => toggleWithHaptics(setEventReminders, eventReminders),
            !pushEnabled
          )}
          {renderToggleItem(
            <Heart size={20} color="#EF4444" />,
            t('settings.notifications.prayer', 'Prayer Updates'),
            t('settings.notifications.prayerDesc', 'Updates on your prayer requests'),
            prayerUpdates,
            () => toggleWithHaptics(setPrayerUpdates, prayerUpdates),
            !pushEnabled
          )}
          {renderToggleItem(
            <MessageSquare size={20} color="#8B5CF6" />,
            t('settings.notifications.community', 'Community Messages'),
            t('settings.notifications.communityDesc', 'Messages from your groups'),
            communityMessages,
            () => toggleWithHaptics(setCommunityMessages, communityMessages),
            !pushEnabled
          )}
        </View>

        {/* Info */}
        <Text className="text-sm text-gray-500 px-4 mt-4">
          {t('settings.notifications.info', 'You can manage notification permissions in your device settings.')}
        </Text>
      </ScrollView>
    </View>
  );
}
