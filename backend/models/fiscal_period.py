from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from datetime import datetime
import uuid


class FiscalPeriodBase(BaseModel):
    """Base model for Fiscal Period"""
    month: int = Field(..., ge=1, le=12, description="Month (1-12)")
    year: int = Field(..., ge=1900, le=2100, description="Year")
    status: Literal["open", "closed", "locked"] = Field(default="open", description="Period status")

    @field_validator('year')
    @classmethod
    def validate_year(cls, v: int) -> int:
        """Validate fiscal year range"""
        if v < 1900 or v > 2100:
            raise ValueError("Fiscal year must be between 1900 and 2100")
        return v


class FiscalPeriodCreate(FiscalPeriodBase):
    """Model for creating a new fiscal period"""
    church_id: str = Field(..., description="Church ID")


class FiscalPeriodUpdate(BaseModel):
    """Model for updating fiscal period status"""
    status: Literal["open", "closed", "locked"] = Field(..., description="New status")


class FiscalPeriod(FiscalPeriodBase):
    """Full Fiscal Period model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique ID")
    church_id: str = Field(..., description="Church ID")
    closed_by: Optional[str] = Field(None, description="User ID who closed the period")
    closed_at: Optional[datetime] = Field(None, description="Close timestamp")
    locked_by: Optional[str] = Field(None, description="User ID who locked the period")
    locked_at: Optional[datetime] = Field(None, description="Lock timestamp")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    def can_create_journal(self) -> bool:
        """Check if journals can be created in this period"""
        return self.status != "locked"
    
    def can_edit(self) -> bool:
        """Check if journals can be edited in this period"""
        return self.status != "locked"
    
    def can_close(self) -> bool:
        """Check if period can be closed"""
        return self.status == "open"
    
    def can_lock(self) -> bool:
        """Check if period can be locked"""
        return self.status == "closed"
    
    def can_unlock(self) -> bool:
        """Check if period can be unlocked"""
        return self.status == "locked"
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "church_id": "church123",
                "month": 1,
                "year": 2024,
                "status": "open",
                "closed_by": None,
                "closed_at": None,
                "locked_by": None,
                "locked_at": None,
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00"
            }
        }
