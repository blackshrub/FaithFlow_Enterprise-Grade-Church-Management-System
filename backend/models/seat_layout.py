from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Literal
from datetime import datetime, timezone
import uuid


class SeatLayoutBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="Layout name (e.g., Main Auditorium, Classroom A)")
    description: Optional[str] = None
    rows: int = Field(..., ge=1, le=50, description="Number of rows (A, B, C...)")
    columns: int = Field(..., ge=1, le=100, description="Number of columns (1, 2, 3...)")
    seat_map: Dict[str, str] = Field(default_factory=dict, description="Map of seat positions to status: available/no_seat/unavailable")
    is_active: bool = True


class SeatLayoutCreate(SeatLayoutBase):
    church_id: str


class SeatLayoutUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    rows: Optional[int] = Field(None, ge=1, le=50)
    columns: Optional[int] = Field(None, ge=1, le=100)
    seat_map: Optional[Dict[str, str]] = None
    is_active: Optional[bool] = None


class SeatLayout(SeatLayoutBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
