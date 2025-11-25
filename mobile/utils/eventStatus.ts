/**
 * Event Status Computation Logic
 *
 * Computes event status based on:
 * - Event date (past vs future)
 * - User RSVP status
 * - User attendance records
 *
 * Priority: attended > rsvp > upcoming > passed
 * Note: Past events without RSVP/attendance show as "passed"
 */

export type EventStatus = 'attended' | 'rsvp' | 'upcoming' | 'passed';

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

  // Priority 4: Passed (past event without RSVP/attendance)
  return 'passed';
}

/**
 * Check if event should be shown
 * All events are shown (including past events without interaction)
 */
export function shouldShowEvent(
  event: Event,
  userRsvps: RSVP[],
  userAttendance: Attendance[]
): boolean {
  // Show all events - past events without interaction will show as "passed"
  return true;
}

/**
 * Get status color configuration
 */
export function getStatusConfig(status: EventStatus) {
  const configs = {
    attended: {
      color: '#f97316', // orange500 - more distinct than purple for small dots
      bgColor: '#ffedd5', // orange50
      textColor: '#c2410c', // orange700
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
    passed: {
      color: '#6b7280', // gray500
      bgColor: '#f3f4f6', // gray100
      textColor: '#374151', // gray700
    },
  };

  return configs[status];
}
