from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional
from datetime import datetime, time
import uuid


class CounselingRecurringRule(BaseModel):
    """Weekly recurring availability pattern for counselors.
    
    Defines base availability like 'Every Monday 10:00-15:00'.
    Slots are generated from these rules and can be overridden per date.
    """
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: str = Field(..., description="Church identifier")
    counselor_id: str = Field(..., description="Counselor this rule applies to")
    day_of_week: int = Field(..., ge=0, le=6, description="0=Monday, 1=Tuesday, ..., 6=Sunday")
    start_time: str = Field(..., description="Start time in HH:MM format (UTC)")
    end_time: str = Field(..., description="End time in HH:MM format (UTC)")
    slot_length_minutes: int = Field(default=60, ge=15, le=240, description="Length of each slot in minutes")
    is_active: bool = Field(default=True, description="Whether this rule is currently active")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
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
        """Ensure end_time is after start_time and slot_length divides evenly."""
        start = time.fromisoformat(self.start_time)
        end = time.fromisoformat(self.end_time)
        
        if end <= start:
            raise ValueError("end_time must be after start_time")
        
        # Calculate total minutes
        start_minutes = start.hour * 60 + start.minute
        end_minutes = end.hour * 60 + end.minute
        total_minutes = end_minutes - start_minutes
        
        if total_minutes < self.slot_length_minutes:
            raise ValueError(f"Time range ({total_minutes} min) is shorter than slot_length ({self.slot_length_minutes} min)")
        
        return self
    
    class Config:
        json_schema_extra = {
            "example": {
                "church_id": "550e8400-e29b-41d4-a716-446655440000",
                "counselor_id": "660e8400-e29b-41d4-a716-446655440000",
                "day_of_week": 1,
                "start_time": "09:00",
                "end_time": "17:00",
                "slot_length_minutes": 60,
                "is_active": True
            }
        }


class RecurringRuleCreate(BaseModel):
    """Request model for creating a recurring rule."""
    counselor_id: str
    day_of_week: int = Field(..., ge=0, le=6)
    start_time: str = Field(..., description="HH:MM format")
    end_time: str = Field(..., description="HH:MM format")
    slot_length_minutes: int = Field(default=60, ge=15, le=240)


class RecurringRuleUpdate(BaseModel):
    """Request model for updating a recurring rule."""
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    slot_length_minutes: Optional[int] = Field(None, ge=15, le=240)
    is_active: Optional[bool] = None
