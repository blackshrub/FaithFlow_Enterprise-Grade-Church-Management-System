/**
 * TodayHeader - Gradient Header with Stats (Memoized)
 *
 * Extracted from Today screen for performance optimization.
 * Features:
 * - Dark gradient header
 * - Time-based greeting
 * - Stats row (prayers, events)
 * - Collapsible animation support
 *
 * CRITICAL: Motion hooks are called INSIDE this component (like EventsHeader)
 * to avoid breaking memoization with new animated style object references.
 *
 * Styling: NativeWind-first with inline style for dynamic values
 */

import React, { memo, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { type SharedValue } from 'react-native-reanimated';
import {
  todayListItemMotion,
  useTodayHeaderMotion,
  useTodayCollapsibleHeader,
} from '@/components/motion/today-motion';
import { Heart, Calendar, type LucideIcon } from 'lucide-react-native';

import { ProfileButton } from '@/components/header';

// Premium monochrome palette
const Colors = {
  gradient: {
    start: '#0f0f0f',
    mid: '#1a1a1a',
    end: '#252525',
  },
  accent: {
    primary: '#C9A962',
  },
};

interface TodayHeaderProps {
  /** Top safe area inset */
  topInset: number;
  /** Greeting icon component */
  GreetingIcon: LucideIcon;
  /** Greeting text (Good Morning, etc.) */
  greetingText: string;
  /** Formatted current date */
  currentDate: string;
  /** User's first name */
  firstName: string;
  /** Number of active prayers */
  activePrayers: number;
  /** Number of upcoming events */
  upcomingCount: number;
  /** Scroll Y shared value for collapsible header */
  scrollY: SharedValue<number>;
  /** Focus key for animation keying (matches Events/Give pattern) */
  focusKey?: number;
}

function TodayHeaderComponent({
  topInset,
  GreetingIcon,
  greetingText,
  currentDate,
  firstName,
  activePrayers,
  upcomingCount,
  scrollY,
  focusKey = 0,
}: TodayHeaderProps) {
  const { t } = useTranslation();
  const router = useRouter();

  // CRITICAL: Motion hooks called INSIDE memoized component
  // This prevents animated style objects from breaking memo() optimization
  const { headerEnterStyle } = useTodayHeaderMotion();
  const {
    statsRowAnimatedStyle,
    greetingAnimatedStyle,
    headerPaddingAnimatedStyle,
  } = useTodayCollapsibleHeader(scrollY);

  // Stable callbacks for navigation
  const handlePrayerPress = useCallback(() => {
    router.push('/prayer');
  }, [router]);

  const handleEventsPress = useCallback(() => {
    router.push('/(tabs)/events');
  }, [router]);

  return (
    <LinearGradient
      colors={[Colors.gradient.start, Colors.gradient.mid, Colors.gradient.end]}
      className="overflow-hidden"
      style={{ paddingTop: topInset + 8 }}
    >
      {/* Animated content wrapper */}
      <Animated.View className="px-5" style={[headerPaddingAnimatedStyle, headerEnterStyle]}>
        {/* Top row: Date + Profile */}
        <Animated.View
          key={`header-top-${focusKey}`}
          entering={todayListItemMotion(0)}
          className="flex-row justify-between items-center mb-4"
        >
          <View className="flex-row items-center gap-2">
            <GreetingIcon size={16} color={Colors.accent.primary} />
            <Text className="text-sm text-neutral-400 font-medium">{currentDate}</Text>
          </View>
          <ProfileButton size={44} />
        </Animated.View>

        {/* Greeting */}
        <Animated.View
          key={`greeting-${focusKey}`}
          entering={todayListItemMotion(1)}
          className="mb-6"
          style={greetingAnimatedStyle}
        >
          <Text className="text-base text-neutral-400 font-medium mb-1">{greetingText}</Text>
          <Text
            className="text-[34px] font-bold text-white"
            style={{ letterSpacing: -0.5 }}
          >
            {firstName}
          </Text>
        </Animated.View>

        {/* Stats row - Collapsible */}
        <Animated.View
          key={`stats-row-${focusKey}`}
          entering={todayListItemMotion(2)}
          className="flex-row items-center rounded-2xl py-4 px-6"
          style={[
            {
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
            },
            statsRowAnimatedStyle,
          ]}
        >
          <Pressable
            onPress={handlePrayerPress}
            className="flex-1 flex-row items-center gap-2"
            accessible
            accessibilityRole="button"
            accessibilityLabel={`${activePrayers} active prayers, tap to view`}
          >
            <Heart size={18} color={Colors.accent.primary} />
            <Text className="text-[22px] font-bold text-white">{activePrayers}</Text>
            <Text className="text-[13px] text-neutral-400 font-medium">
              {t('today.stats.prayers', 'Prayers')}
            </Text>
          </Pressable>

          <View
            className="h-8 mx-4"
            style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.1)' }}
          />

          <Pressable
            onPress={handleEventsPress}
            className="flex-1 flex-row items-center gap-2"
            accessible
            accessibilityRole="button"
            accessibilityLabel={`${upcomingCount} upcoming events, tap to view`}
          >
            <Calendar size={18} color={Colors.accent.primary} />
            <Text className="text-[22px] font-bold text-white">{upcomingCount}</Text>
            <Text className="text-[13px] text-neutral-400 font-medium">
              {t('today.stats.events', 'Events')}
            </Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </LinearGradient>
  );
}

export const TodayHeader = memo(TodayHeaderComponent);
TodayHeader.displayName = 'TodayHeader';
