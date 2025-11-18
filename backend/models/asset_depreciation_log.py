from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal
import uuid


class AssetDepreciationLogBase(BaseModel):
    """Base model for Asset Depreciation Log"""
    asset_id: str = Field(..., description="Fixed asset ID")
    period_month: int = Field(..., ge=1, le=12, description="Period month (1-12)")
    period_year: int = Field(..., ge=1900, le=2100, description="Period year")
    depreciation_amount: Decimal = Field(..., ge=0, description="Depreciation amount for this period")
    accumulated_depreciation: Decimal = Field(..., ge=0, description="Total accumulated depreciation")
    book_value: Decimal = Field(..., ge=0, description="Book value after depreciation")
    journal_id: Optional[str] = Field(None, description="Journal entry ID")


class AssetDepreciationLogCreate(AssetDepreciationLogBase):
    """Model for creating a depreciation log entry"""
    church_id: str = Field(..., description="Church ID")


class AssetDepreciationLog(AssetDepreciationLogBase):
    """Full Asset Depreciation Log model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique ID")
    church_id: str = Field(..., description="Church ID")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "church_id": "church123",
                "asset_id": "asset123",
                "period_month": 1,
                "period_year": 2024,
                "depreciation_amount": 7500000,
                "accumulated_depreciation": 7500000,
                "book_value": 492500000,
                "journal_id": "journal123",
                "created_at": "2024-01-31T00:00:00"
            }
        }

from typing import Optional
