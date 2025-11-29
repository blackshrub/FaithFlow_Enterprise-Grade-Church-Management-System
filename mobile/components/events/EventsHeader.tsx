/**
 * EventsHeader - Gradient Header with Stats & Tabs
 *
 * Premium gradient header extracted from Events screen.
 * Features:
 * - Collapsible stats row on scroll (using shared today-motion)
 * - Tab navigation (upcoming, my RSVPs, attended)
 * - Calendar button
 * - Shared motion architecture with TodayScreen
 */

// components/events/EventsHeader.tsx

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { type SharedValue } from 'react-native-reanimated';
import { Calendar, CalendarDays, Heart, CheckCircle } from 'lucide-react-native';
import type { TFunction } from 'i18next';

import { spacing, radius } from '@/constants/spacing';
import {
  useTodayHeaderMotion,
  useEventsCollapsibleHeader,
  todayListItemMotion,
} from '@/components/motion/today-motion';

// Local palette (match EventsScreen)
const Colors = {
  gradient: {
    start: '#1a1a2e',
    mid: '#16213e',
    end: '#0f3460',
  },
  accent: {
    primary: '#d4af37',
  },
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
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
        colors={[Colors.gradient.start, Colors.gradient.mid, Colors.gradient.end]}
        style={[styles.headerGradient, { paddingTop: topInset + 16 }]}
      >
        {/* Animated inner content only (no entering prop) */}
        <Animated.View
          style={[styles.headerContent, headerPaddingAnimatedStyle, headerEnterStyle]}
        >
          {/* Title + Calendar - stagger index 0 */}
          <Animated.View
            key={`header-top-${focusKey}`}
            entering={todayListItemMotion(0)}
            style={[styles.headerTop, headerTopAnimatedStyle]}
          >
            <View>
              <Text style={styles.headerTitle}>{t('events.title')}</Text>
              <Text style={styles.headerSubtitle}>{t('events.subtitle')}</Text>
            </View>
            <Pressable onPress={onPressCalendar} style={styles.calendarBtn}>
              <Calendar size={22} color={Colors.white} />
            </Pressable>
          </Animated.View>

          {/* Stats Row - collapsible - stagger index 1 */}
          <Animated.View
            key={`stats-row-${focusKey}`}
            entering={todayListItemMotion(1)}
            style={[styles.statsRow, statsRowAnimatedStyle]}
          >
            <View style={styles.statItem}>
              <View style={styles.statIconWrap}>
                <CalendarDays size={18} color={Colors.accent.primary} />
              </View>
              <View>
                <Text style={styles.statValue}>{upcomingCount}</Text>
                <Text style={styles.statLabel}>{t('events.upcoming')}</Text>
              </View>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIconWrap}>
                <Heart size={18} color={Colors.accent.primary} />
              </View>
              <View>
                <Text style={styles.statValue}>{rsvpCount}</Text>
                <Text style={styles.statLabel}>{t('events.myRSVPs')}</Text>
              </View>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIconWrap}>
                <CheckCircle size={18} color={Colors.accent.primary} />
              </View>
              <View>
                <Text style={styles.statValue}>{attendedCount}</Text>
                <Text style={styles.statLabel}>{t('events.attended')}</Text>
              </View>
            </View>
          </Animated.View>

          {/* Tabs - stagger index 2 */}
          <Animated.View key={`tabs-row-${focusKey}`} entering={todayListItemMotion(2)} style={styles.tabsRow}>
            {(['upcoming', 'my_rsvps', 'attended'] as EventsTab[]).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => onTabChange(tab)}
                  style={[styles.tab, isActive && styles.tabActive]}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
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

const styles = StyleSheet.create({
  headerGradient: {
    overflow: 'hidden',
  },
  headerContent: {
    paddingHorizontal: spacing.ml,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  calendarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.m,
    marginBottom: spacing.m,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(212,175,55,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: spacing.s,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.m,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tabActive: {
    backgroundColor: Colors.white,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  tabTextActive: {
    color: Colors.gradient.start,
  },
});