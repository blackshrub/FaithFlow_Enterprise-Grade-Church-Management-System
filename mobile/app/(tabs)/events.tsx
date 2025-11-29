/**
 * Events Screen - Premium Redesign V11 (TodayStyle Architecture)
 */

import React, { useState, useCallback, useMemo, useRef, memo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  RefreshControl,
  Share,
  Alert,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { withPremiumMotionV10 } from '@/hoc';
import { PMotionV10 } from '@/components/motion/premium-motion';
import { spacing, radius } from '@/constants/spacing';
import {
  Filter,
  ChevronRight,
  Sparkles,
  CalendarDays,
  CheckCircle,
  XCircle,
  ArrowRight,
  Heart,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { FlashList } from '@shopify/flash-list';
import Animated, { useSharedValue } from 'react-native-reanimated';

import {
  useUpcomingEvents,
  useMyRSVPs,
  useAttendedEvents,
  useRSVP,
  useCancelRSVP,
  useEventCategories,
} from '@/hooks/useEvents';
import { useAuthStore } from '@/stores/auth';
import type { EventWithMemberStatus } from '@/types/events';
import { ratingService } from '@/services/ratingService';
import { useQueryClient } from '@tanstack/react-query';
import { SearchBar } from '@/components/events/SearchBar';
import { SearchResults } from '@/components/events/SearchResults';
import { SearchEmptyState } from '@/components/events/SearchEmptyState';
import { EventCard } from '@/components/events/EventCard';
import { useEventFiltersStore } from '@/stores/eventFilters';
import { filterEvents } from '@/utils/eventFilters';

// Unified Overlay System
import {
  useOverlay,
  RatingModal,
  CategoryFilterSheet,
  CalendarSheet,
} from '@/components/overlay';
import type { RSVP, Attendance, Event } from '@/utils/eventStatus';

// New extracted header
import { EventsHeader, type EventsTab } from '@/components/events/EventsHeader';

// Shared motion from today-motion module
import { todayListItemMotion } from '@/components/motion/today-motion';

// Premium monochrome palette with accent - consistent with other pages
const Colors = {
  gradient: {
    start: '#1a1a2e',
    mid: '#16213e',
    end: '#0f3460',
  },
  accent: {
    primary: '#d4af37',
    light: '#f4d03f',
    dark: '#b8860b',
    sage: '#87a878',
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
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    600: '#2563eb',
  },
};

type Tab = EventsTab;

// Tab order for direction detection (Shared Axis X)
const TAB_ORDER: Tab[] = ['upcoming', 'my_rsvps', 'attended'];

function EventsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { member } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Focus key for animations - kept static to avoid replaying on tab switch
  const focusKey = 0;

  // Track previous tab for Shared Axis X direction
  const prevTabRef = useRef<Tab>('upcoming');
  const [tabDirection, setTabDirection] = useState<'forward' | 'backward'>('forward');

  // Unified Overlay System
  const overlay = useOverlay();

  // Search store
  const { searchTerm, isSearching } = useEventFiltersStore();

  // Fetch data for all tabs
  const upcomingQuery = useUpcomingEvents(
    selectedCategory ? { event_category_id: selectedCategory } : undefined
  );
  const rsvpsQuery = useMyRSVPs(
    selectedCategory ? { event_category_id: selectedCategory } : undefined
  );
  const attendedQuery = useAttendedEvents(
    selectedCategory ? { event_category_id: selectedCategory } : undefined
  );

  const { data: categories = [] } = useEventCategories();

  const rsvpMutation = useRSVP();
  const cancelRSVPMutation = useCancelRSVP();

  const [refreshing, setRefreshing] = useState(false);

  // TodayStyle scroll value driving collapsible header
  const scrollY = useSharedValue(0);

  const handleScrollEvent = useCallback((event: any) => {
    const y = event.nativeEvent.contentOffset.y ?? 0;
    scrollY.value = y;
  }, [scrollY]);

  // Query client for cache invalidation
  const queryClient = useQueryClient();

  // Stats
  const upcomingCount = upcomingQuery.data?.length || 0;
  const rsvpCount = rsvpsQuery.data?.length || 0;
  const attendedCount = attendedQuery.data?.length || 0;

  // Handle category filter open - using unified overlay
  const handleOpenCategoryFilter = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    overlay.showBottomSheet(CategoryFilterSheet, {
      categories,
      selectedCategory,
      onSelect: (categoryId: string | null) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedCategory(categoryId);
      },
    });
  }, [categories, selectedCategory, overlay]);

  // Handle calendar bottom sheet
  const handleOpenCalendar = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Build events array with status for calendar markers
    const calendarEvents: Array<{ id: string; date: string; status: 'upcoming' | 'rsvp' | 'attended' | 'passed' }> = [];

    // Add upcoming events
    upcomingQuery.data?.forEach((event) => {
      if (event.event_date) {
        const eventDate = new Date(event.event_date);
        const isPassed = eventDate < new Date();
        calendarEvents.push({
          id: event.id,
          date: event.event_date,
          status: isPassed ? 'passed' : 'upcoming',
        });
      }
    });

    // Add RSVP events (mark as rsvp)
    rsvpsQuery.data?.forEach((event) => {
      if (event.event_date) {
        // Check if already added as upcoming
        const existing = calendarEvents.find((e) => e.id === event.id);
        if (existing) {
          existing.status = 'rsvp'; // Upgrade status to rsvp
        } else {
          calendarEvents.push({
            id: event.id,
            date: event.event_date,
            status: 'rsvp',
          });
        }
      }
    });

    // Add attended events
    attendedQuery.data?.forEach((event) => {
      if (event.event_date) {
        const existing = calendarEvents.find((e) => e.id === event.id);
        if (existing) {
          existing.status = 'attended'; // Upgrade status to attended
        } else {
          calendarEvents.push({
            id: event.id,
            date: event.event_date,
            status: 'attended',
          });
        }
      }
    });

    overlay.showBottomSheet(CalendarSheet, {
      events: calendarEvents,
      onDateSelect: (_date: Date) => {
        // Optional: future date filtering logic
      },
    });
  }, [overlay, upcomingQuery.data, rsvpsQuery.data, attendedQuery.data]);

  // Handle tab change with Shared Axis X direction detection
  const handleTabChange = useCallback((newTab: Tab) => {
    if (newTab === activeTab) return;

    const prevIndex = TAB_ORDER.indexOf(prevTabRef.current);
    const newIndex = TAB_ORDER.indexOf(newTab);
    const direction = newIndex > prevIndex ? 'forward' : 'backward';

    setTabDirection(direction);
    prevTabRef.current = newTab;
    setActiveTab(newTab);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [activeTab]);

  // Get current tab data
  const getCurrentTabData = () => {
    if (activeTab === 'upcoming') return upcomingQuery;
    if (activeTab === 'my_rsvps') return rsvpsQuery;
    return attendedQuery;
  };

  const { data: events = [], isLoading, isError, refetch } = getCurrentTabData();

  // Prepare search data
  const allEvents = [
    ...(upcomingQuery.data || []),
    ...(rsvpsQuery.data || []),
    ...(attendedQuery.data || []),
  ];

  const eventsForSearch: Event[] = allEvents.map((event) => ({
    id: event.id,
    title: event.name,
    date: event.event_date || '',
    category: event.event_category_id,
    description: event.description,
    location: event.location,
  }));

  const userRsvps: RSVP[] = allEvents
    .filter((event) => event.my_rsvp)
    .map((event) => ({
      id: `rsvp-${event.id}`,
      event_id: event.id,
      user_id: member?.id || '',
    }));

  const userAttendance: Attendance[] = allEvents
    .filter((event) => event.my_attendance)
    .map((event) => ({
      id: `attendance-${event.id}`,
      event_id: event.id,
      user_id: member?.id || '',
    }));

  const searchResults = useMemo(() => {
    if (!isSearching) return null;
    return filterEvents({
      events: eventsForSearch,
      searchTerm,
      userRsvps,
      userAttendance,
    });
  }, [isSearching, eventsForSearch, searchTerm, userRsvps, userAttendance]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleRSVP = useCallback((eventId: string) => {
    if (!member?.id) {
      Alert.alert(t('common.error'), 'Member ID not available');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    rsvpMutation.mutate(
      { eventId, member_id: member.id },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert(t('common.success'), t('events.rsvpSuccess'));
        },
        onError: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert(t('common.error'), t('events.rsvpError'));
        },
      }
    );
  }, [member, rsvpMutation, t]);

  const handleCancelRSVP = useCallback((eventId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t('events.cancelRSVPTitle'),
      t('events.cancelRSVPMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: () => {
            cancelRSVPMutation.mutate(
              { eventId },
              {
                onSuccess: () => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                },
                onError: () => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                  Alert.alert(t('common.error'), t('events.cancelError'));
                },
              }
            );
          },
        },
      ]
    );
  }, [cancelRSVPMutation, t]);

  const handleShareEvent = useCallback(async (event: EventWithMemberStatus) => {
    try {
      const eventDate = event.event_date
        ? new Date(event.event_date).toLocaleDateString()
        : '';
      await Share.share({
        message: `${event.name}\n${eventDate}\n${event.location || ''}\n\n${event.description || ''}`,
        title: event.name,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error sharing event:', error);
    }
  }, []);

  // Rating submission handler (called from ModalHost)
  const handleSubmitRating = useCallback(async (eventId: string, rating: number, review: string) => {
    if (!member) return;

    try {
      await ratingService.createRating({
        event_id: eventId,
        member_id: member.id,
        rating,
        review: review || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['attended-events'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('common.success'), t('events.ratingSuccess'));
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.detail || t('events.ratingError'));
      throw error;
    }
  }, [member, queryClient, t]);

  // Open rating bottom sheet via unified overlay
  const handleOpenRatingModal = useCallback((event: EventWithMemberStatus, existingRating?: number, existingReview?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    overlay.showBottomSheet(RatingModal, {
      eventId: event.id,
      eventName: event.name,
      existingRating,
      existingReview,
      onSubmit: async (rating: number, review: string) => {
        await handleSubmitRating(event.id, rating, review);
      },
    });
  }, [overlay, handleSubmitRating]);

  const getEventRating = useCallback((eventId: string): { rated: boolean; rating?: number; review?: string } => {
    // Placeholder / mocked rating
    const hash = eventId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hasRating = hash % 3 === 0;

    if (hasRating) {
      const ratings = [7, 8, 9, 6, 10];
      const rating = ratings[hash % ratings.length];
      return { rated: true, rating, review: 'Great event! Really enjoyed it.' };
    }
    return { rated: false };
  }, []);

  // Render event card with shared Today-style motion
  const renderEvent = useCallback(
    ({ item, index }: { item: EventWithMemberStatus; index: number }) => (
      <Animated.View key={`event-${item.id}-${focusKey}`} entering={todayListItemMotion(index)}>
        <EventCard
          event={item}
          activeTab={activeTab}
          categories={categories}
          onRSVP={handleRSVP}
          onCancelRSVP={handleCancelRSVP}
          onShare={handleShareEvent}
          onOpenRating={handleOpenRatingModal}
          getEventRating={getEventRating}
          t={t}
          router={router}
          isRSVPPending={rsvpMutation.isPending}
          isCancelPending={cancelRSVPMutation.isPending}
        />
      </Animated.View>
    ),
    [
      activeTab,
      categories,
      handleRSVP,
      handleCancelRSVP,
      handleShareEvent,
      handleOpenRatingModal,
      getEventRating,
      rsvpMutation.isPending,
      cancelRSVPMutation.isPending,
      router,
      t,
      focusKey,
    ]
  );

  // Loading skeleton
  const LoadingSkeleton = () => (
    <View style={styles.skeletonWrap}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonImage} />
          <View style={styles.skeletonContent}>
            <View style={[styles.skeletonLine, { width: '40%', marginBottom: 8 }]} />
            <View style={[styles.skeletonLine, { width: '80%', marginBottom: 12 }]} />
            <View style={[styles.skeletonLine, { width: '60%' }]} />
          </View>
        </View>
      ))}
    </View>
  );

  // Empty state
  const EmptyState = () => {
    const getEmptyContent = () => {
      switch (activeTab) {
        case 'upcoming':
          return {
            icon: CalendarDays,
            title: t('events.noUpcomingEvents'),
            desc: t('events.noUpcomingEventsDesc'),
            action: selectedCategory ? t('events.clearFilters') : t('common.refresh'),
            onAction: selectedCategory ? () => setSelectedCategory(null) : handleRefresh,
          };
        case 'my_rsvps':
          return {
            icon: Heart,
            title: t('events.noRSVPs'),
            desc: t('events.noRSVPsDesc'),
            action: t('events.browseEvents'),
            onAction: () => handleTabChange('upcoming'),
          };
        case 'attended':
          return {
            icon: Sparkles,
            title: t('events.noAttended'),
            desc: t('events.noAttendedDesc'),
            action: t('events.exploreEvents'),
            onAction: () => handleTabChange('upcoming'),
          };
      }
    };

    const content = getEmptyContent();
    const IconComponent = content.icon;

    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyIcon}>
          <IconComponent size={48} color={Colors.neutral[400]} />
        </View>
        <Text style={styles.emptyTitle}>{content.title}</Text>
        <Text style={styles.emptyDesc}>{content.desc}</Text>
        <Pressable onPress={content.onAction} style={styles.emptyBtn}>
          <Text style={styles.emptyBtnText}>{content.action}</Text>
          <ArrowRight size={18} color={Colors.white} />
        </Pressable>
      </View>
    );
  };

  // Error state
  if (isError) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.errorWrap}>
          <XCircle size={48} color={Colors.error} />
          <Text style={styles.errorTitle}>{t('events.loadError')}</Text>
          <Text style={styles.errorDesc}>{t('events.loadErrorDesc')}</Text>
          <Pressable onPress={handleRefresh} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    // Important: PLAIN View here; withPremiumMotionV10 handles screen transitions.
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Today-style extracted header */}
      <EventsHeader
        t={t}
        topInset={insets.top}
        upcomingCount={upcomingCount}
        rsvpCount={rsvpCount}
        attendedCount={attendedCount}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onPressCalendar={handleOpenCalendar}
        scrollY={scrollY}
        focusKey={focusKey}
      />

      {/* Content */}
      {isSearching ? (
        <Animated.ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <SearchBar />
          {searchResults && searchResults.events.length > 0 ? (
            <SearchResults
              groupedResults={searchResults.groupedByStatus}
              counts={searchResults.counts}
            />
          ) : (
            <SearchEmptyState searchTerm={searchTerm} />
          )}
        </Animated.ScrollView>
      ) : (
        <View style={styles.flex1}>
          {/* Static header - search bar and filter */}
          <View style={styles.staticHeader}>
            <SearchBar />
            {categories.length > 0 && (
              <Pressable onPress={handleOpenCategoryFilter} style={styles.filterBtn}>
                <Filter size={18} color={Colors.gradient.end} />
                <Text style={styles.filterText}>
                  {selectedCategory
                    ? categories.find((c) => c.id === selectedCategory)?.name
                    : t('events.allCategories')}
                </Text>
                <ChevronRight size={18} color={Colors.neutral[400]} />
              </Pressable>
            )}
          </View>

          {/* Event cards with Shared Axis X transitions */}
          <Animated.View
            key={activeTab + '-tab'}
            entering={
              tabDirection === 'forward'
                ? PMotionV10.sharedAxisXForward
                : PMotionV10.sharedAxisXBackward
            }
            exiting={
              tabDirection === 'forward'
                ? PMotionV10.sharedAxisXExitForward
                : PMotionV10.sharedAxisXExitBackward
            }
            style={styles.flex1}
          >
            <FlashList
              data={events}
              renderItem={renderEvent}
              estimatedItemSize={340}
              keyExtractor={(item: EventWithMemberStatus) => item.id}
              onScroll={handleScrollEvent}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.flashListContentNoHeader}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={Colors.gradient.end}
                />
              }
              ListEmptyComponent={
                isLoading ? <LoadingSkeleton /> : <EmptyState />
              }
            />
          </Animated.View>
        </View>
      )}

      {/* Rating Modal is rendered by unified overlay host */}
    </View>
  );
}

