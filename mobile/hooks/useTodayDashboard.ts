/**
 * useTodayDashboard - Consolidated Data Hook for Today Screen
 *
 * Wraps all data fetching for the Today screen into a single hook.
 * Benefits:
 * - Single point of control for all Today screen data
 * - Unified refresh with parallel fetching
 * - Consistent loading/error states
 * - Pre-computed derived values (stats, counts)
 *
 * Performance Notes:
 * - Uses existing hooks (preserves demo mode logic)
 * - Memoized derived values to prevent re-renders
 * - Single refetch function for pull-to-refresh
 */

import { useCallback, useMemo } from 'react';
import { useGivingSummary } from './useGiving';
import { usePrayerRequests } from './usePrayer';
import { useUpcomingEvents } from './useEvents';

export interface TodayDashboardData {
  // Raw data
  givingSummary: ReturnType<typeof useGivingSummary>['data'];
  prayerRequests: ReturnType<typeof usePrayerRequests>['data'];
  upcomingEvents: ReturnType<typeof useUpcomingEvents>['data'];

  // Derived stats
  activePrayers: number;
  upcomingCount: number;

  // Loading states
  isLoading: boolean;
  isRefetching: boolean;
}

export function useTodayDashboard() {
  // Individual data hooks - preserves demo mode and caching logic
  const {
    data: givingSummary,
    refetch: refetchGiving,
    isLoading: givingLoading,
    isRefetching: givingRefetching,
  } = useGivingSummary();

  const {
    data: prayerRequests,
    refetch: refetchPrayer,
    isLoading: prayerLoading,
    isRefetching: prayerRefetching,
  } = usePrayerRequests();

  const {
    data: upcomingEvents,
    refetch: refetchEvents,
    isLoading: eventsLoading,
    isRefetching: eventsRefetching,
  } = useUpcomingEvents();

  // Derived stats - memoized to prevent re-renders
  const activePrayers = useMemo(
    () => prayerRequests?.filter((r) => r.status === 'active').length ?? 0,
    [prayerRequests]
  );

  const upcomingCount = useMemo(
    () => upcomingEvents?.length ?? 0,
    [upcomingEvents]
  );

  // Combined loading state
  const isLoading = givingLoading || prayerLoading || eventsLoading;
  const isRefetching = givingRefetching || prayerRefetching || eventsRefetching;

  // Single refresh function - parallel fetch
  const refetch = useCallback(async () => {
    await Promise.all([refetchGiving(), refetchPrayer(), refetchEvents()]);
  }, [refetchGiving, refetchPrayer, refetchEvents]);

  // Memoized return object to prevent unnecessary re-renders
  const data: TodayDashboardData = useMemo(
    () => ({
      givingSummary,
      prayerRequests,
      upcomingEvents,
      activePrayers,
      upcomingCount,
      isLoading,
      isRefetching,
    }),
    [
      givingSummary,
      prayerRequests,
      upcomingEvents,
      activePrayers,
      upcomingCount,
      isLoading,
      isRefetching,
    ]
  );

  return {
    data,
    refetch,
    isLoading,
    isRefetching,
  };
}
