from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime, timezone
import uuid


class MilestoneBase(BaseModel):
    milestone_type: str = Field(..., description="e.g., Baptism, Confirmation, Group Completion")
    title: str
    description: Optional[str] = None
    achieved_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SpiritualJourneyBase(BaseModel):
    member_id: str
    milestones: List[MilestoneBase] = Field(default_factory=list)
    badges: List[str] = Field(default_factory=list)
    notes: Optional[str] = None


class SpiritualJourneyCreate(SpiritualJourneyBase):
    church_id: str


class SpiritualJourneyUpdate(BaseModel):
    member_id: Optional[str] = None
    milestones: Optional[List[MilestoneBase]] = None
    badges: Optional[List[str]] = None
    notes: Optional[str] = None


class SpiritualJourney(SpiritualJourneyBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
