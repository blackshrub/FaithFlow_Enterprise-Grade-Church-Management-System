/**
 * Realistic Mock Data for Community Feature
 *
 * Complete, production-ready mock data for testing Community UI/UX
 * - Multiple community categories (cell groups, ministry teams, activities, support groups)
 * - Realistic members with different roles
 * - WhatsApp-style messages with reactions, replies, media
 * - Sub-groups with their own messages
 * - Polls and events
 * - Read receipts and typing indicators
 *
 * All timestamps are relative to "now" for realistic testing
 */

import type {
  Community,
  CommunityWithStatus,
  CommunityMember,
  CommunityMessage,
  CommunitySubgroup,
  CommunityPoll,
  CommunityEvent,
  CommunitySettings,
  CommunityThread,
  MessagePreview,
  ReadReceipt,
  PollOption,
  EventRSVP,
  CommunityRole,
  CommunityCategory,
  MessageType,
  ChannelType,
  ThreadType,
} from '@/types/communities';

// ============================================================================
// HELPERS
// ============================================================================

const CHURCH_ID = 'church_001';
const CURRENT_USER_MEMBER_ID = 'member_001'; // The logged-in user

/**
 * Generate a timestamp relative to now
 * @param offset - Negative minutes from now (e.g., -60 = 1 hour ago)
 */
function timeAgo(minutes: number): string {
  const date = new Date(Date.now() + minutes * 60 * 1000);
  return date.toISOString();
}

/**
 * Generate a future timestamp
 * @param days - Days from now
 */
function daysFromNow(days: number): string {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return date.toISOString();
}

/**
 * Create default community settings
 */
function createSettings(overrides?: Partial<CommunitySettings>): CommunitySettings {
  return {
    allow_member_create_subgroups: true,
    subgroup_requires_approval: false,
    allow_announcement_replies: true,
    who_can_announce: 'leaders_only',
    who_can_send_messages: 'all_members',
    allow_media_sharing: true,
    allow_polls: true,
    allow_events: true,
    show_member_list: true,
    show_online_status: true,
    show_read_receipts: true,
    ...overrides,
  };
}

// ============================================================================
// MEMBERS - Reusable member pool
// ============================================================================

export const mockMembers: CommunityMember[] = [
  // Current user (always first)
  {
    id: 'cm_001',
    member_id: 'member_001',
    member_name: 'You',
    member_avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
    role: 'member',
    joined_at: timeAgo(-30 * 24 * 60), // 30 days ago
    is_online: true,
    last_seen: timeAgo(0),
  },
  // Leaders
  {
    id: 'cm_002',
    member_id: 'member_002',
    member_name: 'Pastor David Wijaya',
    member_avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    role: 'leader',
    joined_at: timeAgo(-365 * 24 * 60), // 1 year ago
    is_online: true,
    last_seen: timeAgo(-5),
  },
  {
    id: 'cm_003',
    member_id: 'member_003',
    member_name: 'Sarah Tan',
    member_avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    role: 'leader',
    joined_at: timeAgo(-180 * 24 * 60),
    is_online: false,
    last_seen: timeAgo(-120),
  },
  // Admins
  {
    id: 'cm_004',
    member_id: 'member_004',
    member_name: 'Michael Chen',
    member_avatar: 'https://randomuser.me/api/portraits/men/22.jpg',
    role: 'admin',
    joined_at: timeAgo(-90 * 24 * 60),
    is_online: true,
    last_seen: timeAgo(-2),
  },
  {
    id: 'cm_005',
    member_id: 'member_005',
    member_name: 'Grace Liu',
    member_avatar: 'https://randomuser.me/api/portraits/women/28.jpg',
    role: 'admin',
    joined_at: timeAgo(-60 * 24 * 60),
    is_online: false,
    last_seen: timeAgo(-45),
  },
  // Regular members
  {
    id: 'cm_006',
    member_id: 'member_006',
    member_name: 'Jonathan Lee',
    member_avatar: 'https://randomuser.me/api/portraits/men/45.jpg',
    role: 'member',
    joined_at: timeAgo(-45 * 24 * 60),
    is_online: true,
    last_seen: timeAgo(-1),
  },
  {
    id: 'cm_007',
    member_id: 'member_007',
    member_name: 'Rachel Huang',
    member_avatar: 'https://randomuser.me/api/portraits/women/33.jpg',
    role: 'member',
    joined_at: timeAgo(-30 * 24 * 60),
    is_online: false,
    last_seen: timeAgo(-180),
  },
  {
    id: 'cm_008',
    member_id: 'member_008',
    member_name: 'Daniel Santoso',
    member_avatar: 'https://randomuser.me/api/portraits/men/55.jpg',
    role: 'member',
    joined_at: timeAgo(-20 * 24 * 60),
    is_online: true,
    last_seen: timeAgo(-10),
  },
  {
    id: 'cm_009',
    member_id: 'member_009',
    member_name: 'Emily Wong',
    member_avatar: 'https://randomuser.me/api/portraits/women/17.jpg',
    role: 'member',
    joined_at: timeAgo(-15 * 24 * 60),
    is_online: false,
    last_seen: timeAgo(-60),
  },
  {
    id: 'cm_010',
    member_id: 'member_010',
    member_name: 'Andrew Lim',
    member_avatar: 'https://randomuser.me/api/portraits/men/67.jpg',
    role: 'member',
    joined_at: timeAgo(-10 * 24 * 60),
    is_online: false,
    last_seen: timeAgo(-300),
  },
  {
    id: 'cm_011',
    member_id: 'member_011',
    member_name: 'Jessica Hartono',
    member_avatar: 'https://randomuser.me/api/portraits/women/52.jpg',
    role: 'member',
    joined_at: timeAgo(-7 * 24 * 60),
    is_online: true,
    last_seen: timeAgo(-3),
  },
  {
    id: 'cm_012',
    member_id: 'member_012',
    member_name: 'Kevin Pratama',
    member_avatar: 'https://randomuser.me/api/portraits/men/78.jpg',
    role: 'member',
    joined_at: timeAgo(-5 * 24 * 60),
    is_online: false,
    last_seen: timeAgo(-720),
  },
  {
    id: 'cm_013',
    member_id: 'member_013',
    member_name: 'Michelle Ng',
    member_avatar: 'https://randomuser.me/api/portraits/women/63.jpg',
    role: 'member',
    joined_at: timeAgo(-3 * 24 * 60),
    is_online: true,
    last_seen: timeAgo(-8),
  },
  {
    id: 'cm_014',
    member_id: 'member_014',
    member_name: 'Ryan Kusuma',
    member_avatar: 'https://randomuser.me/api/portraits/men/89.jpg',
    role: 'member',
    joined_at: timeAgo(-2 * 24 * 60),
    is_online: false,
    last_seen: timeAgo(-150),
  },
  {
    id: 'cm_015',
    member_id: 'member_015',
    member_name: 'Stephanie Halim',
    member_avatar: 'https://randomuser.me/api/portraits/women/71.jpg',
    role: 'member',
    joined_at: timeAgo(-1 * 24 * 60),
    is_online: true,
    last_seen: timeAgo(-15),
  },
];

// Helper to get member by ID
function getMember(memberId: string): CommunityMember {
  return mockMembers.find(m => m.member_id === memberId) || mockMembers[0];
}

// ============================================================================
// COMMUNITIES
// ============================================================================

