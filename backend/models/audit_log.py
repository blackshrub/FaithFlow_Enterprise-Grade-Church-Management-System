from pydantic import BaseModel, Field
from typing import Optional, Literal, Dict, Any
from datetime import datetime
import uuid


class AuditLogBase(BaseModel):
    """Base model for Audit Log"""
    user_id: str = Field(..., description="User ID who performed the action")
    action_type: Literal["create", "update", "delete", "approve"] = Field(..., description="Action type")
    module: str = Field(..., description="Module name (e.g., 'coa', 'journal', 'budget')")
    description: str = Field(..., min_length=1, max_length=1000, description="Action description")
    before_data: Optional[Dict[str, Any]] = Field(None, description="Data before action")
    after_data: Optional[Dict[str, Any]] = Field(None, description="Data after action")


class AuditLogCreate(AuditLogBase):
    """Model for creating audit log entry"""
    church_id: str = Field(..., description="Church ID")


class AuditLog(AuditLogBase):
    """Full Audit Log model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique ID")
    church_id: str = Field(..., description="Church ID")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Action timestamp")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "church_id": "church123",
                "user_id": "user123",
                "action_type": "update",
                "module": "coa",
                "description": "Updated account name from 'Kas' to 'Kas Kecil'",
                "before_data": {"name": "Kas"},
                "after_data": {"name": "Kas Kecil"},
                "timestamp": "2024-01-15T10:30:00"
            }
        }
