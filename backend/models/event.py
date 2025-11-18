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
    attendance_list: List[Dict] = Field(default_factory=list)  # [{member_id, session_id, check_in_time}]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
