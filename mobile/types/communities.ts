/**
 * Communities Module Types
 *
 * Types for the WhatsApp-style community messaging system:
 * - Communities and sub-groups
 * - Membership and roles
 * - Messages and media
 * - Polls and events
 */

/**
 * Community category
 */
export type CommunityCategory =
  | 'cell_group'
  | 'ministry_team'
  | 'activity'
  | 'support_group';

/**
 * Member role in community
 */
export type CommunityRole = 'member' | 'admin' | 'leader';

/**
 * Message type
 */
export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'poll'
  | 'event'
  | 'system'
  | 'location'
  | 'live_location';

/**
 * Channel type
 */
export type ChannelType = 'announcement' | 'general' | 'subgroup';

/**
 * Community settings
 */
export interface CommunitySettings {
  allow_member_create_subgroups: boolean;
  subgroup_requires_approval: boolean;
  allow_announcement_replies: boolean;
  who_can_announce: 'leaders_only' | 'all_members';
  who_can_send_messages: 'all_members' | 'leaders_only';
  allow_media_sharing: boolean;
  allow_polls: boolean;
  allow_events: boolean;
  show_member_list: boolean;
  show_online_status: boolean;
  show_read_receipts: boolean;
}

/**
 * Community
 */
export interface Community {
  id: string;
  church_id: string;
  name: string;
  description?: string;
  category: CommunityCategory;
  cover_image?: string;
  meeting_schedule?: string;
  location?: string;
  leader_member_ids: string[];
  leader_name?: string;
  max_members?: number;
  is_open_for_join: boolean;
  settings: CommunitySettings;
  member_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Community with user's membership status
 */
export interface CommunityWithStatus extends Community {
  my_role?: CommunityRole;
  membership_status?: 'pending' | 'approved' | 'rejected';
  joined_at?: string;
  notifications_enabled?: boolean;
  unread_count?: number;
  last_message?: MessagePreview;
  // Legacy compatibility fields
  meeting_location?: string;
  avatar_url?: string;
  is_private?: boolean;
}

/**
 * Message preview (for community list)
 */
export interface MessagePreview {
  id: string;
  sender_name: string;
  text_preview: string;
  message_type: MessageType;
  created_at: string;
}

/**
 * Media attachment
 */
export interface MessageMedia {
  seaweedfs_fid: string;
  mime_type: string;
  file_name?: string;
  file_size: number;
  thumbnail_fid?: string;
  duration?: number;
  width?: number;
  height?: number;
}

/**
 * Reply preview
 */
export interface ReplyPreview {
  message_id: string;
  sender_id: string;
  sender_name: string;
  text_preview: string;
  media_type?: string;
}

/**
 * Read receipt
 */
export interface ReadReceipt {
  member_id: string;
  member_name: string;
  read_at: string;
}

/**
 * Message sender info (resolved from member)
 */
export interface MessageSender {
  id: string;
  name: string;
  avatar_url?: string;
}

/**
 * Reply-to info (for message replies)
 */
export interface ReplyTo {
  sender_name: string;
  preview: string;
  media_type?: string;
}

/**
 * Media with resolved URLs
 */
export interface ResolvedMedia extends MessageMedia {
  url: string;
  thumbnail_url?: string;
}

/**
 * Community message
 */
export interface CommunityMessage {
  id: string;
  church_id: string;
  community_id: string;
  channel_type: ChannelType;
  subgroup_id?: string;
  sender_member_id: string;
  sender_name: string;
  sender_avatar_fid?: string;
  message_type: MessageType;
  text?: string;
  media?: ResolvedMedia;
  reply_to_message_id?: string;
  reply_to_preview?: ReplyPreview;
  is_forwarded: boolean;
  forwarded_from_community_id?: string;
  forwarded_from_community_name?: string;
  reactions: Record<string, string[]>; // emoji -> member_ids
  read_by: ReadReceipt[];
  delivered_to?: string[]; // member_ids who received the message
  read_count: number;
  is_edited: boolean;
  edited_at?: string;
  is_deleted: boolean;
  deleted_at?: string;
  deleted_for_everyone: boolean;
  is_announcement_reply: boolean;
  parent_announcement_id?: string;
  reply_count: number;
  poll_id?: string;
  poll?: CommunityPoll;
  event_id?: string;

  // Location data (for location/live_location messages)
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
    duration?: string; // For live location: '15m' | '1h' | '8h'
    expires_at?: string; // ISO date for when live location expires
  };

