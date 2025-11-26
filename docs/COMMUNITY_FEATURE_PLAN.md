# FaithFlow Community Feature - Implementation Plan

## Overview

Transform the existing "Groups" feature into a full WhatsApp-style "Community" system with real-time messaging, announcements, sub-groups, events, polls, and rich media sharing.

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Real-time Messaging | MQTT via EMQX (self-hosted) | Live message delivery, QoS 2 |
| Push Notifications | Firebase Cloud Messaging (FCM) | Background/closed app notifications |
| Media Storage | SeaweedFS (self-hosted) | Images, videos, audio, documents |
| Message Metadata | MongoDB | Sender, timestamp, media pointers |
| REST API | FastAPI | Auth, uploads, admin operations |
| Mobile App | React Native (Expo) | Primary user interface |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MOBILE APP (Expo)                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Community  │  │    Chat     │  │   Events    │  │    Polls    │        │
│  │  Directory  │  │   Screen    │  │   Screen    │  │   Screen    │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                │                │
│         └────────────────┴────────────────┴────────────────┘                │
│                                   │                                          │
│                    ┌──────────────┴──────────────┐                          │
│                    │       MQTT Client           │                          │
│                    │   (eclipse-paho / mqtt.js)  │                          │
│                    └──────────────┬──────────────┘                          │
└───────────────────────────────────┼─────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
           ┌────────▼────────┐            ┌────────▼────────┐
           │   EMQX Broker   │            │   FastAPI       │
           │   (MQTT)        │            │   Backend       │
           │   Port: 1883    │            │   Port: 8000    │
           └────────┬────────┘            └────────┬────────┘
                    │                              │
                    │                     ┌────────┴────────┐
                    │                     │                 │
                    │            ┌────────▼───────┐ ┌───────▼───────┐
                    │            │    MongoDB     │ │   SeaweedFS   │
                    │            │  (metadata)    │ │   (media)     │
                    │            └────────────────┘ └───────────────┘
                    │
           ┌────────▼────────┐
           │   FCM Server    │
           │ (push notifs)   │
           └─────────────────┘
```

---

## Database Schema Changes

### 1. Rename: `groups` → `communities`

```python
# backend/models/community.py
class Community(BaseModel):
    id: str                                    # UUID
    church_id: str                             # Multi-tenant
    name: str                                  # Community name
    description: Optional[str]                 # Rich text
    category: Literal["cell_group", "ministry_team", "activity", "support_group"]
    cover_image_fid: Optional[str]             # SeaweedFS file ID

    # Leadership
    leader_member_ids: List[str]               # Multiple leaders allowed

    # Settings (configurable by leaders)
    settings: CommunitySettings

    # Metadata
    member_count: int = 0                      # Cached count
    is_open_for_join: bool = True
    max_members: Optional[int]

    # Timestamps
    created_at: datetime
    updated_at: datetime

class CommunitySettings(BaseModel):
    # Sub-group settings
    allow_member_create_subgroups: bool = True        # Can members create sub-groups?
    subgroup_requires_approval: bool = False          # Default: auto-approved

    # Announcement settings
    allow_announcement_replies: bool = True           # Thread-style replies
    who_can_announce: Literal["leaders_only", "all_members"] = "leaders_only"

    # Chat settings
    who_can_send_messages: Literal["all_members", "leaders_only"] = "all_members"
    allow_media_sharing: bool = True
    allow_polls: bool = True
    allow_events: bool = True

    # Privacy
    show_member_list: bool = True
    show_online_status: bool = True
    show_read_receipts: bool = True
```

### 2. New: `community_subgroups`

```python
# backend/models/community_subgroup.py
class CommunitySubgroup(BaseModel):
    id: str                                    # UUID
    church_id: str
    community_id: str                          # Parent community
    name: str
    description: Optional[str]
    cover_image_fid: Optional[str]

    created_by_member_id: str                  # Who created it
    admin_member_ids: List[str]                # Sub-group admins

    member_count: int = 0
    is_active: bool = True

    created_at: datetime
    updated_at: datetime
