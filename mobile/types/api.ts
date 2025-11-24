/**
 * API Request and Response Types
 *
 * Mirrors backend Pydantic models for type safety
 */

// ===========================
// AUTHENTICATION
// ===========================

export interface MemberLoginRequest {
  phone: string; // Format: +628123456789
  church_id: string;
}

export interface MemberLoginResponse {
  message: string;
  expires_in: number; // seconds
}

export interface MemberVerifyOTPRequest {
  phone: string;
  church_id: string;
  otp_code: string;
}

export interface MemberAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  member: Member;
}

// ===========================
// MEMBER
// ===========================

export interface Member {
  id: string;
  church_id: string;
  name: string;
  email?: string;
  phone_whatsapp: string;
  date_of_birth?: string;
  gender?: "male" | "female";
  address?: string;
  city?: string;
  profile_photo_url?: string;
  is_active: boolean;
  member_since?: string;
}

// ===========================
// GIVING
// ===========================

export interface GivingFund {
  id: string;
  church_id: string;
  name: string;
  name_id?: string;
  description?: string;
  is_active: boolean;
  display_order: number;
}

export interface GivingTransactionCreate {
  fund_id: string;
  amount: number;
  payment_method: "va" | "qris" | "gopay" | "ovo" | "dana";
  is_anonymous?: boolean;
}

export interface GivingPaymentIntentResponse {
  transaction_id: string;
  payment_url?: string;
  va_number?: string;
  qr_string?: string;
  amount: number;
  expired_at: string;
}

export interface GivingTransaction {
  id: string;
  member_id: string;
  fund_id: string;
  fund_name: string;
  amount: number;
  payment_method: string;
  payment_status: "pending" | "processing" | "success" | "failed" | "expired";
  is_anonymous: boolean;
  created_at: string;
}

export interface GivingHistoryResponse {
  transactions: GivingTransaction[];
  total_amount: number;
  count: number;
}

// ===========================
// BIBLE
// ===========================

export interface BibleVersion {
  id: string;
  code: string;
  name: string;
  language: string;
  description?: string;
}

export interface BibleBook {
  id: string;
  name: string;
  name_local: string;
  testament: 'OT' | 'NT';
  book_number: number;
  chapter_count: number;
}

export interface BibleVerse {
  id: string;
  version_code: string;
  book: string;
  book_number: number;
  chapter: number;
  verse: number;
  text: string;
}

export interface BibleChapterResponse {
  version: string;
  book: string;
  chapter: number;
  verses: BibleVerse[];
}

// ===========================
// EVENTS
// ===========================

export interface Event {
  id: string;
  title: string;
  description?: string;
  event_type: string;
  start_datetime: string;
  end_datetime: string;
  location?: string;
  max_capacity?: number;
  rsvp_count: number;
  has_rsvp: boolean;
  requires_rsvp: boolean;
  banner_url?: string;
}

export interface EventRSVP {
  event_id: string;
  member_id: string;
  status: "confirmed" | "cancelled";
  created_at: string;
}

// ===========================
// GROUPS
// ===========================

export interface Group {
  id: string;
  name: string;
  description?: string;
  group_type: string;
  meeting_schedule?: string;
  meeting_location?: string;
  leader_name?: string;
  member_count: number;
  max_members?: number;
  is_full: boolean;
}

export interface GroupJoinRequest {
  group_id: string;
  member_id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

// ===========================
// PRAYER REQUESTS
// ===========================

export interface PrayerRequest {
  id: string;
  member_id: string;
  member_name: string;
  request_text: string;
  is_answered: boolean;
  is_anonymous: boolean;
  created_at: string;
  answered_at?: string;
}

export interface PrayerRequestCreate {
  request_text: string;
  is_anonymous?: boolean;
}

// ===========================
// COUNSELING
// ===========================

export interface CounselingAppointment {
  id: string;
  member_id: string;
  member_name: string;
  member_phone: string;
  preferred_date: string;
  preferred_time: string;
  topic?: string;
  notes?: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  created_at: string;
}

export interface CounselingCreate {
  church_id: string;
  name: string;
  phone: string;
  email?: string;
  preferred_date: string;
  preferred_time: string;
  topic?: string;
  notes?: string;
}

// ===========================
// DEVOTIONS & ARTICLES
// ===========================

export interface Devotion {
  id: string;
  title: string;
  content: string;
  scripture_reference?: string;
  author?: string;
  publish_date: string;
  slug: string;
}

export interface Article {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  category?: string;
  author?: string;
  publish_date: string;
  slug: string;
  featured_image_url?: string;
}

// ===========================
// NOTIFICATIONS
// ===========================

export interface DeviceTokenRegister {
  fcm_token: string;
  device_type: "ios" | "android";
  device_name?: string;
  app_version?: string;
}

export interface DeviceToken {
  id: string;
  member_id: string;
  church_id: string;
  fcm_token: string;
  device_type: "ios" | "android";
  is_active: boolean;
  created_at: string;
}

export interface NotificationPreferences {
  id: string;
  member_id: string;
  church_id: string;
  events_enabled: boolean;
  groups_enabled: boolean;
  prayers_enabled: boolean;
  devotions_enabled: boolean;
  announcements_enabled: boolean;
  giving_receipts_enabled: boolean;
  push_enabled: boolean;
  whatsapp_enabled: boolean;
}

export interface NotificationPreferencesUpdate {
  events_enabled?: boolean;
  groups_enabled?: boolean;
  prayers_enabled?: boolean;
  devotions_enabled?: boolean;
  announcements_enabled?: boolean;
  giving_receipts_enabled?: boolean;
  push_enabled?: boolean;
  whatsapp_enabled?: boolean;
}

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  notification_type: string;
  sent_at: string;
  is_read: boolean;
  read_at?: string;
  data?: Record<string, unknown>;
}