export const mockCommunities: CommunityWithStatus[] = [
  // ==========================================================================
  // 1. CELL GROUP - Young Adults Fellowship
  // ==========================================================================
  {
    id: 'comm_001',
    church_id: CHURCH_ID,
    name: 'Young Adults Fellowship',
    description: 'A vibrant community for young professionals aged 21-35. We meet weekly for Bible study, worship, and fellowship. Come grow with us in faith and friendship!',
    category: 'cell_group',
    cover_image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80',
    meeting_schedule: 'Every Friday, 7:00 PM - 9:30 PM',
    location: 'Room 201, Church Building',
    leader_member_ids: ['member_002', 'member_003'],
    leader_name: 'Pastor David Wijaya',
    max_members: 30,
    is_open_for_join: true,
    settings: createSettings(),
    member_count: 24,
    created_at: timeAgo(-365 * 24 * 60),
    updated_at: timeAgo(-60),
    // User status
    my_role: 'member',
    membership_status: 'approved',
    joined_at: timeAgo(-30 * 24 * 60),
    notifications_enabled: true,
    unread_count: 5,
    last_message: {
      id: 'msg_001_latest',
      sender_name: 'Pastor David Wijaya',
      text_preview: 'Don\'t forget our fellowship dinner tomorrow! 🍕',
      message_type: 'text',
      created_at: timeAgo(-15),
      thread_name: 'General Discussion',
    },
  },

  // ==========================================================================
  // 2. MINISTRY TEAM - Worship Team
  // ==========================================================================
  {
    id: 'comm_002',
    church_id: CHURCH_ID,
    name: 'Worship Ministry',
    description: 'For all worship team members - vocalists, musicians, and AV crew. Coordinate schedules, share resources, and grow together in leading worship.',
    category: 'ministry_team',
    cover_image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&q=80',
    meeting_schedule: 'Practice: Saturday 4:00 PM',
    location: 'Main Sanctuary',
    leader_member_ids: ['member_004'],
    leader_name: 'Michael Chen',
    max_members: 50,
    is_open_for_join: false, // Requires audition
    settings: createSettings({
      who_can_announce: 'leaders_only',
      allow_member_create_subgroups: false,
    }),
    member_count: 18,
    created_at: timeAgo(-400 * 24 * 60),
    updated_at: timeAgo(-30),
    my_role: 'admin',
    membership_status: 'approved',
    joined_at: timeAgo(-90 * 24 * 60),
    notifications_enabled: true,
    unread_count: 12,
    last_message: {
      id: 'msg_002_latest',
      sender_name: 'Michael Chen',
      text_preview: 'Schedule for next Sunday uploaded! Please check.',
      message_type: 'text',
      created_at: timeAgo(-45),
      thread_name: 'Announcements',
    },
  },

  // ==========================================================================
  // 3. ACTIVITY - Prayer Warriors
  // ==========================================================================
  {
    id: 'comm_003',
    church_id: CHURCH_ID,
    name: 'Prayer Warriors',
    description: 'Dedicated intercessors committed to praying for our church, community, and world. Share prayer requests and testimonies of answered prayers.',
    category: 'activity',
    cover_image: 'https://images.unsplash.com/photo-1545232979-8bf68ee9b1af?w=800&q=80',
    meeting_schedule: 'Prayer Meeting: Wednesday 6:00 AM & 8:00 PM',
    location: 'Prayer Room / Online via Zoom',
    leader_member_ids: ['member_005'],
    leader_name: 'Grace Liu',
    is_open_for_join: true,
    settings: createSettings({
      allow_polls: false,
      allow_events: true,
    }),
    member_count: 45,
    created_at: timeAgo(-500 * 24 * 60),
    updated_at: timeAgo(-120),
    my_role: 'member',
    membership_status: 'approved',
    joined_at: timeAgo(-60 * 24 * 60),
    notifications_enabled: false, // Muted
    unread_count: 28,
    last_message: {
      id: 'msg_003_latest',
      sender_name: 'Grace Liu',
      text_preview: '🙏 Please pray for Sister Maria\'s surgery tomorrow',
      message_type: 'text',
      created_at: timeAgo(-180),
      thread_name: 'Prayer Requests',
    },
  },

  // ==========================================================================
  // 4. SUPPORT GROUP - New Believers
  // ==========================================================================
  {
    id: 'comm_004',
    church_id: CHURCH_ID,
    name: 'New Believers Journey',
    description: 'A safe space for those who recently accepted Christ. Get mentored, ask questions, and build a strong foundation in faith. All questions welcome!',
    category: 'support_group',
    cover_image: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=800&q=80',
    meeting_schedule: 'Sunday 1:00 PM after service',
    location: 'Room 105',
    leader_member_ids: ['member_002', 'member_005'],
    leader_name: 'Pastor David Wijaya & Grace Liu',
    max_members: 15,
    is_open_for_join: true,
    settings: createSettings({
      show_online_status: false, // Privacy for new believers
      allow_member_create_subgroups: false,
    }),
    member_count: 8,
    created_at: timeAgo(-120 * 24 * 60),
    updated_at: timeAgo(-60 * 24),
    my_role: 'leader',
    membership_status: 'approved',
    joined_at: timeAgo(-120 * 24 * 60),
    notifications_enabled: true,
    unread_count: 0,
    last_message: {
      id: 'msg_004_latest',
      sender_name: 'You',
      text_preview: 'Great discussion today everyone! See you next week.',
      message_type: 'text',
      created_at: timeAgo(-24 * 60),
      thread_name: 'General Discussion',
    },
  },

  // ==========================================================================
  // 5. CELL GROUP - Married Couples
  // ==========================================================================
  {
    id: 'comm_005',
    church_id: CHURCH_ID,
    name: 'Married Couples Connect',
    description: 'Building stronger marriages through fellowship and biblical teaching. Monthly gatherings with childcare provided.',
    category: 'cell_group',
    cover_image: 'https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?w=800&q=80',
    meeting_schedule: 'First Saturday of each month, 5:00 PM',
    location: 'Fellowship Hall',
    leader_member_ids: ['member_006'],
    leader_name: 'Jonathan & Rachel Lee',
    max_members: 20,
    is_open_for_join: true,
    settings: createSettings(),
    member_count: 14,
    created_at: timeAgo(-200 * 24 * 60),
    updated_at: timeAgo(-48 * 60),
    // Not joined yet
    my_role: undefined,
    membership_status: undefined,
    joined_at: undefined,
    notifications_enabled: undefined,
    unread_count: 0,
  },

  // ==========================================================================
  // 6. MINISTRY TEAM - Kids Ministry
  // ==========================================================================
  {
    id: 'comm_006',
    church_id: CHURCH_ID,
    name: 'Kids Ministry Team',
    description: 'Teachers and volunteers serving in Sunday School and Kids Church. Curriculum planning, training, and coordination.',
    category: 'ministry_team',
    cover_image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=80',
    meeting_schedule: 'Teacher Meeting: 1st Sunday 12:00 PM',
    location: 'Kids Ministry Room',
    leader_member_ids: ['member_007'],
    leader_name: 'Rachel Huang',
    max_members: 25,
    is_open_for_join: false,
    settings: createSettings({
      allow_member_create_subgroups: true,
      subgroup_requires_approval: true,
    }),
    member_count: 12,
    created_at: timeAgo(-300 * 24 * 60),
    updated_at: timeAgo(-72 * 60),
    // Pending approval
    my_role: undefined,
    membership_status: 'pending',
    joined_at: undefined,
    notifications_enabled: undefined,
    unread_count: 0,
  },

  // ==========================================================================
  // 7. ACTIVITY - Sports Fellowship
  // ==========================================================================
  {
    id: 'comm_007',
    church_id: CHURCH_ID,
    name: 'Sports Fellowship',
    description: 'Stay active and build friendships through sports! Basketball, badminton, futsal, and more. All skill levels welcome.',
    category: 'activity',
    cover_image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80',
    meeting_schedule: 'Saturday 7:00 AM - 10:00 AM',
    location: 'Community Sports Center',
    leader_member_ids: ['member_008'],
    leader_name: 'Daniel Santoso',
    is_open_for_join: true,
    settings: createSettings({
      allow_polls: true,
      allow_events: true,
    }),
    member_count: 32,
    created_at: timeAgo(-150 * 24 * 60),
    updated_at: timeAgo(-24 * 60),
    my_role: 'member',
    membership_status: 'approved',
    joined_at: timeAgo(-45 * 24 * 60),
    notifications_enabled: true,
    unread_count: 3,
    last_message: {
      id: 'msg_007_latest',
      sender_name: 'Daniel Santoso',
      text_preview: '🏀 Basketball tomorrow! Who\'s coming?',
      message_type: 'text',
      created_at: timeAgo(-360),
      thread_name: 'Sports Schedule',
    },
  },

  // ==========================================================================
  // 8. SUPPORT GROUP - Grief Support
  // ==========================================================================
  {
    id: 'comm_008',
    church_id: CHURCH_ID,
    name: 'Grief & Loss Support',
    description: 'A compassionate community for those walking through grief. Find comfort, share your journey, and know you\'re not alone.',
    category: 'support_group',
    cover_image: 'https://images.unsplash.com/photo-1518481612222-68bbe828ecd1?w=800&q=80',
    meeting_schedule: 'Every other Thursday, 7:00 PM',
    location: 'Counseling Room',
    leader_member_ids: ['member_003'],
    leader_name: 'Sarah Tan',
    max_members: 12,
    is_open_for_join: true,
    settings: createSettings({
      show_member_list: false, // Privacy
      show_online_status: false,
      show_read_receipts: false,
      who_can_send_messages: 'all_members',
    }),
    member_count: 7,
    created_at: timeAgo(-180 * 24 * 60),
    updated_at: timeAgo(-48 * 60),
    // Not joined
    my_role: undefined,
    membership_status: undefined,
    unread_count: 0,
  },
];

// ============================================================================
// THREADS - WhatsApp-style Community Threads
// ============================================================================

/**
 * Threads for Community 001 - Young Adults Fellowship
 */
