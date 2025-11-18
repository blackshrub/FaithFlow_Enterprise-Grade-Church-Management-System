from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from datetime import datetime
from decimal import Decimal
import uuid


class YearEndClosingBase(BaseModel):
    """Base model for Year-End Closing"""
    fiscal_year: int = Field(..., ge=1900, le=2100, description="Fiscal year")

    @field_validator('fiscal_year')
    @classmethod
    def validate_fiscal_year(cls, v: int) -> int:
        """Validate fiscal year range"""
        if v < 1900 or v > 2100:
            raise ValueError("Fiscal year must be between 1900 and 2100")
        return v


class YearEndClosingCreate(YearEndClosingBase):
    """Model for creating year-end closing"""
    church_id: str = Field(..., description="Church ID")
    retained_earnings_account_id: str = Field(..., description="Retained earnings account ID")
    created_by: str = Field(..., description="User ID who initiated")


class YearEndClosing(YearEndClosingBase):
    """Full Year-End Closing model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique ID")
    church_id: str = Field(..., description="Church ID")
    closing_journal_id: Optional[str] = Field(None, description="Closing journal ID")
    net_income: Decimal = Field(default=Decimal('0'), description="Net income for the year")
    total_income: Decimal = Field(default=Decimal('0'), description="Total income for the year")
    total_expenses: Decimal = Field(default=Decimal('0'), description="Total expenses for the year")
    retained_earnings_account_id: str = Field(..., description="Retained earnings account ID")
    status: Literal["pending", "processing", "success", "failed"] = Field(
        default="pending",
        description="Closing status"
    )
    error_message: Optional[str] = Field(None, description="Error message if failed")
    created_by: str = Field(..., description="User ID who initiated")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = Field(None, description="Completion timestamp")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "church_id": "church123",
                "fiscal_year": 2024,
                "closing_journal_id": "journal123",
                "net_income": 50000000,
                "total_income": 200000000,
                "total_expenses": 150000000,
                "retained_earnings_account_id": "acc123",
                "status": "success",
                "error_message": None,
                "created_by": "user123",
                "created_at": "2024-12-31T23:59:59",
                "completed_at": "2025-01-01T00:15:30"
            }
        }
