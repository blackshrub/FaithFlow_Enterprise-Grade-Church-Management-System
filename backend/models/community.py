"""
Community Model (formerly Group)

A Community is the main entity that contains:
- Announcement Channel (leaders broadcast to all members)
- General Chat (all members can participate)
- Sub-groups (topic-based groups within the community)
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal, List
from datetime import datetime
import uuid


class CommunitySettings(BaseModel):
    """Configurable settings for a community (managed by leaders)"""

    # Sub-group settings
    allow_member_create_subgroups: bool = Field(
        True, description="Can members create sub-groups?"
    )
    subgroup_requires_approval: bool = Field(
        False, description="Does sub-group creation require leader approval?"
    )

    # Announcement settings
    allow_announcement_replies: bool = Field(
        True, description="Can members reply to announcements (thread-style)?"
    )
    who_can_announce: Literal["leaders_only", "all_members"] = Field(
        "leaders_only", description="Who can post announcements"
    )

    # Chat settings
    who_can_send_messages: Literal["all_members", "leaders_only"] = Field(
        "all_members", description="Who can send messages in general chat"
    )
    allow_media_sharing: bool = Field(
        True, description="Allow images, videos, audio, documents"
    )
    allow_polls: bool = Field(True, description="Allow creating polls")
    allow_events: bool = Field(True, description="Allow creating events")

    # Privacy settings
    show_member_list: bool = Field(
        True, description="Show member list to all members"
    )
    show_online_status: bool = Field(
        True, description="Show online/offline status"
    )
    show_read_receipts: bool = Field(
        True, description="Show read receipts"
    )


class CommunityBase(BaseModel):
    """Base model for Community"""
    name: str = Field(..., min_length=1, max_length=200, description="Community name")
    description: Optional[str] = Field(None, description="Community description (rich text HTML)")
    category: Literal["cell_group", "ministry_team", "activity", "support_group"] = Field(
        ..., description="Community category"
    )
    cover_image: Optional[str] = Field(None, description="Cover image URL/path or SeaweedFS fid")
    meeting_schedule: Optional[str] = Field(
        None, max_length=200, description="Free text schedule, e.g. 'Every Tuesday 7PM'"
    )
    location: Optional[str] = Field(
        None, max_length=200, description="Location description or address"
    )

    # Leadership - now supports multiple leaders
    leader_member_ids: List[str] = Field(
        default_factory=list, description="Member IDs of community leaders"
    )
    # Keep single leader fields for backward compatibility (deprecated)
    leader_member_id: Optional[str] = Field(
        None, description="[DEPRECATED] Use leader_member_ids. Primary leader member ID"
    )
    leader_name: Optional[str] = Field(
        None, min_length=1, max_length=200, description="[DEPRECATED] Cached primary leader name"
    )
    leader_contact: Optional[str] = Field(
        None, min_length=3, max_length=50, description="[DEPRECATED] Cached primary leader WhatsApp"
    )

    max_members: Optional[int] = Field(
        None, ge=1, description="Maximum members allowed (None = unlimited)"
    )
    is_open_for_join: bool = Field(True, description="Whether community is open for join requests")

    # Community settings
    settings: CommunitySettings = Field(
        default_factory=CommunitySettings, description="Community configuration"
    )


class CommunityCreate(CommunityBase):
    """Model for creating community (internal use)"""
    church_id: str = Field(..., description="Church ID")


class CommunityUpdate(BaseModel):
    """Model for updating community"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    category: Optional[Literal["cell_group", "ministry_team", "activity", "support_group"]] = None
    cover_image: Optional[str] = None
    meeting_schedule: Optional[str] = Field(None, max_length=200)
    location: Optional[str] = Field(None, max_length=200)
    leader_member_ids: Optional[List[str]] = None
    leader_member_id: Optional[str] = None  # Deprecated
    max_members: Optional[int] = Field(None, ge=1)
    is_open_for_join: Optional[bool] = None
    settings: Optional[CommunitySettings] = None


class Community(CommunityBase):
    """Full Community model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique ID")
    church_id: str = Field(..., description="Church ID")
    member_count: int = Field(0, description="Cached member count")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_schema_extra = {
            "example": {
                "id": "community-uuid",
                "church_id": "church-uuid",
                "name": "South Jakarta Youth Cell",
                "description": "<p>Weekly youth cell group for ages 18-25.</p>",
                "category": "cell_group",
                "cover_image": "3,01a2b3c4d5",
                "meeting_schedule": "Every Friday 7PM",
                "location": "GKBJ Taman Kencana, Room 4",
                "leader_member_ids": ["member-uuid-1", "member-uuid-2"],
                "leader_name": "Budi Santoso",
                "leader_contact": "628123456789",
                "max_members": 15,
                "is_open_for_join": True,
                "settings": {
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
                },
                "member_count": 12,
                "created_at": "2025-01-01T10:00:00Z",
                "updated_at": "2025-01-01T10:00:00Z",
            }
        }


# Aliases for backward compatibility during migration
GroupBase = CommunityBase
GroupCreate = CommunityCreate
GroupUpdate = CommunityUpdate
Group = Community