export const mockThreadsComm001: CommunityThread[] = [
  // Default Announcement Thread (admin-only, cannot be deleted)
  {
    id: 'thread_001_ann',
    church_id: CHURCH_ID,
    community_id: 'comm_001',
    name: 'Announcements',
    description: 'Important updates from community leaders. Only admins can post here.',
    cover_image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=80',
    thread_type: 'announcement',
    is_default: true,
    can_be_deleted: false,
    who_can_post: 'admins_only',
    admin_member_ids: ['member_002', 'member_003'],
    member_count: 24,
    message_count: 12,
    unread_count: 2,
    last_message: {
      id: 'ann_msg_001',
      sender_name: 'Pastor David Wijaya',
      text_preview: 'Fellowship dinner this Friday! Please RSVP by Wednesday.',
      message_type: 'text',
      created_at: timeAgo(-30),
    },
    is_muted: false,
    is_pinned: true,
    created_at: timeAgo(-365 * 24 * 60),
    updated_at: timeAgo(-30),
  },
  // Default General Discussion Thread (two-way, cannot be deleted)
  {
    id: 'thread_001_gen',
    church_id: CHURCH_ID,
    community_id: 'comm_001',
    name: 'General Discussion',
    description: 'Chat freely with fellow young adults. Share, encourage, and connect!',
    cover_image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80',
    thread_type: 'general',
    is_default: true,
    can_be_deleted: false,
    who_can_post: 'all_members',
    admin_member_ids: ['member_002', 'member_003', 'member_004'],
    member_count: 24,
    message_count: 156,
    unread_count: 5,
    last_message: {
      id: 'gen_msg_001',
      sender_name: 'Jessica Hartono',
      text_preview: 'Who wants to grab coffee after the meeting?',
      message_type: 'text',
      created_at: timeAgo(-5),
    },
    is_muted: false,
    is_pinned: false,
    created_at: timeAgo(-365 * 24 * 60),
    updated_at: timeAgo(-5),
  },
  // Custom Thread: Prayer Requests
  {
    id: 'thread_001_prayer',
    church_id: CHURCH_ID,
    community_id: 'comm_001',
    name: 'Prayer Requests',
    description: 'Share your prayer needs and pray for one another.',
    cover_image: 'https://images.unsplash.com/photo-1545232979-8bf68ee9b1af?w=800&q=80',
    thread_type: 'custom',
    is_default: false,
    can_be_deleted: true,
    who_can_post: 'all_members',
    created_by_member_id: 'member_002',
    created_by_name: 'Pastor David Wijaya',
    admin_member_ids: ['member_002', 'member_005'],
    member_count: 18,
    message_count: 45,
    unread_count: 3,
    last_message: {
      id: 'prayer_msg_001',
      sender_name: 'Grace Liu',
      text_preview: 'Thank you all for praying! My interview went well.',
      message_type: 'text',
      created_at: timeAgo(-120),
    },
    is_muted: false,
    is_pinned: false,
    created_at: timeAgo(-180 * 24 * 60),
    updated_at: timeAgo(-120),
  },
  // Custom Thread: Book Club
  {
    id: 'thread_001_book',
    church_id: CHURCH_ID,
    community_id: 'comm_001',
    name: 'Book Club',
    description: 'Reading and discussing Christian books together. Current: "Mere Christianity"',
    cover_image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80',
    thread_type: 'custom',
    is_default: false,
    can_be_deleted: true,
    who_can_post: 'all_members',
    created_by_member_id: 'member_011',
    created_by_name: 'Jessica Hartono',
    admin_member_ids: ['member_011'],
    member_count: 12,
    message_count: 89,
    unread_count: 0,
    last_message: {
      id: 'book_msg_001',
      sender_name: 'Michelle Ng',
      text_preview: 'Chapter 5 discussion was so insightful!',
      message_type: 'text',
      created_at: timeAgo(-48 * 60),
    },
    is_muted: true,
    is_pinned: false,
    created_at: timeAgo(-90 * 24 * 60),
    updated_at: timeAgo(-48 * 60),
  },
  // Custom Thread: Hangout Plans
  {
    id: 'thread_001_hangout',
    church_id: CHURCH_ID,
    community_id: 'comm_001',
    name: 'Weekend Hangouts',
    description: 'Plan casual meetups, dinners, and fun activities.',
    cover_image: 'https://images.unsplash.com/photo-1543807535-eceef0bc6599?w=800&q=80',
    thread_type: 'custom',
    is_default: false,
    can_be_deleted: true,
    who_can_post: 'all_members',
    created_by_member_id: 'member_006',
    created_by_name: 'Jonathan Lee',
    admin_member_ids: ['member_006', 'member_004'],
    member_count: 20,
    message_count: 234,
    unread_count: 8,
    last_message: {
      id: 'hangout_msg_001',
      sender_name: 'Andrew Lim',
      text_preview: 'Movie night on Saturday? Anyone interested?',
      message_type: 'text',
      created_at: timeAgo(-15),
    },
    is_muted: false,
    is_pinned: false,
    created_at: timeAgo(-60 * 24 * 60),
    updated_at: timeAgo(-15),
  },
];

/**
 * Threads for Community 002 - Worship Ministry
 */
export const mockThreadsComm002: CommunityThread[] = [
  {
    id: 'thread_002_ann',
    church_id: CHURCH_ID,
    community_id: 'comm_002',
    name: 'Announcements',
    description: 'Official announcements from worship leaders.',
    cover_image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&q=80',
    thread_type: 'announcement',
    is_default: true,
    can_be_deleted: false,
    who_can_post: 'admins_only',
    admin_member_ids: ['member_004'],
    member_count: 18,
    message_count: 24,
    unread_count: 1,
    last_message: {
      id: 'wor_ann_001',
      sender_name: 'Michael Chen',
      text_preview: 'Sunday schedule uploaded. Please check your assignments.',
      message_type: 'text',
      created_at: timeAgo(-45),
    },
    is_muted: false,
    is_pinned: true,
    created_at: timeAgo(-400 * 24 * 60),
    updated_at: timeAgo(-45),
  },
  {
    id: 'thread_002_gen',
    church_id: CHURCH_ID,
    community_id: 'comm_002',
    name: 'General Discussion',
    description: 'Chat with the worship team.',
    cover_image: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&q=80',
    thread_type: 'general',
    is_default: true,
    can_be_deleted: false,
    who_can_post: 'all_members',
    admin_member_ids: ['member_004', 'member_003'],
    member_count: 18,
    message_count: 312,
    unread_count: 12,
    last_message: {
      id: 'wor_gen_001',
      sender_name: 'Sarah Tan',
      text_preview: 'Love the new song arrangement!',
      message_type: 'text',
      created_at: timeAgo(-10),
    },
    is_muted: false,
    is_pinned: false,
    created_at: timeAgo(-400 * 24 * 60),
    updated_at: timeAgo(-10),
  },
  {
    id: 'thread_002_vocals',
    church_id: CHURCH_ID,
    community_id: 'comm_002',
    name: 'Vocalists',
    description: 'Vocal training and harmony practice coordination.',
    thread_type: 'custom',
    is_default: false,
    can_be_deleted: true,
    who_can_post: 'all_members',
    created_by_member_id: 'member_003',
    created_by_name: 'Sarah Tan',
    admin_member_ids: ['member_003'],
    member_count: 7,
    message_count: 78,
    unread_count: 2,
    last_message: {
      id: 'vocals_001',
      sender_name: 'Grace Liu',
      text_preview: 'Harmony practice audio attached',
      message_type: 'audio',
      created_at: timeAgo(-180),
    },
    is_muted: false,
    is_pinned: false,
    created_at: timeAgo(-200 * 24 * 60),
    updated_at: timeAgo(-180),
  },
  {
    id: 'thread_002_band',
    church_id: CHURCH_ID,
    community_id: 'comm_002',
    name: 'Band',
    description: 'Musicians - keys, drums, bass, guitar coordination.',
    thread_type: 'custom',
    is_default: false,
    can_be_deleted: true,
    who_can_post: 'all_members',
    created_by_member_id: 'member_004',
    created_by_name: 'Michael Chen',
    admin_member_ids: ['member_004', 'member_008'],
    member_count: 9,
    message_count: 145,
    unread_count: 5,
    last_message: {
      id: 'band_001',
      sender_name: 'Daniel Santoso',
      text_preview: 'New drum pads arrived! Check this out',
      message_type: 'image',
      created_at: timeAgo(-60),
    },
    is_muted: false,
    is_pinned: false,
    created_at: timeAgo(-200 * 24 * 60),
    updated_at: timeAgo(-60),
  },
  {
    id: 'thread_002_av',
    church_id: CHURCH_ID,
    community_id: 'comm_002',
    name: 'AV & Tech',
    description: 'Audio-visual and technical team coordination.',
    thread_type: 'custom',
    is_default: false,
    can_be_deleted: true,
    who_can_post: 'all_members',
    created_by_member_id: 'member_004',
    created_by_name: 'Michael Chen',
    admin_member_ids: ['member_004'],
    member_count: 5,
    message_count: 67,
    unread_count: 0,
    last_message: {
      id: 'av_001',
      sender_name: 'Kevin Pratama',
      text_preview: 'Projector checked and working fine',
      message_type: 'text',
      created_at: timeAgo(-24 * 60),
    },
    is_muted: true,
    is_pinned: false,
    created_at: timeAgo(-150 * 24 * 60),
    updated_at: timeAgo(-24 * 60),
  },
];

/**
 * Threads for Community 003 - Prayer Warriors
 */
export const mockThreadsComm003: CommunityThread[] = [
  {
    id: 'thread_003_ann',
    church_id: CHURCH_ID,
    community_id: 'comm_003',
    name: 'Announcements',
    description: 'Prayer meeting schedules and important updates.',
    thread_type: 'announcement',
    is_default: true,
    can_be_deleted: false,
    who_can_post: 'admins_only',
    admin_member_ids: ['member_005'],
    member_count: 45,
    message_count: 18,
    unread_count: 1,
    last_message: {
      id: 'pray_ann_001',
      sender_name: 'Grace Liu',
      text_preview: 'Extended prayer night this Friday! 8 PM - 11 PM',
      message_type: 'text',
      created_at: timeAgo(-240),
    },
    is_muted: false,
    is_pinned: true,
    created_at: timeAgo(-500 * 24 * 60),
    updated_at: timeAgo(-240),
  },
  {
    id: 'thread_003_gen',
    church_id: CHURCH_ID,
    community_id: 'comm_003',
    name: 'General Discussion',
    description: 'Share prayer requests, testimonies, and encouragement.',
    thread_type: 'general',
    is_default: true,
    can_be_deleted: false,
    who_can_post: 'all_members',
    admin_member_ids: ['member_005', 'member_002'],
    member_count: 45,
    message_count: 567,
    unread_count: 28,
    last_message: {
      id: 'pray_gen_001',
      sender_name: 'Rachel Huang',
      text_preview: 'Amen! God is so faithful!',
      message_type: 'text',
      created_at: timeAgo(-20),
    },
    is_muted: false,
    is_pinned: false,
    created_at: timeAgo(-500 * 24 * 60),
    updated_at: timeAgo(-20),
  },
  {
    id: 'thread_003_urgent',
    church_id: CHURCH_ID,
    community_id: 'comm_003',
    name: 'Urgent Prayer',
    description: 'For urgent prayer needs that require immediate intercession.',
    thread_type: 'custom',
    is_default: false,
    can_be_deleted: true,
    who_can_post: 'all_members',
    created_by_member_id: 'member_005',
    created_by_name: 'Grace Liu',
    admin_member_ids: ['member_005'],
    member_count: 38,
    message_count: 89,
    unread_count: 4,
    last_message: {
      id: 'urgent_001',
      sender_name: 'Emily Wong',
      text_preview: 'Please pray for my father - in ICU now',
      message_type: 'text',
      created_at: timeAgo(-60),
    },
    is_muted: false,
    is_pinned: true,
    created_at: timeAgo(-300 * 24 * 60),
    updated_at: timeAgo(-60),
  },
  {
    id: 'thread_003_testimony',
    church_id: CHURCH_ID,
    community_id: 'comm_003',
    name: 'Testimonies',
    description: 'Share answered prayers and testimonies of God\'s faithfulness.',
    thread_type: 'custom',
    is_default: false,
    can_be_deleted: true,
    who_can_post: 'all_members',
    created_by_member_id: 'member_005',
    created_by_name: 'Grace Liu',
    admin_member_ids: ['member_005', 'member_007'],
    member_count: 42,
    message_count: 123,
    unread_count: 0,
    last_message: {
      id: 'testimony_001',
      sender_name: 'Daniel Santoso',
      text_preview: 'My wife is cancer-free! Praise God!',
      message_type: 'text',
      created_at: timeAgo(-48 * 60),
    },
    is_muted: false,
    is_pinned: false,
    created_at: timeAgo(-250 * 24 * 60),
    updated_at: timeAgo(-48 * 60),
  },
];

