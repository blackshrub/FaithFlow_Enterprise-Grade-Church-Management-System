from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
import uuid


class Counselor(BaseModel):
    """Counselor profile linked to staff user.
    
    Represents a staff member who can provide counseling/prayer appointments.
    Links to existing users collection via staff_user_id.
    """
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: str = Field(..., description="Church identifier for multi-tenant isolation")
    staff_user_id: str = Field(..., description="Reference to existing staff/user record")
    display_name: str = Field(..., min_length=1, max_length=200)
    whatsapp_number: Optional[str] = Field(None, description="WhatsApp contact for coordination")
    is_active: bool = Field(default=True, description="Whether counselor is currently available for booking")
    max_daily_appointments: Optional[int] = Field(None, ge=1, le=50, description="Maximum appointments per day")
    bio: Optional[str] = Field(None, description="Brief counselor bio for member view")
    specialties: list[str] = Field(default_factory=list, description="Areas of expertise (e.g., marriage, grief, addiction)")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    @field_validator('whatsapp_number')
    @classmethod
    def validate_whatsapp(cls, v: Optional[str]) -> Optional[str]:
        if v and not v.strip():
            return None
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "church_id": "550e8400-e29b-41d4-a716-446655440000",
                "staff_user_id": "660e8400-e29b-41d4-a716-446655440000",
                "display_name": "Pastor John Smith",
                "whatsapp_number": "+6281234567890",
                "is_active": True,
                "max_daily_appointments": 8,
                "bio": "Experienced in marriage counseling and grief support",
                "specialties": ["marriage", "grief", "family"]
            }
        }


class CounselorCreate(BaseModel):
    """Request model for creating a counselor."""
    staff_user_id: str
    display_name: str = Field(..., min_length=1, max_length=200)
    whatsapp_number: Optional[str] = None
    max_daily_appointments: Optional[int] = Field(None, ge=1, le=50)
    bio: Optional[str] = None
    specialties: list[str] = Field(default_factory=list)


class CounselorUpdate(BaseModel):
    """Request model for updating a counselor."""
    display_name: Optional[str] = Field(None, min_length=1, max_length=200)
    whatsapp_number: Optional[str] = None
    is_active: Optional[bool] = None
    max_daily_appointments: Optional[int] = Field(None, ge=1, le=50)
    bio: Optional[str] = None
    specialties: Optional[list[str]] = None


class CounselorResponse(BaseModel):
    """Response model for counselor (public-facing, limited info)."""
    id: str
    display_name: str
    bio: Optional[str]
    specialties: list[str]
    is_active: bool
