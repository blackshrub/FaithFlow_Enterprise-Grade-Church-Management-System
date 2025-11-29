/**
 * EventsHeader - Memoized Events Screen Header
 *
 * Premium gradient header with:
 * - Title and subtitle
 * - Calendar button
 * - Stats row (collapsible)
 * - Tab navigation
 *
 * All animations use the shared animation hooks for consistency.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Calendar, CalendarDays, Heart, CheckCircle } from 'lucide-react-native';

import { MemoIcon } from '@/components/ui/MemoIcon';
import { spacing, radius } from '@/constants/spacing';
import type { EventTab } from '@/stores/ui/eventsUI';

// =============================================================================
// TYPES
// =============================================================================

export interface EventsHeaderProps {
  // Stable insets
  topInset: number;

  // Stats
  upcomingCount: number;
  rsvpCount: number;
  attendedCount: number;

  // Tab state
  activeTab: EventTab;
  onTabChange: (tab: EventTab) => void;

  // Actions
  onCalendarPress: () => void;

  // Animated styles (from useHeaderAnimation)
  headerEnterStyle: any;
  statsRowStyle: any;
  headerTopStyle: any;
  headerPaddingStyle: any;

  // Translations
  t: (key: string) => string;
}

// =============================================================================
// COLORS
// =============================================================================

const Colors = {
  gradient: {
    start: '#1a1a2e',
    mid: '#16213e',
    end: '#0f3460',
  },
  accent: {
    primary: '#d4af37',
  },
  white: '#ffffff',
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface StatItemProps {
  icon: typeof CalendarDays;
  value: number;
  label: string;
}

const StatItem = memo(function StatItem({ icon, value, label }: StatItemProps) {
  return (
    <View style={styles.statItem}>
      <View style={styles.statIconWrap}>
        <MemoIcon icon={icon} size={18} color={Colors.accent.primary} />
      </View>
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
});

const StatDivider = memo(function StatDivider() {
  return <View style={styles.statDivider} />;
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const EventsHeader = memo(function EventsHeader({
  topInset,
  upcomingCount,
  rsvpCount,
  attendedCount,
  activeTab,
  onTabChange,
  onCalendarPress,
  headerEnterStyle,
  statsRowStyle,
  headerTopStyle,
  headerPaddingStyle,
  t,
}: EventsHeaderProps) {
  // Memoized tabs config
  const tabs = useMemo(
    () =>
      [
        { key: 'upcoming' as const, label: t('events.upcoming') },
        { key: 'my_rsvps' as const, label: t('events.myRSVPs') },
        { key: 'attended' as const, label: t('events.attended') },
      ] as const,
    [t]
  );

  // Memoized tab press handler
  const handleTabPress = useCallback(
    (tab: EventTab) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onTabChange(tab);
    },
    [onTabChange]
  );

  // Memoized calendar press handler
  const handleCalendarPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCalendarPress();
  }, [onCalendarPress]);

  return (
    <View>
      <LinearGradient
        colors={[Colors.gradient.start, Colors.gradient.mid, Colors.gradient.end]}
        style={[styles.headerGradient, { paddingTop: topInset + 16 }]}
      >
        <Animated.View style={[styles.headerContent, headerPaddingStyle, headerEnterStyle]}>
          {/* Header Top - Title and Calendar */}
          <Animated.View style={[styles.headerTop, headerTopStyle]}>
            <View>
              <Text style={styles.headerTitle}>{t('events.title')}</Text>
              <Text style={styles.headerSubtitle}>{t('events.subtitle')}</Text>
            </View>
            <Pressable onPress={handleCalendarPress} style={styles.calendarBtn}>
              <MemoIcon icon={Calendar} size={22} color={Colors.white} />
            </Pressable>
          </Animated.View>

          {/* Stats Row - Collapsible */}
          <Animated.View style={[styles.statsRow, statsRowStyle]}>
            <StatItem icon={CalendarDays} value={upcomingCount} label={t('events.upcoming')} />
            <StatDivider />
            <StatItem icon={Heart} value={rsvpCount} label={t('events.myRSVPs')} />
            <StatDivider />
            <StatItem icon={CheckCircle} value={attendedCount} label={t('events.attended')} />
          </Animated.View>

          {/* Tabs */}
          <View style={styles.tabsRow}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => handleTabPress(tab.key)}
                  style={[styles.tab, isActive && styles.tabActive]}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </LinearGradient>
    </View>
  );
});

// =============================================================================
// STYLES
// =============================================================================

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

export default EventsHeader;
