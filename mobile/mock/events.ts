/**
 * Mock Event Data for Demo Mode
 *
 * Matches backend structure from:
 * - /backend/models/event.py
 * - /backend/routes/events.py
 *
 * Provides realistic test scenarios:
 * - Upcoming events (RSVP available, RSVP closed, no RSVP required)
 * - Events with member's RSVP
 * - Events with member's attendance
 * - Single and series events
 * - Different event categories
 */

import type { Event, EventCategory } from '@/types/events';

const DEMO_MEMBER_ID = 'demo-member-001';
const DEMO_CHURCH_ID = 'demo-church-001';

/**
 * Event Categories for filtering
 */
export const mockEventCategories: EventCategory[] = [
  {
    id: 'cat-001',
    church_id: DEMO_CHURCH_ID,
    name: 'Worship Service',
    description: 'Regular worship services and special celebrations',
    color: '#4F46E5', // Indigo
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString(),
  },
  {
    id: 'cat-002',
    church_id: DEMO_CHURCH_ID,
    name: 'Fellowship',
    description: 'Community gatherings and social events',
    color: '#10B981', // Green
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString(),
  },
  {
    id: 'cat-003',
    church_id: DEMO_CHURCH_ID,
    name: 'Prayer',
    description: 'Prayer meetings and spiritual retreats',
    color: '#8B5CF6', // Purple
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString(),
  },
  {
    id: 'cat-004',
    church_id: DEMO_CHURCH_ID,
    name: 'Outreach',
    description: 'Community service and evangelism',
    color: '#F59E0B', // Amber
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString(),
  },
  {
    id: 'cat-005',
    church_id: DEMO_CHURCH_ID,
    name: 'Seminar',
    description: 'Teaching seminars and workshops',
    color: '#EF4444', // Red
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString(),
  },
];

/**
 * Mock Events - Covering all test scenarios
 */
