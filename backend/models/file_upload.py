from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from datetime import datetime
import uuid


class FileUploadBase(BaseModel):
    """Base model for File Upload"""
    original_filename: str = Field(..., min_length=1, max_length=255, description="Original file name")
    mime_type: str = Field(..., description="MIME type")
    file_size: int = Field(..., gt=0, description="File size in bytes")
    reference_type: Literal[
        "journal",
        "asset",
        "budget",
        "bank_transaction",
        "quick_entry",
        "reconciliation",
        "beginning_balance"
    ] = Field(..., description="Reference type")
    reference_id: Optional[str] = Field(None, description="Reference entity ID")

    @field_validator('file_size')
    @classmethod
    def validate_file_size(cls, v: int) -> int:
        """Validate file size (max 10MB)"""
        max_size = 10 * 1024 * 1024  # 10MB
        if v > max_size:
            raise ValueError(f"File size cannot exceed {max_size} bytes (10MB)")
        return v

    @field_validator('mime_type')
    @classmethod
    def validate_mime_type(cls, v: str) -> str:
        """Validate MIME type"""
        allowed_types = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
            'application/pdf',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ]
        if not any(v.startswith(allowed.split('/')[0]) for allowed in allowed_types):
            if v not in allowed_types:
                raise ValueError(f"File type {v} is not allowed")
        return v


class FileUploadCreate(FileUploadBase):
    """Model for creating file upload record"""
    church_id: str = Field(..., description="Church ID")
    stored_filename: str = Field(..., description="Stored file name (unique)")
    storage_path: str = Field(..., description="Storage path")
    uploaded_by: str = Field(..., description="User ID who uploaded")


class FileUpload(FileUploadBase):
    """Full File Upload model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique ID")
    church_id: str = Field(..., description="Church ID")
    stored_filename: str = Field(..., description="Stored file name (unique)")
    storage_path: str = Field(..., description="Storage path")
    uploaded_by: str = Field(..., description="User ID who uploaded")
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "church_id": "church123",
                "original_filename": "receipt.pdf",
                "stored_filename": "church123_20240115_abc123.pdf",
                "mime_type": "application/pdf",
                "storage_path": "/app/uploads/church123/church123_20240115_abc123.pdf",
                "file_size": 524288,
                "reference_type": "journal",
                "reference_id": "journal123",
                "uploaded_by": "user123",
                "uploaded_at": "2024-01-15T10:30:00"
            }
        }
