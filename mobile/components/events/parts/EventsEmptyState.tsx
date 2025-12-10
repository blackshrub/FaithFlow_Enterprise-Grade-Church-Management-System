/**
 * EventsEmptyState - Empty State for Events
 *
 * Memoized empty state component with different states for each tab.
 * Styling: NativeWind-first with inline style for spacing constants
 */

import React, { memo, useMemo, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { CalendarDays, Heart, Sparkles, ArrowRight } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { MemoIcon } from '@/components/ui/MemoIcon';
import { spacing } from '@/constants/spacing';
import type { EventTab } from '@/stores/ui/eventsUI';

// =============================================================================
// TYPES
// =============================================================================

export interface EventsEmptyStateProps {
  activeTab: EventTab;
  selectedCategory: string | null;
  onClearFilters: () => void;
  onRefresh: () => void;
  onBrowseEvents: () => void;
  onExploreEvents: () => void;
  t: (key: string) => string;
}

interface EmptyContent {
  icon: LucideIcon;
  title: string;
  desc: string;
  action: string;
  onAction: () => void;
}

// =============================================================================
// COLORS (for icon colors and dynamic backgrounds)
// =============================================================================

const Colors = {
  neutral200: '#e5e5e5',
  neutral400: '#a3a3a3',
  gradientEnd: '#0f3460',
  white: '#ffffff',
};

// =============================================================================
// COMPONENT
// =============================================================================

export const EventsEmptyState = memo(function EventsEmptyState({
  activeTab,
  selectedCategory,
  onClearFilters,
  onRefresh,
  onBrowseEvents,
  onExploreEvents,
  t,
}: EventsEmptyStateProps) {
  // Get empty content based on tab
  const content: EmptyContent = useMemo(() => {
    switch (activeTab) {
      case 'upcoming':
        return {
          icon: CalendarDays,
          title: t('events.noUpcomingEvents'),
          desc: t('events.noUpcomingEventsDesc'),
          action: selectedCategory ? t('events.clearFilters') : t('common.refresh'),
          onAction: selectedCategory ? onClearFilters : onRefresh,
        };
      case 'my_rsvps':
        return {
          icon: Heart,
          title: t('events.noRSVPs'),
          desc: t('events.noRSVPsDesc'),
          action: t('events.browseEvents'),
          onAction: onBrowseEvents,
        };
      case 'attended':
        return {
          icon: Sparkles,
          title: t('events.noAttended'),
          desc: t('events.noAttendedDesc'),
          action: t('events.exploreEvents'),
          onAction: onExploreEvents,
        };
    }
  }, [activeTab, selectedCategory, onClearFilters, onRefresh, onBrowseEvents, onExploreEvents, t]);

  const handleAction = useCallback(() => {
    content.onAction();
  }, [content]);

  return (
    <View
      className="items-center"
      style={{
        paddingVertical: spacing.xxl + spacing.ml,
        paddingHorizontal: spacing.xxl,
      }}
    >
      <View
        className="w-[100px] h-[100px] rounded-full items-center justify-center"
        style={{ backgroundColor: Colors.neutral200, marginBottom: spacing.l }}
      >
        <MemoIcon icon={content.icon} size={48} color={Colors.neutral400} />
      </View>
      <Text
        className="text-xl font-bold text-neutral-800 text-center"
        style={{ marginBottom: spacing.s }}
      >
        {content.title}
      </Text>
      <Text
        className="text-[15px] text-neutral-500 text-center leading-[22px]"
        style={{ marginBottom: spacing.l }}
      >
        {content.desc}
      </Text>
      <Pressable
        onPress={handleAction}
        className="flex-row items-center"
        style={{
          backgroundColor: Colors.gradientEnd,
          paddingHorizontal: spacing.l,
          paddingVertical: spacing.sm,
          borderRadius: spacing.l,
          gap: spacing.s,
        }}
        accessible
        accessibilityRole="button"
        accessibilityLabel={content.action}
      >
        <Text className="text-[15px] font-semibold text-white">{content.action}</Text>
        <MemoIcon icon={ArrowRight} size={18} color={Colors.white} />
      </Pressable>
    </View>
  );
});

export default EventsEmptyState;
