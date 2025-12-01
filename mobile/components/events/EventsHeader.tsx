/**
 * EventsHeader - Gradient Header with Stats & Tabs
 *
 * Premium gradient header extracted from Events screen.
 * Features:
 * - Collapsible stats row on scroll (using shared today-motion)
 * - Tab navigation (upcoming, my RSVPs, attended)
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

import { spacing } from '@/constants/spacing';
import {
  useTodayHeaderMotion,
  useEventsCollapsibleHeader,
  todayListItemMotion,
} from '@/components/motion/today-motion';

// Local palette - for icon colors only
const Colors = {
  gradient: {
    start: '#1a1a2e',
  },
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
    // 1) Shared header enter animation from today-motion
    const { headerEnterStyle } = useTodayHeaderMotion();

    // 2) Shared collapsible header from today-motion (Events-specific variant)
    const {
      statsRowAnimatedStyle,
      headerTopAnimatedStyle,
      headerPaddingAnimatedStyle,
    } = useEventsCollapsibleHeader(scrollY, spacing);

    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        className="overflow-hidden"
        style={{ paddingTop: topInset + 16 }}
      >
        {/* Animated inner content only (no entering prop) */}
        <Animated.View
          className="px-5"
          style={[headerPaddingAnimatedStyle, headerEnterStyle]}
        >
          {/* Title + Calendar - stagger index 0 */}
          <Animated.View
            key={`header-top-${focusKey}`}
            entering={todayListItemMotion(0)}
            className="flex-row justify-between items-start"
            style={headerTopAnimatedStyle}
          >
            <View>
              <Text
                className="text-[28px] font-bold text-white"
                style={{ letterSpacing: -0.5 }}
              >
                {t('events.title')}
              </Text>
              <Text className="text-[15px] text-white/70 mt-1">
                {t('events.subtitle')}
              </Text>
            </View>
            <Pressable
              onPress={onPressCalendar}
              className="w-11 h-11 rounded-full bg-white/15 items-center justify-center active:scale-95 active:opacity-90"
            >
              <Calendar size={22} color={Colors.white} />
            </Pressable>
          </Animated.View>

          {/* Stats Row - collapsible - stagger index 1 */}
          <Animated.View
            key={`stats-row-${focusKey}`}
            entering={todayListItemMotion(1)}
            className="flex-row items-center rounded-2xl py-3 px-4 mb-4 border border-white/[0.08]"
            style={[{ backgroundColor: 'rgba(255,255,255,0.08)' }, statsRowAnimatedStyle]}
          >
            <View className="flex-1 flex-row items-center gap-2">
              <View
                className="w-9 h-9 rounded-[10px] items-center justify-center"
                style={{ backgroundColor: 'rgba(212,175,55,0.2)' }}
              >
                <CalendarDays size={18} color={Colors.accent.primary} />
              </View>
              <View>
                <Text className="text-[18px] font-bold text-white">{upcomingCount}</Text>
                <Text className="text-[11px] text-white/60 font-medium">{t('events.upcoming')}</Text>
              </View>
            </View>

            <View className="w-px h-7 bg-white/15 mx-2" />

            <View className="flex-1 flex-row items-center gap-2">
              <View
                className="w-9 h-9 rounded-[10px] items-center justify-center"
                style={{ backgroundColor: 'rgba(212,175,55,0.2)' }}
              >
                <Heart size={18} color={Colors.accent.primary} />
              </View>
              <View>
                <Text className="text-[18px] font-bold text-white">{rsvpCount}</Text>
                <Text className="text-[11px] text-white/60 font-medium">{t('events.myRSVPs')}</Text>
              </View>
            </View>

            <View className="w-px h-7 bg-white/15 mx-2" />

            <View className="flex-1 flex-row items-center gap-2">
              <View
                className="w-9 h-9 rounded-[10px] items-center justify-center"
                style={{ backgroundColor: 'rgba(212,175,55,0.2)' }}
              >
                <CheckCircle size={18} color={Colors.accent.primary} />
              </View>
              <View>
                <Text className="text-[18px] font-bold text-white">{attendedCount}</Text>
                <Text className="text-[11px] text-white/60 font-medium">{t('events.attended')}</Text>
              </View>
            </View>
          </Animated.View>

          {/* Tabs - stagger index 2 */}
          <Animated.View
            key={`tabs-row-${focusKey}`}
            entering={todayListItemMotion(2)}
            className="flex-row gap-2"
          >
            {(['upcoming', 'my_rsvps', 'attended'] as EventsTab[]).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => onTabChange(tab)}
                  className={`flex-1 py-3 rounded-xl items-center ${
                    isActive ? 'bg-white' : 'bg-white/10'
                  }`}
                >
                  <Text
                    className={`text-[13px] font-semibold ${
                      isActive ? 'text-[#1a1a2e]' : 'text-white/80'
                    }`}
                  >
                    {tab === 'upcoming' && t('events.upcoming')}
                    {tab === 'my_rsvps' && t('events.myRSVPs')}
                    {tab === 'attended' && t('events.attended')}
                  </Text>
                </Pressable>
              );
            })}
          </Animated.View>
        </Animated.View>
      </LinearGradient>
    );
  }
);

EventsHeader.displayName = 'EventsHeader';
