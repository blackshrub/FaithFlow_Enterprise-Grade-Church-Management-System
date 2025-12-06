from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Literal
from datetime import datetime, timezone
import uuid


class SessionBase(BaseModel):
    name: str = Field(..., description="Session name")
    date: datetime
    end_date: Optional[datetime] = None


class EventBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    event_type: Literal['single', 'series'] = 'single'
    requires_rsvp: bool = False
    enable_seat_selection: bool = False
    seat_layout_id: Optional[str] = None
    seat_capacity: Optional[int] = Field(None, ge=1, description="Maximum seat capacity (used when no seat layout)")
    event_category_id: Optional[str] = Field(None, description="Event category ID")
    location: Optional[str] = None
    reservation_start: Optional[datetime] = None
    reservation_end: Optional[datetime] = None
    event_photo: Optional[str] = None  # Base64 or URL
    is_active: bool = True
    
    # For single events
    event_date: Optional[datetime] = None
    event_end_date: Optional[datetime] = None
    
    # For series events
    sessions: List[SessionBase] = Field(default_factory=list)


class EventCreate(EventBase):
    church_id: str


class EventUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    requires_rsvp: Optional[bool] = None
    enable_seat_selection: Optional[bool] = None
    seat_layout_id: Optional[str] = None
    seat_capacity: Optional[int] = Field(None, ge=1)
    event_category_id: Optional[str] = None
    location: Optional[str] = None
    reservation_start: Optional[datetime] = None
    reservation_end: Optional[datetime] = None
    event_photo: Optional[str] = None
    is_active: Optional[bool] = None
    event_date: Optional[datetime] = None
    event_end_date: Optional[datetime] = None
    sessions: Optional[List[SessionBase]] = None


class Event(EventBase):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: str
    rsvp_list: List[Dict] = Field(default_factory=list)  # [{member_id, session_id, seat, timestamp, status}]
    attendance_list: List[Dict] = Field(default_factory=list)  # [{member_id, session_id, check_in_time}] - DEPRECATED: Use event_attendance collection
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# =============================================================================
# Event Attendance - Separate Collection for Scalability
# =============================================================================

class EventAttendanceBase(BaseModel):
    """Base model for event attendance records."""
    event_id: str = Field(..., description="Event ID")
    member_id: str = Field(..., description="Member ID")
    member_name: str = Field(..., description="Member name at time of check-in")
    session_id: Optional[str] = Field(None, description="Session ID for series events")
    check_in_method: Literal["face", "qr", "manual", "quick_add"] = Field(
        "manual", description="How the member checked in"
    )
    source: Optional[str] = Field(None, description="Kiosk ID or admin user ID")


class EventAttendanceCreate(EventAttendanceBase):
    """Model for creating attendance records."""
    church_id: str = Field(..., description="Church ID for multi-tenant isolation")


class EventAttendance(EventAttendanceBase):
    """Full attendance record model."""
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: str
    check_in_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    member_photo: Optional[str] = Field(None, description="Member photo URL at time of check-in")
    confidence: Optional[float] = Field(None, description="Face recognition confidence (0-1)")

    # Denormalized fields for fast queries
    event_name: Optional[str] = Field(None, description="Event name for reporting")
    event_date: Optional[datetime] = Field(None, description="Event date for reporting")


class EventAttendanceResponse(BaseModel):
    """Response model for attendance data."""
    id: str
    event_id: str
    member_id: str
    member_name: str
    session_id: Optional[str] = None
    check_in_time: datetime
    check_in_method: str
    member_photo: Optional[str] = None


class AttendanceSummary(BaseModel):
    """Summary of attendance for an event."""
    event_id: str
    total_attendance: int
    attendance_by_method: Dict[str, int] = Field(default_factory=dict)
    attendance_by_session: Dict[str, int] = Field(default_factory=dict)
    attendance_rate: Optional[float] = Field(None, description="Attendance vs RSVP rate")
