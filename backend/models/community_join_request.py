"""
Community Join Request Model (formerly GroupJoinRequest)

Tracks requests from members to join communities.
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
import uuid


class CommunityJoinRequestBase(BaseModel):
    """Base model for CommunityJoinRequest"""
    church_id: str = Field(..., description="Church ID")
    community_id: str = Field(..., description="Community ID")
    member_id: str = Field(..., description="Member ID")
    message: Optional[str] = Field(None, max_length=1000, description="Optional message from member")
    status: Literal["pending", "approved", "rejected", "canceled"] = Field(
        "pending", description="Join request status"
    )


class CommunityJoinRequestCreate(BaseModel):
    """Model for creating join request (public/mobile)."""
    message: Optional[str] = Field(None, max_length=1000)


class CommunityJoinRequestUpdate(BaseModel):
    """Model for staff processing join request."""
    status: Literal["approved", "rejected", "canceled"]


class CommunityJoinRequest(CommunityJoinRequestBase):
    """Full join request model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique ID")
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    processed_at: Optional[datetime] = Field(None)
    processed_by: Optional[str] = Field(None, description="Staff user ID who processed")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "join-request-uuid",
                "church_id": "church-uuid",
                "community_id": "community-uuid",
                "member_id": "member-uuid",
                "message": "I'd love to join this community.",
                "status": "pending",
                "submitted_at": "2025-01-01T10:00:00Z",
                "processed_at": None,
                "processed_by": None,
            }
        }


# Aliases for backward compatibility during migration
GroupJoinRequestBase = CommunityJoinRequestBase
GroupJoinRequestCreate = CommunityJoinRequestCreate
GroupJoinRequestUpdate = CommunityJoinRequestUpdate
GroupJoinRequest = CommunityJoinRequest
