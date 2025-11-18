from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
import uuid


class ReportTemplateBase(BaseModel):
    """Base model for Report Template"""
    name: str = Field(..., min_length=1, max_length=200, description="Template name")
    report_type: str = Field(..., description="Report type (e.g., 'custom', 'general_ledger')")
    config: Dict[str, Any] = Field(..., description="Report configuration (accounts, date range, etc.)")


class ReportTemplateCreate(ReportTemplateBase):
    """Model for creating report template"""
    church_id: str = Field(..., description="Church ID")
    created_by: str = Field(..., description="User ID who created")


class ReportTemplateUpdate(BaseModel):
    """Model for updating report template"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    config: Optional[Dict[str, Any]] = None


class ReportTemplate(ReportTemplateBase):
    """Full Report Template model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique ID")
    church_id: str = Field(..., description="Church ID")
    created_by: str = Field(..., description="User ID who created")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "church_id": "church123",
                "name": "Monthly Income Report",
                "report_type": "custom",
                "config": {
                    "selected_accounts": ["acc1", "acc2"],
                    "date_range": "last_6_months",
                    "grouping": "by_month"
                },
                "created_by": "user123",
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00"
            }
        }