```

### 3. Rename: `group_memberships` → `community_memberships`

```python
# backend/models/community_membership.py
class CommunityMembership(BaseModel):
    id: str
    church_id: str
    community_id: str
    member_id: str

    role: Literal["member", "admin", "leader"] = "member"
    status: Literal["active", "pending_leave", "removed"]

    # Notification preferences (per-community)
    notifications_enabled: bool = True
    muted_until: Optional[datetime]            # Temporary mute

    joined_at: datetime
    left_at: Optional[datetime]
```

### 4. New: `community_subgroup_memberships`

```python
class CommunitySubgroupMembership(BaseModel):
    id: str
    church_id: str
    community_id: str
    subgroup_id: str
    member_id: str

    role: Literal["member", "admin"] = "member"
    status: Literal["active", "removed"]

    notifications_enabled: bool = True

    joined_at: datetime
    left_at: Optional[datetime]
```

### 5. New: `community_messages`

```python
# backend/models/community_message.py
class CommunityMessage(BaseModel):
    id: str                                    # UUID (also used as MQTT message ID)
    church_id: str
    community_id: str

    # Channel info
    channel_type: Literal["announcement", "general", "subgroup"]
    subgroup_id: Optional[str]                 # If channel_type == "subgroup"

    # Sender
    sender_member_id: str
    sender_name: str                           # Cached for display
    sender_avatar_fid: Optional[str]           # Cached

    # Content
    message_type: Literal["text", "image", "video", "audio", "document", "poll", "event", "system"]
    text: Optional[str]                        # Text content or caption

    # Media (if applicable)
    media: Optional[MessageMedia]

    # Reply (if replying to another message)
    reply_to_message_id: Optional[str]
    reply_to_preview: Optional[ReplyPreview]   # Cached preview of replied message

    # Forwarded
    is_forwarded: bool = False
    forwarded_from_community_id: Optional[str]

    # Reactions
    reactions: Dict[str, List[str]] = {}       # emoji -> [member_ids]

    # Read receipts
    read_by: List[ReadReceipt] = []

    # Edit/Delete
    is_edited: bool = False
    edited_at: Optional[datetime]
    is_deleted: bool = False                   # Soft delete (shows "message deleted")
    deleted_at: Optional[datetime]
    deleted_for_everyone: bool = False

    # Timestamps
    created_at: datetime

    # For announcements with replies
    is_announcement_reply: bool = False
    parent_announcement_id: Optional[str]      # Thread parent

class MessageMedia(BaseModel):
    seaweedfs_fid: str                         # File ID in SeaweedFS
    mime_type: str                             # e.g., "image/jpeg"
    file_name: Optional[str]                   # Original filename
    file_size: int                             # Bytes
    thumbnail_fid: Optional[str]               # Thumbnail for images/videos
    duration: Optional[int]                    # Seconds (for audio/video)
    width: Optional[int]                       # Pixels (for images/videos)
    height: Optional[int]

class ReplyPreview(BaseModel):
    sender_name: str
    text_preview: str                          # First 100 chars
    media_type: Optional[str]                  # "image", "video", etc.

class ReadReceipt(BaseModel):
    member_id: str
    read_at: datetime
```

### 6. New: `community_polls`

```python
# backend/models/community_poll.py
class CommunityPoll(BaseModel):
    id: str
    church_id: str
    community_id: str
    subgroup_id: Optional[str]
    message_id: str                            # Link to the message

    question: str
    options: List[PollOption]

    # Settings
    allow_multiple_answers: bool = False
    is_anonymous: bool = False
    closes_at: Optional[datetime]              # Auto-close time

    created_by_member_id: str
    created_at: datetime
    is_closed: bool = False

class PollOption(BaseModel):
    id: str                                    # UUID
    text: str
    votes: List[PollVote] = []

class PollVote(BaseModel):
    member_id: str
    voted_at: datetime
