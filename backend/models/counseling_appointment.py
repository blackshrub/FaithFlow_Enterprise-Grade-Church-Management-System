from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from datetime import datetime, date, time
import uuid


class CounselingAppointment(BaseModel):
    """Counseling or prayer appointment request.
    
    Represents both member-initiated and staff-created appointments.
    Linked to a specific time slot to prevent double-booking.
    """
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: str = Field(..., description="Church identifier")
    member_id: str = Field(..., description="Reference to member in members collection")
    counselor_id: Optional[str] = Field(None, description="Assigned counselor (can be set later)")
    slot_id: str = Field(..., description="Reference to counseling_time_slot")
    
    # Denormalized from slot for easier querying
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    start_time: str = Field(..., description="Start time in HH:MM format (UTC)")
    end_time: str = Field(..., description="End time in HH:MM format (UTC)")
    
    type: Literal["counseling", "prayer", "pastoral_visit"] = Field(
        default="counseling",
        description="Type of appointment"
    )
    status: Literal["pending", "approved", "rejected", "canceled", "completed"] = Field(
        default="pending",
        description="Appointment lifecycle status"
    )
    urgency: Literal["low", "normal", "high", "crisis"] = Field(
        default="normal",
        description="Urgency level"
    )
    
    # Pre-counseling form fields
    topic: str = Field(..., min_length=1, max_length=200, description="Brief topic (e.g., 'marriage', 'grief')")
    description: str = Field(..., min_length=1, max_length=2000, description="Detailed explanation from member")
    preferred_channel: Optional[Literal["in_person", "online", "phone"]] = Field(
        None,
        description="How member prefers to meet"
    )
    preferred_location: Optional[str] = Field(None, max_length=500)
    contact_phone: Optional[str] = Field(None, max_length=50, description="Contact phone (defaults from member profile)")
    
    # Creation tracking
    created_by_member: bool = Field(default=True, description="True if from mobile app, False if created by staff")
    created_by_staff_id: Optional[str] = Field(None, description="Staff ID if created by admin")
    
    # Approval tracking
    approved_by_staff_id: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejected_reason: Optional[str] = Field(None, max_length=1000)
    
    # Admin notes
    admin_notes: Optional[str] = Field(None, max_length=2000, description="Internal notes for staff")
    outcome_notes: Optional[str] = Field(None, max_length=2000, description="Post-session notes after completion")
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    @field_validator('date')
    @classmethod
    def validate_date_format(cls, v: str) -> str:
        try:
            date.fromisoformat(v)
            return v
        except ValueError:
            raise ValueError("Date must be in YYYY-MM-DD format")
    
    @field_validator('start_time', 'end_time')
    @classmethod
    def validate_time_format(cls, v: str) -> str:
        try:
            time.fromisoformat(v)
            return v
        except ValueError:
            raise ValueError("Time must be in HH:MM format")
    
    class Config:
        json_schema_extra = {
            "example": {
                "church_id": "550e8400-e29b-41d4-a716-446655440000",
                "member_id": "member-uuid",
                "counselor_id": "counselor-uuid",
                "slot_id": "slot-uuid",
                "date": "2025-11-25",
                "start_time": "10:00",
                "end_time": "11:00",
                "type": "counseling",
                "status": "pending",
                "urgency": "normal",
                "topic": "Marriage difficulties",
                "description": "Having communication issues with spouse, would like guidance",
                "preferred_channel": "in_person",
                "created_by_member": True
            }
        }


class AppointmentCreate(BaseModel):
    """Request model for creating an appointment (from member or staff)."""
    slot_id: str
    type: Literal["counseling", "prayer", "pastoral_visit"] = "counseling"
    urgency: Literal["low", "normal", "high", "crisis"] = "normal"
    topic: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=2000)
    preferred_channel: Optional[Literal["in_person", "online", "phone"]] = None
    preferred_location: Optional[str] = Field(None, max_length=500)
    contact_phone: Optional[str] = Field(None, max_length=50)


class AppointmentCreateByStaff(AppointmentCreate):
    """Request model for staff creating appointment on behalf of member."""
    member_id: str = Field(..., description="Member ID to create appointment for")


class AppointmentUpdate(BaseModel):
    """Request model for updating appointment details."""
    admin_notes: Optional[str] = Field(None, max_length=2000)
    preferred_channel: Optional[Literal["in_person", "online", "phone"]] = None
    preferred_location: Optional[str] = Field(None, max_length=500)


class AppointmentApprove(BaseModel):
    """Request model for approving an appointment."""
    admin_notes: Optional[str] = Field(None, max_length=2000)


class AppointmentReject(BaseModel):
    """Request model for rejecting an appointment."""
    reason: str = Field(..., min_length=1, max_length=1000)


class AppointmentCancel(BaseModel):
    """Request model for canceling an appointment."""
    reason: Optional[str] = Field(None, max_length=1000)


class AppointmentComplete(BaseModel):
    """Request model for completing an appointment."""
    outcome_notes: str = Field(..., min_length=1, max_length=2000)
