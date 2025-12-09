/**
 * VerseCard - Daily Verse Display (Memoized)
 *
 * Extracted from Today screen for performance optimization.
 * Features:
 * - Dark gradient card with gold accent
 * - Scripture verse with reference
 * - Theme tag
 *
 * Styling: NativeWind-first with inline style for dynamic values
 */

import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Quote } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

// Premium monochrome palette
const Colors = {
  accent: {
    primary: '#C9A962',
    light: '#E8D5A8',
    dark: '#9A7B3D',
  },
};

interface VerseData {
  text: string;
  reference: string;
  theme: string;
}

interface VerseCardProps {
  verse: VerseData;
}

function VerseCardComponent({ verse }: VerseCardProps) {
  const { t } = useTranslation();

  return (
    <View className="mb-6">
      <View className="flex-row items-center gap-2 mb-3">
        <Quote size={16} color={Colors.accent.dark} />
        <Text
          className="text-[13px] font-semibold text-typography-500 uppercase"
          style={{ letterSpacing: 1 }}
        >
          {t('today.verseOfTheDay', 'Verse of the Day')}
        </Text>
      </View>

      {/* Shadow wrapper - separate from overflow:hidden to prevent shadow clipping */}
      <View
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
          elevation: 5,
          borderRadius: 20,
        }}
      >
        <View className="rounded-[20px] overflow-hidden">
          <LinearGradient
            colors={['#1a1a1a', '#252525']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 24, position: 'relative' }}
          >
            {/* Gold accent bar */}
            <View
              style={{
                position: 'absolute',
                left: 0,
                top: 24,
                bottom: 24,
                width: 3,
                backgroundColor: Colors.accent.primary,
                borderRadius: 2,
              }}
            />

            <Text
              className="text-lg font-medium text-white italic mb-4 pl-4"
              style={{ lineHeight: 28 }}
            >
              {verse.text}
            </Text>

            <View className="flex-row justify-between items-center pl-4">
              <Text
                className="text-sm font-semibold"
                style={{ color: Colors.accent.light }}
              >
                {verse.reference}
              </Text>
              <View
                className="px-2.5 py-1 rounded-xl"
                style={{ backgroundColor: 'rgba(201,169,98,0.2)' }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: Colors.accent.primary }}
                >
                  {verse.theme}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      </View>
    </View>
  );
}

export const VerseCard = memo(VerseCardComponent);
VerseCard.displayName = 'VerseCard';
