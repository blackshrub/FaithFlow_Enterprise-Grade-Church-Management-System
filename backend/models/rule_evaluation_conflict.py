from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime, timezone
import uuid


class RuleEvaluationConflictBase(BaseModel):
    member_id: str = Field(..., description="Member with conflicting rules")
    member_name: str = Field(..., description="Member full name (for display)")
    current_status: Optional[str] = Field(None, description="Current member status")
    matched_rules: List[Dict[str, Any]] = Field(
        ...,
        description="Array of matched rules with details"
    )
    possible_statuses: List[Dict[str, str]] = Field(
        ...,
        description="Array of possible target statuses: [{id, name, color}]"
    )
    status: Literal['pending', 'resolved'] = Field(
        default='pending',
        description="Conflict resolution status"
    )
    resolved_by_user_id: Optional[str] = None
    resolved_by_user_name: Optional[str] = None
    resolved_status_id: Optional[str] = None
    resolved_at: Optional[datetime] = None


class RuleEvaluationConflictCreate(RuleEvaluationConflictBase):
    church_id: str


class RuleEvaluationConflictUpdate(BaseModel):
    status: Optional[Literal['pending', 'resolved']] = None
    resolved_by_user_id: Optional[str] = None
    resolved_by_user_name: Optional[str] = None
    resolved_status_id: Optional[str] = None
    resolved_at: Optional[datetime] = None


class RuleEvaluationConflict(RuleEvaluationConflictBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
