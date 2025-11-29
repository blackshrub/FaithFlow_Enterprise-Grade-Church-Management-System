/**
 * Calendar Modal (Global)
 *
 * Full-screen calendar view with event markers
 * Controlled via Zustand store
 * Uses BottomSheet with declarative control
 * Integrates with eventFilters store for date filtering
 */

import React, { useRef, useCallback, useMemo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon, X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import Animated, { FadeIn, FadeInUp, SlideInRight } from 'react-native-reanimated';
import BottomSheet, { BottomSheetBackdrop, BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { Calendar, toDateId } from '@marceloterreiro/flash-calendar';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Button, ButtonText } from '@/components/ui/button';
import { colors, shadows } from '@/constants/theme';
import { useCalendarModalStore } from '@/stores/calendarModal';
import { useEventFiltersStore } from '@/stores/eventFilters';
import { getCalendarMarkers, filterEvents, getStatusColors, convertMarkersToActiveDateRanges } from '@/utils/eventFilters';
import { useUpcomingEvents, useMyRSVPs, useAttendedEvents } from '@/hooks/useEvents';
import { useAuthStore } from '@/stores/auth';
import type { Event, RSVP, Attendance } from '@/utils/eventStatus';
import { computeEventStatus, getStatusConfig } from '@/utils/eventStatus';
import { EventStatusBadge } from '@/components/events/EventStatusBadge';
import { mockCalendarEvents } from '@/utils/mockCalendarEvents';

export function CalendarModal() {
  const { t } = useTranslation();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['90%'], []);

  // Current month for calendar display
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { visible, close } = useCalendarModalStore();
  const { selectedDate, setSelectedDate, clearSelectedDate } = useEventFiltersStore();
  const { member } = useAuthStore();

  // Fetch all events
  const upcomingQuery = useUpcomingEvents();
  const rsvpsQuery = useMyRSVPs();
  const attendedQuery = useAttendedEvents();

  // Check if any query is loading
  const isLoading = upcomingQuery.isLoading || rsvpsQuery.isLoading || attendedQuery.isLoading;

  // Combine all events (including mock data for testing)
  const allEvents = useMemo(
    () => [
      ...(upcomingQuery.data || []),
      ...(rsvpsQuery.data || []),
      ...(attendedQuery.data || []),
      ...mockCalendarEvents, // Add mock events for testing multi-status indicators
    ],
    [upcomingQuery.data, rsvpsQuery.data, attendedQuery.data]
  );

  // Transform to Event interface for filtering
  const eventsForCalendar: Event[] = useMemo(
    () =>
      allEvents.map((event) => ({
        id: event.id,
        title: event.name,
        date: event.event_date || '',
        category: event.event_category_id,
        description: event.description,
        location: event.location,
      })),
    [allEvents]
  );

  // Extract RSVP and Attendance records from events
  // NOTE: These need to match the event IDs, including mock events
  const userRsvps: RSVP[] = useMemo(
    () =>
      allEvents
        .filter((event) => event.my_rsvp === true)
        .map((event) => ({
          id: `rsvp-${event.id}`,
          event_id: event.id,
          user_id: member?.id || '',
        })),
    [allEvents, member?.id]
  );

  const userAttendance: Attendance[] = useMemo(
    () =>
      allEvents
        .filter((event) => event.my_attendance === true)
        .map((event) => ({
          id: `attendance-${event.id}`,
          event_id: event.id,
          user_id: member?.id || '',
        })),
    [allEvents, member?.id]
  );

  // Get filtered events
  const filteredResults = useMemo(
    () =>
      filterEvents({
        events: eventsForCalendar,
        userRsvps,
        userAttendance,
      }),
    [eventsForCalendar, userRsvps, userAttendance]
  );

  // Get calendar markers (event dots) - Map of date -> statuses
  const calendarMarkersMap = useMemo(
    () => getCalendarMarkers(filteredResults.events, userRsvps, userAttendance),
    [filteredResults.events, userRsvps, userAttendance]
  );

  // Convert map to array format for calendarActiveDateRanges (blue outline only)
  const calendarActiveDates = useMemo(() => {
    const dates: Array<{ startId: string; endId: string }> = [];
    calendarMarkersMap.forEach((statuses, dateKey) => {
      if (statuses.length > 0) {
        dates.push({ startId: dateKey, endId: dateKey });
      }
    });
    return dates;
  }, [calendarMarkersMap]);

  // Get status colors
  const statusColors = getStatusColors();

  // Helper function to get calendar grid structure for dot positioning
  const getCalendarGrid = useCallback((month: Date) => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);

    // Monday is first day (0 = Monday, 6 = Sunday)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6; // Sunday becomes 6

    const daysInMonth = lastDay.getDate();
    const grid: Array<{ date: number; row: number; col: number }> = [];

    let currentRow = 0;
    let currentCol = startDayOfWeek;

    for (let day = 1; day <= daysInMonth; day++) {
      grid.push({ date: day, row: currentRow, col: currentCol });
      currentCol++;
      if (currentCol > 6) {
        currentCol = 0;
        currentRow++;
      }
    }

    return grid;
  }, []);

  const calendarGrid = useMemo(() => getCalendarGrid(currentMonth), [currentMonth, getCalendarGrid]);

  // Custom week day format function for calendar
  // The library expects a function that receives a Date and returns the formatted day name
  const getCalendarWeekDayFormat = useCallback(
    (date: Date) => {
      const dayIndex = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      // Since we set calendarFirstDayOfWeek="monday", we need to map accordingly
      const dayNames = [
        t('common.dayNames.sunday'),
        t('common.dayNames.monday'),
        t('common.dayNames.tuesday'),
        t('common.dayNames.wednesday'),
        t('common.dayNames.thursday'),
        t('common.dayNames.friday'),
        t('common.dayNames.saturday'),
      ];
      return dayNames[dayIndex];
    },
    [t]
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  const handleDismiss = useCallback(() => {
    bottomSheetRef.current?.close();
    close();
  }, [close]);

  const handleDateSelect = useCallback(
    (date: string) => {
      if (!date) return;
      const selectedDateObj = new Date(date);
      // Only set if it's a valid date
      if (!isNaN(selectedDateObj.getTime())) {
        // If user taps the same date again, clear it (toggle behavior)
        if (
          selectedDate &&
          selectedDateObj.getDate() === selectedDate.getDate() &&
          selectedDateObj.getMonth() === selectedDate.getMonth() &&
          selectedDateObj.getFullYear() === selectedDate.getFullYear()
        ) {
          clearSelectedDate();
        } else {
          setSelectedDate(selectedDateObj);
        }
      }
    },
    [setSelectedDate, selectedDate, clearSelectedDate]
  );

  const handleClearDate = useCallback(() => {
    clearSelectedDate();
    close();
  }, [clearSelectedDate, close]);

  const handlePrevMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  }, []);

  // Filter events for selected date
  const eventsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];

    return filteredResults.events.filter((event) => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getDate() === selectedDate.getDate() &&
        eventDate.getMonth() === selectedDate.getMonth() &&
        eventDate.getFullYear() === selectedDate.getFullYear()
      );
    });
  }, [selectedDate, filteredResults.events]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={visible ? 0 : -1}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableDynamicSizing={false}
      bottomInset={0}
      onClose={handleDismiss}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: colors.white,
      }}
      handleIndicatorStyle={{
        backgroundColor: colors.gray[300],
        width: 40,
        height: 4,
      }}
    >
      <View className="flex-1 px-6 pb-8">
        {/* Header */}
        <HStack className="justify-between items-center mb-4">
          <VStack>
            <Heading size="xl" className="text-gray-900 font-bold">
              {t('events.calendar.title')}
            </Heading>
            <Text className="text-gray-500 text-sm">{t('events.calendar.selectDate')}</Text>
          </VStack>

          <Pressable onPress={handleDismiss} className="active:opacity-70">
            <View
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.gray[100] }}
            >
              <Icon as={X} size="md" className="text-gray-600" />
            </View>
          </Pressable>
        </HStack>

        {/* Month Navigation */}
        <HStack className="justify-between items-center mb-2 px-2">
          <Pressable onPress={handlePrevMonth} className="active:opacity-70" hitSlop={10}>
            <View
              className="w-9 h-9 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.gray[100] }}
            >
              <Icon as={ChevronLeft} size="md" className="text-gray-700" />
            </View>
          </Pressable>

          <Text className="text-gray-900 font-bold text-base">
            {currentMonth.toLocaleDateString(t('common.locale'), {
              month: 'long',
              year: 'numeric',
            })}
          </Text>

          <Pressable onPress={handleNextMonth} className="active:opacity-70" hitSlop={10}>
            <View
              className="w-9 h-9 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.gray[100] }}
            >
              <Icon as={ChevronRight} size="md" className="text-gray-700" />
            </View>
          </Pressable>
        </HStack>

        {/* Calendar */}
        <View className="mb-4">
          <Calendar
            calendarMonthId={currentMonth.toISOString().split('T')[0]}
            calendarActiveDateRanges={undefined}
            calendarColorScheme="light"
            calendarFirstDayOfWeek="monday"
            calendarDayHeight={56}
            onCalendarDayPress={handleDateSelect}
            calendarRowVerticalSpacing={8}
            calendarRowHorizontalSpacing={8}
            getCalendarWeekDayFormat={getCalendarWeekDayFormat}
            theme={{
              rowMonth: {
                content: {
                  display: 'none', // Hide the redundant month title inside calendar
                },
              },
              rowWeek: {
                container: {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.gray[200],
                  paddingBottom: 8,
                  marginBottom: 8,
                },
              },
              itemWeekName: {
                content: {
                  color: colors.gray[500],
                  fontWeight: '600',
                  fontSize: 12,
                },
              },
              itemDay: {
                idle: ({ isPressed, isWeekend }) => ({
                  container: {
                    backgroundColor: isPressed ? colors.primary[100] : 'transparent',
                    borderRadius: 12,
                  },
                  content: {
                    color: isWeekend ? colors.gray[500] : colors.gray[900],
                  },
                }),
                today: ({ isPressed }) => ({
                  container: {
                    borderColor: colors.primary[500],
                    borderWidth: 2,
                    borderRadius: 12,
                    backgroundColor: isPressed ? colors.primary[100] : 'transparent',
                  },
                  content: {
                    color: colors.primary[600],
                    fontWeight: 'bold',
                  },
                }),
                active: ({ isPressed, isEndOfRange, isStartOfRange }) => ({
                  container: {
                    borderRadius: 12,
                    backgroundColor: isPressed ? colors.primary[100] : 'transparent',
                  },
                  content: {
                    color: colors.gray[900],
                    fontWeight: 'bold',
                  },
                }),
              },
            }}
          />

          {/* Colored Dots Overlay on Calendar Dates */}
          <View
            style={{
              position: 'absolute',
              top: 48, // Height of week day names row + spacing
              left: 0,
              right: 0,
              pointerEvents: 'none', // Don't block calendar touch events
            }}
          >
            {calendarGrid.map((gridCell) => {
              const dateKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(gridCell.date).padStart(2, '0')}`;
              const statuses = calendarMarkersMap.get(dateKey) || [];

              if (statuses.length === 0) return null;

              // Calculate position
              const DOT_SIZE = 5;
              const DOT_SPACING = 2;
              const DAY_CELL_HEIGHT = 56;
              const ROW_SPACING = 8;

              // Approximate column width (container width / 7)
              // We use percentage positioning for better responsiveness
              const colWidthPercent = 100 / 7;
              const leftPercent = gridCell.col * colWidthPercent;

              // Add one row offset (64px) to fix dots appearing 7 days too early
              const topPosition = (gridCell.row + 1) * (DAY_CELL_HEIGHT + ROW_SPACING) + 38; // 38px = bottom of date number

              return (
                <View
                  key={dateKey}
                  style={{
                    position: 'absolute',
                    left: `${leftPercent}%`,
                    top: topPosition,
                    width: `${colWidthPercent}%`,
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: DOT_SPACING,
                  }}
                >
                  {statuses.map((status, index) => (
                    <View
                      key={`${dateKey}-${status}-${index}`}
                      style={{
                        width: DOT_SIZE,
                        height: DOT_SIZE,
                        borderRadius: DOT_SIZE / 2,
                        backgroundColor: statusColors[status],
                      }}
                    />
                  ))}
                </View>
              );
            })}
          </View>

          {/* Event Indicator Dots Overlay - Positioned below calendar */}
          <View style={{ marginTop: 8 }}>
            <Text className="text-gray-600 text-xs font-semibold mb-2">
              {t('events.calendar.eventIndicators')}
            </Text>
            <HStack space="md" className="flex-wrap">
              <HStack space="xs" className="items-center">
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb' }} />
                <Text className="text-gray-600 text-xs">{t('events.upcoming')}</Text>
              </HStack>
              <HStack space="xs" className="items-center">
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#16a34a' }} />
                <Text className="text-gray-600 text-xs">{t('events.myRSVPs')}</Text>
              </HStack>
              <HStack space="xs" className="items-center">
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#f97316' }} />
                <Text className="text-gray-600 text-xs">{t('events.attended')}</Text>
              </HStack>
              <HStack space="xs" className="items-center">
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#6b7280' }} />
                <Text className="text-gray-600 text-xs">{t('events.passed')}</Text>
              </HStack>
            </HStack>
          </View>
        </View>

        {/* Clear Date Button */}
        {selectedDate && (
          <Animated.View
            entering={FadeInUp.duration(250)}
            className="mb-4"
          >
            <Button onPress={handleClearDate} variant="outline" size="md">
              <Icon as={X} size="sm" className="text-gray-600 mr-2" />
              <ButtonText className="font-semibold">{t('events.calendar.clearDate')}</ButtonText>
            </Button>
          </Animated.View>
        )}

        {/* Loading State */}
        {isLoading && (
          <View className="items-center justify-center py-8">
            <Text className="text-gray-500 text-sm">{t('events.loadingEvents')}</Text>
          </View>
        )}

        {/* Events for Selected Date */}
        {!isLoading && selectedDate && (
          <Animated.View
            entering={FadeInUp.delay(100).duration(250)}
          >
            <VStack space="sm">
              <Text className="text-gray-700 font-bold text-sm">
                {t('events.calendar.eventsOnDate')} (
                {selectedDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })})
              </Text>

              {eventsForSelectedDate.length > 0 ? (
                <VStack space="xs">
                  {eventsForSelectedDate.slice(0, 3).map((event, index) => {
                    const eventStatus = computeEventStatus(event, userRsvps, userAttendance);
                    const statusConfig = getStatusConfig(eventStatus);

                    return (
                      <Animated.View
                        key={event.id}
                        entering={SlideInRight.delay(index * 50).duration(200)}
                      >
                        <View
                          className="p-3 rounded-xl border border-gray-200"
                          style={[
                            shadows.sm,
                            {
                              backgroundColor: statusConfig.bgColor,
                              borderLeftWidth: 4,
                              borderLeftColor: statusConfig.color,
                            },
                          ]}
                        >
                          <HStack className="justify-between items-start">
                            <VStack className="flex-1 pr-2">
                              <Text className="text-gray-900 font-semibold text-sm" numberOfLines={1}>
                                {event.title}
                              </Text>
                              {event.location && (
                                <Text className="text-gray-500 text-xs mt-1" numberOfLines={1}>
                                  {event.location}
                                </Text>
                              )}
                            </VStack>
                            <EventStatusBadge status={eventStatus} delay={0} />
                          </HStack>
                        </View>
                      </Animated.View>
                    );
                  })}

                  {eventsForSelectedDate.length > 3 && (
                    <Text className="text-gray-500 text-xs text-center mt-2">
                      {t('events.calendar.moreEvents', {
                        count: eventsForSelectedDate.length - 3,
                      })}
                    </Text>
                  )}
                </VStack>
              ) : (
                <View
                  className="p-4 rounded-xl items-center justify-center"
                  style={{ backgroundColor: colors.gray[50] }}
                >
                  <Icon as={CalendarIcon} size="lg" className="text-gray-400 mb-2" />
                  <Text className="text-gray-500 text-sm">{t('events.calendar.noEvents')}</Text>
                </View>
              )}
            </VStack>
          </Animated.View>
        )}
      </View>
    </BottomSheet>
  );
}
