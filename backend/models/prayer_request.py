from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal
from datetime import datetime, timezone
import uuid


class PrayerRequestBase(BaseModel):
    member_id: str
    title: str = Field(..., min_length=1, max_length=200)
    description: str
    status: Literal['pending', 'in_progress', 'answered', 'archived'] = 'pending'
    is_private: bool = False
    assigned_to: Optional[str] = None  # user_id of admin/staff


class PrayerRequestCreate(PrayerRequestBase):
    church_id: str


class PrayerRequestUpdate(BaseModel):
    member_id: Optional[str] = None
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    status: Optional[Literal['pending', 'in_progress', 'answered', 'archived']] = None
    is_private: Optional[bool] = None
    assigned_to: Optional[str] = None


class PrayerRequest(PrayerRequestBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
