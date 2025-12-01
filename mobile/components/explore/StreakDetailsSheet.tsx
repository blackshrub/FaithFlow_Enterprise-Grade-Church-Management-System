/**
 * Streak Details Bottom Sheet
 *
 * Shows detailed streak information and rules
 * Helps users understand how to maintain their streak
 *
 * Styling: NativeWind-first with inline style for dynamic values
 */

import React, { useRef, useCallback, useMemo } from 'react';
import { View, Text } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Flame, Calendar, Trophy, Target, CheckCircle, Info } from 'lucide-react-native';
import { useStreakStore } from '@/stores/explore/streakStore';
import { useUserProgress, useCurrentStreak } from '@/hooks/explore/useExploreMock';
import { useExploreStore } from '@/stores/explore/exploreStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Tab bar height constant (should match your tab bar)
const TAB_BAR_HEIGHT = 80;

// Colors for icon usage
const Colors = {
  secondary: {
    50: '#FFF7ED',
    600: '#EA580C',
  },
  primary: {
    50: '#EFF6FF',
    600: '#2563EB',
    800: '#1E40AF',
  },
  success: {
    50: '#F0FDF4',
    500: '#22C55E',
    600: '#16A34A',
  },
  neutral: {
    300: '#D4D4D4',
    600: '#525252',
    700: '#404040',
    900: '#171717',
  },
};

export function StreakDetailsSheet() {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['70%'], []); // Increased to show above tab bar
  const insets = useSafeAreaInsets();

  const { visible, close } = useStreakStore();
  const { data: progressData } = useUserProgress();
  const streakFromHook = useCurrentStreak();
  const contentLanguage = useExploreStore((state) => state.contentLanguage);

  // Use the streak from hook as primary, fallback to progress data
  const currentStreak = streakFromHook || progressData?.streak?.current_streak || 0;
  const longestStreak = progressData?.streak?.longest_streak || currentStreak;
  const totalDaysActive = progressData?.streak?.total_days_active || currentStreak;

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  const handleDismiss = useCallback(() => {
    close();
  }, [close]);

  // Streak rules content
  const streakRules = contentLanguage === 'en'
    ? [
        'Complete any daily content (devotion, verse, quiz, or figure)',
        'Your streak resets if you miss a day',
        'A new day starts at midnight your local time',
        'Completing multiple items in one day counts as one streak day',
      ]
    : [
        'Selesaikan konten harian apa pun (renungan, ayat, kuis, atau tokoh)',
        'Rangkaian Anda akan direset jika melewatkan satu hari',
        'Hari baru dimulai pada tengah malam waktu lokal Anda',
        'Menyelesaikan beberapa item dalam satu hari dihitung sebagai satu hari rangkaian',
      ];

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={visible ? 0 : -1}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableDynamicSizing={false}
      onClose={handleDismiss}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
      handleIndicatorStyle={{ backgroundColor: Colors.neutral[300], width: 40, height: 4 }}
    >
      <BottomSheetScrollView className="flex-1 px-5">
        {/* Header */}
        <View className="flex-row items-center gap-3 mb-6 pt-3">
          <View
            className="w-12 h-12 rounded-full items-center justify-center"
            style={{ backgroundColor: Colors.secondary[50] }}
          >
            <Flame size={32} color={Colors.secondary[600]} />
          </View>
          <Text className="text-2xl font-bold text-neutral-900">
            {contentLanguage === 'en' ? 'Your Streak' : 'Rangkaian Anda'}
          </Text>
        </View>

        {/* Stats Grid */}
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-neutral-50 rounded-2xl p-4 items-center gap-1">
            <View
              className="w-9 h-9 rounded-full items-center justify-center mb-1"
              style={{ backgroundColor: Colors.secondary[50] }}
            >
              <Flame size={20} color={Colors.secondary[600]} />
            </View>
            <Text className="text-2xl font-bold text-neutral-900">{currentStreak}</Text>
            <Text className="text-[11px] text-neutral-600 text-center">
              {contentLanguage === 'en' ? 'Current Streak' : 'Rangkaian Saat Ini'}
            </Text>
          </View>

          <View className="flex-1 bg-neutral-50 rounded-2xl p-4 items-center gap-1">
            <View
              className="w-9 h-9 rounded-full items-center justify-center mb-1"
              style={{ backgroundColor: Colors.primary[50] }}
            >
              <Trophy size={20} color={Colors.primary[600]} />
            </View>
            <Text className="text-2xl font-bold text-neutral-900">{longestStreak}</Text>
            <Text className="text-[11px] text-neutral-600 text-center">
              {contentLanguage === 'en' ? 'Longest Streak' : 'Rangkaian Terpanjang'}
            </Text>
          </View>

          <View className="flex-1 bg-neutral-50 rounded-2xl p-4 items-center gap-1">
            <View
              className="w-9 h-9 rounded-full items-center justify-center mb-1"
              style={{ backgroundColor: Colors.success[50] }}
            >
              <Calendar size={20} color={Colors.success[600]} />
            </View>
            <Text className="text-2xl font-bold text-neutral-900">{totalDaysActive}</Text>
            <Text className="text-[11px] text-neutral-600 text-center">
              {contentLanguage === 'en' ? 'All Time' : 'Sepanjang Waktu'}
            </Text>
          </View>
        </View>

        {/* How to maintain streak */}
        <View className="bg-neutral-50 rounded-2xl p-4 mb-4">
          <View className="flex-row items-center gap-2 mb-3">
            <Info size={18} color={Colors.neutral[600]} />
            <Text className="text-base font-semibold text-neutral-700">
              {contentLanguage === 'en' ? 'How to maintain your streak' : 'Cara mempertahankan rangkaian'}
            </Text>
          </View>

          <View className="gap-3">
            {streakRules.map((rule, index) => (
              <View key={index} className="flex-row items-start gap-3">
                <CheckCircle size={16} color={Colors.success[500]} />
                <Text className="text-xs text-neutral-700 flex-1 leading-[18px]">{rule}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Motivation text */}
        <View
          className="flex-row items-center gap-3 rounded-xl p-4"
          style={{ backgroundColor: Colors.primary[50] }}
        >
          <Target size={18} color={Colors.primary[600]} />
          <Text
            className="text-xs flex-1 italic leading-[18px]"
            style={{ color: Colors.primary[800] }}
          >
            {contentLanguage === 'en'
              ? `Keep going! You're building a powerful habit of daily spiritual growth.`
              : `Terus semangat! Anda sedang membangun kebiasaan pertumbuhan rohani harian yang kuat.`}
          </Text>
        </View>

        {/* Bottom padding for tab bar */}
        <View style={{ height: TAB_BAR_HEIGHT + insets.bottom }} />
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
