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
    passed: FilteredEvent[];
  };
  counts: {
    attended: number;
    rsvp: number;
    upcoming: number;
    passed: number;
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
    passed: finalEvents.filter((e) => e.status === 'passed'),
  };

  // Step 9: Calculate counts
  const counts = {
    attended: groupedByStatus.attended.length,
    rsvp: groupedByStatus.rsvp.length,
    upcoming: groupedByStatus.upcoming.length,
    passed: groupedByStatus.passed.length,
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
 * Returns map of dates to their event statuses
 * When multiple events exist on the same date with different statuses,
 * all statuses are returned to show multiple color indicators
 */
export function getCalendarMarkers(
  events: Event[],
  userRsvps: RSVP[],
  userAttendance: Attendance[]
): Map<string, EventStatus[]> {
  const dateStatusMap = new Map<string, EventStatus[]>();

  // Group events by date and collect their statuses
  events.forEach((event) => {
    if (!shouldShowEvent(event, userRsvps, userAttendance)) {
      console.log(`[getCalendarMarkers] Skipping event ${event.id} (${event.title}) - shouldShowEvent returned false`);
      return; // Skip events that shouldn't be shown
    }

    // Skip events with invalid dates
    if (!event.date) return;
    const eventDate = new Date(event.date);
    if (isNaN(eventDate.getTime())) return;

    const dateKey = eventDate.toISOString().split('T')[0];
    const status = computeEventStatus(event, userRsvps, userAttendance);

    console.log(`[getCalendarMarkers] Event ${event.id} (${event.title}) on ${dateKey} = ${status}`);
    console.log(`  - Has RSVP: ${userRsvps.some((r) => r.event_id === event.id)}`);
    console.log(`  - Has Attendance: ${userAttendance.some((a) => a.event_id === event.id)}`);
    console.log(`  - Is Past: ${new Date(event.date) < new Date()}`);

    // Add status to date's status list (avoid duplicates)
    const statuses = dateStatusMap.get(dateKey) || [];
    if (!statuses.includes(status)) {
      statuses.push(status);
    }
    dateStatusMap.set(dateKey, statuses);
  });

  console.log('[getCalendarMarkers] Final dateStatusMap:', dateStatusMap);
  return dateStatusMap;
}

/**
 * Get status colors for calendar markers
 */
export function getStatusColors() {
  return {
    attended: '#f97316', // orange500 - more distinct than purple for small dots
    rsvp: '#16a34a', // green600
    upcoming: '#2563eb', // blue600
    passed: '#6b7280', // gray500
  };
}

/**
 * Convert calendar markers map to active date ranges with colors
 * For multiple statuses, creates a blended color
 */
export function convertMarkersToActiveDateRanges(
  markersMap: Map<string, EventStatus[]>
): Array<{ startId: string; endId: string; color: string }> {
  const statusColors = getStatusColors();
  const ranges: Array<{ startId: string; endId: string; color: string }> = [];

  markersMap.forEach((statuses, dateKey) => {
    let color = '';

    if (statuses.length === 1) {
      // Single status: use its color
      color = statusColors[statuses[0]];
      console.log(`[convertMarkersToActiveDateRanges] ${dateKey}: Single status (${statuses[0]}) = ${color}`);
    } else if (statuses.length === 2) {
      // Two statuses: blend colors
      const color1 = statusColors[statuses[0]];
      const color2 = statusColors[statuses[1]];
      color = blendColors(color1, color2);
      console.log(`[convertMarkersToActiveDateRanges] ${dateKey}: Two statuses (${statuses[0]} + ${statuses[1]}) = ${color}`);
    } else if (statuses.length === 3) {
      // Three statuses: blend all three
      const color1 = statusColors[statuses[0]];
      const color2 = statusColors[statuses[1]];
      const color3 = statusColors[statuses[2]];
      color = blendThreeColors(color1, color2, color3);
      console.log(`[convertMarkersToActiveDateRanges] ${dateKey}: Three statuses (${statuses[0]} + ${statuses[1]} + ${statuses[2]}) = ${color}`);
    }

    ranges.push({
      startId: dateKey,
      endId: dateKey,
      color,
    });
  });

  console.log('[convertMarkersToActiveDateRanges] Final ranges:', ranges);
  return ranges;
}

/**
 * Blend two hex colors 50/50
 */
function blendColors(color1: string, color2: string): string {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);

  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  const r = Math.round((r1 + r2) / 2);
  const g = Math.round((g1 + g2) / 2);
  const b = Math.round((b1 + b2) / 2);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Blend three hex colors 33/33/33
 */
function blendThreeColors(color1: string, color2: string, color3: string): string {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);

  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  const r3 = parseInt(color3.slice(1, 3), 16);
  const g3 = parseInt(color3.slice(3, 5), 16);
  const b3 = parseInt(color3.slice(5, 7), 16);

  const r = Math.round((r1 + r2 + r3) / 3);
  const g = Math.round((g1 + g2 + g3) / 3);
  const b = Math.round((b1 + b2 + b3) / 3);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
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