export const mockEvents: Event[] = [
  // ========================================
  // UPCOMING EVENTS (5 events)
  // ========================================

  // Event 1: Upcoming + Requires RSVP + Not yet RSVP'd
  {
    id: 'event-001',
    church_id: DEMO_CHURCH_ID,
    name: 'Sunday Worship Service',
    description:
      'Join us for our weekly Sunday worship service with praise, worship, and an inspiring message from the Word of God.',
    event_type: 'single',
    requires_rsvp: true,
    enable_seat_selection: false,
    seat_capacity: 200,
    event_category_id: 'cat-001',
    location: 'Main Sanctuary, 123 Church Street, Jakarta',
    reservation_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    reservation_end: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    event_photo: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=800&q=80',
    is_active: true,
    event_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
    event_end_date: new Date(
      Date.now() + 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000
    ).toISOString(), // +2 hours
    sessions: [],
    rsvp_list: [
      // 127 members already RSVP'd (not including demo member)
      {
        member_id: 'member-100',
        member_name: 'John Doe',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'confirmed',
        confirmation_code: 'CONF-ABC123',
      },
      // ... Simulating 127 RSVPs by having realistic count
    ],
    attendance_list: [],
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },

  // Event 2: Upcoming + Requires RSVP + Already RSVP'd (Should appear in "My RSVPs" tab)
  {
    id: 'event-002',
    church_id: DEMO_CHURCH_ID,
    name: 'Youth Group Meeting',
    description:
      'An exciting time of fellowship, games, and Bible study for our youth (ages 13-18). Bring your friends!',
    event_type: 'single',
    requires_rsvp: true,
    enable_seat_selection: false,
    seat_capacity: 50,
    event_category_id: 'cat-002',
    location: 'Youth Center, Building B',
    reservation_start: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    reservation_end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    event_photo: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80',
    is_active: true,
    event_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days from now
    event_end_date: new Date(
      Date.now() + 4 * 24 * 60 * 60 * 1000 + 1.5 * 60 * 60 * 1000
    ).toISOString(),
    sessions: [],
    rsvp_list: [
      // Demo member already RSVP'd
      {
        member_id: DEMO_MEMBER_ID,
        member_name: 'Demo User',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'confirmed',
        confirmation_code: 'CONF-DEMO001',
        qr_code: 'data:image/png;base64,mock-qr-code-data',
        qr_data: 'EVENT:event-002:MEMBER:demo-member-001',
        whatsapp_status: 'delivered',
      },
      {
        member_id: 'member-101',
        member_name: 'Jane Smith',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'confirmed',
        confirmation_code: 'CONF-XYZ789',
      },
    ],
    attendance_list: [],
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },

  // Event 3: Upcoming + Series Event + Requires RSVP per session
  {
    id: 'event-003',
    church_id: DEMO_CHURCH_ID,
    name: 'Prayer & Fasting Week',
    description:
      'Join us for a special week of prayer and fasting. Daily prayer meetings at 6 AM and 7 PM. Seek God together!',
    event_type: 'series',
    requires_rsvp: false, // No RSVP required - open to all
    enable_seat_selection: false,
    event_category_id: 'cat-003',
    location: 'Prayer Room, Main Building',
    event_photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
    is_active: true,
    event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // First session date
    event_end_date: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), // Last session end
    sessions: [
      {
        name: 'Day 1 - Consecration',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        name: 'Day 2 - Repentance',
        date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        name: 'Day 3 - Breakthrough',
        date: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      },
    ],
    rsvp_list: [],
    attendance_list: [],
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },

  // Event 4: Upcoming + Requires RSVP + With seat selection
  {
    id: 'event-004',
    church_id: DEMO_CHURCH_ID,
    name: 'Community Outreach - Food Distribution',
    description:
      'Serve our community by helping distribute food packages to families in need. Volunteers needed!',
    event_type: 'single',
    requires_rsvp: true,
    enable_seat_selection: true, // Seat selection for volunteer positions
    seat_layout_id: 'layout-001',
    event_category_id: 'cat-004',
    location: 'Community Center, Downtown Jakarta',
    reservation_start: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    reservation_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    event_photo: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80',
    is_active: true,
    event_date: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
    event_end_date: new Date(
      Date.now() + 9 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000
    ).toISOString(),
    sessions: [],
    rsvp_list: [
      {
        member_id: 'member-102',
        member_name: 'Peter Anderson',
        seat: 'A1', // Volunteer position A1
        timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'confirmed',
        confirmation_code: 'CONF-OUT001',
      },
    ],
    attendance_list: [],
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },

  // Event 5: Upcoming + Requires RSVP + Nearly full
  {
    id: 'event-005',
    church_id: DEMO_CHURCH_ID,
    name: 'Marriage Enrichment Seminar',
    description:
      'A special seminar for married couples to strengthen their relationships. Guest speaker: Pastor John & Mrs. Sarah.',
    event_type: 'single',
    requires_rsvp: true,
    enable_seat_selection: false,
    seat_capacity: 100,
    event_category_id: 'cat-005',
    location: 'Conference Hall, Building C',
    reservation_start: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    reservation_end: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
    event_photo: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&q=80',
    is_active: true,
    event_date: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString(),
    event_end_date: new Date(
      Date.now() + 11 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000
    ).toISOString(),
    sessions: [],
    rsvp_list: [
      // Demo member RSVP'd
      {
        member_id: DEMO_MEMBER_ID,
        member_name: 'Demo User',
        timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'confirmed',
        confirmation_code: 'CONF-DEMO002',
        qr_code: 'data:image/png;base64,mock-qr-code-data-2',
        qr_data: 'EVENT:event-005:MEMBER:demo-member-001',
        whatsapp_status: 'sent',
      },
      // Simulate 66 more RSVPs (67 total including demo member)
      {
        member_id: 'member-103',
        member_name: 'Michael Chen',
        timestamp: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'confirmed',
        confirmation_code: 'CONF-MAR001',
      },
    ],
    attendance_list: [],
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },

  // ========================================
  // PAST EVENTS (3 events)
  // ========================================

  // Event 6: Past + RSVP'd + Attended (Should appear in "Attended" tab only)
  {
    id: 'event-006',
    church_id: DEMO_CHURCH_ID,
    name: 'Easter Celebration Service',
    description:
      'A powerful celebration of the resurrection of Jesus Christ with special worship, drama, and communion.',
    event_type: 'single',
    requires_rsvp: true,
    enable_seat_selection: false,
    seat_capacity: 300,
    event_category_id: 'cat-001',
    location: 'Main Sanctuary',
    reservation_start: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    reservation_end: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString(),
    event_photo: 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=800&q=80',
    is_active: true,
    event_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    event_end_date: new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000 + 2.5 * 60 * 60 * 1000
    ).toISOString(),
    sessions: [],
    rsvp_list: [
      {
        member_id: DEMO_MEMBER_ID,
        member_name: 'Demo User',
        timestamp: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'confirmed',
        confirmation_code: 'CONF-EASTER001',
        qr_code: 'data:image/png;base64,mock-qr-code-data-3',
        qr_data: 'EVENT:event-006:MEMBER:demo-member-001',
        whatsapp_status: 'read',
      },
    ],
    attendance_list: [
      // Demo member attended
      {
        member_id: DEMO_MEMBER_ID,
        member_name: 'Demo User',
        check_in_time: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },

  // Event 7: Past + No RSVP required + Attended (Should appear in "Attended" tab)
  {
    id: 'event-007',
    church_id: DEMO_CHURCH_ID,
    name: 'Bible Study: Book of Romans',
    description:
      'Deep dive into the Book of Romans with Pastor David. Week 8 of 12 - Righteousness through Faith.',
    event_type: 'single',
    requires_rsvp: false, // No RSVP required
    enable_seat_selection: false,
    event_category_id: 'cat-002',
    location: 'Study Room A',
    event_photo: 'https://images.unsplash.com/photo-1519491050282-cf00c82424b4?w=800&q=80',
    is_active: true,
    event_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
    event_end_date: new Date(
      Date.now() - 14 * 24 * 60 * 60 * 1000 + 1.5 * 60 * 60 * 1000
    ).toISOString(),
    sessions: [],
    rsvp_list: [], // No RSVPs since it's not required
    attendance_list: [
      // Demo member attended without RSVP
      {
        member_id: DEMO_MEMBER_ID,
        member_name: 'Demo User',
        check_in_time: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        member_id: 'member-104',
        member_name: 'Sarah Johnson',
        check_in_time: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },

  // Event 8: Past + RSVP'd but NOT attended (Should appear in "My RSVPs" only)
  {
    id: 'event-008',
    church_id: DEMO_CHURCH_ID,
    name: 'Christmas Outreach 2024',
    description:
      'Blessed hundreds of families with food, gifts, and the Gospel during our annual Christmas outreach.',
    event_type: 'single',
    requires_rsvp: true,
    enable_seat_selection: false,
    seat_capacity: 80,
    event_category_id: 'cat-004',
    location: 'City Park, Central Jakarta',
    reservation_start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    reservation_end: new Date(Date.now() - 65 * 24 * 60 * 60 * 1000).toISOString(),
    event_photo: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=800&q=80',
    is_active: true,
    event_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
    event_end_date: new Date(
      Date.now() - 60 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000
    ).toISOString(),
    sessions: [],
    rsvp_list: [
      // Demo member RSVP'd but didn't show up
      {
        member_id: DEMO_MEMBER_ID,
        member_name: 'Demo User',
        timestamp: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'confirmed',
        confirmation_code: 'CONF-XMAS001',
        qr_code: 'data:image/png;base64,mock-qr-code-data-4',
        qr_data: 'EVENT:event-008:MEMBER:demo-member-001',
        whatsapp_status: 'delivered',
      },
    ],
    attendance_list: [
      // Other members attended, but not demo member
      {
        member_id: 'member-105',
        member_name: 'David Lee',
        check_in_time: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
];
