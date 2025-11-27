/**
 * Event Types - Matching Backend API Structure
 *
 * Based on /backend/models/event.py and /backend/routes/events.py
 */

export type EventType = 'single' | 'series';

// Event categories used for filtering and display colors
export type EventCategoryType =
  | 'worship'
  | 'bible_study'
  | 'fellowship'
  | 'prayer'
  | 'community_service'
  | 'youth'
  | 'children'
  | 'special'
  | 'other';

export interface EventSession {
  name: string;
  date: string; // ISO 8601
  end_date?: string; // ISO 8601
}

export interface EventRSVP {
  member_id: string;
  member_name: string;
  session_id?: string; // For series events
  seat?: string; // If seat selection enabled
  timestamp: string; // ISO 8601
  status: 'confirmed';
  confirmation_code: string;
  qr_code?: string; // Base64 QR code image
  qr_data?: string; // QR code data string
  whatsapp_status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'disabled';
  whatsapp_message_id?: string;
}

export interface EventAttendance {
  member_id: string;
  member_name: string;
  session_id?: string; // For series events
  check_in_time: string; // ISO 8601
}

/**
 * Core Event structure matching backend
 */
export interface Event {
  id: string;
  church_id: string;
  name: string;
  description?: string;
  event_type: EventType;
  requires_rsvp: boolean;
  enable_seat_selection: boolean;
  seat_layout_id?: string;
  seat_capacity?: number; // Manual capacity if no seat layout
  event_category_id?: string;
  location?: string;
  reservation_start?: string; // ISO 8601
  reservation_end?: string; // ISO 8601
  event_photo?: string; // Base64 or URL
  is_active: boolean;

  // For single events
  event_date?: string; // ISO 8601
  event_end_date?: string; // ISO 8601

  // For series events
  sessions: EventSession[];

  // RSVP and attendance data
  rsvp_list: EventRSVP[];
  attendance_list: EventAttendance[];

  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

/**
 * Event with member's personal RSVP and attendance status
 */
export interface EventWithMemberStatus extends Partial<Omit<Event, 'event_type'>> {
  // Required identity fields
  id: string;
  church_id: string;
  name: string;

  // Member's RSVP status for this event (supports both object and boolean for backwards compatibility)
  my_rsvp?: EventRSVP | boolean; // EventRSVP object or boolean for mock data
  my_attendance?: EventAttendance | boolean; // EventAttendance object or boolean for mock data

  // Calculated fields (optional for mock data)
  total_rsvps?: number; // rsvp_list.length
  total_attendance?: number; // attendance_list.length
  available_seats?: number; // If seat selection enabled
  is_past?: boolean; // event_date < now
  is_upcoming?: boolean; // event_date > now
  can_rsvp?: boolean; // Within reservation window and has capacity

  // Legacy compatibility fields
  max_attendees?: number; // Alias for seat_capacity
  attendee_count?: number; // Alias for total_rsvps
  current_attendees?: number; // Alias for total_rsvps

  // Event category support (can also use event_type for category)
  event_category?: EventCategoryType | string;

  // Allow event_type to also be category string for mock data compatibility
  event_type?: EventType | EventCategoryType | string;

  // Simplified required fields for mock data
  deleted?: boolean;
}

/**
 * RSVP Request (matching backend POST /events/{id}/rsvp)
 */
export interface RSVPRequest {
  member_id: string;
  session_id?: string; // Required for series events
  seat?: string; // Required if seat selection enabled
}

/**
 * RSVP Response from backend
 */
export interface RSVPResponse {
  success: boolean;
  message: string;
  rsvp: EventRSVP;
}

/**
 * Check-in Request
 */
export interface CheckInRequest {
  member_id?: string;
  session_id?: string;
  qr_code?: string; // Alternative to member_id
}

/**
 * Check-in Response
 */
export interface CheckInResponse {
  success: boolean;
  message: string;
  attendance?: EventAttendance;
  member_name?: string;
  member_photo?: string;
  requires_onsite_rsvp?: boolean; // If RSVP required but member hasn't registered
}

/**
 * Event Category (from backend)
 */
export interface EventCategory {
  id: string;
  church_id: string;
  name: string;
  description?: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Available Seats Response
 */
export interface AvailableSeatsResponse {
  event_id: string;
  session_id?: string;
  layout_id: string;
  layout_name: string;
  total_seats: number;
  available: number;
  taken: number;
  unavailable: number;
  available_seats: string[];
  taken_seats: string[];
  seat_map: Record<string, 'available' | 'unavailable' | 'no_seat'>;
}

/**
 * Event Filters for API
 */
export interface EventFilters {
  event_type?: EventType;
  is_active?: boolean;
  event_category_id?: string;
}
