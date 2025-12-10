/**
 * Mock Calendar Events for Testing Multi-Status Indicators
 *
 * This file contains dummy events that can be used to test the calendar's
 * multi-color indicator feature when multiple event types exist on the same day.
 *
 * Usage: Import and merge with real events in CalendarModal or events screen
 */

import type { EventWithMemberStatus, EventRSVP, EventAttendance } from '@/types/events';

// Mock RSVP object for events where user has RSVP'd
const createMockRSVP = (): EventRSVP => ({
  member_id: 'mock-member-1',
  member_name: 'Test User',
  timestamp: new Date().toISOString(),
  status: 'confirmed',
  confirmation_code: 'MOCK-CONF-123',
});

// Mock Attendance object for events user has attended
const createMockAttendance = (): EventAttendance => ({
  member_id: 'mock-member-1',
  member_name: 'Test User',
  check_in_time: new Date().toISOString(),
});

// Get dates for the current month
const now = new Date();
const currentMonth = now.getMonth();
const currentYear = now.getFullYear();

// Helper to create a FUTURE date in the current month
const createFutureDate = (day: number) => {
  return new Date(Date.UTC(currentYear, currentMonth, day, 12, 0, 0)).toISOString().split('T')[0];
};

// Helper to create a PAST date in the current month (3 days ago from now)
const createPastDate = (daysAgo: number) => {
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - daysAgo);
  return pastDate.toISOString().split('T')[0];
};

/**
 * Mock events demonstrating different scenarios:
 * - Day 5: Single upcoming event (blue)
 * - Day 10: Two events - upcoming + RSVP'd (blue + green blend)
 * - Day 15: Three events - upcoming + RSVP'd + attended (blue + green + purple blend)
 * - Day 20: Single RSVP'd event (green)
 * - Day 25: Two events - RSVP'd + attended (green + purple blend)
 *
 * IMPORTANT: Calendar shows events by their EVENT DATE.
 * Status (upcoming/rsvp/attended) is based on:
 * - upcoming: future event date, no RSVP
 * - rsvp: has RSVP record (any date)
 * - attended: PAST event date + attendance record
 *
 * To show all 3 colors on day 15, we need 3 DIFFERENT events:
 * - Event A on FUTURE day 15 (no RSVP) = upcoming (blue)
 * - Event B on FUTURE day 15 (with RSVP) = rsvp (green)
 * - Event C on PAST (3 days ago) = attended (purple)
 *
 * But for simplicity, we'll use fixed past dates that are easy to find
 */