/**
 * Threads for Community 007 - Sports Fellowship
 */
export const mockThreadsComm007: CommunityThread[] = [
  {
    id: 'thread_007_ann',
    church_id: CHURCH_ID,
    community_id: 'comm_007',
    name: 'Announcements',
    description: 'Weekly schedules and venue updates.',
    thread_type: 'announcement',
    is_default: true,
    can_be_deleted: false,
    who_can_post: 'admins_only',
    admin_member_ids: ['member_008'],
    member_count: 32,
    message_count: 15,
    unread_count: 0,
    last_message: {
      id: 'sport_ann_001',
      sender_name: 'Daniel Santoso',
      text_preview: 'Basketball this Saturday! Court 3, 7 AM',
      message_type: 'text',
      created_at: timeAgo(-360),
    },
    is_muted: false,
    is_pinned: true,
    created_at: timeAgo(-150 * 24 * 60),
    updated_at: timeAgo(-360),
  },
  {
    id: 'thread_007_gen',
    church_id: CHURCH_ID,
    community_id: 'comm_007',
    name: 'General Discussion',
    description: 'Chat, coordinate, and have fun!',
    thread_type: 'general',
    is_default: true,
    can_be_deleted: false,
    who_can_post: 'all_members',
    admin_member_ids: ['member_008', 'member_006'],
    member_count: 32,
    message_count: 456,
    unread_count: 3,
    last_message: {
      id: 'sport_gen_001',
      sender_name: 'Jonathan Lee',
      text_preview: 'Great game today everyone!',
      message_type: 'text',
      created_at: timeAgo(-180),
    },
    is_muted: false,
    is_pinned: false,
    created_at: timeAgo(-150 * 24 * 60),
    updated_at: timeAgo(-180),
  },
  {
    id: 'thread_007_basketball',
    church_id: CHURCH_ID,
    community_id: 'comm_007',
    name: 'Basketball',
    description: 'For basketball enthusiasts - game coordination.',
    thread_type: 'custom',
    is_default: false,
    can_be_deleted: true,
    who_can_post: 'all_members',
    created_by_member_id: 'member_008',
    created_by_name: 'Daniel Santoso',
    admin_member_ids: ['member_008'],
    member_count: 15,
    message_count: 178,
    unread_count: 2,
    last_message: {
      id: 'bb_001',
      sender_name: 'Andrew Lim',
      text_preview: 'Need one more player for Saturday!',
      message_type: 'text',
      created_at: timeAgo(-120),
    },
    is_muted: false,
    is_pinned: false,
    created_at: timeAgo(-100 * 24 * 60),
    updated_at: timeAgo(-120),
  },
  {
    id: 'thread_007_badminton',
    church_id: CHURCH_ID,
    community_id: 'comm_007',
    name: 'Badminton',
    description: 'Badminton lovers - doubles partners and games.',
    thread_type: 'custom',
    is_default: false,
    can_be_deleted: true,
    who_can_post: 'all_members',
    created_by_member_id: 'member_006',
    created_by_name: 'Jonathan Lee',
    admin_member_ids: ['member_006'],
    member_count: 12,
    message_count: 98,
    unread_count: 0,
    last_message: {
      id: 'badminton_001',
      sender_name: 'Michelle Ng',
      text_preview: 'Anyone free for doubles tomorrow?',
      message_type: 'text',
      created_at: timeAgo(-24 * 60),
    },
    is_muted: true,
    is_pinned: false,
    created_at: timeAgo(-80 * 24 * 60),
    updated_at: timeAgo(-24 * 60),
  },
];

// ============================================================================
// MESSAGES FOR COMMUNITY 001 (Young Adults Fellowship)
// ============================================================================

