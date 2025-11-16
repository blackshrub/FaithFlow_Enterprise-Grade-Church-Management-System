from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid


class GroupBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    group_type: Optional[str] = Field(None, description="e.g., Small Group, Ministry, Bible Study")
    meeting_schedule: Optional[str] = None
    location: Optional[str] = None
    leader_id: Optional[str] = None
    is_active: bool = True


class GroupCreate(GroupBase):
    church_id: str


class GroupUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    group_type: Optional[str] = None
    meeting_schedule: Optional[str] = None
    location: Optional[str] = None
    leader_id: Optional[str] = None
    is_active: Optional[bool] = None


class Group(GroupBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: str
    member_ids: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
