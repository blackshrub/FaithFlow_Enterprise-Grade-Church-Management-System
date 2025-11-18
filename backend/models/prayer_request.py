from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
import uuid


class PrayerRequestBase(BaseModel):
    """Base model for Prayer Request"""
    member_id: Optional[str] = Field(None, description="Member ID if linked to member")
    requester_name: str = Field(..., min_length=1, max_length=200, description="Requester name")
    requester_contact: Optional[str] = Field(None, max_length=200, description="Contact info")
    title: str = Field(..., min_length=1, max_length=500, description="Prayer request title")
    description: str = Field(..., min_length=1, description="Prayer request description")
    category: str = Field(..., description="Prayer request category")
    status: Literal["new", "prayed"] = Field(default="new", description="Request status")
    source: Literal["admin_input", "mobile_app", "imported"] = Field(
        default="admin_input",
        description="Source of prayer request"
    )
    assigned_to_user_id: Optional[str] = Field(None, description="Staff member assigned")
    internal_notes: Optional[str] = Field(None, max_length=2000, description="Internal staff notes")


class PrayerRequestCreate(PrayerRequestBase):
    """Model for creating prayer request"""
    church_id: str = Field(..., description="Church ID")
    created_by: str = Field(..., description="User ID who created")


class PrayerRequestUpdate(BaseModel):
    """Model for updating prayer request"""
    category: Optional[str] = None
    status: Optional[Literal["new", "prayed"]] = None
    assigned_to_user_id: Optional[str] = None
    internal_notes: Optional[str] = None


class PrayerRequest(PrayerRequestBase):
    """Full Prayer Request model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique ID")
    church_id: str = Field(..., description="Church ID")
    prayed_at: Optional[datetime] = Field(None, description="Timestamp when marked as prayed")
    created_by: str = Field(..., description="User ID who created")
    updated_by: Optional[str] = Field(None, description="User ID who last updated")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "prayer-uuid",
                "church_id": "church123",
                "member_id": "member123",
                "requester_name": "John Doe",
                "requester_contact": "+62812345678",
                "title": "Prayer for healing",
                "description": "Please pray for my mother's recovery",
                "category": "healing",
                "status": "new",
                "source": "admin_input",
                "assigned_to_user_id": "user123",
                "internal_notes": "Follow up needed",
                "prayed_at": None,
                "created_by": "user123",
                "created_at": "2025-01-01T10:00:00"
            }
        }
