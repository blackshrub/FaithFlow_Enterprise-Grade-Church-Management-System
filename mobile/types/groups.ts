/**
 * Groups Module Types
 *
 * Types for small groups system:
 * - Groups and categories
 * - Membership and join requests
 * - Group activities
 */

/**
 * Group category
 */
export type GroupCategory =
  | 'small_group'
  | 'ministry'
  | 'bible_study'
  | 'prayer_group'
  | 'youth'
  | 'mens'
  | 'womens'
  | 'couples'
  | 'seniors'
  | 'other';

/**
 * Group meeting schedule
 */
export type MeetingSchedule = {
  day: string; // e.g., "Monday", "Friday"
  time: string; // e.g., "19:00"
  frequency: 'weekly' | 'biweekly' | 'monthly';
};

/**
 * Member role in group
 */
export type GroupRole = 'leader' | 'co_leader' | 'member';

/**
 * Join request status
 */
export type JoinRequestStatus = 'pending' | 'approved' | 'rejected';

/**
 * Group
 */
export interface Group {
  _id: string;
  church_id: string;
  name: string;
  description: string;
  category: GroupCategory;
  leader_id: string;
  leader_name: string;
  co_leaders: string[];
  member_count: number;
  max_members?: number;
  is_full: boolean;
  is_open: boolean;
  meeting_schedule?: MeetingSchedule;
  location?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Group with user's membership status
 */
export interface GroupWithStatus extends Group {
  is_member: boolean;
  member_role?: GroupRole;
  join_request_status?: JoinRequestStatus;
}

/**
 * Group member
 */
export interface GroupMember {
  _id: string;
  member_id: string;
  member_name: string;
  member_email?: string;
  member_phone?: string;
  role: GroupRole;
  joined_at: string;
}

/**
 * Join request
 */
export interface JoinRequest {
  _id: string;
  group_id: string;
  member_id: string;
  member_name: string;
  status: JoinRequestStatus;
  message?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Group activity/discussion
 */
export interface GroupActivity {
  _id: string;
  group_id: string;
  member_id: string;
  member_name: string;
  activity_type: 'post' | 'event' | 'announcement';
  title: string;
  content: string;
  created_at: string;
}

/**
 * Create group request
 */
export interface CreateGroupRequest {
  name: string;
  description: string;
  category: GroupCategory;
  max_members?: number;
  is_open: boolean;
  meeting_schedule?: MeetingSchedule;
  location?: string;
}

/**
 * Join group response
 */
export interface JoinGroupResponse {
  success: boolean;
  message: string;
  requires_approval: boolean;
}

/**
 * Leave group response
 */
export interface LeaveGroupResponse {
  success: boolean;
  message: string;
}
