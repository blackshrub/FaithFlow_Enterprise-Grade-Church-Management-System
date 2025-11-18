from pydantic import BaseModel, Field
from typing import Dict, Any
from datetime import datetime
import uuid


class BankImportLogBase(BaseModel):
    """Base model for Bank Import Log"""
    bank_account_id: str = Field(..., description="Bank account ID")
    file_name: str = Field(..., description="Imported file name")
    total_rows: int = Field(..., ge=0, description="Total rows in file")
    success_count: int = Field(default=0, ge=0, description="Successfully imported count")
    error_count: int = Field(default=0, ge=0, description="Error count")
    errors: list[Dict[str, Any]] = Field(default_factory=list, description="Error details")
    imported_by: str = Field(..., description="User ID who imported")


class BankImportLogCreate(BankImportLogBase):
    """Model for creating a bank import log"""
    church_id: str = Field(..., description="Church ID")


class BankImportLog(BankImportLogBase):
    """Full Bank Import Log model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique ID")
    church_id: str = Field(..., description="Church ID")
    import_date: datetime = Field(default_factory=datetime.utcnow, description="Import timestamp")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "church_id": "church123",
                "bank_account_id": "bank123",
                "file_name": "bank_statement_jan2024.csv",
                "import_date": "2024-01-31T15:30:00",
                "total_rows": 100,
                "success_count": 98,
                "error_count": 2,
                "errors": [
                    {"row": 5, "error": "Invalid date format"},
                    {"row": 23, "error": "Missing amount"}
                ],
                "imported_by": "user123",
                "created_at": "2024-01-31T15:30:00"
            }
        }
