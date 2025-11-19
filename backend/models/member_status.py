from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid


class MemberStatusBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    color: str = Field(default="#3C5AFF", description="Status color for UI badges (hex)")
    display_order: int = Field(default=0, description="Display order in UI")
    is_active: bool = True
    is_default: bool = Field(default=False, description="Default status for new members")
    is_system: bool = Field(default=False, description="System status (cannot be deleted)")


class MemberStatusCreate(MemberStatusBase):
    church_id: str


class MemberStatusUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    color: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None
    # is_system cannot be updated


class MemberStatus(MemberStatusBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