```

### 7. New: `community_events`

```python
# backend/models/community_event.py
class CommunityEvent(BaseModel):
    id: str
    church_id: str
    community_id: str
    subgroup_id: Optional[str]
    message_id: str                            # Link to the message

    title: str
    description: Optional[str]
    location: Optional[str]

    start_time: datetime
    end_time: Optional[datetime]

    # RSVP
    rsvp_enabled: bool = True
    rsvp_responses: List[EventRSVP] = []

    # Reminders
    reminder_times: List[int] = [60, 1440]     # Minutes before (1hr, 1day)

    created_by_member_id: str
    created_at: datetime

class EventRSVP(BaseModel):
    member_id: str
    response: Literal["yes", "no", "maybe"]
    responded_at: datetime
```

### 8. New: `member_presence`

```python
# backend/models/member_presence.py
class MemberPresence(BaseModel):
    member_id: str
    church_id: str

    is_online: bool = False
    last_seen: datetime

    # Current active community (for typing indicators)
    active_community_id: Optional[str]
    active_subgroup_id: Optional[str]
```

---

## MQTT Topic Structure

```
# Presence
faithflow/{church_id}/presence/{member_id}
  → Payload: { "online": true, "last_seen": "2025-01-15T10:30:00Z" }

# Community Announcement Channel
faithflow/{church_id}/community/{community_id}/announcements
  → Messages from leaders to all members

# Community General Chat
faithflow/{church_id}/community/{community_id}/general
  → All member chat

# Sub-group Chat
faithflow/{church_id}/community/{community_id}/subgroup/{subgroup_id}
  → Sub-group specific chat

# Typing Indicators
faithflow/{church_id}/community/{community_id}/typing
faithflow/{church_id}/community/{community_id}/subgroup/{subgroup_id}/typing
  → Payload: { "member_id": "xxx", "is_typing": true }

# Read Receipts
faithflow/{church_id}/community/{community_id}/read
  → Payload: { "member_id": "xxx", "message_id": "yyy", "read_at": "..." }

# Reactions
faithflow/{church_id}/community/{community_id}/reactions
  → Payload: { "message_id": "xxx", "member_id": "yyy", "emoji": "👍", "action": "add" }
```

---

## API Endpoints

### Community Management (Refactored from Groups)

```
# Public (Mobile App)
GET    /api/public/communities                    # Browse directory
GET    /api/public/communities/{id}               # Community detail
POST   /api/public/communities/{id}/join-request  # Request to join
POST   /api/public/communities/{id}/leave         # Leave community

# Member (Authenticated Mobile)
GET    /api/mobile/communities/my                 # My communities
GET    /api/mobile/communities/{id}/messages      # Get messages (paginated)
POST   /api/mobile/communities/{id}/messages      # Send message
PUT    /api/mobile/messages/{id}                  # Edit message
DELETE /api/mobile/messages/{id}                  # Delete message
POST   /api/mobile/messages/{id}/react            # Add/remove reaction
POST   /api/mobile/messages/{id}/forward          # Forward message

# Sub-groups
GET    /api/mobile/communities/{id}/subgroups     # List sub-groups
POST   /api/mobile/communities/{id}/subgroups     # Create sub-group
POST   /api/mobile/subgroups/{id}/join            # Join sub-group
POST   /api/mobile/subgroups/{id}/leave           # Leave sub-group

# Events
POST   /api/mobile/communities/{id}/events        # Create event
GET    /api/mobile/communities/{id}/events        # List events
POST   /api/mobile/events/{id}/rsvp               # RSVP to event

# Polls
POST   /api/mobile/communities/{id}/polls         # Create poll
POST   /api/mobile/polls/{id}/vote                # Vote on poll

# Media
POST   /api/mobile/media/upload                   # Upload to SeaweedFS
GET    /api/mobile/media/{fid}                    # Get media URL

# Presence
POST   /api/mobile/presence/heartbeat             # Update online status

