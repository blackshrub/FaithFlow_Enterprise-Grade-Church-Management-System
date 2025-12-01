/**
 * CalendarSheet - Unified Overlay System
 *
 * Bottom sheet for calendar date picker with event markers.
 * Used via: overlay.showBottomSheet(CalendarSheet, payload)
 *
 * Styling: NativeWind-first with inline style for dynamic/calculated values
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, ScrollView, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import type { OverlayComponentProps } from '@/stores/overlayStore';
import { Text } from '@/components/ui/text';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Calculated cell size (needs inline style)
const CELL_SIZE = (SCREEN_WIDTH - 40) / 7; // 40 = px-5 * 2

// Premium colors - for icon colors only
const Colors = {
  neutral: {
    100: '#F5F5F5',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    900: '#171717',
  },
  white: '#FFFFFF',
  primary: {
    50: '#EFF6FF',
    500: '#3B82F6',
    700: '#1D4ED8',
  },
};

// Event status colors for markers
const STATUS_COLORS = {
  upcoming: '#2563EB', // Blue
  rsvp: '#16A34A',     // Green
  attended: '#F97316', // Orange
  passed: '#6B7280',   // Gray
};

// Day names for header
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Event type for calendar
interface CalendarEvent {
  id: string;
  date: string; // ISO date string
  status: 'upcoming' | 'rsvp' | 'attended' | 'passed';
  title?: string; // Optional event title for list display
}

// Extended payload type
interface CalendarSheetPayload {
  selectedDate?: Date;
  events?: CalendarEvent[];
  onDateSelect?: (date: Date) => void;
  onConfirm?: (date: Date) => void;
}

interface CalendarDayProps {
  day: number;
  isSelected: boolean;
  isToday: boolean;
  isCurrentMonth: boolean;
  markers: Array<'upcoming' | 'rsvp' | 'attended' | 'passed'>;
  onPress: () => void;
}

function CalendarDay({ day, isSelected, isToday, isCurrentMonth, markers, onPress }: CalendarDayProps) {
  // Determine text color based on state
  const getTextColor = () => {
    if (isSelected) return Colors.white;
    if (isToday) return Colors.primary[700];
    if (!isCurrentMonth) return Colors.neutral[400];
    return Colors.neutral[900];
  };

  // Determine cell background/border based on state
  const getCellStyle = () => {
    if (isSelected) {
      return { backgroundColor: Colors.primary[500] };
    }
    if (isToday) {
      return {
        backgroundColor: Colors.primary[50],
        borderWidth: 2,
        borderColor: Colors.primary[500],
      };
    }
    return {};
  };

  return (
    <Pressable
      onPress={onPress}
      className="items-center justify-center"
      style={[
        {
          width: CELL_SIZE,
          height: CELL_SIZE,
          borderRadius: CELL_SIZE / 2,
        },
        getCellStyle(),
      ]}
    >
      {/* Date number - centered */}
      <Text
        className="text-base font-medium"
        style={{
          color: getTextColor(),
          fontWeight: isSelected || isToday ? '700' : '500',
        }}
      >
        {day}
      </Text>

      {/* Event markers (dots) - absolute positioned at bottom */}
      {markers.length > 0 && (
        <View className="absolute bottom-1.5 flex-row gap-0.5">
          {markers.slice(0, 3).map((status, index) => (
            <View
              key={`${status}-${index}`}
              className="w-[5px] h-[5px] rounded-full"
              style={{ backgroundColor: STATUS_COLORS[status] }}
            />
          ))}
        </View>
      )}
    </Pressable>
  );
}

