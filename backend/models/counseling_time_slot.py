from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from datetime import datetime, date, time
import uuid


class CounselingTimeSlot(BaseModel):
    """Pre-generated concrete time slot for booking.
    
    Generated from recurring rules + overrides.
    This is what members see when selecting appointment times.
    """
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: str = Field(..., description="Church identifier")
    counselor_id: str = Field(..., description="Counselor this slot belongs to")
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    start_time: str = Field(..., description="Start time in HH:MM format (UTC)")
    end_time: str = Field(..., description="End time in HH:MM format (UTC)")
    status: Literal["open", "reserved", "booked", "blocked"] = Field(
        default="open",
        description="open=available, reserved=temporarily held, booked=taken, blocked=not available"
    )
    source: Literal["recurring", "override_block", "override_add"] = Field(
        default="recurring",
        description="How this slot was created"
    )
    appointment_id: Optional[str] = Field(None, description="Linked appointment if booked")
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
                "counselor_id": "660e8400-e29b-41d4-a716-446655440000",
                "date": "2025-11-25",
                "start_time": "10:00",
                "end_time": "11:00",
                "status": "open",
                "source": "recurring"
            }
        }


class TimeSlotAvailability(BaseModel):
    """Public-facing slot info for member booking."""
    slot_id: str
    date: str
    start_time: str
    end_time: str
    counselor_id: str
    counselor_name: str