# Admin (Web Dashboard)
GET    /api/v1/communities/                       # List communities
POST   /api/v1/communities/                       # Create community
PUT    /api/v1/communities/{id}                   # Update community
DELETE /api/v1/communities/{id}                   # Delete community
GET    /api/v1/communities/{id}/members           # List members
POST   /api/v1/communities/{id}/members/add       # Add member
POST   /api/v1/communities/{id}/members/remove    # Remove member
GET    /api/v1/communities/join-requests          # Pending requests
POST   /api/v1/communities/join-requests/{id}/approve
POST   /api/v1/communities/join-requests/{id}/reject
DELETE /api/v1/messages/{id}                      # Moderate: delete message
```

---

## Implementation Phases

### Phase 1: Foundation & Infrastructure Setup
**Estimated Files: 15-20**

1. **SeaweedFS Setup**
   - Docker compose configuration
   - Volume setup and networking
   - Python client wrapper (`backend/services/seaweedfs_service.py`)
   - Media upload/download endpoints

2. **EMQX Setup**
   - Docker compose configuration
   - Authentication plugin (JWT-based)
   - ACL rules for topic access
   - Python MQTT publisher (`backend/services/mqtt_service.py`)

3. **Terminology Refactor: group → community**
   - Rename all files, models, routes, services
   - Update database collection names
   - Update frontend components and API calls
   - Update i18n translations

### Phase 2: Core Community Chat
**Estimated Files: 20-25**

1. **Database Models**
   - `community.py` (updated)
   - `community_subgroup.py`
   - `community_membership.py` (updated)
   - `community_subgroup_membership.py`
   - `community_message.py`
   - `member_presence.py`

2. **Backend Services**
   - `community_service.py` (business logic)
   - `message_service.py` (send, edit, delete)
   - `presence_service.py` (online/offline)

3. **Backend Routes**
   - Update existing group routes → community
   - Add message endpoints
   - Add sub-group endpoints
   - Add presence endpoints

### Phase 3: Rich Messaging Features
**Estimated Files: 10-15**

1. **Message Features**
   - Reply to messages
   - Forward messages
   - Edit messages
   - Delete for everyone
   - Emoji reactions
   - @ Mentions with notifications
   - Read receipts

2. **Media Handling**
   - Image upload/compress/thumbnail
   - Video upload/thumbnail generation
   - Audio recording support
   - Document sharing

### Phase 4: Events & Polls
**Estimated Files: 10-12**

1. **Events**
   - Event creation within communities
   - RSVP system (Yes/No/Maybe)
   - Event reminders (scheduled notifications)
   - Event listing and filtering

2. **Polls**
   - Single choice polls
   - Multiple choice polls
   - Anonymous voting
   - Auto-close at deadline
   - Real-time vote updates

### Phase 5: Mobile App - Community Screens
**Estimated Files: 25-30**

1. **Directory & Discovery**
   - Community directory screen
   - Community detail/preview screen
   - Join request flow

2. **Chat Interface**
   - Chat screen with message list
   - Message input with media picker
   - Voice message recording
   - Reply/forward UI
   - Reaction picker

3. **Sub-groups**
   - Sub-group list
   - Create sub-group modal
   - Sub-group chat

4. **Events & Polls**
   - Event card in chat
   - RSVP modal
   - Poll card in chat
   - Vote UI

5. **Settings**
   - Community settings (for leaders)
   - Notification preferences
   - Mute/unmute

### Phase 6: Push Notifications & Background Sync
**Estimated Files: 8-10**

1. **FCM Integration**
   - Backend: Send push notifications
   - Mobile: Handle notification taps
   - Badge/unread count updates

2. **Background Sync**
   - Sync missed messages when app opens
   - Update unread counts
   - Presence heartbeat

### Phase 7: Admin Dashboard Updates
**Estimated Files: 12-15**

1. **Community Management**
   - Rename Groups → Communities in UI
   - Community list with chat stats
   - Sub-group management

2. **Message Moderation**
   - View recent messages
   - Delete inappropriate content
   - Member muting/banning

3. **Analytics**
   - Message volume stats
   - Active members
   - Engagement metrics

---

## File Structure (New/Modified)

```
backend/
├── models/
│   ├── community.py              # Renamed from group.py
│   ├── community_membership.py   # Renamed from group_membership.py
│   ├── community_join_request.py # Renamed
│   ├── community_subgroup.py     # NEW
│   ├── community_subgroup_membership.py  # NEW
│   ├── community_message.py      # NEW
│   ├── community_poll.py         # NEW
│   ├── community_event.py        # NEW
│   └── member_presence.py        # NEW
├── routes/
│   ├── communities.py            # Renamed from groups.py
│   ├── community_memberships.py  # Renamed
│   ├── community_join_requests.py # Renamed
│   ├── community_subgroups.py    # NEW
│   ├── community_messages.py     # NEW
│   ├── community_polls.py        # NEW
│   ├── community_events.py       # NEW
│   ├── communities_public.py     # Renamed from groups_public.py
│   ├── community_mobile.py       # NEW (authenticated mobile endpoints)
│   └── media.py                  # NEW (SeaweedFS uploads)
├── services/
│   ├── mqtt_service.py           # NEW
│   ├── seaweedfs_service.py      # NEW
│   ├── fcm_service.py            # NEW (or update existing notification)
│   ├── community_service.py      # NEW
│   ├── message_service.py        # NEW
│   └── presence_service.py       # NEW
├── scripts/
│   ├── migrate_groups_to_communities.py  # NEW (migration script)
│   └── create_community_indexes.py       # NEW
└── docker/
    ├── docker-compose.emqx.yml   # NEW
    └── docker-compose.seaweedfs.yml  # NEW

