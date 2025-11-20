from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, Literal
from datetime import datetime, date, time
import uuid


class CounselingOverride(BaseModel):
    """Date-specific override for counselor availability.
    
    Allows blocking or adding extra slots for specific dates,
    overriding the weekly recurring rules.
    """
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: str = Field(..., description="Church identifier")
    counselor_id: str = Field(..., description="Counselor this override applies to")
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    start_time: str = Field(..., description="Start time in HH:MM format (UTC)")
    end_time: str = Field(..., description="End time in HH:MM format (UTC)")
    action: Literal["block", "add_extra"] = Field(
        ...,
        description="'block' removes slots in this range, 'add_extra' adds additional availability"
    )
    reason: Optional[str] = Field(None, max_length=500, description="Reason for override (e.g., 'On vacation', 'Conference')")
    created_by: str = Field(..., description="Staff user ID who created this override")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    @field_validator('date')
    @classmethod
    def validate_date_format(cls, v: str) -> str:
        """Validate date is in YYYY-MM-DD format."""
        try:
            date.fromisoformat(v)
            return v
        except ValueError:
            raise ValueError("Date must be in YYYY-MM-DD format (e.g., '2025-12-25')")
    
    @field_validator('start_time', 'end_time')
    @classmethod
    def validate_time_format(cls, v: str) -> str:
        """Validate time is in HH:MM format."""
        try:
            time.fromisoformat(v)
            return v
        except ValueError:
            raise ValueError("Time must be in HH:MM format (e.g., '09:00', '14:30')")
    
    @model_validator(mode='after')
    def validate_time_range(self):
        """Ensure end_time is after start_time."""
        start = time.fromisoformat(self.start_time)
        end = time.fromisoformat(self.end_time)
        
        if end <= start:
            raise ValueError("end_time must be after start_time")
        
        return self
    
    class Config:
        json_schema_extra = {
            "example": {
                "church_id": "550e8400-e29b-41d4-a716-446655440000",
                "counselor_id": "660e8400-e29b-41d4-a716-446655440000",
                "date": "2025-12-25",
                "start_time": "00:00",
                "end_time": "23:59",
                "action": "block",
                "reason": "Christmas Day - Office Closed",
                "created_by": "staff-user-id"
            }
        }


class OverrideCreate(BaseModel):
    """Request model for creating an override."""
    counselor_id: str
    date: str = Field(..., description="YYYY-MM-DD format")
    start_time: str = Field(..., description="HH:MM format")
    end_time: str = Field(..., description="HH:MM format")
    action: Literal["block", "add_extra"]
    reason: Optional[str] = Field(None, max_length=500)


class OverrideUpdate(BaseModel):
    """Request model for updating an override."""
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    action: Optional[Literal["block", "add_extra"]] = None
    reason: Optional[str] = Field(None, max_length=500)
