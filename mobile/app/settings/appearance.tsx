/**
 * Appearance Settings Screen
 *
 * Allows users to configure app appearance (theme, etc.).
 * Theme preference is persisted using the theme store.
 */

import React, { useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, Check, Sun, Moon, Smartphone } from 'lucide-react-native';

import { useThemeStore, type ThemeMode } from '@/stores/theme';
import { useRequireAuth } from '@/hooks/useRequireAuth';

const THEME_OPTIONS: { value: ThemeMode; icon: typeof Sun; label: string; description: string }[] = [
  { value: 'light', icon: Sun, label: 'Light', description: 'Always use light theme' },
  { value: 'dark', icon: Moon, label: 'Dark', description: 'Always use dark theme' },
  { value: 'system', icon: Smartphone, label: 'System', description: 'Follow system settings' },
];

export default function AppearanceSettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // SEC-M7: Route protection
  useRequireAuth();

  // Theme state from global store (persisted)
  const { themeMode: selectedTheme, setThemeMode } = useThemeStore();

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleSelectTheme = useCallback((theme: ThemeMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setThemeMode(theme);
  }, [setThemeMode]);

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
          {t('settings.appearance.title', 'Appearance')}
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        {/* Theme Options */}
        <Text className="text-sm font-medium text-gray-500 px-4 mt-6 mb-2 uppercase">
          {t('settings.appearance.theme', 'Theme')}
        </Text>

        <View className="mx-4 rounded-xl overflow-hidden bg-white divide-y divide-gray-100">
          {THEME_OPTIONS.map((option) => {
            const IconComponent = option.icon;
            const isSelected = selectedTheme === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => handleSelectTheme(option.value)}
                className="flex-row items-center px-4 py-4 active:bg-gray-50"
                accessible
                accessibilityRole="button"
                accessibilityLabel={`${t(`settings.appearance.${option.value}`, option.label)} theme${isSelected ? ', selected' : ''}`}
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: option.value === 'dark' ? '#374151' : '#FEF3C7' }}
                >
                  <IconComponent
                    size={20}
                    color={option.value === 'dark' ? '#FBBF24' : '#F59E0B'}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-medium text-gray-900">
                    {t(`settings.appearance.${option.value}`, option.label)}
                  </Text>
                  <Text className="text-sm text-gray-500">
                    {t(`settings.appearance.${option.value}Desc`, option.description)}
                  </Text>
                </View>
                {isSelected && <Check size={20} color="#3B82F6" />}
              </Pressable>
            );
          })}
        </View>

        {/* Info */}
        <Text className="text-sm text-gray-500 px-4 mt-4">
          {t('settings.appearance.info', 'Choose how FaithFlow looks on your device.')}
        </Text>
      </ScrollView>
    </View>
  );
}
