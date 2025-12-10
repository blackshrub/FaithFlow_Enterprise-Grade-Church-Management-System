/**
 * GivingPrompt - Giving CTA Card (Memoized)
 *
 * Extracted from Today screen for performance optimization.
 * Features:
 * - Gold gradient background
 * - Heart icon with text
 * - Navigate to giving screen
 *
 * Styling: NativeWind-first with inline style for dynamic values
 */

import React, { memo, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Heart, ArrowRight } from 'lucide-react-native';

import type { GivingSummary } from '@/types/giving';

// Premium monochrome palette
const Colors = {
  accent: {
    dark: '#9A7B3D',
  },
};

interface GivingPromptProps {
  givingSummary: GivingSummary | null | undefined;
}

function GivingPromptComponent({ givingSummary }: GivingPromptProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const handlePress = useCallback(() => {
    router.push('/(tabs)/give');
  }, [router]);

  if (!givingSummary) return null;

  return (
    <View className="mb-6">
      <Pressable
        onPress={handlePress}
        className="flex-row items-center justify-between rounded-2xl p-5 active:opacity-90"
        style={{
          backgroundColor: Colors.accent.dark,
          shadowColor: Colors.accent.dark,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 4,
        }}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Continue your generosity, navigate to giving"
      >
        <View className="flex-row items-center gap-3.5">
          <View
            className="w-11 h-11 rounded-xl items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            <Heart size={20} color="#FFFFFF" fill="#FFFFFF" />
          </View>
          <View>
            <Text className="text-base font-semibold text-white">
              {t('today.giving.title', 'Continue Your Generosity')}
            </Text>
            <Text
              className="text-[13px] mt-0.5"
              style={{ color: 'rgba(255,255,255,0.7)' }}
            >
              {t('today.giving.subtitle', 'Your giving makes a difference')}
            </Text>
          </View>
        </View>
        <ArrowRight size={20} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

export const GivingPrompt = memo(GivingPromptComponent);
GivingPrompt.displayName = 'GivingPrompt';
