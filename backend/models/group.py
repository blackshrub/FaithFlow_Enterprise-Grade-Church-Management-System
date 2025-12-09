from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
import uuid


class GroupBase(BaseModel):
    """Base model for Group"""
    name: str = Field(..., min_length=1, max_length=200, description="Group name")
    description: Optional[str] = Field(None, description="Group description (rich text HTML)")
    category: Literal["cell_group", "ministry_team", "activity", "support_group"] = Field(
        ..., description="Group category"
    )
    cover_image: Optional[str] = Field(None, description="Cover image URL/path")
    meeting_schedule: Optional[str] = Field(
        None, max_length=200, description="Free text schedule, e.g. 'Every Tuesday 7PM'"
    )
    location: Optional[str] = Field(
        None, max_length=200, description="Location description or address"
    )
    leader_member_id: Optional[str] = Field(
        None, description="Member ID of the group leader (linked to members collection)"
    )
    leader_name: Optional[str] = Field(
        None, min_length=1, max_length=200, description="Cached group leader name"
    )
    leader_contact: Optional[str] = Field(
        None, min_length=3, max_length=50, description="Cached leader WhatsApp number"
    )
    max_members: Optional[int] = Field(
        None, ge=1, description="Maximum members allowed (None = unlimited)"
    )
    is_open_for_join: bool = Field(True, description="Whether group is open for join requests")


class GroupCreate(GroupBase):
    """Model for creating group (internal use)"""
    church_id: str = Field(..., description="Church ID")


class GroupUpdate(BaseModel):
    """Model for updating group"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    category: Optional[Literal["cell_group", "ministry_team", "activity", "support_group"]] = None
    cover_image: Optional[str] = None
    meeting_schedule: Optional[str] = Field(None, max_length=200)
    location: Optional[str] = Field(None, max_length=200)
    leader_member_id: Optional[str] = None
    max_members: Optional[int] = Field(None, ge=1)
    is_open_for_join: Optional[bool] = None


class Group(GroupBase):
    """Full Group model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique ID")
    church_id: str = Field(..., description="Church ID")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Computed fields from aggregation
    members_count: Optional[int] = Field(None, description="Computed: number of members in the group")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "group-uuid",
                "church_id": "church-uuid",
                "name": "South Jakarta Youth Cell",
                "description": "<p>Weekly youth cell group for ages 18-25.</p>",
                "category": "cell_group",
                "cover_image": "/uploads/church/groups/group-id/cover.jpg",
                "meeting_schedule": "Every Friday 7PM",
                "location": "GKBJ Taman Kencana, Room 4",
                "leader_name": "Budi Santoso",
                "leader_contact": "628123456789",
                "max_members": 15,
                "is_open_for_join": True,
                "created_at": "2025-01-01T10:00:00Z",
                "updated_at": "2025-01-01T10:00:00Z",
            }
        }