frontend/
├── src/
│   ├── pages/
│   │   └── Communities/          # Renamed from Groups/
│   │       ├── index.js
│   │       ├── CommunityDetail.js
│   │       ├── CommunityMembers.js
│   │       ├── JoinRequests.js
│   │       └── SubgroupManagement.js  # NEW
│   ├── services/
│   │   └── communityApi.js       # Renamed from groupApi.js
│   └── i18n/locales/
│       ├── en/
│       │   └── communities.json  # Renamed from groups.json
│       └── id/
│           └── communities.json

mobile/
├── app/
│   └── community/                # NEW
│       ├── index.tsx             # Directory
│       ├── [id]/
│       │   ├── index.tsx         # Community home
│       │   ├── chat.tsx          # Chat screen
│       │   ├── announcements.tsx
│       │   ├── members.tsx
│       │   ├── settings.tsx
│       │   └── subgroups/
│       │       ├── index.tsx
│       │       └── [subgroupId].tsx
│       └── events/
│           └── [eventId].tsx
├── components/
│   └── community/                # NEW
│       ├── MessageBubble.tsx
│       ├── MessageInput.tsx
│       ├── ReactionPicker.tsx
│       ├── MediaPicker.tsx
│       ├── VoiceRecorder.tsx
│       ├── PollCard.tsx
│       ├── EventCard.tsx
│       └── CommunityHeader.tsx
├── services/
│   ├── mqtt.ts                   # NEW
│   ├── seaweedfs.ts              # NEW
│   └── communityApi.ts           # NEW
├── stores/
│   ├── communityStore.ts         # NEW
│   ├── messageStore.ts           # NEW
│   └── presenceStore.ts          # NEW
└── hooks/
    ├── useMqtt.ts                # NEW
    ├── useMessages.ts            # NEW
    └── usePresence.ts            # NEW
```

---

## SeaweedFS Setup Instructions

### Docker Compose

```yaml
# docker/docker-compose.seaweedfs.yml
version: '3.8'

