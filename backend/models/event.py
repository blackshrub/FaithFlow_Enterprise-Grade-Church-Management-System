from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime, timezone
import uuid


class EventBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    event_type: Optional[str] = Field(None, description="e.g., Service, Meeting, Conference")
    start_datetime: datetime
    end_datetime: datetime
    location: Optional[str] = None
    max_attendees: Optional[int] = None
    requires_rsvp: bool = False
    is_published: bool = True


class EventCreate(EventBase):
    church_id: str


class EventUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    event_type: Optional[str] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    location: Optional[str] = None
    max_attendees: Optional[int] = None
    requires_rsvp: Optional[bool] = None
    is_published: Optional[bool] = None


class Event(EventBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: str
    rsvp_list: List[dict] = Field(default_factory=list)  # [{member_id, status, timestamp}]
    attendance_list: List[str] = Field(default_factory=list)  # [member_id]
    volunteer_ids: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