export const mockMessagesComm001: CommunityMessage[] = [
  // --- Messages from today ---
  {
    id: 'msg_001_001',
    church_id: CHURCH_ID,
    community_id: 'comm_001',
    channel_type: 'general',
    sender_member_id: 'member_002',
    sender_name: 'Pastor David Wijaya',
    message_type: 'text',
    text: 'Good morning everyone! 🌅 Just a reminder that we have our fellowship dinner tomorrow evening. Please RSVP if you haven\'t already!',
    is_forwarded: false,
    reactions: {
      '👍': ['member_004', 'member_006', 'member_011'],
      '🙏': ['member_005', 'member_013'],
    },
    read_by: [
      { member_id: 'member_004', member_name: 'Michael Chen', read_at: timeAgo(-10) },
      { member_id: 'member_006', member_name: 'Jonathan Lee', read_at: timeAgo(-8) },
      { member_id: 'member_011', member_name: 'Jessica Hartono', read_at: timeAgo(-5) },
    ],
    read_count: 18,
    is_edited: false,
    is_deleted: false,
    deleted_for_everyone: false,
    is_announcement_reply: false,
    reply_count: 0,
    mentioned_member_ids: [],
    mentions_everyone: false,
    created_at: timeAgo(-120),
    sender: {
      id: 'member_002',
      name: 'Pastor David Wijaya',
      avatar_url: 'https://randomuser.me/api/portraits/men/32.jpg',
    },
  },
  {
    id: 'msg_001_002',
    church_id: CHURCH_ID,
    community_id: 'comm_001',
    channel_type: 'general',
    sender_member_id: 'member_006',
    sender_name: 'Jonathan Lee',
    message_type: 'text',
    text: 'I\'ll be there! Should I bring anything?',
    reply_to_message_id: 'msg_001_001',
    reply_to_preview: {
      message_id: 'msg_001_001',
      sender_id: 'member_002',
      sender_name: 'Pastor David Wijaya',
      text_preview: 'Good morning everyone! Just a reminder...',
    },
    is_forwarded: false,
    reactions: {},
    read_by: [],
    read_count: 15,
    is_edited: false,
    is_deleted: false,
    deleted_for_everyone: false,
    is_announcement_reply: false,
    reply_count: 0,
    mentioned_member_ids: [],
    mentions_everyone: false,
    created_at: timeAgo(-115),
    sender: {
      id: 'member_006',
      name: 'Jonathan Lee',
      avatar_url: 'https://randomuser.me/api/portraits/men/45.jpg',
    },
    reply_to: {
      sender_name: 'Pastor David Wijaya',
      preview: 'Good morning everyone! Just a reminder...',
    },
  },
  {
    id: 'msg_001_003',
    church_id: CHURCH_ID,
    community_id: 'comm_001',
    channel_type: 'general',
    sender_member_id: 'member_002',
    sender_name: 'Pastor David Wijaya',
    message_type: 'text',
    text: 'Drinks would be great! We already have pizza ordered 🍕',
    reply_to_message_id: 'msg_001_002',
    is_forwarded: false,
    reactions: {
      '😋': ['member_006', 'member_011', 'member_013'],
    },
    read_by: [],
    read_count: 14,
    is_edited: false,
    is_deleted: false,
    deleted_for_everyone: false,
    is_announcement_reply: false,
    reply_count: 0,
    mentioned_member_ids: [],
    mentions_everyone: false,
    created_at: timeAgo(-110),
    sender: {
      id: 'member_002',
      name: 'Pastor David Wijaya',
      avatar_url: 'https://randomuser.me/api/portraits/men/32.jpg',
    },
    reply_to: {
      sender_name: 'Jonathan Lee',
      preview: 'I\'ll be there! Should I bring anything?',
    },
  },
  {
    id: 'msg_001_004',
    church_id: CHURCH_ID,
    community_id: 'comm_001',
    channel_type: 'general',
    sender_member_id: 'member_011',
    sender_name: 'Jessica Hartono',
    message_type: 'image',
    text: 'Here\'s the flyer for tomorrow\'s event!',
    media: {
      seaweedfs_fid: 'img_001',
      mime_type: 'image/jpeg',
      file_name: 'fellowship_dinner_flyer.jpg',
      file_size: 245000,
      width: 1080,
      height: 1920,
      url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
      thumbnail_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&q=60',
    },
    is_forwarded: false,
    reactions: {
      '❤️': ['member_002', 'member_004', 'member_006'],
      '🔥': ['member_013', 'member_015'],
    },
    read_by: [],
    read_count: 16,
    is_edited: false,
    is_deleted: false,
    deleted_for_everyone: false,
    is_announcement_reply: false,
    reply_count: 0,
    mentioned_member_ids: [],
    mentions_everyone: false,
    created_at: timeAgo(-100),
    sender: {
      id: 'member_011',
      name: 'Jessica Hartono',
      avatar_url: 'https://randomuser.me/api/portraits/women/52.jpg',
    },
  },
  {
    id: 'msg_001_005',
    church_id: CHURCH_ID,
    community_id: 'comm_001',
    channel_type: 'general',
    sender_member_id: 'member_013',
    sender_name: 'Michelle Ng',
    message_type: 'text',
    text: 'The flyer looks amazing! 😍 Who designed it?',
    is_forwarded: false,
    reactions: {},
    read_by: [],
    read_count: 12,
    is_edited: false,
    is_deleted: false,
    deleted_for_everyone: false,
    is_announcement_reply: false,
    reply_count: 0,
    mentioned_member_ids: [],
    mentions_everyone: false,
    created_at: timeAgo(-95),
    sender: {
      id: 'member_013',
      name: 'Michelle Ng',
      avatar_url: 'https://randomuser.me/api/portraits/women/63.jpg',
    },
  },
  {
    id: 'msg_001_006',
    church_id: CHURCH_ID,
    community_id: 'comm_001',
    channel_type: 'general',
    sender_member_id: 'member_011',
    sender_name: 'Jessica Hartono',
    message_type: 'text',
    text: 'I did! Used Canva 😊',
    reply_to_message_id: 'msg_001_005',
    is_forwarded: false,
    reactions: {
      '👏': ['member_013', 'member_002'],
    },
    read_by: [],
    read_count: 11,
    is_edited: false,
    is_deleted: false,
    deleted_for_everyone: false,
    is_announcement_reply: false,
    reply_count: 0,
    mentioned_member_ids: [],
    mentions_everyone: false,
    created_at: timeAgo(-90),
    sender: {
      id: 'member_011',
      name: 'Jessica Hartono',
      avatar_url: 'https://randomuser.me/api/portraits/women/52.jpg',
    },
    reply_to: {
      sender_name: 'Michelle Ng',
      preview: 'The flyer looks amazing! 😍 Who designed it?',
    },
  },
  // Poll message
  {
    id: 'msg_001_007',
    church_id: CHURCH_ID,
    community_id: 'comm_001',
    channel_type: 'general',
    sender_member_id: 'member_002',
    sender_name: 'Pastor David Wijaya',
    message_type: 'poll',
    text: '',
    poll_id: 'poll_001',
    poll: {
      id: 'poll_001',
      community_id: 'comm_001',
      message_id: 'msg_001_007',
      question: 'What topic should we study next month?',
      options: [
        { id: 'opt_1', text: 'Book of James', vote_count: 8, voted_by_me: true },
        { id: 'opt_2', text: 'Psalms', vote_count: 5, voted_by_me: false },
        { id: 'opt_3', text: 'Sermon on the Mount', vote_count: 6, voted_by_me: false },
        { id: 'opt_4', text: 'Spiritual Gifts', vote_count: 3, voted_by_me: false },
      ],
      allow_multiple_answers: false,
      is_anonymous: false,
      is_closed: false,
      total_votes: 22,
      created_by_member_id: 'member_002',
      created_at: timeAgo(-60),
    },
    is_forwarded: false,
    reactions: {},
    read_by: [],
    read_count: 20,
    is_edited: false,
    is_deleted: false,
    deleted_for_everyone: false,
    is_announcement_reply: false,
    reply_count: 0,
    mentioned_member_ids: [],
    mentions_everyone: false,
    created_at: timeAgo(-60),
    sender: {
      id: 'member_002',
      name: 'Pastor David Wijaya',
      avatar_url: 'https://randomuser.me/api/portraits/men/32.jpg',
    },
  },
  {
    id: 'msg_001_008',
    church_id: CHURCH_ID,
    community_id: 'comm_001',
    channel_type: 'general',
    sender_member_id: 'member_001',
    sender_name: 'You',
    message_type: 'text',
    text: 'I voted for James! It\'s so practical for daily life.',
    is_forwarded: false,
    reactions: {
      '💯': ['member_002'],
    },
    read_by: [],
    read_count: 8,
    is_edited: false,
    is_deleted: false,
    deleted_for_everyone: false,
    is_announcement_reply: false,
    reply_count: 0,
    mentioned_member_ids: [],
    mentions_everyone: false,
    created_at: timeAgo(-55),
    sender: {
      id: 'member_001',
      name: 'You',
      avatar_url: 'https://randomuser.me/api/portraits/men/1.jpg',
    },
  },
  // Location message
  {
    id: 'msg_001_009',
    church_id: CHURCH_ID,
    community_id: 'comm_001',
    channel_type: 'general',
    sender_member_id: 'member_004',
    sender_name: 'Michael Chen',
    message_type: 'location',
    text: 'Here\'s the restaurant location for tomorrow',
    location: {
      latitude: -6.2088,
      longitude: 106.8456,
      address: 'Pizza Marzano, Grand Indonesia Mall, Jakarta',
    },
    is_forwarded: false,
    reactions: {
      '📍': ['member_006', 'member_011'],
    },
    read_by: [],
    read_count: 14,
    is_edited: false,
    is_deleted: false,
    deleted_for_everyone: false,
    is_announcement_reply: false,
    reply_count: 0,
    mentioned_member_ids: [],
    mentions_everyone: false,
    created_at: timeAgo(-45),
    sender: {
      id: 'member_004',
      name: 'Michael Chen',
      avatar_url: 'https://randomuser.me/api/portraits/men/22.jpg',
    },
  },
  {
    id: 'msg_001_010',
    church_id: CHURCH_ID,
    community_id: 'comm_001',
    channel_type: 'general',
    sender_member_id: 'member_015',
    sender_name: 'Stephanie Halim',
    message_type: 'text',
    text: 'Yay! Love that place! See you all there 🎉',
    is_forwarded: false,
    reactions: {},
    read_by: [],
    read_count: 10,
    is_edited: false,
    is_deleted: false,
    deleted_for_everyone: false,
    is_announcement_reply: false,
    reply_count: 0,
    mentioned_member_ids: [],
    mentions_everyone: false,
    created_at: timeAgo(-30),
    sender: {
      id: 'member_015',
      name: 'Stephanie Halim',
      avatar_url: 'https://randomuser.me/api/portraits/women/71.jpg',
    },
  },
  // Most recent message
  {
    id: 'msg_001_011',
    church_id: CHURCH_ID,
    community_id: 'comm_001',
    channel_type: 'general',
    sender_member_id: 'member_002',
    sender_name: 'Pastor David Wijaya',
    message_type: 'text',
    text: 'Don\'t forget our fellowship dinner tomorrow! 🍕',
    is_forwarded: false,
    reactions: {
      '✅': ['member_001', 'member_004', 'member_006', 'member_011', 'member_015'],
    },
    read_by: [],
    read_count: 6,
    is_edited: false,
    is_deleted: false,
    deleted_for_everyone: false,
    is_announcement_reply: false,
    reply_count: 0,
    mentioned_member_ids: [],
    mentions_everyone: true,
    created_at: timeAgo(-15),
    sender: {
      id: 'member_002',
      name: 'Pastor David Wijaya',
      avatar_url: 'https://randomuser.me/api/portraits/men/32.jpg',
    },
  },
];

// ============================================================================
// MESSAGES FOR COMMUNITY 002 (Worship Ministry)
// ============================================================================

