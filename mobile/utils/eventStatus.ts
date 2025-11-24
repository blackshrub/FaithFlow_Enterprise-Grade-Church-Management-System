/**
 * Event Status Computation Logic
 *
 * Computes event status based on:
 * - Event date (past vs future)
 * - User RSVP status
 * - User attendance records
 *
 * Priority: attended > rsvp > upcoming
 * Note: Past events without RSVP/attendance are filtered out
 */

export type EventStatus = 'attended' | 'rsvp' | 'upcoming';

export interface Event {
  id: string;
  title: string;
  date: string;
  category?: string;
  [key: string]: any;
}

export interface RSVP {
  id: string;
  event_id: string;
  user_id: string;
  [key: string]: any;
}

export interface Attendance {
  id: string;
  event_id: string;
  user_id: string;
  [key: string]: any;
}

/**
 * Compute event status for a single event
 */
export function computeEventStatus(
  event: Event,
  userRsvps: RSVP[],
  userAttendance: Attendance[]
): EventStatus {
  const now = new Date();
  const eventDate = new Date(event.date);
  const isPast = eventDate < now;

  // Priority 1: Attended (past event + attendance record)
  if (isPast && userAttendance.some((a) => a.event_id === event.id)) {
    return 'attended';
  }

  // Priority 2: RSVP'd (user has RSVP record)
  if (userRsvps.some((r) => r.event_id === event.id)) {
    return 'rsvp';
  }

  // Priority 3: Upcoming (future event)
  if (!isPast) {
    return 'upcoming';
  }

  // Default: upcoming (shouldn't reach here due to filtering)
  return 'upcoming';
}

/**
 * Check if event should be shown
 * Past events are only shown if user RSVP'd or attended
 */
export function shouldShowEvent(
  event: Event,
  userRsvps: RSVP[],
  userAttendance: Attendance[]
): boolean {
  const now = new Date();
  const eventDate = new Date(event.date);
  const isPast = eventDate < now;

  if (!isPast) {
    return true; // Always show future events
  }

  // For past events, only show if user RSVP'd or attended
  const hasRsvp = userRsvps.some((r) => r.event_id === event.id);
  const hasAttendance = userAttendance.some((a) => a.event_id === event.id);

  return hasRsvp || hasAttendance;
}

/**
 * Get status color configuration
 */
export function getStatusConfig(status: EventStatus) {
  const configs = {
    attended: {
      color: '#9333ea', // purple600
      bgColor: '#f3e8ff', // purple50
      textColor: '#6b21a8', // purple800
    },
    rsvp: {
      color: '#16a34a', // green600
      bgColor: '#dcfce7', // green50
      textColor: '#15803d', // green700
    },
    upcoming: {
      color: '#2563eb', // blue600
      bgColor: '#dbeafe', // blue50
      textColor: '#1e40af', // blue700
    },
  };

  return configs[status];
}
