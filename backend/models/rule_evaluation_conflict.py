from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime, timezone
import uuid


class RuleEvaluationConflictBase(BaseModel):
    member_id: str = Field(..., description="Member with conflicting rules")
    member_name: str = Field(..., description="Member full name (for display)")
    current_status_id: Optional[str] = Field(None, description="Current member status ID at time of conflict")
    proposed_status_ids: List[str] = Field(
        ...,
        description="Array of proposed status IDs from matching rules"
    )
    rule_ids: List[str] = Field(
        ...,
        description="Array of rule IDs that matched"
    )
    status: Literal['open', 'resolved'] = Field(
        default='open',
        description="Conflict resolution status"
    )
    resolved_by: Optional[str] = Field(None, description="User ID who resolved")
    resolved_at: Optional[datetime] = None
    resolution_status_id: Optional[str] = Field(None, description="Final chosen status ID")
    resolution_comment: Optional[str] = None


class RuleEvaluationConflictCreate(RuleEvaluationConflictBase):
    church_id: str


class RuleEvaluationConflictUpdate(BaseModel):
    status: Optional[Literal['open', 'resolved']] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolution_status_id: Optional[str] = None
    resolution_comment: Optional[str] = None


class RuleEvaluationConflict(RuleEvaluationConflictBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
