"""
Community Membership Model (formerly GroupMembership)

Tracks which members belong to which communities and their roles.
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
import uuid


class CommunityMembershipBase(BaseModel):
    """Base model for CommunityMembership"""
    church_id: str = Field(..., description="Church ID")
    community_id: str = Field(..., description="Community ID")
    member_id: str = Field(..., description="Member ID")
    role: Literal["member", "admin", "leader"] = Field(
        "member", description="Member role in community"
    )
    status: Literal["active", "pending_leave", "removed"] = Field(
        "active", description="Membership status"
    )

    # Notification preferences
    notifications_enabled: bool = Field(
        True, description="Receive notifications from this community"
    )
    muted_until: Optional[datetime] = Field(
        None, description="Mute notifications until this time"
    )


class CommunityMembershipCreate(BaseModel):
    """Model for creating membership"""
    church_id: str = Field(..., description="Church ID")
    community_id: str = Field(..., description="Community ID")
    member_id: str = Field(..., description="Member ID")
    role: Literal["member", "admin", "leader"] = Field("member")


class CommunityMembershipUpdate(BaseModel):
    """Model for updating membership"""
    role: Optional[Literal["member", "admin", "leader"]] = None
    status: Optional[Literal["active", "pending_leave", "removed"]] = None
    left_at: Optional[datetime] = None
    notifications_enabled: Optional[bool] = None
    muted_until: Optional[datetime] = None


class CommunityMembership(CommunityMembershipBase):
    """Full membership model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique ID")
    joined_at: datetime = Field(default_factory=datetime.utcnow)
    left_at: Optional[datetime] = Field(None, description="When member left community")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "membership-uuid",
                "church_id": "church-uuid",
                "community_id": "community-uuid",
                "member_id": "member-uuid",
                "role": "member",
                "status": "active",
                "notifications_enabled": True,
                "muted_until": None,
                "joined_at": "2025-01-01T10:00:00Z",
                "left_at": None,
            }
        }


# Aliases for backward compatibility during migration
GroupMembershipBase = CommunityMembershipBase
GroupMembershipCreate = CommunityMembershipCreate
GroupMembershipUpdate = CommunityMembershipUpdate
GroupMembership = CommunityMembership
