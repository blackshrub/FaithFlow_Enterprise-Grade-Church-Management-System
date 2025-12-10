/**
 * Language Settings Screen
 *
 * Allows users to change the app language.
 */

import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, Check, Globe } from 'lucide-react-native';
import { useRequireAuth } from '@/hooks/useRequireAuth';

const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
];

export default function LanguageSettingsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // SEC-M7: Route protection
  useRequireAuth();

  const currentLanguage = useMemo(() => i18n.language, [i18n.language]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleSelectLanguage = useCallback((langCode: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    i18n.changeLanguage(langCode);
  }, [i18n]);

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
          {t('settings.language.title', 'Language')}
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        {/* Language Options */}
        <View className="mt-4 mx-4 rounded-xl overflow-hidden bg-white divide-y divide-gray-100">
          {LANGUAGES.map((lang) => (
            <Pressable
              key={lang.code}
              onPress={() => handleSelectLanguage(lang.code)}
              className="flex-row items-center px-4 py-4 active:bg-gray-50"
              accessible
              accessibilityRole="button"
              accessibilityLabel={`${lang.nativeName} (${lang.name})${currentLanguage === lang.code ? ', selected' : ''}`}
            >
              <View className="w-10 h-10 rounded-full bg-green-50 items-center justify-center mr-3">
                <Globe size={20} color="#22C55E" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-medium text-gray-900">{lang.nativeName}</Text>
                <Text className="text-sm text-gray-500">{lang.name}</Text>
              </View>
              {currentLanguage === lang.code && (
                <Check size={20} color="#3B82F6" />
              )}
            </Pressable>
          ))}
        </View>

        {/* Info */}
        <Text className="text-sm text-gray-500 px-4 mt-4">
          {t('settings.language.info', 'Changing the language will update all text in the app.')}
        </Text>
      </ScrollView>
    </View>
  );
}
