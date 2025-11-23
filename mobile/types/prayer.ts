/**
 * Prayer Requests Module Types
 *
 * Types for prayer request system:
 * - Prayer requests
 * - Prayer interactions
 * - Prayer categories
 */

/**
 * Prayer request status
 */
export type PrayerStatus = 'active' | 'answered' | 'archived';

/**
 * Prayer request category
 */
export type PrayerCategory =
  | 'health'
  | 'family'
  | 'financial'
  | 'spiritual'
  | 'work'
  | 'relationships'
  | 'guidance'
  | 'thanksgiving'
  | 'other';

/**
 * Prayer request
 */
export interface PrayerRequest {
  _id: string;
  church_id: string;
  member_id: string;
  member_name: string;
  title: string;
  description: string;
  category: PrayerCategory;
  status: PrayerStatus;
  is_anonymous: boolean;
  prayer_count: number;
  is_answered: boolean;
  answered_at?: string;
  answered_testimony?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Prayer request with user's prayer status
 */
export interface PrayerRequestWithStatus extends PrayerRequest {
  has_prayed: boolean;
}

/**
 * Create prayer request payload
 */
export interface CreatePrayerRequest {
  title: string;
  description: string;
  category: PrayerCategory;
  is_anonymous?: boolean;
}

/**
 * Update prayer request payload
 */
export interface UpdatePrayerRequest {
  title?: string;
  description?: string;
  category?: PrayerCategory;
  status?: PrayerStatus;
}

/**
 * Mark as answered payload
 */
export interface MarkAsAnsweredRequest {
  answered_testimony?: string;
}

/**
 * Prayer response
 */
export interface PrayResponse {
  success: boolean;
  prayer_count: number;
}
