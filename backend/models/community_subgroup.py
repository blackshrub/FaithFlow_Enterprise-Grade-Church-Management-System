"""
Community Sub-group Model

Sub-groups are topic-based groups within a Community:
- Each sub-group has its own chat channel
- Members can join/leave sub-groups independently
- Sub-groups inherit community membership (must be community member first)
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid


class CommunitySubgroupBase(BaseModel):
    """Base model for Community Sub-group"""
    name: str = Field(..., min_length=1, max_length=100, description="Sub-group name")
    description: Optional[str] = Field(None, max_length=500, description="Sub-group description")
    cover_image_fid: Optional[str] = Field(None, description="SeaweedFS file ID for cover image")


class CommunitySubgroupCreate(CommunitySubgroupBase):
    """Model for creating a sub-group"""
    pass


class CommunitySubgroupUpdate(BaseModel):
    """Model for updating a sub-group"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    cover_image_fid: Optional[str] = None
    is_active: Optional[bool] = None
    admin_member_ids: Optional[List[str]] = None


class CommunitySubgroup(CommunitySubgroupBase):
    """Full Community Sub-group model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique ID")
    church_id: str = Field(..., description="Church ID")
    community_id: str = Field(..., description="Parent community ID")
    created_by_member_id: str = Field(..., description="Member who created this sub-group")
    admin_member_ids: List[str] = Field(default_factory=list, description="Sub-group admin member IDs")
    member_count: int = Field(0, description="Number of members in sub-group")
    is_active: bool = Field(True, description="Whether sub-group is active")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_schema_extra = {
            "example": {
                "id": "subgroup-uuid",
                "church_id": "church-uuid",
                "community_id": "community-uuid",
                "name": "Worship Team",
                "description": "Discussion and coordination for the worship team",
                "cover_image_fid": "3,01a2b3c4",
                "created_by_member_id": "member-uuid",
                "admin_member_ids": ["member-uuid-1", "member-uuid-2"],
                "member_count": 8,
                "is_active": True,
                "created_at": "2025-01-15T10:00:00Z",
                "updated_at": "2025-01-15T10:00:00Z"
            }
        }


class SubgroupMembership(BaseModel):
    """Sub-group membership record"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique ID")
    church_id: str = Field(..., description="Church ID")
    community_id: str = Field(..., description="Parent community ID")
    subgroup_id: str = Field(..., description="Sub-group ID")
    member_id: str = Field(..., description="Member ID")
    role: str = Field("member", description="Role in sub-group: member, admin")
    joined_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_schema_extra = {
            "example": {
                "id": "membership-uuid",
                "church_id": "church-uuid",
                "community_id": "community-uuid",
                "subgroup_id": "subgroup-uuid",
                "member_id": "member-uuid",
                "role": "member",
                "joined_at": "2025-01-15T10:00:00Z"
            }
        }


class SubgroupWithStatus(CommunitySubgroup):
    """Sub-group with user's membership status and unread count"""
    is_member: bool = Field(False, description="Whether current user is a member")
    my_role: Optional[str] = Field(None, description="User's role in sub-group")
    unread_count: int = Field(0, description="Number of unread messages")
    last_message: Optional[dict] = Field(None, description="Last message preview")