// Memoize screen + Apply Premium Motion V10 Ultra HOC for production-grade transitions
const MemoizedEventsScreen = memo(EventsScreen);
MemoizedEventsScreen.displayName = 'EventsScreen';
export default withPremiumMotionV10(MemoizedEventsScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[100],
  },
  flex1: {
    flex: 1,
  },
  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.ml,
    paddingTop: spacing.ml,
    paddingBottom: spacing.xxl * 3,
  },
  // Static header for search bar and filter (no transition)
  staticHeader: {
    paddingHorizontal: spacing.ml,
    paddingTop: spacing.ml,
  },
  // FlashList content when static header is used
  flashListContentNoHeader: {
    paddingHorizontal: spacing.ml,
    paddingBottom: spacing.xxl * 3,
  },
  // Filter
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: radius.card,
    padding: spacing.sm,
    marginBottom: spacing.ml,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: spacing.s,
  },
  filterText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.neutral[800],
  },
  // Loading
  skeletonWrap: {
    gap: spacing.m,
  },
  skeletonCard: {
    backgroundColor: Colors.white,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  skeletonImage: {
    height: 160,
    backgroundColor: Colors.neutral[200],
  },
  skeletonContent: {
    padding: spacing.m,
  },
  skeletonLine: {
    height: 14,
    backgroundColor: Colors.neutral[200],
    borderRadius: 7,
  },
  // Empty
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: spacing.xxl + spacing.ml,
    paddingHorizontal: spacing.xxl,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.l,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.neutral[800],
    marginBottom: spacing.s,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 15,
    color: Colors.neutral[500],
    textAlign: 'center',
    marginBottom: spacing.l,
    lineHeight: 22,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gradient.end,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.sm,
    borderRadius: spacing.l,
    gap: spacing.s,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
  // Error
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.neutral[800],
    marginTop: spacing.m,
    marginBottom: spacing.s,
  },
  errorDesc: {
    fontSize: 15,
    color: Colors.neutral[500],
    textAlign: 'center',
    marginBottom: spacing.l,
  },
  retryBtn: {
    backgroundColor: Colors.gradient.end,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
});