export const CalendarSheet: React.FC<OverlayComponentProps<CalendarSheetPayload>> = ({
  payload,
  onClose,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  if (!payload) return null;

  const [currentMonth, setCurrentMonth] = useState(() => {
    const initial = payload.selectedDate || new Date();
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(payload.selectedDate);

  // Build a map of date -> statuses for quick lookup
  const eventsByDate = useMemo(() => {
    const map = new Map<string, Array<'upcoming' | 'rsvp' | 'attended' | 'passed'>>();

    if (payload.events) {
      payload.events.forEach((event) => {
        const dateKey = event.date.split('T')[0]; // Get YYYY-MM-DD
        const existing = map.get(dateKey) || [];
        if (!existing.includes(event.status)) {
          existing.push(event.status);
        }
        map.set(dateKey, existing);
      });
    }

    return map;
  }, [payload.events]);

  // Get calendar days for the current month view
  const getCalendarDays = useCallback(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // First day of the month (0 = Sunday, adjust for Monday start)
    const firstDay = new Date(year, month, 1);
    let startDay = firstDay.getDay() - 1; // Adjust for Monday start
    if (startDay < 0) startDay = 6;

    // Number of days in current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Number of days in previous month
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: { day: number; isCurrentMonth: boolean; date: Date; dateKey: string }[] = [];

    // Previous month days
    for (let i = startDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const date = new Date(year, month - 1, day);
      days.push({
        day,
        isCurrentMonth: false,
        date,
        dateKey: date.toISOString().split('T')[0],
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({
        day,
        isCurrentMonth: true,
        date,
        dateKey: date.toISOString().split('T')[0],
      });
    }

    // Next month days (fill to complete 6 rows)
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        day,
        isCurrentMonth: false,
        date,
        dateKey: date.toISOString().split('T')[0],
      });
    }

    return days;
  }, [currentMonth]);

  const handleDateSelect = useCallback((date: Date) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDate(date);
    if (payload.onDateSelect) {
      payload.onDateSelect(date);
    }
  }, [payload]);

  const handleConfirm = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (selectedDate && payload.onConfirm) {
      payload.onConfirm(selectedDate);
    }
    onClose();
  }, [selectedDate, payload, onClose]);

  const handlePrevMonth = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const today = new Date();
  const calendarDays = getCalendarDays();
  const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  // Check if we have events to show legend
  const hasEvents = payload.events && payload.events.length > 0;

  return (
    <View
      className="bg-white rounded-t-3xl"
      style={{
        maxHeight: SCREEN_HEIGHT * 0.85,
        paddingBottom: insets.bottom + 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 12,
      }}
    >
      {/* Handle indicator */}
      <View className="items-center pt-3 pb-2">
        <View className="w-10 h-1 rounded-full bg-black/20" />
      </View>

      <View className="px-5 pt-2">
        {/* Header */}
        <View className="flex-row items-start justify-between mb-4">
          <View className="flex-1 mr-4">
            <Text
              className="text-[22px] font-bold text-neutral-900 mb-1"
              style={{ letterSpacing: -0.3 }}
            >
              {t('events.calendar.title', 'Select Date')}
            </Text>
            <Text className="text-sm text-neutral-500">
              {t('events.calendar.selectDate', 'Choose a date to filter events')}
            </Text>
          </View>

          {/* Close button - 44px for finger-friendly touch */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
            className="w-11 h-11 rounded-full bg-neutral-100 items-center justify-center active:opacity-70"
          >
            <X size={20} color={Colors.neutral[600]} />
          </Pressable>
        </View>

        {/* Month Navigation */}
        <View className="flex-row items-center justify-between mb-4 px-2">
          <Pressable
            onPress={handlePrevMonth}
            className="w-11 h-11 rounded-full bg-neutral-100 items-center justify-center active:scale-95"
          >
            <ChevronLeft size={24} color={Colors.neutral[700]} />
          </Pressable>

          <Text className="text-lg font-bold text-neutral-900">{monthLabel}</Text>

          <Pressable
            onPress={handleNextMonth}
            className="w-11 h-11 rounded-full bg-neutral-100 items-center justify-center active:scale-95"
          >
            <ChevronRight size={24} color={Colors.neutral[700]} />
          </Pressable>
        </View>

        {/* Weekday Headers */}
        <View className="flex-row mb-3">
          {WEEKDAYS.map((day) => (
            <View key={day} className="items-center py-1" style={{ width: CELL_SIZE }}>
              <Text className="text-[13px] font-semibold text-neutral-500">{day}</Text>
            </View>
          ))}
        </View>

        {/* Calendar Grid */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ maxHeight: CELL_SIZE * 6 + 16 }}
          contentContainerStyle={{ paddingBottom: 8 }}
        >
          <View className="flex-row flex-wrap">
            {calendarDays.map((item, index) => (
              <CalendarDay
                key={`${item.dateKey}-${index}`}
                day={item.day}
                isSelected={selectedDate ? isSameDay(item.date, selectedDate) : false}
                isToday={isSameDay(item.date, today)}
                isCurrentMonth={item.isCurrentMonth}
                markers={eventsByDate.get(item.dateKey) || []}
                onPress={() => handleDateSelect(item.date)}
              />
            ))}
          </View>
        </ScrollView>

        {/* Events for selected date */}
        {selectedDate && payload.events && payload.events.length > 0 && (() => {
          const selectedDateKey = selectedDate.toISOString().split('T')[0];
          const eventsForDate = payload.events.filter(
            (e) => e.date.split('T')[0] === selectedDateKey
          );

          if (eventsForDate.length > 0) {
            return (
              <View className="mt-4 pt-3 border-t border-neutral-200">
                <Text className="text-sm font-bold text-neutral-900 mb-3">
                  {t('events.calendar.eventsOnDate', 'Events on')} {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
                <View className="gap-2">
                  {eventsForDate.map((event) => (
                    <View
                      key={event.id}
                      className="flex-row items-center gap-3 p-3 bg-neutral-50 rounded-xl"
                    >
                      <View
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[event.status] }}
                      />
                      <View className="flex-1">
                        <Text className="text-sm font-medium text-neutral-900" numberOfLines={1}>
                          {event.title || t('events.untitled', 'Event')}
                        </Text>
                        <Text className="text-xs text-neutral-500 capitalize">{event.status}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            );
          }
          return null;
        })()}

        {/* Legend */}
        {hasEvents && (
          <View className="mt-4 pt-3 border-t border-neutral-200">
            <Text className="text-xs font-semibold text-neutral-600 mb-3">
              {t('events.calendar.eventIndicators', 'Event Indicators')}
            </Text>
            <View className="flex-row flex-wrap gap-4">
              <View className="flex-row items-center gap-1">
                <View className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.upcoming }} />
                <Text className="text-xs text-neutral-600">{t('events.upcoming', 'Upcoming')}</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <View className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.rsvp }} />
                <Text className="text-xs text-neutral-600">{t('events.myRSVPs', 'RSVPs')}</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <View className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.attended }} />
                <Text className="text-xs text-neutral-600">{t('events.attended', 'Attended')}</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <View className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.passed }} />
                <Text className="text-xs text-neutral-600">{t('events.passed', 'Passed')}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Confirm Button */}
        <Pressable
          onPress={handleConfirm}
          disabled={!selectedDate}
          className={`items-center py-4 rounded-xl mt-4 mb-2 active:opacity-90 ${
            selectedDate ? 'bg-blue-500' : 'bg-neutral-200'
          }`}
        >
          <Text
            className={`text-base font-bold ${
              selectedDate ? 'text-white' : 'text-neutral-500'
            }`}
          >
            {t('common.done', 'Done')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export default CalendarSheet;