export const mockMessagesComm002: CommunityMessage[] = [
  {
    id: 'msg_002_001',
    church_id: CHURCH_ID,
    community_id: 'comm_002',
    channel_type: 'announcement',
    sender_member_id: 'member_004',
    sender_name: 'Michael Chen',
    message_type: 'text',
    text: '📢 ANNOUNCEMENT: Sunday worship schedule is now available!\n\nService 1 (8:00 AM):\n- Worship Leader: Sarah\n- Keys: Michael\n- Drums: Daniel\n- Bass: Andrew\n\nService 2 (10:30 AM):\n- Worship Leader: Grace\n- Keys: Jessica\n- Drums: Kevin\n- Bass: Ryan\n\nPlease confirm your attendance by Friday.',
    is_forwarded: false,
    reactions: {
      '✅': ['member_003', 'member_005', 'member_008', 'member_011'],
    },
    read_by: [],
    read_count: 16,
    is_edited: false,
    is_deleted: false,
    deleted_for_everyone: false,
    is_announcement_reply: false,
    reply_count: 3,
    mentioned_member_ids: ['member_003', 'member_005', 'member_008', 'member_010', 'member_011', 'member_012', 'member_014'],
    mentions_everyone: false,
    created_at: timeAgo(-180),
    sender: {
      id: 'member_004',
      name: 'Michael Chen',
      avatar_url: 'https://randomuser.me/api/portraits/men/22.jpg',
    },
  },
  {
    id: 'msg_002_002',
    church_id: CHURCH_ID,
    community_id: 'comm_002',
    channel_type: 'general',
    sender_member_id: 'member_003',
    sender_name: 'Sarah Tan',
    message_type: 'text',
    text: 'Confirmed for Service 1! What songs are we doing?',
    is_forwarded: false,
    reactions: {},
    read_by: [],
    read_count: 14,
    is_edited: false,
    is_deleted: false,
    deleted_for_everyone: false,
    is_announcement_reply: false,
    reply_count: 0,
    mentioned_member_ids: [],
    mentions_everyone: false,
    created_at: timeAgo(-150),
    sender: {
      id: 'member_003',
      name: 'Sarah Tan',
      avatar_url: 'https://randomuser.me/api/portraits/women/44.jpg',
    },
  },
  {
    id: 'msg_002_003',
    church_id: CHURCH_ID,
    community_id: 'comm_002',
    channel_type: 'general',
    sender_member_id: 'member_004',
    sender_name: 'Michael Chen',
    message_type: 'document',
    text: 'Here\'s the setlist and chord charts',
    media: {
      seaweedfs_fid: 'doc_001',
      mime_type: 'application/pdf',
      file_name: 'Sunday_Worship_Setlist.pdf',
      file_size: 524288,
      url: 'https://example.com/setlist.pdf',
    },
    is_forwarded: false,
    reactions: {
      '🙌': ['member_003', 'member_005'],
    },
    read_by: [],
    read_count: 12,
    is_edited: false,
    is_deleted: false,
    deleted_for_everyone: false,
    is_announcement_reply: false,
    reply_count: 0,
    mentioned_member_ids: [],
    mentions_everyone: false,
    created_at: timeAgo(-145),
    sender: {
      id: 'member_004',
      name: 'Michael Chen',
      avatar_url: 'https://randomuser.me/api/portraits/men/22.jpg',
    },
  },
  {
    id: 'msg_002_004',
    church_id: CHURCH_ID,
    community_id: 'comm_002',
    channel_type: 'general',
    sender_member_id: 'member_008',
    sender_name: 'Daniel Santoso',
    message_type: 'text',
    text: 'Got it! The bridge on "Build My Life" - are we doing it twice or once?',
    is_forwarded: false,
    reactions: {},
    read_by: [],
    read_count: 10,
    is_edited: false,
    is_deleted: false,
    deleted_for_everyone: false,
    is_announcement_reply: false,
    reply_count: 0,
    mentioned_member_ids: [],
    mentions_everyone: false,
    created_at: timeAgo(-120),
    sender: {
      id: 'member_008',
      name: 'Daniel Santoso',
      avatar_url: 'https://randomuser.me/api/portraits/men/55.jpg',
    },
  },
  {
    id: 'msg_002_005',
    church_id: CHURCH_ID,
    community_id: 'comm_002',
    channel_type: 'general',
    sender_member_id: 'member_003',
    sender_name: 'Sarah Tan',
    message_type: 'text',
    text: 'Let\'s do it twice! Really builds the moment 🎵',
    reply_to_message_id: 'msg_002_004',
    is_forwarded: false,
    reactions: {
      '👍': ['member_004', 'member_008'],
    },
    read_by: [],
    read_count: 9,
    is_edited: false,
    is_deleted: false,
    deleted_for_everyone: false,
    is_announcement_reply: false,
    reply_count: 0,
    mentioned_member_ids: [],
    mentions_everyone: false,
    created_at: timeAgo(-115),
    sender: {
      id: 'member_003',
      name: 'Sarah Tan',
      avatar_url: 'https://randomuser.me/api/portraits/women/44.jpg',
    },
    reply_to: {
      sender_name: 'Daniel Santoso',
      preview: 'Got it! The bridge on "Build My Life"...',
    },
  },
  {
    id: 'msg_002_006',
    church_id: CHURCH_ID,
    community_id: 'comm_002',
    channel_type: 'general',
    sender_member_id: 'member_001',
    sender_name: 'You',
    message_type: 'audio',
    text: 'Here\'s my practice recording, let me know if the arrangement works',
    media: {
      seaweedfs_fid: 'audio_001',
      mime_type: 'audio/mpeg',
      file_name: 'practice_recording.mp3',
      file_size: 3145728,
      duration: 185,
      url: 'https://example.com/audio.mp3',
    },
    is_forwarded: false,
    reactions: {
      '🔥': ['member_003', 'member_004'],
    },
    read_by: [],
    read_count: 8,
    is_edited: false,
    is_deleted: false,
    deleted_for_everyone: false,
    is_announcement_reply: false,
    reply_count: 0,
    mentioned_member_ids: [],
    mentions_everyone: false,
    created_at: timeAgo(-90),
    sender: {
      id: 'member_001',
      name: 'You',
      avatar_url: 'https://randomuser.me/api/portraits/men/1.jpg',
    },
  },
  {
    id: 'msg_002_007',
    church_id: CHURCH_ID,
    community_id: 'comm_002',
    channel_type: 'general',
    sender_member_id: 'member_004',
    sender_name: 'Michael Chen',
    message_type: 'text',
    text: 'Sounds great! Love the dynamics. See everyone at practice on Saturday 🎹',
    reply_to_message_id: 'msg_002_006',
    is_forwarded: false,
    reactions: {},
    read_by: [],
    read_count: 7,
    is_edited: false,
    is_deleted: false,
    deleted_for_everyone: false,
    is_announcement_reply: false,
    reply_count: 0,
    mentioned_member_ids: [],
    mentions_everyone: false,
    created_at: timeAgo(-45),
    sender: {
      id: 'member_004',
      name: 'Michael Chen',
      avatar_url: 'https://randomuser.me/api/portraits/men/22.jpg',
    },
    reply_to: {
      sender_name: 'You',
      preview: 'Here\'s my practice recording...',
      media_type: 'audio',
    },
  },
];

// ============================================================================
// MESSAGES FOR COMMUNITY 003 (Prayer Warriors)
// ============================================================================

export const mockMessagesComm003: CommunityMessage[] = [
  {
    id: 'msg_003_001',
    church_id: CHURCH_ID,
    community_id: 'comm_003',
    channel_type: 'general',
    sender_member_id: 'member_005',
    sender_name: 'Grace Liu',
    message_type: 'text',
    text: '🙏 Prayer Points for this week:\n\n1. Healing for Sister Maria - surgery tomorrow\n2. Job provision for Brother Kevin\n3. Peace in troubled regions of the world\n4. Our church\'s upcoming outreach event\n\nLet\'s stand in the gap together!',
    is_forwarded: false,
    reactions: {
      '🙏': ['member_002', 'member_007', 'member_009', 'member_013'],
      '❤️': ['member_011'],
    },
    read_by: [],
    read_count: 38,
    is_edited: false,
    is_deleted: false,
    deleted_for_everyone: false,
    is_announcement_reply: false,
    reply_count: 0,
    mentioned_member_ids: [],
    mentions_everyone: false,
    created_at: timeAgo(-360),
    sender: {
      id: 'member_005',
      name: 'Grace Liu',
      avatar_url: 'https://randomuser.me/api/portraits/women/28.jpg',
    },
  },
  {
    id: 'msg_003_002',
    church_id: CHURCH_ID,
    community_id: 'comm_003',
    channel_type: 'general',
    sender_member_id: 'member_007',
    sender_name: 'Rachel Huang',
    message_type: 'text',
    text: 'Praying now! 🙏 Lord, we lift up Sister Maria to you...',
    is_forwarded: false,
    reactions: {
      '🙏': ['member_005', 'member_002'],
    },
    read_by: [],
    read_count: 32,
    is_edited: false,
    is_deleted: false,
    deleted_for_everyone: false,
    is_announcement_reply: false,
    reply_count: 0,
    mentioned_member_ids: [],
    mentions_everyone: false,
    created_at: timeAgo(-340),
    sender: {
      id: 'member_007',
      name: 'Rachel Huang',
      avatar_url: 'https://randomuser.me/api/portraits/women/33.jpg',
    },
  },
  {
    id: 'msg_003_003',
    church_id: CHURCH_ID,
    community_id: 'comm_003',
    channel_type: 'general',
    sender_member_id: 'member_009',
    sender_name: 'Emily Wong',
    message_type: 'text',
    text: '✨ TESTIMONY! Brother Kevin just got a job offer! God is faithful! 🎉',
    is_forwarded: false,
    reactions: {
      '🙌': ['member_005', 'member_002', 'member_007', 'member_013', 'member_011'],
      '❤️': ['member_015', 'member_006'],
      '🎉': ['member_004'],
    },
    read_by: [],
    read_count: 35,
    is_edited: false,
    is_deleted: false,
    deleted_for_everyone: false,
    is_announcement_reply: false,
    reply_count: 0,
    mentioned_member_ids: [],
    mentions_everyone: false,
    created_at: timeAgo(-240),
    sender: {
      id: 'member_009',
      name: 'Emily Wong',
      avatar_url: 'https://randomuser.me/api/portraits/women/17.jpg',
    },
  },
  {
    id: 'msg_003_004',
    church_id: CHURCH_ID,
    community_id: 'comm_003',
    channel_type: 'general',
    sender_member_id: 'member_005',
    sender_name: 'Grace Liu',
    message_type: 'text',
    text: 'Hallelujah! What an answered prayer! 🙏\n\n"The prayer of a righteous person is powerful and effective." - James 5:16',
    reply_to_message_id: 'msg_003_003',
    is_forwarded: false,
    reactions: {
      '🙏': ['member_007', 'member_009'],
    },
    read_by: [],
    read_count: 30,
    is_edited: false,
    is_deleted: false,
    deleted_for_everyone: false,
    is_announcement_reply: false,
    reply_count: 0,
    mentioned_member_ids: [],
    mentions_everyone: false,
    created_at: timeAgo(-235),
    sender: {
      id: 'member_005',
      name: 'Grace Liu',
      avatar_url: 'https://randomuser.me/api/portraits/women/28.jpg',
    },
    reply_to: {
      sender_name: 'Emily Wong',
      preview: '✨ TESTIMONY! Brother Kevin just got a job offer!',
    },
  },
  {
    id: 'msg_003_005',
    church_id: CHURCH_ID,
    community_id: 'comm_003',
    channel_type: 'general',
    sender_member_id: 'member_005',
    sender_name: 'Grace Liu',
    message_type: 'text',
    text: '🙏 Please pray for Sister Maria\'s surgery tomorrow',
    is_forwarded: false,
    reactions: {
      '🙏': ['member_002', 'member_007', 'member_009', 'member_013', 'member_001'],
    },
    read_by: [],
    read_count: 25,
    is_edited: false,
    is_deleted: false,
    deleted_for_everyone: false,
    is_announcement_reply: false,
    reply_count: 0,
    mentioned_member_ids: [],
    mentions_everyone: false,
    created_at: timeAgo(-180),
    sender: {
      id: 'member_005',
      name: 'Grace Liu',
      avatar_url: 'https://randomuser.me/api/portraits/women/28.jpg',
    },
  },
];

