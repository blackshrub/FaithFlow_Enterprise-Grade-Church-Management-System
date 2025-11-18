from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, Literal, Dict
from datetime import datetime
from decimal import Decimal
import uuid


class BudgetLine(BaseModel):
    """Individual line in a budget"""
    account_id: str = Field(..., description="Chart of Account ID")
    responsibility_center_id: Optional[str] = Field(None, description="Responsibility center ID")
    annual_amount: Decimal = Field(..., ge=0, description="Annual budgeted amount")
    monthly_amounts: Dict[str, Decimal] = Field(
        default_factory=dict,
        description="Monthly amounts (keys: '01' to '12')"
    )

    @model_validator(mode='after')
    def validate_monthly_total(self):
        """Validate that monthly amounts sum to annual (if distributed)"""
        if self.monthly_amounts:
            total_monthly = sum(self.monthly_amounts.values())
            # Allow small rounding difference (0.01)
            if abs(total_monthly - self.annual_amount) > Decimal('0.01'):
                raise ValueError(
                    f"Monthly amounts ({total_monthly}) must equal annual amount ({self.annual_amount})"
                )
        return self


class BudgetBase(BaseModel):
    """Base model for Budget"""
    name: str = Field(..., min_length=1, max_length=200, description="Budget name")
    fiscal_year: int = Field(..., ge=1900, le=2100, description="Fiscal year")
    lines: list[BudgetLine] = Field(..., description="Budget lines")

    @field_validator('fiscal_year')
    @classmethod
    def validate_fiscal_year(cls, v: int) -> int:
        """Validate fiscal year range"""
        if v < 1900 or v > 2100:
            raise ValueError("Fiscal year must be between 1900 and 2100")
        return v


class BudgetCreate(BudgetBase):
    """Model for creating a new budget"""
    church_id: str = Field(..., description="Church ID")
    status: Literal["draft", "active", "closed"] = Field(default="draft", description="Budget status")


class BudgetUpdate(BaseModel):
    """Model for updating a budget"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    lines: Optional[list[BudgetLine]] = Field(None, description="Budget lines")


class Budget(BudgetBase):
    """Full Budget model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique ID")
    church_id: str = Field(..., description="Church ID")
    status: Literal["draft", "active", "closed"] = Field(default="draft", description="Budget status")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    attachments: list[str] = Field(default_factory=list, description="File attachment IDs")
    
    def distribute_monthly(self):
        """Distribute annual amounts evenly across 12 months"""
        for line in self.lines:
            if not line.monthly_amounts:
                monthly_amount = line.annual_amount / 12
                line.monthly_amounts = {
                    f"{i:02d}": monthly_amount for i in range(1, 13)
                }
    
    def validate_activation(self) -> tuple[bool, str]:
        """Validate if budget can be activated"""
        for line in self.lines:
            if line.monthly_amounts:
                total_monthly = sum(line.monthly_amounts.values())
                if abs(total_monthly - line.annual_amount) > Decimal('0.01'):
                    return False, f"Account {line.account_id}: Monthly total != Annual amount"
        return True, "OK"
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "church_id": "church123",
                "name": "Budget 2024",
                "fiscal_year": 2024,
                "status": "draft",
                "lines": [
                    {
                        "account_id": "acc1",
                        "responsibility_center_id": "rc1",
                        "annual_amount": 120000000,
                        "monthly_amounts": {
                            "01": 10000000,
                            "02": 10000000
                        }
                    }
                ],
                "attachments": [],
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00"
            }
        }
