/**
 * Bible Font Selector Component
 *
 * Displays a scrollable list of Bible reading fonts with live previews.
 * Each font name is rendered in its actual typeface so users can see
 * exactly how it will look in their Bible reader.
 *
 * Features:
 * - Live font previews
 * - Categorized by serif/sans-serif
 * - Instant feedback with haptics
 * - Persists selection to AsyncStorage
 *
 * Usage:
 * ```tsx
 * <BibleFontSelector />
 * ```
 */

import React from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';

import { useBibleFontStore } from '@/stores/bibleFontStore';
import { getAvailableBibleFonts, type BibleFontKey } from '@/utils/fonts';
import { colors } from '@/constants/theme';

export function BibleFontSelector() {
  const { t } = useTranslation();
  const { fontFamily, setFontFamily } = useBibleFontStore();
  const fonts = getAvailableBibleFonts();

  // Group fonts by category
  const serifFonts = fonts.filter(f => f.category === 'serif');
  const sansSerifFonts = fonts.filter(f => f.category === 'sans-serif');

  const handleFontSelect = (font: BibleFontKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFontFamily(font);
  };

  const renderFontItem = (fontKey: BibleFontKey, label: string) => {
    const isSelected = fontFamily === fontKey;

    return (
      <Pressable
        key={fontKey}
        onPress={() => handleFontSelect(fontKey)}
        className="active:opacity-70"
      >
        <View
          className="px-4 py-4 rounded-lg mb-2"
          style={{
            backgroundColor: isSelected ? colors.primary[50] : colors.gray[50],
            borderWidth: isSelected ? 2 : 1,
            borderColor: isSelected ? colors.primary[500] : colors.gray[200],
          }}
        >
          <HStack className="items-center justify-between">
            {/* Font preview - rendered in actual font */}
            <View className="flex-1 mr-3">
              <Text
                style={{
                  fontFamily: fontKey,
                  fontSize: 18,
                  lineHeight: 28,
                  color: isSelected ? colors.primary[700] : colors.gray[900],
                  fontWeight: isSelected ? '600' : '400',
                }}
                numberOfLines={1}
              >
                {label}
              </Text>
              <Text
                style={{
                  fontFamily: fontKey,
                  fontSize: 14,
                  lineHeight: 20,
                  color: colors.gray[600],
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                The quick brown fox jumps
              </Text>
            </View>

            {/* Selection indicator */}
            {isSelected && (
              <View
                className="rounded-full p-1"
                style={{ backgroundColor: colors.primary[500] }}
              >
                <Icon as={Check} size="sm" className="text-white" />
              </View>
            )}
          </HStack>
        </View>
      </Pressable>
    );
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 16 }}
    >
      <VStack space="lg">
        {/* Serif Fonts Section */}
        <VStack space="sm">
          <Text className="text-gray-700 font-semibold text-sm px-1 mb-1">
            Serif Fonts
          </Text>
          <Text className="text-gray-500 text-xs px-1 mb-2">
            Traditional, readable for long-form text
          </Text>
          {serifFonts.map(font => renderFontItem(font.key, font.label))}
        </VStack>

        {/* Sans-Serif Fonts Section */}
        <VStack space="sm">
          <Text className="text-gray-700 font-semibold text-sm px-1 mb-1">
            Sans-Serif Fonts
          </Text>
          <Text className="text-gray-500 text-xs px-1 mb-2">
            Modern, clean appearance
          </Text>
          {sansSerifFonts.map(font => renderFontItem(font.key, font.label))}
        </VStack>

        {/* Info note */}
        <View
          className="p-4 rounded-lg"
          style={{ backgroundColor: colors.blue[50] }}
        >
          <Text className="text-blue-700 text-xs">
            💡 Font changes apply only to Bible reading screens. The rest of the app
            uses default fonts.
          </Text>
        </View>
      </VStack>
    </ScrollView>
  );
}
