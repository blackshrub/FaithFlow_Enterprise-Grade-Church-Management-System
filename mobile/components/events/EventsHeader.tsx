/**
 * EventsHeader - Gradient Header with Clickable Stat Cards
 *
 * Premium gradient header extracted from Events screen.
 * Standardized to match Explore screen header for consistent UX.
 *
 * Features:
 * - Collapsible stats row on scroll (using shared today-motion)
 * - Clickable stat cards that filter events
 * - Calendar button
 * - Shared motion architecture with TodayScreen
 *
 * Styling: NativeWind-first with inline style for dynamic/animated values
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { type SharedValue } from 'react-native-reanimated';
import { Calendar, CalendarDays, Heart, CheckCircle } from 'lucide-react-native';
import type { TFunction } from 'i18next';

import {
  useTodayHeaderMotion,
  useTodayCollapsibleHeader,
  todayListItemMotion,
} from '@/components/motion/today-motion';

// Local palette - matching Explore screen colors
const Colors = {
  accent: {
    primary: '#d4af37',
  },
  white: '#ffffff',
};

export type EventsTab = 'upcoming' | 'my_rsvps' | 'attended';

interface EventsHeaderProps {
  t: TFunction;
  topInset: number;
  upcomingCount: number;
  rsvpCount: number;
  attendedCount: number;
  activeTab: EventsTab;
  onTabChange: (tab: EventsTab) => void;
  onPressCalendar: () => void;
  scrollY: SharedValue<number>;
  /** Focus key - increment to replay enter animations on tab focus */
  focusKey?: number;
}

export const EventsHeader: React.FC<EventsHeaderProps> = React.memo(
  ({
    t,
    topInset,
    upcomingCount,
    rsvpCount,
    attendedCount,
    activeTab,
    onTabChange,
    onPressCalendar,
    scrollY,
    focusKey = 0,
  }) => {
    // Shared header enter animation from today-motion
    const { headerEnterStyle } = useTodayHeaderMotion();

    // Shared collapsible header from today-motion (same as Explore)
    const {
      statsRowAnimatedStyle,
      greetingAnimatedStyle: titleRowAnimatedStyle,
      headerPaddingAnimatedStyle,
    } = useTodayCollapsibleHeader(scrollY);

    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        className="overflow-hidden"
        style={{ paddingTop: topInset + 4 }}
      >
        {/* Animated content wrapper - matching Explore pattern */}
        <Animated.View
          className="px-5"
          style={[headerEnterStyle, headerPaddingAnimatedStyle]}
        >
          {/* Title + Calendar - stagger index 0, matching Explore layout */}
          <Animated.View
            key={`header-top-${focusKey}`}
            entering={todayListItemMotion(0)}
            style={titleRowAnimatedStyle}
            className="flex-row justify-between items-start mb-5"
          >
            {/* Title section - matching Explore */}
            <View>
              <Text
                className="text-[32px] font-bold text-white mb-1"
                style={{ letterSpacing: -0.5 }}
              >
                {t('events.title')}
              </Text>
              <View className="flex-row items-center gap-1.5">
                <CalendarDays size={14} color={Colors.accent.primary} />
                <Text className="text-[13px] text-white/60 font-medium">
                  {t('events.subtitle')}
                </Text>
              </View>
            </View>

            {/* Calendar button - matching Explore's language toggle style */}
            <Pressable
              onPress={onPressCalendar}
              className="flex-row items-center gap-2 bg-white/15 px-4 py-2.5 rounded-full active:scale-95 active:opacity-90 mt-1"
            >
              <Calendar size={16} color={Colors.white} />
            </Pressable>
          </Animated.View>

          {/* Stats row - Collapsible, matching Explore's single-container style */}
          <Animated.View
            key={`stats-row-${focusKey}`}
            entering={todayListItemMotion(1)}
            style={statsRowAnimatedStyle}
            className="flex-row items-center rounded-2xl py-4 px-6"
          >
            {/* Background - matching Explore */}
            <View
              className="absolute inset-0 rounded-2xl"
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            />

            {/* Upcoming */}
            <Pressable
              onPress={() => onTabChange('upcoming')}
              className="flex-1 flex-row items-center gap-2.5 active:scale-95 active:opacity-90"
            >
              <View
                className="w-10 h-10 rounded-xl items-center justify-center"
                style={{
                  backgroundColor: activeTab === 'upcoming'
                    ? 'rgba(255,255,255,0.25)'
                    : 'rgba(212,175,55,0.2)',
                }}
              >
                <CalendarDays
                  size={20}
                  color={activeTab === 'upcoming' ? Colors.white : Colors.accent.primary}
                />
              </View>
              <View className="gap-0.5">
                <Text className="text-[18px] font-bold text-white leading-tight">
                  {upcomingCount}
                </Text>
                <Text
                  className={`text-[11px] font-medium ${
                    activeTab === 'upcoming' ? 'text-white/90' : 'text-white/60'
                  }`}
                >
                  {t('events.upcoming')}
                </Text>
              </View>
            </Pressable>

            <View className="w-px h-8 bg-white/15 mx-2" />

            {/* My RSVPs */}
            <Pressable
              onPress={() => onTabChange('my_rsvps')}
              className="flex-1 flex-row items-center gap-2.5 active:scale-95 active:opacity-90"
            >
              <View
                className="w-10 h-10 rounded-xl items-center justify-center"
                style={{
                  backgroundColor: activeTab === 'my_rsvps'
                    ? 'rgba(255,255,255,0.25)'
                    : 'rgba(212,175,55,0.2)',
                }}
              >
                <Heart
                  size={20}
                  color={activeTab === 'my_rsvps' ? Colors.white : Colors.accent.primary}
                />
              </View>
              <View className="gap-0.5">
                <Text className="text-[18px] font-bold text-white leading-tight">
                  {rsvpCount}
                </Text>
                <Text
                  className={`text-[11px] font-medium ${
                    activeTab === 'my_rsvps' ? 'text-white/90' : 'text-white/60'
                  }`}
                >
                  {t('events.myRSVPs')}
                </Text>
              </View>
            </Pressable>

            <View className="w-px h-8 bg-white/15 mx-2" />

            {/* Attended */}
            <Pressable
              onPress={() => onTabChange('attended')}
              className="flex-1 flex-row items-center gap-2.5 active:scale-95 active:opacity-90"
            >
              <View
                className="w-10 h-10 rounded-xl items-center justify-center"
                style={{
                  backgroundColor: activeTab === 'attended'
                    ? 'rgba(255,255,255,0.25)'
                    : 'rgba(212,175,55,0.2)',
                }}
              >
                <CheckCircle
                  size={20}
                  color={activeTab === 'attended' ? Colors.white : Colors.accent.primary}
                />
              </View>
              <View className="gap-0.5">
                <Text className="text-[18px] font-bold text-white leading-tight">
                  {attendedCount}
                </Text>
                <Text
                  className={`text-[11px] font-medium ${
                    activeTab === 'attended' ? 'text-white/90' : 'text-white/60'
                  }`}
                >
                  {t('events.attended')}
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </LinearGradient>
    );
  }
);

EventsHeader.displayName = 'EventsHeader';
