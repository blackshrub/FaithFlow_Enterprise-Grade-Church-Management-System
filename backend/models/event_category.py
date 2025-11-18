from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid


class EventCategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    color: str = Field(default="#3C5AFF", description="Category color for UI")
    icon: Optional[str] = Field(None, description="Icon name (lucide-react)")
    order: int = Field(default=0, description="Display order")
    is_active: bool = True
    is_system: bool = Field(default=False, description="System category (cannot be deleted)")


class EventCategoryCreate(EventCategoryBase):
    church_id: str


class EventCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None
    # is_system cannot be updated


class EventCategory(EventCategoryBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
