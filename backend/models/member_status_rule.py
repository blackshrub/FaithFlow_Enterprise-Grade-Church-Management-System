from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime, timezone
import uuid


class MemberStatusRuleBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="Rule name")
    description: Optional[str] = None
    rule_type: Literal['global', 'status_based'] = Field(
        ...,
        description="Global rules apply to all members, status-based rules only when current status matches"
    )
    current_status_id: Optional[str] = Field(
        None,
        description="Required for status_based rules - only evaluate when member has this status"
    )
    conditions: List[Dict[str, Any]] = Field(
        ...,
        description="Array of condition objects with AND/OR logic"
    )
    action_status_id: str = Field(
        ...,
        description="Status to set when rule matches"
    )
    enabled: bool = Field(default=True, description="Enable/disable rule")
    priority: int = Field(
        default=0,
        description="Rule priority (higher = evaluated first, for conflict resolution)"
    )


class MemberStatusRuleCreate(MemberStatusRuleBase):
    church_id: str


class MemberStatusRuleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    rule_type: Optional[Literal['global', 'status_based']] = None
    current_status_id: Optional[str] = None
    conditions: Optional[List[Dict[str, Any]]] = None
    action_status_id: Optional[str] = None
    enabled: Optional[bool] = None
    priority: Optional[int] = None


class MemberStatusRule(MemberStatusRuleBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: str
    human_readable: Optional[str] = Field(
        None,
        description="Auto-generated human-friendly rule description"
    )
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
