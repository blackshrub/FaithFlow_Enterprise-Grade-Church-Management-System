from pydantic import BaseModel, Field
from typing import Optional, Literal, Dict, Any
from datetime import datetime
import uuid


class ExportJobBase(BaseModel):
    """Base model for Export Job (async report export)"""
    report_type: str = Field(..., description="Report type")
    params: Dict[str, Any] = Field(..., description="Report parameters")
    format: Literal["pdf", "excel", "csv"] = Field(..., description="Export format")


class ExportJobCreate(ExportJobBase):
    """Model for creating export job"""
    church_id: str = Field(..., description="Church ID")
    job_id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Job ID")
    created_by: str = Field(..., description="User ID who created")


class ExportJob(ExportJobBase):
    """Full Export Job model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique ID")
    church_id: str = Field(..., description="Church ID")
    job_id: str = Field(..., description="Job ID")
    status: Literal["pending", "processing", "completed", "failed"] = Field(
        default="pending",
        description="Job status"
    )
    file_path: Optional[str] = Field(None, description="Export file path (if completed)")
    error_message: Optional[str] = Field(None, description="Error message (if failed)")
    created_by: str = Field(..., description="User ID who created")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = Field(None, description="Completion timestamp")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "church_id": "church123",
                "job_id": "job-123e4567",
                "report_type": "income_statement",
                "params": {
                    "start_date": "2024-01-01",
                    "end_date": "2024-12-31"
                },
                "format": "pdf",
                "status": "completed",
                "file_path": "/app/exports/church123/income_statement_2024.pdf",
                "error_message": None,
                "created_by": "user123",
                "created_at": "2024-01-15T10:00:00",
                "completed_at": "2024-01-15T10:02:30"
            }
        }
