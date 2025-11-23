/**
 * Event Types
 */

export type RSVPStatus = 'going' | 'maybe' | 'not_going' | null;

export interface Event {
  _id: string;
  church_id: string;
  title: string;
  description: string;
  start_time: string; // ISO 8601
  end_time: string; // ISO 8601
  location: string;
  category: string;
  image_url?: string;
  max_attendees?: number;
  requires_rsvp: boolean;
  rsvp_deadline?: string; // ISO 8601
  created_at: string;
  updated_at: string;
  deleted: boolean;
}

export interface EventWithRSVP extends Event {
  rsvp_status: RSVPStatus;
  attendee_count: number;
  is_full: boolean;
}

export interface RSVPResponse {
  event_id: string;
  member_id: string;
  status: RSVPStatus;
  updated_at: string;
}
