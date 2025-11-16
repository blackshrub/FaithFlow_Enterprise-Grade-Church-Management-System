from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid


class DemographicPresetBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="e.g., Kid, Teen, Youth, Adult, Senior")
    min_age: int = Field(..., ge=0, le=150, description="Minimum age for this category")
    max_age: int = Field(..., ge=0, le=150, description="Maximum age for this category")
    description: Optional[str] = None
    order: int = Field(default=0, description="Display order")
    is_active: bool = True


class DemographicPresetCreate(DemographicPresetBase):
    church_id: str


class DemographicPresetUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    min_age: Optional[int] = Field(None, ge=0, le=150)
    max_age: Optional[int] = Field(None, ge=0, le=150)
    description: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None


class DemographicPreset(DemographicPresetBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
