/**
 * Bible Font Selector Component
 *
 * Displays a scrollable list of Latin Bible reading fonts with live previews.
 * Each font name is rendered in its actual typeface so users can see
 * exactly how it will look in their Bible reader.
 *
 * IMPORTANT: This component is ONLY shown for Latin-script Bibles.
 * For Chinese Bibles, this component returns null (hidden completely).
 *
 * Features:
 * - Live font previews
 * - Categorized by serif/sans-serif
 * - Instant feedback with haptics
 * - Persists selection to AsyncStorage
 * - Auto-hides for Chinese Bible versions
 *
 * Usage:
 * ```tsx
 * <BibleFontSelector version="NIV" />  // Shows for Latin Bibles
 * <BibleFontSelector version="CHS" />  // Returns null for Chinese Bibles
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
import {
  getAvailableLatinFonts,
  isChineseBible,
  type LatinBibleFontKey
} from '@/utils/fonts';
import { colors } from '@/constants/theme';

interface BibleFontSelectorProps {
  /**
   * Current Bible version code (e.g., 'NIV', 'CHS', 'TB')
   * Used to determine if font selector should be shown
   */
  version: string;
}

export function BibleFontSelector({ version }: BibleFontSelectorProps) {
  const { latinFont, setLatinFont } = useBibleFontStore();
  const fonts = getAvailableLatinFonts();

  // Hide font selector completely for Chinese Bibles
  if (isChineseBible(version)) {
    return null;
  }

  const handleFontSelect = (font: LatinBibleFontKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLatinFont(font);
  };

  const renderFontItem = (fontKey: LatinBibleFontKey, label: string) => {
    const isSelected = latinFont === fontKey;

    return (
      <Pressable
        key={fontKey}
        onPress={() => handleFontSelect(fontKey)}
        className="active:opacity-70 mr-2"
      >
        <View
          className="px-4 py-3 rounded-lg"
          style={{
            backgroundColor: isSelected ? colors.primary[50] : colors.gray[50],
            borderWidth: isSelected ? 2 : 1,
            borderColor: isSelected ? colors.primary[500] : colors.gray[200],
            minWidth: 100,
          }}
        >
          <HStack className="items-center justify-center" space="xs">
            {/* Font name preview - rendered in actual font */}
            <Text
              style={{
                fontFamily: fontKey,
                fontSize: 16,
                color: isSelected ? colors.primary[700] : colors.gray[900],
                fontWeight: isSelected ? '600' : '400',
              }}
              numberOfLines={1}
            >
              {label}
            </Text>

            {/* Selection indicator */}
            {isSelected && (
              <Icon as={Check} size="xs" style={{ color: colors.primary[600] }} />
            )}
          </HStack>
        </View>
      </Pressable>
    );
  };

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 8, paddingRight: 16 }}
      >
        {fonts.map(font => renderFontItem(font.key, font.label))}
      </ScrollView>

      {/* Info note */}
      <View
        className="p-3 rounded-lg mt-3"
        style={{ backgroundColor: colors.primary[50] }}
      >
        <Text style={{ color: colors.primary[700] }} className="text-xs">
          💡 Font changes apply only to Latin Bible reading screens. Chinese Bibles automatically use system fonts.
        </Text>
      </View>
    </View>
  );
}
