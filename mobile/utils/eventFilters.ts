/**
 * Event Filtering Logic (Offline)
 *
 * Handles all event filtering:
 * - Search (fuzzy matching with Fuse.js)
 * - Category filter
 * - Date filter (calendar)
 * - Status filter
 * - Visibility (hide past unattended events)
 */

import Fuse from 'fuse.js';
import {
  Event,
  RSVP,
  Attendance,
  EventStatus,
  computeEventStatus,
  shouldShowEvent,
} from './eventStatus';

export interface FilteredEvent extends Event {
  status: EventStatus;
}

export interface FilterOptions {
  events: Event[];
  categories?: Array<{ id: string; name: string }>;
  selectedDate?: Date | null;
  searchTerm?: string;
  categoryFilter?: string | null;
  statusFilter?: EventStatus | null;
  userRsvps: RSVP[];
  userAttendance: Attendance[];
}

export interface FilterResults {
  events: FilteredEvent[];
  groupedByStatus: {
    attended: FilteredEvent[];
    rsvp: FilteredEvent[];
    upcoming: FilteredEvent[];
  };
  counts: {
    attended: number;
    rsvp: number;
    upcoming: number;
    total: number;
  };
}

/**
 * Main filtering function
 * Combines all filters and returns enriched events
 */
export function filterEvents(options: FilterOptions): FilterResults {
  const {
    events,
    selectedDate = null,
    searchTerm = '',
    categoryFilter = null,
    statusFilter = null,
    userRsvps,
    userAttendance,
  } = options;

  // Step 1: Filter out past events that user didn't interact with
  let filteredEvents = events.filter((event) =>
    shouldShowEvent(event, userRsvps, userAttendance)
  );

  // Step 2: Apply category filter
  if (categoryFilter) {
    filteredEvents = filteredEvents.filter((event) => event.category === categoryFilter);
  }

  // Step 3: Apply date filter (calendar)
  if (selectedDate) {
    filteredEvents = filteredEvents.filter((event) => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getDate() === selectedDate.getDate() &&
        eventDate.getMonth() === selectedDate.getMonth() &&
        eventDate.getFullYear() === selectedDate.getFullYear()
      );
    });
  }

  // Step 4: Apply search filter (fuzzy search)
  if (searchTerm.trim()) {
    const fuse = new Fuse(filteredEvents, {
      keys: ['title', 'description', 'location'],
      threshold: 0.3, // 0 = perfect match, 1 = match anything
      ignoreLocation: true,
    });

    const searchResults = fuse.search(searchTerm);
    filteredEvents = searchResults.map((result) => result.item);
  }

  // Step 5: Enrich events with status
  const enrichedEvents: FilteredEvent[] = filteredEvents.map((event) => ({
    ...event,
    status: computeEventStatus(event, userRsvps, userAttendance),
  }));

  // Step 6: Apply status filter
  let finalEvents = enrichedEvents;
  if (statusFilter) {
    finalEvents = enrichedEvents.filter((event) => event.status === statusFilter);
  }

  // Step 7: Sort by date (upcoming first, then past)
  finalEvents.sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    const now = Date.now();

    // Both future: sort ascending (nearest first)
    if (dateA >= now && dateB >= now) {
      return dateA - dateB;
    }

    // Both past: sort descending (most recent first)
    if (dateA < now && dateB < now) {
      return dateB - dateA;
    }

    // One future, one past: future comes first
    return dateB >= now ? 1 : -1;
  });

  // Step 8: Group by status
  const groupedByStatus = {
    attended: finalEvents.filter((e) => e.status === 'attended'),
    rsvp: finalEvents.filter((e) => e.status === 'rsvp'),
    upcoming: finalEvents.filter((e) => e.status === 'upcoming'),
  };

  // Step 9: Calculate counts
  const counts = {
    attended: groupedByStatus.attended.length,
    rsvp: groupedByStatus.rsvp.length,
    upcoming: groupedByStatus.upcoming.length,
    total: finalEvents.length,
  };

  return {
    events: finalEvents,
    groupedByStatus,
    counts,
  };
}

/**
 * Get calendar markers for events
 * Used by flash-calendar to show dots under dates
 * Returns array format for flash-calendar's calendarMarkedDates prop
 */
export function getCalendarMarkers(
  events: Event[],
  userRsvps: RSVP[],
  userAttendance: Attendance[]
) {
  const markersArray: Array<{ startId: string; endId: string; color: string }> = [];
  const processedDates = new Set<string>();

  events.forEach((event) => {
    if (!shouldShowEvent(event, userRsvps, userAttendance)) {
      return; // Skip events that shouldn't be shown
    }

    // Skip events with invalid dates
    if (!event.date) return;
    const eventDate = new Date(event.date);
    if (isNaN(eventDate.getTime())) return;

    const dateKey = eventDate.toISOString().split('T')[0];

    // Skip if we already processed this date
    if (processedDates.has(dateKey)) return;
    processedDates.add(dateKey);

    const status = computeEventStatus(event, userRsvps, userAttendance);

    // Use status color for marker
    const colors = {
      attended: '#9333ea', // purple600
      rsvp: '#16a34a', // green600
      upcoming: '#2563eb', // blue600
    };

    markersArray.push({
      startId: dateKey,
      endId: dateKey,
      color: colors[status],
    });
  });

  return markersArray;
}

/**
 * Get events for a specific date
 */
export function getEventsForDate(
  date: Date,
  events: Event[],
  userRsvps: RSVP[],
  userAttendance: Attendance[]
): FilteredEvent[] {
  return filterEvents({
    events,
    categories: [],
    selectedDate: date,
    searchTerm: '',
    categoryFilter: null,
    statusFilter: null,
    userRsvps,
    userAttendance,
  }).events;
}
