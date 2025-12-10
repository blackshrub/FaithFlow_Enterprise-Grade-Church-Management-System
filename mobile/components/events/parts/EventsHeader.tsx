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
 * Styling: NativeWind-first with inline style for spacing constants
 */

import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
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
    <View className="flex-1 flex-row items-center" style={{ gap: spacing.s }}>
      <View
        className="w-9 h-9 rounded-[10px] items-center justify-center"
        style={{ backgroundColor: 'rgba(212,175,55,0.2)' }}
      >
        <MemoIcon icon={icon} size={18} color={Colors.accent.primary} />
      </View>
      <View>
        <Text className="text-lg font-bold text-white">{value}</Text>
        <Text className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>
          {label}
        </Text>
      </View>
    </View>
  );
});

const StatDivider = memo(function StatDivider() {
  return (
    <View
      className="w-px h-7"
      style={{ backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: spacing.s }}
    />
  );
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
        className="overflow-hidden"
        style={{ paddingTop: topInset + 16 }}
      >
        <Animated.View
          style={[{ paddingHorizontal: spacing.ml }, headerPaddingStyle, headerEnterStyle]}
        >
          {/* Header Top - Title and Calendar */}
          <Animated.View
            className="flex-row justify-between items-start"
            style={headerTopStyle}
          >
            <View>
              <Text className="text-[28px] font-bold text-white" style={{ letterSpacing: -0.5 }}>
                {t('events.title')}
              </Text>
              <Text className="text-[15px] mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {t('events.subtitle')}
              </Text>
            </View>
            <Pressable
              onPress={handleCalendarPress}
              className="w-11 h-11 rounded-full items-center justify-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
              accessible
              accessibilityRole="button"
              accessibilityLabel={t('events.openCalendar')}
            >
              <MemoIcon icon={Calendar} size={22} color={Colors.white} />
            </Pressable>
          </Animated.View>

          {/* Stats Row - Collapsible */}
          <Animated.View
            className="flex-row items-center border"
            style={[
              {
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: radius.card,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.m,
                marginBottom: spacing.m,
                borderColor: 'rgba(255,255,255,0.08)',
              },
              statsRowStyle,
            ]}
          >
            <StatItem icon={CalendarDays} value={upcomingCount} label={t('events.upcoming')} />
            <StatDivider />
            <StatItem icon={Heart} value={rsvpCount} label={t('events.myRSVPs')} />
            <StatDivider />
            <StatItem icon={CheckCircle} value={attendedCount} label={t('events.attended')} />
          </Animated.View>

          {/* Tabs */}
          <View className="flex-row" style={{ gap: spacing.s }}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => handleTabPress(tab.key)}
                  className={`flex-1 items-center ${isActive ? 'bg-white' : ''}`}
                  style={{
                    paddingVertical: spacing.sm,
                    borderRadius: radius.m,
                    backgroundColor: isActive ? Colors.white : 'rgba(255,255,255,0.1)',
                  }}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={`${tab.label} ${isActive ? t('common.selected') : ''}`}
                  accessibilityState={{ selected: isActive }}
                >
                  <Text
                    className="text-[13px] font-semibold"
                    style={{ color: isActive ? Colors.gradient.start : 'rgba(255,255,255,0.8)' }}
                  >
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

export default EventsHeader;
