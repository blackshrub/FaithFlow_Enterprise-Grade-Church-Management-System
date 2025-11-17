from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid


class MemberStatusBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    order: int = Field(default=0, description="Display order")
    is_active: bool = True
    is_default_for_new: bool = Field(default=False, description="Default status for new visitors/members")


class MemberStatusCreate(MemberStatusBase):
    church_id: str


class MemberStatusUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None
    is_default_for_new: Optional[bool] = None


class MemberStatus(MemberStatusBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
