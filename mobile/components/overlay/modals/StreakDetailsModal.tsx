/**
 * StreakDetailsModal - Unified Overlay System (Bottom Sheet)
 *
 * Streak statistics and progress bottom sheet.
 * Used via: overlay.showBottomSheet(StreakDetailsModal, payload)
 *
 * Standardized styling:
 * - Header title: 22px font-bold
 * - Close button: 44x44 with 20px icon
 * - NativeWind + minimal inline styles
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { X, Flame, Trophy, Target, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import type { OverlayProps } from '@/components/overlay/types';
import type { StreakDetailsPayload } from '@/stores/overlayStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Consistent colors
const Colors = {
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  white: '#FFFFFF',
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
  },
  streak: '#FF6B35',
  streakLight: '#FFF3EE',
};

export const StreakDetailsModal: React.FC<OverlayProps<StreakDetailsPayload>> = ({
  payload,
  onClose,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  if (!payload) return null;

  const streakRules = [
    t('explore.streakRules.rule1', 'Complete a daily devotion to maintain your streak'),
    t('explore.streakRules.rule2', 'Your streak resets if you miss a day'),
    t('explore.streakRules.rule3', 'Longer streaks unlock special achievements'),
    t('explore.streakRules.rule4', 'Stay consistent for spiritual growth'),
  ];

  return (
    <View
      className="bg-white rounded-t-3xl"
      style={{
        maxHeight: SCREEN_HEIGHT * 0.85,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 12,
      }}
    >
      {/* Handle indicator */}
      <View className="items-center pt-3 pb-1">
        <View className="w-10 h-1 rounded-full bg-neutral-300" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      >
        <View className="px-5 pt-2">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center gap-3">
              <View
                className="w-12 h-12 rounded-full items-center justify-center"
                style={{ backgroundColor: Colors.streakLight }}
              >
                <Flame size={26} color={Colors.streak} />
              </View>
              <Text
                className="text-[22px] font-bold text-neutral-900"
                style={{ letterSpacing: -0.3 }}
              >
                {t('explore.yourStreak', 'Your Streak')}
              </Text>
            </View>

            {/* Close button - 44px */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
              className="w-11 h-11 rounded-full bg-neutral-100 items-center justify-center active:opacity-70"
            >
              <X size={20} color={Colors.neutral[600]} />
            </Pressable>
          </View>

          {/* Stats Grid */}
          <View className="flex-row gap-3 mb-5">
            <View className="flex-1 items-center py-5 px-3 rounded-2xl bg-neutral-50">
              <View className="flex-row items-center gap-3 mb-1">
                <View
                  className="w-11 h-11 rounded-full items-center justify-center"
                  style={{ backgroundColor: Colors.streakLight }}
                >
                  <Flame size={22} color={Colors.streak} fill={Colors.streak} />
                </View>
                <Text className="text-[40px] font-bold" style={{ color: Colors.streak, lineHeight: 44 }}>
                  {payload.streakCount}
                </Text>
              </View>
              <Text className="text-[14px] font-medium text-neutral-600 mt-1">
                {t('explore.currentStreak', 'Current Streak')}
              </Text>
            </View>

            <View className="flex-1 items-center py-5 px-3 rounded-2xl bg-neutral-50">
              <View className="flex-row items-center gap-3 mb-1">
                <View
                  className="w-11 h-11 rounded-full items-center justify-center"
                  style={{ backgroundColor: Colors.primary[50] }}
                >
                  <Trophy size={22} color={Colors.primary[600]} />
                </View>
                <Text className="text-[40px] font-bold" style={{ color: Colors.primary[600], lineHeight: 44 }}>
                  {payload.longestStreak}
                </Text>
              </View>
              <Text className="text-[14px] font-medium text-neutral-600 mt-1">
                {t('explore.longestStreak', 'Longest Streak')}
              </Text>
            </View>
          </View>

          {/* Week Progress */}
          <View className="p-4 rounded-2xl bg-neutral-50 mb-5">
            <Text className="text-base font-semibold text-neutral-800 mb-4">
              {t('explore.thisWeek', 'This Week')}
            </Text>
            <View className="flex-row justify-between">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                <View key={index} className="items-center">
                  <View
                    className="w-9 h-9 rounded-full items-center justify-center mb-1"
                    style={{
                      backgroundColor: payload.currentWeekDays[index]
                        ? Colors.streak
                        : Colors.neutral[200],
                    }}
                  >
                    {payload.currentWeekDays[index] && (
                      <Check size={16} color={Colors.white} strokeWidth={3} />
                    )}
                  </View>
                  <Text className="text-[13px] font-medium text-neutral-500">{day}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Rules */}
          <View className="p-4 rounded-2xl bg-neutral-50 mb-5">
            <Text className="text-base font-semibold text-neutral-800 mb-4">
              {t('explore.howStreaksWork', 'How Streaks Work')}
            </Text>
            {streakRules.map((rule, index) => (
              <View key={index} className="flex-row items-start gap-2 mb-2">
                <View
                  className="w-6 h-6 rounded-full items-center justify-center mt-0.5"
                  style={{ backgroundColor: Colors.primary[50] }}
                >
                  <Target size={14} color={Colors.primary[600]} />
                </View>
                <Text className="flex-1 text-[15px] text-neutral-600 leading-[22px]">{rule}</Text>
              </View>
            ))}
          </View>

          {/* Done Button */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
            className="items-center justify-center py-4 rounded-2xl active:opacity-80"
            style={{
              backgroundColor: Colors.primary[600],
              shadowColor: Colors.primary[600],
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text className="text-base font-bold text-white">
              {t('common.done', 'Done')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
};

export default StreakDetailsModal;
