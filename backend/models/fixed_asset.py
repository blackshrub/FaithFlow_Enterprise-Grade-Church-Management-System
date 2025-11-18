from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal, List
from datetime import datetime, date
from decimal import Decimal
import uuid
from dateutil.relativedelta import relativedelta


class FixedAssetBase(BaseModel):
    """Base model for Fixed Asset"""
    name: str = Field(..., min_length=1, max_length=200, description="Asset name")
    asset_code: str = Field(..., min_length=1, max_length=50, description="Asset code")
    acquisition_date: date = Field(..., description="Date of acquisition")
    cost: Decimal = Field(..., gt=0, description="Acquisition cost")
    useful_life_months: int = Field(..., gt=0, description="Useful life in months")
    salvage_value: Decimal = Field(default=Decimal('0'), ge=0, description="Salvage value")
    depreciation_method: Literal["straight_line"] = Field(
        default="straight_line",
        description="Depreciation method"
    )
    asset_account_id: str = Field(..., description="Asset account ID")
    depreciation_expense_account_id: str = Field(..., description="Depreciation expense account ID")
    accumulated_depreciation_account_id: str = Field(..., description="Accumulated depreciation account ID")
    is_active: bool = Field(default=True, description="Active status")

    @field_validator('asset_code')
    @classmethod
    def validate_asset_code(cls, v: str) -> str:
        """Validate asset code format"""
        if not v or not v.strip():
            raise ValueError("Asset code cannot be empty")
        return v.strip().upper()


class FixedAssetCreate(FixedAssetBase):
    """Model for creating a new fixed asset"""
    church_id: str = Field(..., description="Church ID")


class FixedAssetUpdate(BaseModel):
    """Model for updating a fixed asset"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    is_active: Optional[bool] = None


class FixedAsset(FixedAssetBase):
    """Full Fixed Asset model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique ID")
    church_id: str = Field(..., description="Church ID")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    attachments: List[str] = Field(default_factory=list, description="File attachment IDs")
    
    def calculate_monthly_depreciation(self) -> Decimal:
        """Calculate monthly depreciation amount (straight-line)"""
        if self.depreciation_method == "straight_line":
            depreciable_amount = self.cost - self.salvage_value
            return depreciable_amount / self.useful_life_months
        return Decimal('0')
    
    def get_depreciation_to_date(self, as_of_date: date) -> Decimal:
        """Calculate total depreciation up to a specific date"""
        if as_of_date < self.acquisition_date:
            return Decimal('0')
        
        # Calculate months elapsed
        months_elapsed = relativedelta(as_of_date, self.acquisition_date).months
        months_elapsed += relativedelta(as_of_date, self.acquisition_date).years * 12
        
        # Cap at useful life
        months_elapsed = min(months_elapsed, self.useful_life_months)
        
        monthly_depreciation = self.calculate_monthly_depreciation()
        total_depreciation = monthly_depreciation * months_elapsed
        
        # Cap at depreciable amount
        depreciable_amount = self.cost - self.salvage_value
        return min(total_depreciation, depreciable_amount)
    
    def get_book_value(self, as_of_date: date) -> Decimal:
        """Calculate book value as of a specific date"""
        accumulated_depreciation = self.get_depreciation_to_date(as_of_date)
        return self.cost - accumulated_depreciation
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "church_id": "church123",
                "name": "Church Van",
                "asset_code": "VEH-001",
                "acquisition_date": "2024-01-01",
                "cost": 500000000,
                "useful_life_months": 60,
                "salvage_value": 50000000,
                "depreciation_method": "straight_line",
                "asset_account_id": "acc1",
                "depreciation_expense_account_id": "acc2",
                "accumulated_depreciation_account_id": "acc3",
                "is_active": True,
                "attachments": [],
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00"
            }
        }
