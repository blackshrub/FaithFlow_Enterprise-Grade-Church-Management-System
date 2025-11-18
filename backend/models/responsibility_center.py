from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal, List
from datetime import datetime
import uuid


class ResponsibilityCenterBase(BaseModel):
    """Base model for Responsibility Center"""
    code: str = Field(..., min_length=1, max_length=50, description="Center code")
    name: str = Field(..., min_length=1, max_length=200, description="Center name")
    type: Literal["department", "ministry", "project", "campus"] = Field(..., description="Center type")
    parent_id: Optional[str] = Field(None, description="Parent center ID for hierarchy")
    level: int = Field(default=0, ge=0, description="Hierarchy level (0=root)")
    is_active: bool = Field(default=True, description="Active status")

    @field_validator('code')
    @classmethod
    def validate_code(cls, v: str) -> str:
        """Validate center code format"""
        if not v or not v.strip():
            raise ValueError("Center code cannot be empty")
        return v.strip().upper()


class ResponsibilityCenterCreate(ResponsibilityCenterBase):
    """Model for creating a new responsibility center"""
    church_id: str = Field(..., description="Church ID")


class ResponsibilityCenterUpdate(BaseModel):
    """Model for updating a responsibility center"""
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    type: Optional[Literal["department", "ministry", "project", "campus"]] = None
    parent_id: Optional[str] = None
    is_active: Optional[bool] = None


class ResponsibilityCenter(ResponsibilityCenterBase):
    """Full Responsibility Center model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique ID")
    church_id: str = Field(..., description="Church ID")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "church_id": "church123",
                "code": "MIN-001",
                "name": "Ministry of Worship",
                "type": "ministry",
                "parent_id": None,
                "level": 0,
                "is_active": True,
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00"
            }
        }
