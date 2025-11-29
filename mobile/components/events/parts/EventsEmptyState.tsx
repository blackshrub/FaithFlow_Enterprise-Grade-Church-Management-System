/**
 * EventsEmptyState - Empty State for Events
 *
 * Memoized empty state component with different states for each tab.
 */

import React, { memo, useMemo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
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
// COLORS
// =============================================================================

const Colors = {
  neutral: {
    200: '#e5e5e5',
    400: '#a3a3a3',
    500: '#737373',
    800: '#262626',
  },
  gradient: {
    end: '#0f3460',
  },
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
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <MemoIcon icon={content.icon} size={48} color={Colors.neutral[400]} />
      </View>
      <Text style={styles.title}>{content.title}</Text>
      <Text style={styles.desc}>{content.desc}</Text>
      <Pressable onPress={handleAction} style={styles.button}>
        <Text style={styles.buttonText}>{content.action}</Text>
        <MemoIcon icon={ArrowRight} size={18} color={Colors.white} />
      </Pressable>
    </View>
  );
});

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xxl + spacing.ml,
    paddingHorizontal: spacing.xxl,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.l,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.neutral[800],
    marginBottom: spacing.s,
    textAlign: 'center',
  },
  desc: {
    fontSize: 15,
    color: Colors.neutral[500],
    textAlign: 'center',
    marginBottom: spacing.l,
    lineHeight: 22,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gradient.end,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.sm,
    borderRadius: spacing.l,
    gap: spacing.s,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
});

export default EventsEmptyState;
