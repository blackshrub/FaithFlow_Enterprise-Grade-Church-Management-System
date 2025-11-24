/**
 * Calendar Modal (Global)
 *
 * Full-screen calendar view with event markers
 * Controlled via Zustand store
 * Uses BottomSheet with declarative control
 * Integrates with eventFilters store for date filtering
 */

import React, { useRef, useCallback, useMemo } from 'react';
import { View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon, X } from 'lucide-react-native';
import { MotiView } from 'moti';
import BottomSheet, { BottomSheetBackdrop, BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { Calendar } from '@marceloterreiro/flash-calendar';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Button, ButtonText } from '@/components/ui/button';
import { colors, shadows } from '@/constants/theme';
import { useCalendarModalStore } from '@/stores/calendarModal';
import { useEventFiltersStore } from '@/stores/eventFilters';
import { getCalendarMarkers, filterEvents } from '@/utils/eventFilters';
import { useUpcomingEvents, useMyRSVPs, useAttendedEvents } from '@/hooks/useEvents';
import { useAuthStore } from '@/stores/auth';
import type { Event, RSVP, Attendance } from '@/utils/eventStatus';

export function CalendarModal() {
  const { t } = useTranslation();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['90%'], []);

  const { visible, close } = useCalendarModalStore();
  const { selectedDate, setSelectedDate, clearSelectedDate } = useEventFiltersStore();
  const { member } = useAuthStore();

  // Fetch all events
  const upcomingQuery = useUpcomingEvents();
  const rsvpsQuery = useMyRSVPs();
  const attendedQuery = useAttendedEvents();

  // Combine all events
  const allEvents = useMemo(
    () => [
      ...(upcomingQuery.data || []),
      ...(rsvpsQuery.data || []),
      ...(attendedQuery.data || []),
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

  // Extract RSVP and Attendance records
  const userRsvps: RSVP[] = useMemo(
    () =>
      allEvents
        .filter((event) => event.my_rsvp)
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
        .filter((event) => event.my_attendance)
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

  // Get calendar markers (event dots)
  const calendarMarkers = useMemo(
    () => getCalendarMarkers(filteredResults.results),
    [filteredResults.results]
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
    close();
  }, [close]);

  const handleDateSelect = useCallback(
    (date: string) => {
      const selectedDateObj = new Date(date);
      setSelectedDate(selectedDateObj);
    },
    [setSelectedDate]
  );

  const handleClearDate = useCallback(() => {
    clearSelectedDate();
    close();
  }, [clearSelectedDate, close]);

  // Filter events for selected date
  const eventsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];

    return filteredResults.results.filter((event) => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getDate() === selectedDate.getDate() &&
        eventDate.getMonth() === selectedDate.getMonth() &&
        eventDate.getFullYear() === selectedDate.getFullYear()
      );
    });
  }, [selectedDate, filteredResults.results]);

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

        {/* Calendar */}
        <View className="mb-4">
          <Calendar
            calendarActiveDateRanges={[
              selectedDate
                ? {
                    startId: selectedDate.toISOString().split('T')[0],
                    endId: selectedDate.toISOString().split('T')[0],
                  }
                : undefined,
            ].filter(Boolean)}
            calendarColorScheme="light"
            calendarFirstDayOfWeek="sunday"
            onCalendarDayPress={handleDateSelect}
            theme={{
              rowMonth: {
                content: {
                  textAlign: 'left',
                  color: colors.gray[900],
                  fontWeight: 'bold',
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
                    backgroundColor: isPressed ? colors.primary[50] : 'transparent',
                  },
                  content: {
                    color: colors.primary[600],
                    fontWeight: 'bold',
                  },
                }),
                active: ({ isPressed }) => ({
                  container: {
                    backgroundColor: colors.primary[500],
                    borderRadius: 12,
                  },
                  content: {
                    color: colors.white,
                    fontWeight: 'bold',
                  },
                }),
              },
            }}
          />
        </View>

        {/* Clear Date Button */}
        {selectedDate && (
          <MotiView
            from={{ opacity: 0, translateY: -10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 250 }}
            className="mb-4"
          >
            <Button onPress={handleClearDate} variant="outline" size="md">
              <Icon as={X} size="sm" className="text-gray-600 mr-2" />
              <ButtonText className="font-semibold">{t('events.calendar.clearDate')}</ButtonText>
            </Button>
          </MotiView>
        )}

        {/* Events for Selected Date */}
        {selectedDate && (
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 250, delay: 100 }}
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
                  {eventsForSelectedDate.slice(0, 3).map((event, index) => (
                    <MotiView
                      key={event.id}
                      from={{ opacity: 0, translateX: -10 }}
                      animate={{ opacity: 1, translateX: 0 }}
                      transition={{
                        type: 'timing',
                        duration: 200,
                        delay: index * 50,
                      }}
                    >
                      <View
                        className="p-3 rounded-xl border border-gray-200"
                        style={shadows.sm}
                      >
                        <Text className="text-gray-900 font-semibold text-sm" numberOfLines={1}>
                          {event.title}
                        </Text>
                        {event.location && (
                          <Text className="text-gray-500 text-xs mt-1" numberOfLines={1}>
                            {event.location}
                          </Text>
                        )}
                      </View>
                    </MotiView>
                  ))}

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
          </MotiView>
        )}
      </View>
    </BottomSheet>
  );
}
