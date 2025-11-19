from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
import uuid


class GroupMembershipBase(BaseModel):
    """Base model for GroupMembership"""
    church_id: str = Field(..., description="Church ID")
    group_id: str = Field(..., description="Group ID")
    member_id: str = Field(..., description="Member ID")
    status: Literal["active", "pending_leave", "removed"] = Field(
        "active", description="Membership status"
    )


class GroupMembershipCreate(GroupMembershipBase):
    """Model for creating membership"""
    pass


class GroupMembershipUpdate(BaseModel):
    """Model for updating membership status"""
    status: Optional[Literal["active", "pending_leave", "removed"]] = None
    left_at: Optional[datetime] = None


class GroupMembership(GroupMembershipBase):
    """Full membership model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique ID")
    joined_at: datetime = Field(default_factory=datetime.utcnow)
    left_at: Optional[datetime] = Field(None, description="When member left group")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "membership-uuid",
                "church_id": "church-uuid",
                "group_id": "group-uuid",
                "member_id": "member-uuid",
                "status": "active",
                "joined_at": "2025-01-01T10:00:00Z",
                "left_at": None,
            }
        }