// ============================================================================
// MESSAGES FOR COMMUNITY 007 (Sports Fellowship)
// ============================================================================

export const mockMessagesComm007: CommunityMessage[] = [
  {
    id: 'msg_007_001',
    church_id: CHURCH_ID,
    community_id: 'comm_007',
    channel_type: 'general',
    sender_member_id: 'member_008',
    sender_name: 'Daniel Santoso',
    message_type: 'poll',
    text: '',
    poll_id: 'poll_002',
    poll: {
      id: 'poll_002',
      community_id: 'comm_007',
      message_id: 'msg_007_001',
      question: 'What sport for this Saturday?',
      options: [
        { id: 'sport_1', text: '🏀 Basketball', vote_count: 12, voted_by_me: true },
        { id: 'sport_2', text: '🏸 Badminton', vote_count: 8, voted_by_me: false },
        { id: 'sport_3', text: '⚽ Futsal', vote_count: 6, voted_by_me: false },
        { id: 'sport_4', text: '🎾 Tennis', vote_count: 3, voted_by_me: false },
      ],
      allow_multiple_answers: false,
      is_anonymous: false,
      is_closed: false,
      total_votes: 29,
      created_by_member_id: 'member_008',
      created_at: timeAgo(-480),
    },
    is_forwarded: false,
    reactions: {},
    read_by: [],
    read_count: 28,
    is_edited: false,
    is_deleted: false,
    deleted_for_everyone: false,
    is_announcement_reply: false,
    reply_count: 0,
    mentioned_member_ids: [],
    mentions_everyone: false,
    created_at: timeAgo(-480),
    sender: {
      id: 'member_008',
      name: 'Daniel Santoso',
      avatar_url: 'https://randomuser.me/api/portraits/men/55.jpg',
    },
  },
  {
    id: 'msg_007_002',
    church_id: CHURCH_ID,
    community_id: 'comm_007',
    channel_type: 'general',
    sender_member_id: 'member_006',
    sender_name: 'Jonathan Lee',
    message_type: 'text',
    text: 'Basketball it is! 🏀 Let\'s gooo!',
    is_forwarded: false,
    reactions: {
      '🏀': ['member_008', 'member_010', 'member_014'],
    },
    read_by: [],
    read_count: 25,
    is_edited: false,
    is_deleted: false,
    deleted_for_everyone: false,
    is_announcement_reply: false,
    reply_count: 0,
    mentioned_member_ids: [],
    mentions_everyone: false,
    created_at: timeAgo(-420),
    sender: {
      id: 'member_006',
      name: 'Jonathan Lee',
      avatar_url: 'https://randomuser.me/api/portraits/men/45.jpg',
    },
  },
  {
    id: 'msg_007_003',
    church_id: CHURCH_ID,
    community_id: 'comm_007',
    channel_type: 'general',
    sender_member_id: 'member_008',
    sender_name: 'Daniel Santoso',
    message_type: 'event',
    text: '',
    event_id: 'event_001',
    is_forwarded: false,
    reactions: {},
    read_by: [],
    read_count: 24,
    is_edited: false,
    is_deleted: false,
    deleted_for_everyone: false,
    is_announcement_reply: false,
    reply_count: 0,
    mentioned_member_ids: [],
    mentions_everyone: false,
    created_at: timeAgo(-400),
    sender: {
      id: 'member_008',
      name: 'Daniel Santoso',
      avatar_url: 'https://randomuser.me/api/portraits/men/55.jpg',
    },
  },
  {
    id: 'msg_007_004',
    church_id: CHURCH_ID,
    community_id: 'comm_007',
    channel_type: 'general',
    sender_member_id: 'member_008',
    sender_name: 'Daniel Santoso',
    message_type: 'text',
    text: '🏀 Basketball tomorrow! Who\'s coming?',
    is_forwarded: false,
    reactions: {
      '✋': ['member_001', 'member_006', 'member_010', 'member_014'],
    },
    read_by: [],
    read_count: 18,
    is_edited: false,
    is_deleted: false,
    deleted_for_everyone: false,
    is_announcement_reply: false,
    reply_count: 0,
    mentioned_member_ids: [],
    mentions_everyone: false,
    created_at: timeAgo(-360),
    sender: {
      id: 'member_008',
      name: 'Daniel Santoso',
      avatar_url: 'https://randomuser.me/api/portraits/men/55.jpg',
    },
  },
];

// ============================================================================
// SUB-GROUPS
// ============================================================================

export const mockSubgroupsComm001: CommunitySubgroup[] = [
  {
    id: 'subgroup_001',
    church_id: CHURCH_ID,
    community_id: 'comm_001',
    name: 'Worship Team',
    description: 'For fellowship worship team volunteers',
    created_by_member_id: 'member_002',
    admin_member_ids: ['member_002', 'member_004'],
    member_count: 8,
    is_active: true,
    created_at: timeAgo(-60 * 24 * 60),
    updated_at: timeAgo(-24 * 60),
    unread_count: 2,
    last_message: {
      id: 'sub_msg_001',
      sender_name: 'Michael Chen',
      text_preview: 'Practice at 6 PM tomorrow',
      message_type: 'text',
      created_at: timeAgo(-24 * 60),
    },
  },
  {
    id: 'subgroup_002',
    church_id: CHURCH_ID,
    community_id: 'comm_001',
    name: 'Bible Study Leaders',
    description: 'Small group leaders coordination',
    created_by_member_id: 'member_002',
    admin_member_ids: ['member_002', 'member_003'],
    member_count: 5,
    is_active: true,
    created_at: timeAgo(-45 * 24 * 60),
    updated_at: timeAgo(-48 * 60),
    unread_count: 0,
    last_message: {
      id: 'sub_msg_002',
      sender_name: 'Sarah Tan',
      text_preview: 'Materials for next week are ready',
      message_type: 'text',
      created_at: timeAgo(-48 * 60),
    },
  },
  {
    id: 'subgroup_003',
    church_id: CHURCH_ID,
    community_id: 'comm_001',
    name: 'Event Planning',
    description: 'Planning committee for fellowship events',
    created_by_member_id: 'member_004',
    admin_member_ids: ['member_004', 'member_011'],
    member_count: 6,
    is_active: true,
    created_at: timeAgo(-30 * 24 * 60),
    updated_at: timeAgo(-12 * 60),
    unread_count: 5,
    last_message: {
      id: 'sub_msg_003',
      sender_name: 'Jessica Hartono',
      text_preview: 'Budget approved! 🎉',
      message_type: 'text',
      created_at: timeAgo(-12 * 60),
    },
  },
];

export const mockSubgroupsComm002: CommunitySubgroup[] = [
  {
    id: 'subgroup_004',
    church_id: CHURCH_ID,
    community_id: 'comm_002',
    name: 'Vocalists',
    description: 'Vocal training and coordination',
    created_by_member_id: 'member_004',
    admin_member_ids: ['member_004', 'member_003'],
    member_count: 7,
    is_active: true,
    created_at: timeAgo(-90 * 24 * 60),
    updated_at: timeAgo(-6 * 60),
    unread_count: 3,
    last_message: {
      id: 'sub_msg_004',
      sender_name: 'Sarah Tan',
      text_preview: 'Harmony practice files attached',
      message_type: 'document',
      created_at: timeAgo(-6 * 60),
    },
  },
  {
    id: 'subgroup_005',
    church_id: CHURCH_ID,
    community_id: 'comm_002',
    name: 'Instrumentalists',
    description: 'Musicians coordination',
    created_by_member_id: 'member_004',
    admin_member_ids: ['member_004'],
    member_count: 9,
    is_active: true,
    created_at: timeAgo(-90 * 24 * 60),
    updated_at: timeAgo(-18 * 60),
    unread_count: 1,
    last_message: {
      id: 'sub_msg_005',
      sender_name: 'Daniel Santoso',
      text_preview: 'New drum pads arrived!',
      message_type: 'image',
      created_at: timeAgo(-18 * 60),
    },
  },
];

// ============================================================================
// EVENTS
// ============================================================================

