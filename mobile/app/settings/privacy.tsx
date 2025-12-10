/**
 * Privacy & Security Settings Screen
 *
 * Allows users to manage privacy and security settings including biometric auth.
 * Redirects main security features to /settings/security.tsx
 */

import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter, Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ChevronLeft,
  ChevronRight,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Fingerprint,
} from 'lucide-react-native';
import { useRequireAuth } from '@/hooks/useRequireAuth';

export default function PrivacySettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // SEC-M7: Route protection
  useRequireAuth();

  // Privacy preferences state
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [anonymousPrayer, setAnonymousPrayer] = useState(false);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleNavigate = useCallback((route: Href) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route);
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
    onToggle: () => void
  ) => (
    <View className="flex-row items-center px-4 py-4 bg-white">
      <View className="w-10 h-10 rounded-full bg-purple-50 items-center justify-center mr-3">
        {icon}
      </View>
      <View className="flex-1 mr-3">
        <Text className="text-base font-medium text-gray-900">{label}</Text>
        <Text className="text-sm text-gray-500 mt-0.5">{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#E5E7EB', true: '#8B5CF6' }}
        thumbColor="#FFFFFF"
      />
    </View>
  );

  const renderLinkItem = (
    icon: React.ReactNode,
    label: string,
    description: string,
    onPress: () => void
  ) => (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-4 py-4 bg-white active:bg-gray-50"
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${description}`}
    >
      <View className="w-10 h-10 rounded-full bg-purple-50 items-center justify-center mr-3">
        {icon}
      </View>
      <View className="flex-1 mr-3">
        <Text className="text-base font-medium text-gray-900">{label}</Text>
        <Text className="text-sm text-gray-500 mt-0.5">{description}</Text>
      </View>
      <ChevronRight size={20} color="#D1D5DB" />
    </Pressable>
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
          {t('settings.privacy.title', 'Privacy & Security')}
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        {/* Security Section */}
        <Text className="text-sm font-medium text-gray-500 px-4 mt-6 mb-2 uppercase">
          {t('settings.privacy.security', 'Security')}
        </Text>

        <View className="mx-4 rounded-xl overflow-hidden bg-white divide-y divide-gray-100">
          {renderLinkItem(
            <Fingerprint size={20} color="#8B5CF6" />,
            t('settings.privacy.biometric', 'Biometric Authentication'),
            t('settings.privacy.biometricDesc', 'Use Face ID or fingerprint to unlock'),
            () => handleNavigate('/settings/security' as Href)
          )}
          {renderLinkItem(
            <Lock size={20} color="#8B5CF6" />,
            t('settings.privacy.appLock', 'App Lock'),
            t('settings.privacy.appLockDesc', 'Require authentication on app open'),
            () => handleNavigate('/settings/security' as Href)
          )}
        </View>

        {/* Privacy Section */}
        <Text className="text-sm font-medium text-gray-500 px-4 mt-6 mb-2 uppercase">
          {t('settings.privacy.privacy', 'Privacy')}
        </Text>

        <View className="mx-4 rounded-xl overflow-hidden bg-white divide-y divide-gray-100">
          {renderToggleItem(
            <Eye size={20} color="#8B5CF6" />,
            t('settings.privacy.onlineStatus', 'Show Online Status'),
            t('settings.privacy.onlineStatusDesc', 'Let others see when you are online'),
            showOnlineStatus,
            () => toggleWithHaptics(setShowOnlineStatus, showOnlineStatus)
          )}
          {renderToggleItem(
            <EyeOff size={20} color="#8B5CF6" />,
            t('settings.privacy.anonymousPrayer', 'Default Anonymous Prayer'),
            t('settings.privacy.anonymousPrayerDesc', 'Make prayer requests anonymous by default'),
            anonymousPrayer,
            () => toggleWithHaptics(setAnonymousPrayer, anonymousPrayer)
          )}
        </View>

        {/* Info */}
        <Text className="text-sm text-gray-500 px-4 mt-4">
          {t('settings.privacy.info', 'Your privacy matters. We never share your personal data with third parties.')}
        </Text>
      </ScrollView>
    </View>
  );
}
