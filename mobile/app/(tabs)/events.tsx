/**
 * Events Screen - Premium Redesign V11 (TodayStyle Architecture)
 *
 * Styling Strategy:
 * - NativeWind (className) for all layout and styling
 * - Inline style only for: dynamic values, custom colors, shadows
 */

import React, { useState, useCallback, useMemo, useRef, memo } from 'react';
import {
  View,
  Text,
  Pressable,
  RefreshControl,
  Share,
  Alert,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { withPremiumMotionV10 } from '@/hoc';
import { PMotionV10 } from '@/components/motion/premium-motion';
import {
  Filter,
  ChevronRight,
  Sparkles,
  CalendarDays,
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
import { getErrorMessage } from '@/utils/errorHelpers';

// Custom colors not in tailwind
const Colors = {
  gradient: {
    start: '#1a1a2e',
    mid: '#16213e',
    end: '#0f3460',
  },
  accent: {
    primary: '#d4af37',
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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

  const handleScrollEvent = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
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

  // Memoize calendar events array (computed once when data changes, not on every modal open)
  const calendarEvents = useMemo(() => {
    const events: Array<{ id: string; date: string; status: 'upcoming' | 'rsvp' | 'attended' | 'passed'; title?: string }> = [];
    const eventMap = new Map<string, typeof events[0]>();

    // Add upcoming events
    upcomingQuery.data?.forEach((event) => {
      if (event.event_date) {
        const eventDate = new Date(event.event_date);
        const isPassed = eventDate < new Date();
        eventMap.set(event.id, {
          id: event.id,
          date: event.event_date,
          status: isPassed ? 'passed' : 'upcoming',
          title: event.name,
        });
      }
    });

    // Update with RSVP status (higher priority)
    rsvpsQuery.data?.forEach((event) => {
      if (event.event_date) {
        const existing = eventMap.get(event.id);
        if (existing) {
          existing.status = 'rsvp';
        } else {
          eventMap.set(event.id, {
            id: event.id,
            date: event.event_date,
            status: 'rsvp',
            title: event.name,
          });
        }
      }
    });

    // Update with attended status (highest priority)
    attendedQuery.data?.forEach((event) => {
      if (event.event_date) {
        const existing = eventMap.get(event.id);
        if (existing) {
          existing.status = 'attended';
        } else {
          eventMap.set(event.id, {
            id: event.id,
            date: event.event_date,
            status: 'attended',
            title: event.name,
          });
        }
      }
    });

    return Array.from(eventMap.values());
  }, [upcomingQuery.data, rsvpsQuery.data, attendedQuery.data]);

  // Handle calendar bottom sheet
  const handleOpenCalendar = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    overlay.showBottomSheet(CalendarSheet, {
      events: calendarEvents,
      selectedDate: selectedDate || undefined,
      onDateSelect: (date: Date) => {
        // Immediately update filter when selecting a date
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onConfirm: (date: Date) => {
        // Apply date filter when user confirms
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedDate(date);
      },
    });
  }, [overlay, calendarEvents, selectedDate]);

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

  const { data: rawEvents = [], isLoading, isError, refetch } = getCurrentTabData();

  // Filter events by selected date
  const events = useMemo(() => {
    if (!selectedDate) return rawEvents;

    return rawEvents.filter((event) => {
      if (!event.event_date) return false;
      const eventDate = new Date(event.event_date);
      return (
        eventDate.getDate() === selectedDate.getDate() &&
        eventDate.getMonth() === selectedDate.getMonth() &&
        eventDate.getFullYear() === selectedDate.getFullYear()
      );
    });
  }, [rawEvents, selectedDate]);

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
    } catch (error: unknown) {
      Alert.alert(t('common.error'), getErrorMessage(error, t('events.ratingError')));
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
    <View className="gap-4">
      {[1, 2, 3].map((i) => (
        <View key={i} className="bg-white rounded-[18px] overflow-hidden">
          <View className="h-40 bg-neutral-200" />
          <View className="p-4">
            <View className="h-3.5 bg-neutral-200 rounded-lg w-2/5 mb-2" />
            <View className="h-3.5 bg-neutral-200 rounded-lg w-4/5 mb-3" />
            <View className="h-3.5 bg-neutral-200 rounded-lg w-3/5" />
          </View>
        </View>
      ))}
    </View>
  );

  // Empty state
  const EmptyState = () => {
    const hasFilters = selectedCategory || selectedDate;

    const getEmptyContent = () => {
      // If we have active filters and no results, show filter clear option
      if (hasFilters) {
        return {
          icon: CalendarDays,
          title: t('events.noEventsForFilter', 'No events found'),
          desc: selectedDate
            ? t('events.noEventsForDateDesc', 'No events on this date. Try selecting a different date or clear the filter.')
            : t('events.noEventsForCategoryDesc', 'No events in this category.'),
          action: t('events.clearFilters', 'Clear Filters'),
          onAction: () => {
            setSelectedCategory(null);
            setSelectedDate(null);
          },
        };
      }

      switch (activeTab) {
        case 'upcoming':
          return {
            icon: CalendarDays,
            title: t('events.noUpcomingEvents'),
            desc: t('events.noUpcomingEventsDesc'),
            action: t('common.refresh'),
            onAction: handleRefresh,
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
      <View className="items-center py-16 px-10">
        <View className="w-[100px] h-[100px] rounded-full bg-neutral-200 items-center justify-center mb-6">
          <IconComponent size={48} color="#A3A3A3" />
        </View>
        <Text className="text-xl font-bold text-typography-800 mb-2 text-center">
          {content.title}
        </Text>
        <Text
          className="text-[15px] text-typography-500 text-center mb-6"
          style={{ lineHeight: 22 }}
        >
          {content.desc}
        </Text>
        <Pressable
          onPress={content.onAction}
          className="flex-row items-center px-6 py-3 rounded-3xl gap-2"
          style={{ backgroundColor: Colors.gradient.end }}
        >
          <Text className="text-[15px] font-semibold text-white">
            {content.action}
          </Text>
          <ArrowRight size={18} color="#FFFFFF" />
        </Pressable>
      </View>
    );
  };

  // Error state
  if (isError) {
    return (
      <View className="flex-1 bg-background-100" style={{ paddingTop: insets.top }}>
        <View className="flex-1 items-center justify-center px-10">
          <XCircle size={48} color="#EF4444" />
          <Text className="text-xl font-bold text-typography-800 mt-4 mb-2">
            {t('events.loadError')}
          </Text>
          <Text className="text-[15px] text-typography-500 text-center mb-6">
            {t('events.loadErrorDesc')}
          </Text>
          <Pressable
            onPress={handleRefresh}
            className="px-6 py-3 rounded-[20px]"
            style={{ backgroundColor: Colors.gradient.end }}
          >
            <Text className="text-[15px] font-semibold text-white">
              {t('common.retry')}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-100">
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
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 }}
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
        <View className="flex-1">
          {/* Static header - search bar and filter */}
          <View className="px-5 pt-5">
            <SearchBar />

            {/* Active date filter indicator */}
            {selectedDate && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedDate(null);
                }}
                className="flex-row items-center bg-blue-50 rounded-[18px] p-3 mb-3 gap-2 border border-blue-200"
              >
                <CalendarDays size={18} color="#2563EB" />
                <Text className="flex-1 text-[15px] font-semibold text-blue-700">
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
                <XCircle size={18} color="#2563EB" />
              </Pressable>
            )}

            {categories.length > 0 && (
              <Pressable
                onPress={handleOpenCategoryFilter}
                className="flex-row items-center bg-white rounded-[18px] p-3 mb-5 gap-2"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <Filter size={18} color={Colors.gradient.end} />
                <Text className="flex-1 text-[15px] font-semibold text-typography-800">
                  {selectedCategory
                    ? categories.find((c) => c.id === selectedCategory)?.name
                    : t('events.allCategories')}
                </Text>
                <ChevronRight size={18} color="#A3A3A3" />
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
            className="flex-1"
          >
            <FlashList
              data={events}
              renderItem={renderEvent}
              estimatedItemSize={340}
              keyExtractor={(item: EventWithMemberStatus) => item.id}
              onScroll={handleScrollEvent}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
              // Performance optimizations
              initialNumToRender={5}
              maxToRenderPerBatch={5}
              windowSize={5}
              drawDistance={300}
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
    </View>
  );
}

// Memoize screen + Apply Premium Motion V10 Ultra HOC for production-grade transitions
const MemoizedEventsScreen = memo(EventsScreen);
MemoizedEventsScreen.displayName = 'EventsScreen';
export default withPremiumMotionV10(MemoizedEventsScreen);