services:
  seaweedfs-master:
    image: chrislusf/seaweedfs:latest
    container_name: seaweedfs-master
    ports:
      - "9333:9333"   # Master HTTP
      - "19333:19333" # Master gRPC
    command: "master -ip=seaweedfs-master -ip.bind=0.0.0.0"
    volumes:
      - seaweedfs-master-data:/data
    restart: unless-stopped

  seaweedfs-volume:
    image: chrislusf/seaweedfs:latest
    container_name: seaweedfs-volume
    ports:
      - "8080:8080"   # Volume HTTP
      - "18080:18080" # Volume gRPC
    command: "volume -mserver=seaweedfs-master:9333 -ip.bind=0.0.0.0 -port=8080 -max=100"
    volumes:
      - seaweedfs-volume-data:/data
    depends_on:
      - seaweedfs-master
    restart: unless-stopped

  seaweedfs-filer:
    image: chrislusf/seaweedfs:latest
    container_name: seaweedfs-filer
    ports:
      - "8888:8888"   # Filer HTTP
      - "18888:18888" # Filer gRPC
    command: "filer -master=seaweedfs-master:9333 -ip.bind=0.0.0.0"
    volumes:
      - seaweedfs-filer-data:/data
    depends_on:
      - seaweedfs-master
      - seaweedfs-volume
    restart: unless-stopped

volumes:
  seaweedfs-master-data:
  seaweedfs-volume-data:
  seaweedfs-filer-data:
```

### Start SeaweedFS

```bash
cd backend/docker
docker-compose -f docker-compose.seaweedfs.yml up -d
```

### Verify

```bash
# Check master
curl http://localhost:9333/cluster/status

# Upload test file
curl -F file=@test.jpg http://localhost:9333/submit
# Returns: {"fid":"3,01637037d6","fileName":"test.jpg","fileUrl":"localhost:8080/3,01637037d6","size":12345}

# Retrieve file
curl http://localhost:8080/3,01637037d6
```

---

## EMQX Setup Instructions

### Docker Compose

```yaml
# docker/docker-compose.emqx.yml
version: '3.8'

services:
  emqx:
    image: emqx/emqx:5.3.0
    container_name: emqx
    ports:
      - "1883:1883"     # MQTT
      - "8083:8083"     # MQTT over WebSocket
      - "8084:8084"     # MQTT over WebSocket (SSL)
      - "8883:8883"     # MQTT (SSL)
      - "18083:18083"   # Dashboard
    environment:
      - EMQX_NAME=emqx
      - EMQX_HOST=127.0.0.1
      - EMQX_LOADED_PLUGINS=emqx_auth_jwt
    volumes:
      - emqx-data:/opt/emqx/data
      - emqx-log:/opt/emqx/log
      - ./emqx/acl.conf:/opt/emqx/etc/acl.conf
      - ./emqx/auth_jwt.conf:/opt/emqx/etc/plugins/emqx_auth_jwt.conf
    restart: unless-stopped

volumes:
  emqx-data:
  emqx-log:
```

### JWT Authentication Config

```hocon
# docker/emqx/auth_jwt.conf
auth.jwt.secret = ${JWT_SECRET}
auth.jwt.from = password
auth.jwt.verify_claims = on
auth.jwt.verify_claims.sub = %u
```

### ACL Rules

```erlang
# docker/emqx/acl.conf
%% Allow members to subscribe to their church's topics
{allow, {user, all}, subscribe, ["faithflow/${church_id}/#"]}.

%% Allow members to publish to their communities
{allow, {user, all}, publish, ["faithflow/${church_id}/community/+/general"]}.
{allow, {user, all}, publish, ["faithflow/${church_id}/community/+/subgroup/+"]}.
{allow, {user, all}, publish, ["faithflow/${church_id}/community/+/typing"]}.
{allow, {user, all}, publish, ["faithflow/${church_id}/community/+/read"]}.
{allow, {user, all}, publish, ["faithflow/${church_id}/community/+/reactions"]}.
{allow, {user, all}, publish, ["faithflow/${church_id}/presence/+"]}.

%% Only leaders can publish announcements (enforced by backend, not ACL)
{allow, {user, all}, publish, ["faithflow/${church_id}/community/+/announcements"]}.

