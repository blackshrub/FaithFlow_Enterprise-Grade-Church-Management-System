from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal
from datetime import datetime, timezone
import uuid


class MemberStatusHistoryBase(BaseModel):
    member_id: str = Field(..., description="Member ID")
    member_name: str = Field(..., description="Member full name (for display)")
    old_status_id: Optional[str] = Field(None, description="Previous status ID (null if initial)")
    new_status_id: str = Field(..., description="New status ID")
    reason: Literal['automation', 'manual', 'conflict_resolution'] = Field(
        ...,
        description="How the status was changed"
    )
    rule_id: Optional[str] = Field(
        None,
        description="Rule ID that triggered the change (for automation)"
    )
    changed_by: Optional[str] = Field(
        None,
        description="User ID who made the change (for manual/conflict_resolution)"
    )
    notes: Optional[str] = Field(
        None,
        description="Additional notes about the change"
    )


class MemberStatusHistoryCreate(MemberStatusHistoryBase):
    church_id: str


class MemberStatusHistory(MemberStatusHistoryBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
