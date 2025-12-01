/**
 * GiveHeader - Memoized Give Screen Header
 *
 * Premium gradient header with:
 * - Title and subtitle
 * - History button
 * - Stats row
 * - Back navigation for sub-steps
 *
 * Styling: NativeWind-first with inline style for dynamic/animated values
 */

import React, { memo, useCallback } from 'react';
import { View, Text, Pressable, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { History, ArrowLeft, TrendingUp, Calendar } from 'lucide-react-native';

import { MemoIcon } from '@/components/ui/MemoIcon';
import type { GiveStep } from '@/stores/ui/giveUI';

// =============================================================================
// TYPES
// =============================================================================

export interface GiveHeaderProps {
  // Stable insets
  topInset: number;

  // State
  step: GiveStep;
  showHistory: boolean;
  totalGiven: string;
  totalTransactions: number;

  // Actions
  onHistoryPress: () => void;
  onBackPress: () => void;

  // Animated styles
  headerEnterStyle: any;

  // Translations
  t: (key: string) => string;
}

// =============================================================================
// COLORS - for icon colors only
// =============================================================================

const Colors = {
  gradient: {
    start: '#1a1a2e',
  },
  accent: {
    gold: '#D4AF37',
  },
  white: '#ffffff',
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface StatCardProps {
  icon: typeof TrendingUp;
  value: string | number;
  label: string;
}

const StatCard = memo(function StatCard({ icon, value, label }: StatCardProps) {
  return (
    <View
      className="flex-1 flex-row items-center gap-2 rounded-2xl py-3 px-3 border border-white/10"
      style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
    >
      <View
        className="w-9 h-9 rounded-[10px] items-center justify-center"
        style={{ backgroundColor: 'rgba(212,175,55,0.2)' }}
      >
        <MemoIcon icon={icon} size={16} color={Colors.accent.gold} />
      </View>
      <View className="flex-1">
        <Text className="text-[15px] font-bold text-white">{value}</Text>
        <Text className="text-[11px] text-white/60 mt-0.5">{label}</Text>
      </View>
    </View>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const GiveHeader = memo(function GiveHeader({
  topInset,
  step,
  showHistory,
  totalGiven,
  totalTransactions,
  onHistoryPress,
  onBackPress,
  headerEnterStyle,
  t,
}: GiveHeaderProps) {
  const showBackButton = step !== 'choose' || showHistory;

  const handleHistoryPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onHistoryPress();
  }, [onHistoryPress]);

  const handleBackPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBackPress();
  }, [onBackPress]);

  return (
    <>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        className="overflow-hidden"
        style={{
          paddingTop: topInset + 8,
          paddingBottom: showBackButton ? 12 : 24,
        }}
      >
        <Animated.View style={headerEnterStyle}>
          {!showBackButton ? (
            <View className="px-6">
              {/* Title row with history button */}
              <View className="flex-row justify-between items-start mb-5">
                <View className="flex-1">
                  <Text
                    className="text-[32px] font-bold text-white"
                    style={{ letterSpacing: -0.5 }}
                  >
                    {t('give.title')}
                  </Text>
                  <Text className="text-base text-white/70 mt-1">
                    {t('give.subtitle')}
                  </Text>
                </View>
                <Pressable
                  onPress={handleHistoryPress}
                  className="w-11 h-11 rounded-full bg-white/10 items-center justify-center active:scale-95 active:opacity-90"
                >
                  <MemoIcon icon={History} size={20} color={Colors.white} />
                </Pressable>
              </View>

              {/* Stats cards */}
              <View className="flex-row gap-3 mt-4">
                <StatCard
                  icon={TrendingUp}
                  value={totalGiven}
                  label={t('give.totalGiven')}
                />
                <StatCard
                  icon={Calendar}
                  value={totalTransactions}
                  label={t('give.transactions')}
                />
              </View>
            </View>
          ) : (
            <View className="flex-row items-center justify-between px-5 py-3">
              <Pressable
                onPress={handleBackPress}
                className="w-11 h-11 rounded-full bg-white/10 items-center justify-center active:scale-95"
              >
                <MemoIcon icon={ArrowLeft} size={24} color={Colors.white} />
              </Pressable>

              <View className="flex-1 items-center px-3">
                <Text className="text-xl font-bold text-white text-center">
                  {showHistory ? t('give.historyTitle') : t('give.title')}
                </Text>
                <Text className="text-[13px] text-white/70 text-center mt-0.5">
                  {showHistory ? t('give.historySubtitle') : t('give.subtitle')}
                </Text>
              </View>

              <Pressable
                onPress={handleHistoryPress}
                className={`w-11 h-11 rounded-full items-center justify-center active:scale-95 ${
                  showHistory ? 'bg-white' : 'bg-white/10'
                }`}
              >
                <MemoIcon
                  icon={History}
                  size={20}
                  color={showHistory ? Colors.gradient.start : Colors.white}
                />
              </Pressable>
            </View>
          )}
        </Animated.View>
      </LinearGradient>
    </>
  );
});

export default GiveHeader;
