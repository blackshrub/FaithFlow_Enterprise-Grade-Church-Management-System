"""
Community Message Model

Messages in community channels:
- Announcements (leaders only, with optional replies)
- General Chat (all members)
- Sub-group Chat

Features:
- Text, image, video, audio, document, poll, event, system messages
- Reply threading
- Forwarding
- Reactions (emoji)
- Read receipts
- Edit and delete
- Media attachments via SeaweedFS
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal, List, Dict
from datetime import datetime
import uuid


# Message Types
MessageType = Literal[
    "text",           # Plain text message
    "image",          # Image attachment
    "video",          # Video attachment
    "audio",          # Audio/voice message
    "document",       # Document file
    "poll",           # Poll message (linked to community_polls)
    "event",          # Event message (linked to community_events)
    "system",         # System notification (member joined, left, etc.)
    "location",       # Location sharing
    "live_location"   # Live location sharing
]

# Channel Types
ChannelType = Literal[
    "announcement",  # Leader announcements
    "general",       # General community chat
    "subgroup"       # Sub-group chat
]


class MessageMedia(BaseModel):
    """Media attachment for a message"""
    seaweedfs_fid: str = Field(..., description="SeaweedFS file ID")
    mime_type: str = Field(..., description="MIME type (e.g., image/jpeg)")
    file_name: Optional[str] = Field(None, description="Original filename")
    file_size: int = Field(..., ge=0, description="File size in bytes")
    thumbnail_fid: Optional[str] = Field(None, description="Thumbnail file ID for images/videos")
    duration: Optional[int] = Field(None, ge=0, description="Duration in seconds for audio/video")
    width: Optional[int] = Field(None, ge=0, description="Width in pixels for images/videos")
    height: Optional[int] = Field(None, ge=0, description="Height in pixels for images/videos")


class MessageLocation(BaseModel):
    """Location data for location/live_location messages"""
    latitude: float = Field(..., ge=-90, le=90, description="Latitude coordinate")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude coordinate")
    address: Optional[str] = Field(None, max_length=500, description="Human-readable address")
    duration: Optional[str] = Field(None, description="Duration for live location: '15m', '1h', '8h'")
    expires_at: Optional[datetime] = Field(None, description="When live location expires")


class ReplyPreview(BaseModel):
    """Preview of the message being replied to"""
    message_id: str = Field(..., description="ID of original message")
    sender_id: str = Field(..., description="Sender member ID")
    sender_name: str = Field(..., description="Sender display name")
    text_preview: str = Field(..., max_length=100, description="First 100 chars of text")
    media_type: Optional[str] = Field(None, description="Media type if message has attachment")


class ReadReceipt(BaseModel):
    """Read receipt for a message"""
    member_id: str = Field(..., description="Member who read the message")
    member_name: str = Field(..., description="Member's display name")
    read_at: datetime = Field(..., description="When the message was read")


class MessageReaction(BaseModel):
    """Reaction on a message"""
    emoji: str = Field(..., description="Reaction emoji")
    member_ids: List[str] = Field(default_factory=list, description="Members who reacted")


# ============================================================================
# Create/Update Models
# ============================================================================

class CommunityMessageCreate(BaseModel):
    """Model for creating a new message"""
    text: Optional[str] = Field(None, max_length=10000, description="Message text or caption")
    message_type: MessageType = Field("text", description="Type of message")
    media: Optional[MessageMedia] = Field(None, description="Media attachment")
    reply_to_message_id: Optional[str] = Field(None, description="ID of message being replied to")
    location: Optional[MessageLocation] = Field(None, description="Location data for location messages")


class CommunityMessageUpdate(BaseModel):
    """Model for editing a message (only text can be edited)"""
    text: str = Field(..., max_length=10000, description="Updated message text")


# ============================================================================
# Full Message Model
# ============================================================================

class CommunityMessage(BaseModel):
    """Full Community Message model"""
    # Identity
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Message UUID")
    church_id: str = Field(..., description="Church ID")
    community_id: str = Field(..., description="Community ID")

    # Channel info
    channel_type: ChannelType = Field(..., description="Type of channel")
    subgroup_id: Optional[str] = Field(None, description="Subgroup ID if channel_type is 'subgroup'")

    # Sender info (cached for performance)
    sender_member_id: str = Field(..., description="Sender's member ID")
    sender_name: str = Field(..., description="Sender's display name (cached)")
    sender_avatar_fid: Optional[str] = Field(None, description="Sender's avatar SeaweedFS ID (cached)")

    # Content
    message_type: MessageType = Field(..., description="Type of message")
    text: Optional[str] = Field(None, description="Text content or caption")
    media: Optional[MessageMedia] = Field(None, description="Media attachment")
    location: Optional[MessageLocation] = Field(None, description="Location data for location messages")

    # Reply
    reply_to_message_id: Optional[str] = Field(None, description="ID of replied message")
    reply_to_preview: Optional[ReplyPreview] = Field(None, description="Preview of replied message")

    # Forwarding
    is_forwarded: bool = Field(False, description="Is this a forwarded message?")
    forwarded_from_community_id: Optional[str] = Field(None, description="Original community ID")
    forwarded_from_community_name: Optional[str] = Field(None, description="Original community name")

    # Reactions
    reactions: Dict[str, List[str]] = Field(
        default_factory=dict,
        description="Reactions: emoji -> [member_ids]"
    )

    # Read receipts (only stored for small communities, otherwise use presence service)
    read_by: List[ReadReceipt] = Field(
        default_factory=list,
        description="Read receipts (limited to first 50)"
    )
    read_count: int = Field(0, description="Total read count")

    # Edit/Delete status
    is_edited: bool = Field(False, description="Has message been edited?")
    edited_at: Optional[datetime] = Field(None, description="When message was edited")
    is_deleted: bool = Field(False, description="Has message been deleted?")
    deleted_at: Optional[datetime] = Field(None, description="When message was deleted")
    deleted_for_everyone: bool = Field(False, description="Deleted for all members?")

    # For announcements with replies (thread-style)
    is_announcement_reply: bool = Field(False, description="Is this a reply to an announcement?")
    parent_announcement_id: Optional[str] = Field(None, description="Parent announcement ID")
    reply_count: int = Field(0, description="Number of replies (for announcements)")

    # Poll/Event references
    poll_id: Optional[str] = Field(None, description="Linked poll ID (if message_type is 'poll')")
    event_id: Optional[str] = Field(None, description="Linked event ID (if message_type is 'event')")

    # Mentions
    mentioned_member_ids: List[str] = Field(
        default_factory=list,
        description="Member IDs mentioned in this message"
    )
    mentions_everyone: bool = Field(False, description="@everyone mention?")

    # Starring
    starred_by: List[str] = Field(
        default_factory=list,
        description="Member IDs who starred this message"
    )

    # Delivered to (for read receipts)
    delivered_to: List[str] = Field(
        default_factory=list,
        description="Member IDs who received the message"
    )

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow, description="When message was sent")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "msg-uuid",
                "church_id": "church-uuid",
                "community_id": "community-uuid",
                "channel_type": "general",
                "subgroup_id": None,
                "sender_member_id": "member-uuid",
                "sender_name": "Budi Santoso",
                "sender_avatar_fid": "3,01abc123",
                "message_type": "text",
                "text": "Halo teman-teman! Jangan lupa ibadah besok ya 🙏",
                "media": None,
                "reply_to_message_id": None,
                "reply_to_preview": None,
                "is_forwarded": False,
                "forwarded_from_community_id": None,
                "reactions": {"👍": ["member-uuid-1", "member-uuid-2"]},
                "read_by": [],
                "read_count": 5,
                "is_edited": False,
                "edited_at": None,
                "is_deleted": False,
                "deleted_at": None,
                "deleted_for_everyone": False,
                "is_announcement_reply": False,
                "parent_announcement_id": None,
                "reply_count": 0,
                "poll_id": None,
                "event_id": None,
                "mentioned_member_ids": [],
                "mentions_everyone": False,
                "created_at": "2025-01-15T10:30:00Z"
            }
        }


# ============================================================================
# Response Models (for API)
# ============================================================================

class MessageListResponse(BaseModel):
    """Response for message list API"""
    messages: List[CommunityMessage]
    total: int
    has_more: bool
    oldest_message_id: Optional[str] = None
    newest_message_id: Optional[str] = None


class MessageSendResponse(BaseModel):
    """Response after sending a message"""
    message: CommunityMessage
    mqtt_published: bool = Field(True, description="Was message published to MQTT?")


# ============================================================================
# System Message Templates
# ============================================================================

class SystemMessageData(BaseModel):
    """Data for system messages"""
    action: Literal[
        "member_joined",
        "member_left",
        "member_removed",
        "member_promoted",
        "member_demoted",
        "subgroup_created",
        "subgroup_deleted",
        "settings_changed",
        "community_renamed"
    ]
    actor_member_id: Optional[str] = Field(None, description="Member who performed action")
    actor_name: Optional[str] = Field(None, description="Actor's display name")
    target_member_id: Optional[str] = Field(None, description="Target member (if applicable)")
    target_name: Optional[str] = Field(None, description="Target's display name")
    extra_data: Dict = Field(default_factory=dict, description="Additional data")


def create_system_message(
    church_id: str,
    community_id: str,
    channel_type: ChannelType,
    system_data: SystemMessageData,
    subgroup_id: Optional[str] = None
) -> CommunityMessage:
    """
    Factory function to create a system message.

    Args:
        church_id: Church ID
        community_id: Community ID
        channel_type: Channel type
        system_data: System message data
        subgroup_id: Subgroup ID if applicable

    Returns:
        CommunityMessage instance
    """
    # Generate text based on action
    action_texts = {
        "member_joined": f"{system_data.target_name} joined the community",
        "member_left": f"{system_data.target_name} left the community",
        "member_removed": f"{system_data.target_name} was removed by {system_data.actor_name}",
        "member_promoted": f"{system_data.target_name} was promoted to leader by {system_data.actor_name}",
        "member_demoted": f"{system_data.target_name} was demoted by {system_data.actor_name}",
        "subgroup_created": f"Subgroup '{system_data.extra_data.get('subgroup_name', '')}' was created",
        "subgroup_deleted": f"Subgroup '{system_data.extra_data.get('subgroup_name', '')}' was deleted",
        "settings_changed": f"{system_data.actor_name} updated community settings",
        "community_renamed": f"Community renamed to '{system_data.extra_data.get('new_name', '')}'"
    }

    return CommunityMessage(
        church_id=church_id,
        community_id=community_id,
        channel_type=channel_type,
        subgroup_id=subgroup_id,
        sender_member_id="system",
        sender_name="System",
        sender_avatar_fid=None,
        message_type="system",
        text=action_texts.get(system_data.action, "System notification")
    )
