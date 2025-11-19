from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal
from datetime import datetime, timezone
import uuid


class MemberStatusHistoryBase(BaseModel):
    member_id: str = Field(..., description="Member ID")
    member_name: str = Field(..., description="Member full name (for display)")
    previous_status: Optional[str] = Field(None, description="Previous status name")
    new_status: str = Field(..., description="New status name")
    change_type: Literal['manual', 'automation', 'conflict_resolved'] = Field(
        ...,
        description="How the status was changed"
    )
    changed_by_user_id: Optional[str] = Field(
        None,
        description="User ID who made the change (for manual changes)"
    )
    changed_by_user_name: Optional[str] = Field(
        None,
        description="User name who made the change"
    )
    rule_id: Optional[str] = Field(
        None,
        description="Rule ID that triggered the change (for automation)"
    )
    rule_name: Optional[str] = Field(
        None,
        description="Rule name that triggered the change"
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