export const mockEvents: CommunityEvent[] = [
  {
    id: 'event_001',
    community_id: 'comm_007',
    message_id: 'msg_007_003',
    title: 'Basketball Saturday',
    description: 'Weekly basketball session. All skill levels welcome! Bring your own water bottle.',
    location: 'Community Sports Center, Court 3',
    start_time: daysFromNow(1),
    end_time: daysFromNow(1),
    rsvp_enabled: true,
    rsvp_responses: [
      { member_id: 'member_001', member_name: 'You', response: 'yes', responded_at: timeAgo(-300) },
      { member_id: 'member_006', member_name: 'Jonathan Lee', response: 'yes', responded_at: timeAgo(-350) },
      { member_id: 'member_010', member_name: 'Andrew Lim', response: 'yes', responded_at: timeAgo(-320) },
      { member_id: 'member_014', member_name: 'Ryan Kusuma', response: 'yes', responded_at: timeAgo(-280) },
      { member_id: 'member_012', member_name: 'Kevin Pratama', response: 'maybe', responded_at: timeAgo(-260) },
    ],
    my_rsvp: 'yes',
    created_by_member_id: 'member_008',
    created_at: timeAgo(-400),
  },
  {
    id: 'event_002',
    community_id: 'comm_001',
    message_id: 'msg_001_event',
    title: 'Fellowship Dinner',
    description: 'Monthly fellowship dinner at Pizza Marzano. Catch up with friends and enjoy good food!',
    location: 'Pizza Marzano, Grand Indonesia Mall',
    start_time: daysFromNow(1),
    end_time: daysFromNow(1),
    rsvp_enabled: true,
    rsvp_responses: [
      { member_id: 'member_001', member_name: 'You', response: 'yes', responded_at: timeAgo(-100) },
      { member_id: 'member_004', member_name: 'Michael Chen', response: 'yes', responded_at: timeAgo(-110) },
      { member_id: 'member_006', member_name: 'Jonathan Lee', response: 'yes', responded_at: timeAgo(-105) },
      { member_id: 'member_011', member_name: 'Jessica Hartono', response: 'yes', responded_at: timeAgo(-95) },
      { member_id: 'member_013', member_name: 'Michelle Ng', response: 'yes', responded_at: timeAgo(-90) },
      { member_id: 'member_015', member_name: 'Stephanie Halim', response: 'yes', responded_at: timeAgo(-85) },
      { member_id: 'member_009', member_name: 'Emily Wong', response: 'maybe', responded_at: timeAgo(-80) },
    ],
    my_rsvp: 'yes',
    created_by_member_id: 'member_002',
    created_at: timeAgo(-200),
  },
];

// ============================================================================
// POLLS
// ============================================================================

export const mockPolls: CommunityPoll[] = [
  {
    id: 'poll_001',
    community_id: 'comm_001',
    message_id: 'msg_001_007',
    question: 'What topic should we study next month?',
    options: [
      { id: 'opt_1', text: 'Book of James', vote_count: 8, voted_by_me: true },
      { id: 'opt_2', text: 'Psalms', vote_count: 5, voted_by_me: false },
      { id: 'opt_3', text: 'Sermon on the Mount', vote_count: 6, voted_by_me: false },
      { id: 'opt_4', text: 'Spiritual Gifts', vote_count: 3, voted_by_me: false },
    ],
    allow_multiple_answers: false,
    is_anonymous: false,
    is_closed: false,
    total_votes: 22,
    created_by_member_id: 'member_002',
    created_at: timeAgo(-60),
    my_votes: ['opt_1'],
  },
  {
    id: 'poll_002',
    community_id: 'comm_007',
    message_id: 'msg_007_001',
    question: 'What sport for this Saturday?',
    options: [
      { id: 'sport_1', text: '🏀 Basketball', vote_count: 12, voted_by_me: true },
      { id: 'sport_2', text: '🏸 Badminton', vote_count: 8, voted_by_me: false },
      { id: 'sport_3', text: '⚽ Futsal', vote_count: 6, voted_by_me: false },
      { id: 'sport_4', text: '🎾 Tennis', vote_count: 3, voted_by_me: false },
    ],
    allow_multiple_answers: false,
    is_anonymous: false,
    is_closed: false,
    total_votes: 29,
    created_by_member_id: 'member_008',
    created_at: timeAgo(-480),
    my_votes: ['sport_1'],
  },
  {
    id: 'poll_003',
    community_id: 'comm_002',
    message_id: 'msg_002_poll',
    question: 'Which worship song should we add to rotation?',
    options: [
      { id: 'song_1', text: 'Way Maker - Sinach', vote_count: 7, voted_by_me: false },
      { id: 'song_2', text: 'Goodness of God - Bethel', vote_count: 9, voted_by_me: true },
      { id: 'song_3', text: 'Do It Again - Elevation', vote_count: 4, voted_by_me: false },
    ],
    allow_multiple_answers: true,
    is_anonymous: false,
    is_closed: false,
    total_votes: 14,
    created_by_member_id: 'member_004',
    created_at: timeAgo(-720),
    my_votes: ['song_2'],
  },
];

// ============================================================================
// HELPER FUNCTIONS FOR ACCESSING MOCK DATA
// ============================================================================

/**
 * Get all communities the current user has joined
 */
export function getMyCommunities(): CommunityWithStatus[] {
  return mockCommunities.filter(c => c.membership_status === 'approved');
}

/**
 * Get communities available for discovery (not joined or pending)
 */
export function getDiscoverCommunities(): CommunityWithStatus[] {
  return mockCommunities.filter(c => !c.membership_status || c.membership_status === 'pending');
}

/**
 * Get community by ID
 */
export function getCommunityById(id: string): CommunityWithStatus | undefined {
  return mockCommunities.find(c => c.id === id);
}

/**
 * Get messages for a community
 */
export function getMessagesForCommunity(communityId: string): CommunityMessage[] {
  switch (communityId) {
    case 'comm_001':
      return mockMessagesComm001;
    case 'comm_002':
      return mockMessagesComm002;
    case 'comm_003':
      return mockMessagesComm003;
    case 'comm_007':
      return mockMessagesComm007;
    default:
      return [];
  }
}

/**
 * Get sub-groups for a community
 */
export function getSubgroupsForCommunity(communityId: string): CommunitySubgroup[] {
  switch (communityId) {
    case 'comm_001':
      return mockSubgroupsComm001;
    case 'comm_002':
      return mockSubgroupsComm002;
    default:
      return [];
  }
}

/**
 * Get members for a community (random subset)
 */
export function getMembersForCommunity(communityId: string, limit?: number): CommunityMember[] {
  const community = getCommunityById(communityId);
  if (!community) return [];

  // Return a subset of members based on community size
  const memberCount = Math.min(community.member_count, mockMembers.length);
  const members = mockMembers.slice(0, memberCount);

  if (limit) {
    return members.slice(0, limit);
  }
  return members;
}

/**
 * Get poll by ID
 */
export function getPollById(pollId: string): CommunityPoll | undefined {
  return mockPolls.find(p => p.id === pollId);
}

/**
 * Get event by ID
 */
export function getEventById(eventId: string): CommunityEvent | undefined {
  return mockEvents.find(e => e.id === eventId);
}

/**
 * Get events for a community
 */
export function getEventsForCommunity(communityId: string): CommunityEvent[] {
  return mockEvents.filter(e => e.community_id === communityId);
}

/**
 * Get polls for a community
 */
export function getPollsForCommunity(communityId: string): CommunityPoll[] {
  return mockPolls.filter(p => p.community_id === communityId);
}

/**
 * Get threads for a community
 */
export function getThreadsForCommunity(communityId: string): CommunityThread[] {
  switch (communityId) {
    case 'comm_001':
      return mockThreadsComm001;
    case 'comm_002':
      return mockThreadsComm002;
    case 'comm_003':
      return mockThreadsComm003;
    case 'comm_007':
      return mockThreadsComm007;
    default:
      // Return default Announcement + General for other communities with sample data
      return [
        {
          id: `thread_${communityId}_ann`,
          church_id: CHURCH_ID,
          community_id: communityId,
          name: 'Announcements',
          description: 'Important updates from community leaders.',
          thread_type: 'announcement',
          is_default: true,
          can_be_deleted: false,
          who_can_post: 'admins_only',
          admin_member_ids: ['member_002', 'member_003'],
          member_count: 15,
          message_count: 8,
          unread_count: 1,
          last_message: {
            id: `ann_msg_${communityId}`,
            sender_name: 'Pastor David Wijaya',
            text_preview: 'Welcome to our community! Please read the guidelines.',
            message_type: 'text',
            created_at: timeAgo(-60),
          },
          is_muted: false,
          is_pinned: true,
          created_at: timeAgo(-365 * 24 * 60),
          updated_at: timeAgo(-60),
        },
        {
          id: `thread_${communityId}_gen`,
          church_id: CHURCH_ID,
          community_id: communityId,
          name: 'General Discussion',
          description: 'Chat with community members.',
          thread_type: 'general',
          is_default: true,
          can_be_deleted: false,
          who_can_post: 'all_members',
          admin_member_ids: ['member_002', 'member_004'],
          member_count: 15,
          message_count: 42,
          unread_count: 3,
          last_message: {
            id: `gen_msg_${communityId}`,
            sender_name: 'Sarah Tan',
            text_preview: 'Looking forward to meeting everyone!',
            message_type: 'text',
            created_at: timeAgo(-15),
          },
          is_muted: false,
          is_pinned: false,
          created_at: timeAgo(-365 * 24 * 60),
          updated_at: timeAgo(-15),
        },
      ];
  }
}

/**
 * Get thread by ID
 */
export function getThreadById(threadId: string): CommunityThread | undefined {
  const allThreads = [
    ...mockThreadsComm001,
    ...mockThreadsComm002,
    ...mockThreadsComm003,
    ...mockThreadsComm007,
  ];
  return allThreads.find(t => t.id === threadId);
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export default {
  communities: mockCommunities,
  members: mockMembers,
  threads: {
    comm_001: mockThreadsComm001,
    comm_002: mockThreadsComm002,
    comm_003: mockThreadsComm003,
    comm_007: mockThreadsComm007,
  },
  messages: {
    comm_001: mockMessagesComm001,
    comm_002: mockMessagesComm002,
    comm_003: mockMessagesComm003,
    comm_007: mockMessagesComm007,
  },
  subgroups: {
    comm_001: mockSubgroupsComm001,
    comm_002: mockSubgroupsComm002,
  },
  events: mockEvents,
  polls: mockPolls,
  // Helpers
  getMyCommunities,
  getDiscoverCommunities,
  getCommunityById,
  getThreadsForCommunity,
  getThreadById,
  getMessagesForCommunity,
  getSubgroupsForCommunity,
  getMembersForCommunity,
  getPollById,
  getEventById,
  getEventsForCommunity,
  getPollsForCommunity,
};
