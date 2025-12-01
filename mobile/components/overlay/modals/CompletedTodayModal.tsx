/**
 * CompletedTodayModal - Unified Overlay System (Bottom Sheet)
 *
 * Shows today's completed activities and progress.
 * Used via: overlay.showBottomSheet(CompletedTodayModal, payload)
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
import { X, Sparkles, BookOpen, CheckCircle2, Circle, Calendar } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import type { OverlayProps } from '@/components/overlay/types';

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
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    500: '#10B981',
    600: '#059669',
  },
  amber: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    500: '#F59E0B',
    600: '#D97706',
    800: '#92400E',
  },
};

// Payload type
export interface CompletedTodayPayload {
  devotionCompleted: boolean;
  devotionTitle?: string;
  quizzesCompleted: number;
  versesRead: number;
  totalActivities: number;
}

export const CompletedTodayModal: React.FC<OverlayProps<CompletedTodayPayload>> = ({
  payload,
  onClose,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  if (!payload) return null;

  const activities = [
    {
      label: t('explore.completedToday.devotion', 'Daily Devotion'),
      completed: payload.devotionCompleted,
      detail: payload.devotionTitle || t('explore.completedToday.noDevotionYet', 'Not started yet'),
      icon: BookOpen,
      color: Colors.primary[600],
      bgColor: Colors.primary[50],
    },
    {
      label: t('explore.completedToday.quizzes', 'Quizzes Completed'),
      completed: payload.quizzesCompleted > 0,
      detail: payload.quizzesCompleted > 0
        ? t('explore.completedToday.quizzesCount', '{{count}} completed today', { count: payload.quizzesCompleted })
        : t('explore.completedToday.noQuizzesYet', 'No quizzes taken yet'),
      icon: Sparkles,
      color: Colors.amber[500],
      bgColor: Colors.amber[100],
    },
    {
      label: t('explore.completedToday.verses', 'Verses Read'),
      completed: payload.versesRead > 0,
      detail: payload.versesRead > 0
        ? t('explore.completedToday.versesCount', '{{count}} verses today', { count: payload.versesRead })
        : t('explore.completedToday.noVersesYet', 'No verses read yet'),
      icon: Calendar,
      color: Colors.success[600],
      bgColor: Colors.success[50],
    },
  ];

  const completedCount = activities.filter(a => a.completed).length;
  const progressPercent = (completedCount / activities.length) * 100;

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
                style={{ backgroundColor: Colors.amber[100] }}
              >
                <Sparkles size={26} color={Colors.amber[500]} />
              </View>
              <Text
                className="text-[22px] font-bold text-neutral-900"
                style={{ letterSpacing: -0.3 }}
              >
                {t('explore.completedToday.title', "Today's Progress")}
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

          {/* Summary Card */}
          <View className="p-4 rounded-2xl bg-neutral-50 mb-5">
            <View className="flex-row items-baseline gap-2 mb-3">
              <Text className="text-[48px] font-bold" style={{ color: Colors.amber[500], lineHeight: 52 }}>
                {completedCount}
              </Text>
              <Text className="text-base text-neutral-600">
                {t('explore.completedToday.of', 'of')} {activities.length} {t('explore.completedToday.activities', 'activities')}
              </Text>
            </View>
            <View className="h-2 bg-neutral-200 rounded overflow-hidden">
              <View
                className="h-full rounded"
                style={{ width: `${progressPercent}%`, backgroundColor: Colors.amber[500] }}
              />
            </View>
          </View>

          {/* Activities List */}
          <View className="mb-5">
            <Text className="text-base font-semibold text-neutral-800 mb-3">
              {t('explore.completedToday.activitiesTitle', 'Activities')}
            </Text>
            {activities.map((activity, index) => (
              <View key={index} className="flex-row items-center p-3 bg-neutral-50 rounded-xl mb-2 gap-3">
                <View
                  className="w-11 h-11 rounded-full items-center justify-center"
                  style={{ backgroundColor: activity.bgColor }}
                >
                  <activity.icon size={20} color={activity.color} />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-neutral-800 mb-0.5">{activity.label}</Text>
                  <Text className="text-[13px] text-neutral-500">{activity.detail}</Text>
                </View>
                {activity.completed ? (
                  <CheckCircle2 size={24} color={Colors.success[500]} fill={Colors.success[100]} />
                ) : (
                  <Circle size={24} color={Colors.neutral[300]} />
                )}
              </View>
            ))}
          </View>

          {/* Encouragement */}
          <View className="p-4 rounded-2xl mb-5" style={{ backgroundColor: Colors.amber[100] }}>
            <Text className="text-[15px] font-medium text-center leading-[22px]" style={{ color: Colors.amber[800] }}>
              {completedCount === activities.length
                ? t('explore.completedToday.allDone', '🎉 Amazing! You completed all activities today!')
                : completedCount > 0
                  ? t('explore.completedToday.keepGoing', '💪 Great progress! Keep going!')
                  : t('explore.completedToday.getStarted', '✨ Start your spiritual journey today!')}
            </Text>
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

export default CompletedTodayModal;