%% Deny all other
{deny, all}.
```

### Start EMQX

```bash
cd backend/docker
docker-compose -f docker-compose.emqx.yml up -d
```

### Access Dashboard

```
URL: http://localhost:18083
Default: admin / public
```

---

## Migration Script (group → community)

```python
# backend/scripts/migrate_groups_to_communities.py
"""
Migration script to rename groups → communities in MongoDB.
Run this ONCE after deploying the schema changes.
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime

async def migrate():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.church_management

    # 1. Rename collections
    print("Renaming collections...")

    collections = await db.list_collection_names()

    if "groups" in collections:
        await db.groups.rename("communities")
        print("✓ groups → communities")

    if "group_memberships" in collections:
        await db.group_memberships.rename("community_memberships")
        print("✓ group_memberships → community_memberships")

    if "group_join_requests" in collections:
        await db.group_join_requests.rename("community_join_requests")
        print("✓ group_join_requests → community_join_requests")

    # 2. Update field names in documents
    print("\nUpdating field names...")

    # In community_memberships: group_id → community_id
    result = await db.community_memberships.update_many(
        {"group_id": {"$exists": True}},
        {"$rename": {"group_id": "community_id"}}
    )
    print(f"✓ Updated {result.modified_count} membership documents")

    # In community_join_requests: group_id → community_id
    result = await db.community_join_requests.update_many(
        {"group_id": {"$exists": True}},
        {"$rename": {"group_id": "community_id"}}
    )
    print(f"✓ Updated {result.modified_count} join request documents")

    # 3. Add default settings to communities
    print("\nAdding default settings...")

    default_settings = {
        "allow_member_create_subgroups": True,
        "subgroup_requires_approval": False,
        "allow_announcement_replies": True,
        "who_can_announce": "leaders_only",
        "who_can_send_messages": "all_members",
        "allow_media_sharing": True,
        "allow_polls": True,
        "allow_events": True,
        "show_member_list": True,
        "show_online_status": True,
        "show_read_receipts": True
    }

    result = await db.communities.update_many(
        {"settings": {"$exists": False}},
        {"$set": {"settings": default_settings}}
    )
    print(f"✓ Added settings to {result.modified_count} communities")

    # 4. Convert leader_member_id to leader_member_ids array
    result = await db.communities.update_many(
        {"leader_member_id": {"$exists": True}, "leader_member_ids": {"$exists": False}},
        [
            {"$set": {
                "leader_member_ids": {"$cond": {
                    "if": {"$ne": ["$leader_member_id", None]},
                    "then": ["$leader_member_id"],
                    "else": []
                }}
            }}
        ]
    )
    print(f"✓ Converted leader_member_id to array in {result.modified_count} communities")

    print("\n✅ Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
```

---

## Estimated Effort

| Phase | Description | Files | Complexity |
|-------|-------------|-------|------------|
| 1 | Foundation & Infrastructure | 15-20 | High |
| 2 | Core Community Chat | 20-25 | High |
| 3 | Rich Messaging Features | 10-15 | Medium |
| 4 | Events & Polls | 10-12 | Medium |
| 5 | Mobile App Screens | 25-30 | High |
| 6 | Push Notifications | 8-10 | Medium |
| 7 | Admin Dashboard | 12-15 | Medium |

**Total: ~100-130 files** across backend, frontend, and mobile.

---

## Risk Mitigation

1. **Data Migration**: Run migration script on staging first, backup production before migrating.

2. **MQTT Scalability**: EMQX supports clustering for scale. Start single-node, add nodes as needed.

3. **SeaweedFS Reliability**: Configure replication (`-rack=` flag) for data redundancy.

4. **Mobile Performance**: Implement message pagination, lazy loading, and local caching.

5. **Offline Support**: Store pending messages locally, sync when online.

---

## Success Metrics

- [ ] Real-time message delivery < 500ms
- [ ] Media upload/download < 3s for images
- [ ] Push notification delivery < 2s
- [ ] Support 1000+ concurrent connections per church
- [ ] Zero data loss with MQTT QoS 2

---

*Document created: 2025-01-15*
*Last updated: 2025-01-15*
