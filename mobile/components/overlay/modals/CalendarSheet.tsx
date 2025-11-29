/**
 * CalendarSheet - Unified Overlay System
 *
 * Bottom sheet for calendar date picker with event markers.
 * Used via: overlay.showBottomSheet(CalendarSheet, payload)
 *
 * Features:
 * - Full-height bottom sheet with edge-to-edge design
 * - Event markers (colored dots) for upcoming, RSVP, attended, passed
 * - Legend showing what each color means
 * - Large close button (44px)
 * - Safe area handling
 * - Single month header (no duplicates)
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import type { OverlayComponentProps } from '@/stores/overlayStore';
import { Text } from '@/components/ui/text';
import { spacing, radius } from '@/constants/spacing';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Premium colors - consistent with app theme
const Colors = {
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  white: '#FFFFFF',
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    500: '#3B82F6',
    600: '#2563EB',
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
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.dayCell,
        isSelected && styles.dayCellSelected,
        isToday && !isSelected && styles.dayCellToday,
      ]}
    >
      <Text
        style={[
          styles.dayText,
          !isCurrentMonth && styles.dayTextOtherMonth,
          isSelected && styles.dayTextSelected,
          isToday && !isSelected && styles.dayTextToday,
        ]}
      >
        {day}
      </Text>

      {/* Event markers (dots) */}
      {markers.length > 0 && (
        <View style={styles.markerRow}>
          {markers.slice(0, 3).map((status, index) => (
            <View
              key={`${status}-${index}`}
              style={[
                styles.marker,
                { backgroundColor: STATUS_COLORS[status] },
              ]}
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
    <View style={[styles.sheetCard, { paddingBottom: insets.bottom + 12 }]}>
      {/* Handle indicator */}
      <View style={styles.handleContainer}>
        <View style={styles.handle} />
      </View>

      <View style={styles.sheetContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>
              {t('events.calendar.title', 'Select Date')}
            </Text>
            <Text style={styles.headerSubtitle}>
              {t('events.calendar.selectDate', 'Choose a date to filter events')}
            </Text>
          </View>

          {/* Close button - 44px for finger-friendly touch */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
            style={styles.closeButton}
          >
            <X size={20} color={Colors.neutral[600]} />
          </Pressable>
        </View>

        {/* Month Navigation - SINGLE header, no duplicates */}
        <View style={styles.monthNavigation}>
          <Pressable onPress={handlePrevMonth} style={styles.monthNavButton}>
            <ChevronLeft size={24} color={Colors.neutral[700]} />
          </Pressable>

          <Text style={styles.monthLabel}>{monthLabel}</Text>

          <Pressable onPress={handleNextMonth} style={styles.monthNavButton}>
            <ChevronRight size={24} color={Colors.neutral[700]} />
          </Pressable>
        </View>

        {/* Weekday Headers */}
        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((day) => (
            <View key={day} style={styles.weekdayCell}>
              <Text style={styles.weekdayText}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Calendar Grid */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.calendarScroll}
          contentContainerStyle={styles.calendarScrollContent}
        >
          <View style={styles.calendarGrid}>
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

        {/* Legend */}
        {hasEvents && (
          <View style={styles.legendContainer}>
            <Text style={styles.legendTitle}>
              {t('events.calendar.eventIndicators', 'Event Indicators')}
            </Text>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS.upcoming }]} />
                <Text style={styles.legendText}>{t('events.upcoming', 'Upcoming')}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS.rsvp }]} />
                <Text style={styles.legendText}>{t('events.myRSVPs', 'RSVPs')}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS.attended }]} />
                <Text style={styles.legendText}>{t('events.attended', 'Attended')}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS.passed }]} />
                <Text style={styles.legendText}>{t('events.passed', 'Passed')}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Confirm Button */}
        <Pressable
          onPress={handleConfirm}
          style={[
            styles.confirmButton,
            !selectedDate && styles.confirmButtonDisabled,
          ]}
          disabled={!selectedDate}
        >
          <Text style={styles.confirmButtonText}>
            {t('common.done', 'Done')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const CELL_SIZE = (SCREEN_WIDTH - spacing.ml * 2) / 7;

const styles = StyleSheet.create({
  sheetCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  sheetContent: {
    paddingHorizontal: spacing.ml,
    paddingTop: spacing.s,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.m,
  },
  headerText: {
    flex: 1,
    marginRight: spacing.m,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.neutral[900],
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.neutral[500],
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.m,
    paddingHorizontal: spacing.s,
  },
  monthNavButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  weekdayCell: {
    width: CELL_SIZE,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  weekdayText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.neutral[500],
  },
  calendarScroll: {
    maxHeight: CELL_SIZE * 6 + spacing.m,
  },
  calendarScrollContent: {
    paddingBottom: spacing.s,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: CELL_SIZE / 2,
  },
  dayCellSelected: {
    backgroundColor: Colors.primary[500],
  },
  dayCellToday: {
    backgroundColor: Colors.primary[50],
    borderWidth: 2,
    borderColor: Colors.primary[500],
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.neutral[900],
  },
  dayTextOtherMonth: {
    color: Colors.neutral[400],
  },
  dayTextSelected: {
    color: Colors.white,
    fontWeight: '700',
  },
  dayTextToday: {
    color: Colors.primary[700],
    fontWeight: '700',
  },
  markerRow: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 4,
    gap: 2,
  },
  marker: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  legendContainer: {
    marginTop: spacing.m,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.neutral[600],
    marginBottom: spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.m,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: Colors.neutral[600],
  },
  confirmButton: {
    backgroundColor: Colors.primary[500],
    borderRadius: radius.m,
    paddingVertical: spacing.m,
    alignItems: 'center',
    marginTop: spacing.m,
    marginBottom: spacing.s,
  },
  confirmButtonDisabled: {
    backgroundColor: Colors.neutral[200],
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
});

export default CalendarSheet;