export const mockCalendarEvents: EventWithMemberStatus[] = [
  // Day 5: Single upcoming event (future, no RSVP)
  {
    id: 'mock-1',
    name: 'Sunday Worship Service',
    description: 'Join us for our weekly worship service',
    event_date: createFutureDate(5),
    location: 'Main Sanctuary',
    event_category_id: 'cat-1',
    event_type: 'worship',
    requires_rsvp: false,
    can_rsvp: false,
    max_attendees: 200,
    current_attendees: 150,
    my_rsvp: null, // No RSVP = upcoming
    my_attendance: null,
    church_id: 'mock-church',
    created_at: createFutureDate(1),
    updated_at: createFutureDate(1),
    deleted: false,
  },

  // Day 10: Event 1 - Upcoming (future, no RSVP)
  {
    id: 'mock-2',
    name: 'Bible Study',
    description: 'Weekly Bible study session',
    event_date: createFutureDate(10),
    location: 'Fellowship Hall',
    event_category_id: 'cat-2',
    event_type: 'bible_study',
    requires_rsvp: true,
    can_rsvp: true,
    max_attendees: 50,
    current_attendees: 30,
    my_rsvp: null, // No RSVP = upcoming
    my_attendance: null,
    church_id: 'mock-church',
    created_at: createFutureDate(1),
    updated_at: createFutureDate(1),
    deleted: false,
  },

  // Day 10: Event 2 - RSVP'd (future, with RSVP)
  {
    id: 'mock-3',
    name: 'Youth Group Meeting',
    description: 'Youth group gathering',
    event_date: createFutureDate(10),
    location: 'Youth Center',
    event_category_id: 'cat-3',
    event_type: 'fellowship',
    requires_rsvp: true,
    can_rsvp: false,
    max_attendees: 30,
    current_attendees: 25,
    my_rsvp: createMockRSVP(), // Has RSVP = rsvp status
    my_attendance: null,
    church_id: 'mock-church',
    created_at: createFutureDate(1),
    updated_at: createFutureDate(1),
    deleted: false,
  },

  // Day 15: Event 1 - Upcoming (future, no RSVP)
  {
    id: 'mock-4',
    name: 'Prayer Meeting',
    description: 'Community prayer time',
    event_date: createFutureDate(15),
    location: 'Prayer Room',
    event_category_id: 'cat-4',
    event_type: 'prayer',
    requires_rsvp: false,
    can_rsvp: false,
    max_attendees: 40,
    current_attendees: 20,
    my_rsvp: null, // No RSVP = upcoming
    my_attendance: null,
    church_id: 'mock-church',
    created_at: createFutureDate(1),
    updated_at: createFutureDate(1),
    deleted: false,
  },

  // Day 15: Event 2 - RSVP'd (future, with RSVP)
  {
    id: 'mock-5',
    name: 'Choir Practice',
    description: 'Weekly choir rehearsal',
    event_date: createFutureDate(15),
    location: 'Music Room',
    event_category_id: 'cat-5',
    event_type: 'music',
    requires_rsvp: true,
    can_rsvp: false,
    max_attendees: 25,
    current_attendees: 20,
    my_rsvp: createMockRSVP(), // Has RSVP = rsvp status
    my_attendance: null,
    church_id: 'mock-church',
    created_at: createFutureDate(1),
    updated_at: createFutureDate(1),
    deleted: false,
  },

  // Day 15: Event 3 - Attended (PAST date, with attendance)
  // Use 3 days ago so it's definitely in the past
  {
    id: 'mock-6',
    name: 'Community Outreach',
    description: 'Outreach program in the community',
    event_date: createPastDate(3),
    location: 'Community Center',
    event_category_id: 'cat-6',
    event_type: 'outreach',
    requires_rsvp: true,
    can_rsvp: false,
    max_attendees: 60,
    current_attendees: 55,
    my_rsvp: createMockRSVP(),
    my_attendance: createMockAttendance(), // PAST + attendance = attended status
    church_id: 'mock-church',
    created_at: createFutureDate(1),
    updated_at: createFutureDate(1),
    deleted: false,
  },

  // Day 20: Single RSVP'd event (future, with RSVP)
  {
    id: 'mock-7',
    name: 'Baptism Service',
    description: 'Special baptism ceremony',
    event_date: createFutureDate(20),
    location: 'Baptismal Pool',
    event_category_id: 'cat-7',
    event_type: 'sacrament',
    requires_rsvp: true,
    can_rsvp: false,
    max_attendees: 100,
    current_attendees: 80,
    my_rsvp: createMockRSVP(), // Has RSVP = rsvp status
    my_attendance: null,
    church_id: 'mock-church',
    created_at: createFutureDate(1),
    updated_at: createFutureDate(1),
    deleted: false,
  },

  // Day 25: Event 1 - RSVP'd (future, with RSVP)
  {
    id: 'mock-8',
    name: 'Mens Fellowship',
    description: 'Monthly mens gathering',
    event_date: createFutureDate(25),
    location: 'Fellowship Hall',
    event_category_id: 'cat-8',
    event_type: 'fellowship',
    requires_rsvp: true,
    can_rsvp: false,
    max_attendees: 40,
    current_attendees: 35,
    my_rsvp: createMockRSVP(), // Has RSVP = rsvp status
    my_attendance: null,
    church_id: 'mock-church',
    created_at: createFutureDate(1),
    updated_at: createFutureDate(1),
    deleted: false,
  },

  // Day 25: Event 2 - Attended (PAST date, with attendance)
  // Use 5 days ago so it's definitely in the past
  {
    id: 'mock-9',
    name: 'Ladies Bible Study',
    description: 'Monthly ladies Bible study',
    event_date: createPastDate(5),
    location: 'Library',
    event_category_id: 'cat-9',
    event_type: 'bible_study',
    requires_rsvp: true,
    can_rsvp: false,
    max_attendees: 35,
    current_attendees: 30,
    my_rsvp: createMockRSVP(),
    my_attendance: createMockAttendance(), // PAST + attendance = attended status
    church_id: 'mock-church',
    created_at: createFutureDate(1),
    updated_at: createFutureDate(1),
    deleted: false,
  },
];

/**
 * Instructions to use mock data:
 *
 * In CalendarModal.tsx, add this after the real event queries:
 *
 * ```typescript
 * import { mockCalendarEvents } from '@/utils/mockCalendarEvents';
 *
 * // After combining real events:
 * const allEvents = useMemo(
 *   () => [
 *     ...(upcomingQuery.data || []),
 *     ...(rsvpsQuery.data || []),
 *     ...(attendedQuery.data || []),
 *     ...mockCalendarEvents, // Add mock data
 *   ],
 *   [upcomingQuery.data, rsvpsQuery.data, attendedQuery.data]
 * );
 * ```
 *
 * Expected results:
 * - Day 5: Blue indicator (upcoming only)
 * - Day 10: Blended blue-green indicator (upcoming + RSVP)
 * - 3 days ago: Purple indicator (attended only)
 * - 5 days ago: Purple indicator (attended only)
 * - Day 15: Blended blue-green indicator (upcoming + RSVP) - NOTE: attended event won't show here, it's 3 days ago
 * - Day 20: Green indicator (RSVP only)
 * - Day 25: Green indicator (RSVP only) - NOTE: attended event won't show here, it's 5 days ago
 */