  mentioned_member_ids: string[];
  mentions_everyone: boolean;

  // Starring
  starred_by?: string[];

  created_at: string;
  updated_at?: string;

  // Resolved fields from API (populated by backend)
  sender?: MessageSender;
  reply_to?: ReplyTo;

  // Optimistic update fields (client-side only)
  is_optimistic?: boolean;
  send_failed?: boolean;
  optimistic_id?: string;
}

/**
 * Community member
 */
export interface CommunityMember {
  id: string;
  member_id: string;
  member_name: string;
  member_avatar?: string;
  role: CommunityRole;
  joined_at: string;
  is_online?: boolean;
  last_seen?: string;
  // Legacy compatibility fields
  profile_photo?: string;
  full_name?: string;
}

/**
 * Sub-group
 */
export interface CommunitySubgroup {
  id: string;
  church_id: string;
  community_id: string;
  name: string;
  description?: string;
  cover_image_fid?: string;
  created_by_member_id: string;
  admin_member_ids: string[];
  member_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  unread_count?: number;
  last_message?: MessagePreview;
}

/**
 * Poll option
 */
export interface PollOption {
  id: string;
  text: string;
  vote_count: number;
  voted_by_me: boolean;
}

/**
 * Community poll
 */
export interface CommunityPoll {
  id: string;
  community_id: string;
  message_id: string;
  question: string;
  options: PollOption[];
  allow_multiple_answers: boolean;
  is_anonymous: boolean;
  closes_at?: string;
  is_closed: boolean;
  total_votes: number;
  created_by_member_id: string;
  created_at: string;
  my_votes?: string[]; // option IDs the current user voted for
  // Legacy compatibility fields
  allow_multiple?: boolean;
  created_by?: string;
}

/**
 * Event RSVP
 */
export interface EventRSVP {
  member_id: string;
  member_name: string;
  response: 'yes' | 'no' | 'maybe';
  responded_at: string;
}

/**
 * Community event
 */
export interface CommunityEvent {
  id: string;
  community_id: string;
  message_id: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time?: string;
  rsvp_enabled: boolean;
  rsvp_responses: EventRSVP[];
  my_rsvp?: 'yes' | 'no' | 'maybe';
  created_by_member_id: string;
  created_at: string;
}

/**
 * Typing indicator
 */
export interface TypingIndicator {
  member_id: string;
  member_name: string;
  is_typing: boolean;
  timestamp: string;
}

/**
 * Presence status
 */
export interface MemberPresence {
  member_id: string;
  is_online: boolean;
  last_seen: string;
  active_community_id?: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface MessageLocation {
  latitude: number;
  longitude: number;
  address?: string;
  duration?: string; // For live location: '15m' | '1h' | '8h'
  expires_at?: string; // ISO date for when live location expires
}

export interface SendMessageRequest {
  text?: string;
  message_type: MessageType;
  media?: MessageMedia;
  reply_to_message_id?: string;
  location?: MessageLocation;
}

export interface MessageListResponse {
  messages: CommunityMessage[];
  total: number;
  has_more: boolean;
  oldest_message_id?: string;
  newest_message_id?: string;
}

export interface JoinCommunityResponse {
  success: boolean;
  message: string;
  requires_approval: boolean;
  request_id?: string;
}

export interface LeaveCommunityResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// MQTT Message Types
// ============================================================================

export interface MQTTMessage {
  type: 'message' | 'message_edit' | 'message_delete' | 'system';
  data: CommunityMessage | SystemMessageData;
  timestamp: string;
}

export interface MQTTTypingMessage {
  member_id: string;
  member_name: string;
  is_typing: boolean;
  timestamp: string;
}

export interface MQTTReadReceiptMessage {
  member_id: string;
  message_id: string;
  subgroup_id?: string;
  read_at: string;
}

export interface MQTTReactionMessage {
  message_id: string;
  member_id: string;
  member_name: string;
  emoji: string;
  action: 'add' | 'remove';
  timestamp: string;
}

export interface MQTTPresenceMessage {
  online: boolean;
  last_seen: string;
  active_community_id?: string;
  active_subgroup_id?: string;
}

export interface SystemMessageData {
  action: string;
  actor_member_id?: string;
  actor_name?: string;
  target_member_id?: string;
  target_name?: string;
  extra_data?: Record<string, any>;
}
