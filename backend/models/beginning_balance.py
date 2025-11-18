from pydantic import BaseModel, Field, model_validator
from typing import Optional, Literal
from datetime import datetime, date
from decimal import Decimal
import uuid


class BeginningBalanceEntry(BaseModel):
    """Individual entry in beginning balance"""
    account_id: str = Field(..., description="Chart of Account ID")
    amount: Decimal = Field(..., ge=0, description="Balance amount")
    balance_type: Literal["debit", "credit"] = Field(..., description="Balance type")


class BeginningBalanceBase(BaseModel):
    """Base model for Beginning Balance"""
    effective_date: date = Field(..., description="Effective date of beginning balance")
    entries: List[BeginningBalanceEntry] = Field(..., min_length=1, description="Balance entries")

    @model_validator(mode='after')
    def validate_balanced(self):
        """Validate that total debits equal total credits"""
        total_debit = sum(
            entry.amount for entry in self.entries if entry.balance_type == "debit"
        )
        total_credit = sum(
            entry.amount for entry in self.entries if entry.balance_type == "credit"
        )
        
        if total_debit != total_credit:
            raise ValueError(
                f"Beginning balance is not balanced: Debit {total_debit} != Credit {total_credit}"
            )
        
        return self


class BeginningBalanceCreate(BeginningBalanceBase):
    """Model for creating beginning balance"""
    church_id: str = Field(..., description="Church ID")
    created_by: str = Field(..., description="User ID who created")


class BeginningBalanceUpdate(BaseModel):
    """Model for updating beginning balance (only if draft)"""
    effective_date: Optional[date] = None
    entries: Optional[List[BeginningBalanceEntry]] = Field(None, min_length=1)


class BeginningBalance(BeginningBalanceBase):
    """Full Beginning Balance model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique ID")
    church_id: str = Field(..., description="Church ID")
    total_debit: Decimal = Field(default=Decimal('0'), description="Total debit")
    total_credit: Decimal = Field(default=Decimal('0'), description="Total credit")
    is_balanced: bool = Field(default=True, description="Balance status")
    journal_id: Optional[str] = Field(None, description="Generated journal ID")
    status: Literal["draft", "posted"] = Field(default="draft", description="Status")
    created_by: str = Field(..., description="User ID who created")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    def calculate_totals(self):
        """Calculate total debit and credit"""
        self.total_debit = sum(
            entry.amount for entry in self.entries if entry.balance_type == "debit"
        )
        self.total_credit = sum(
            entry.amount for entry in self.entries if entry.balance_type == "credit"
        )
        self.is_balanced = (self.total_debit == self.total_credit)
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "church_id": "church123",
                "effective_date": "2024-01-01",
                "entries": [
                    {
                        "account_id": "acc1",
                        "amount": 10000000,
                        "balance_type": "debit"
                    },
                    {
                        "account_id": "acc2",
                        "amount": 10000000,
                        "balance_type": "credit"
                    }
                ],
                "total_debit": 10000000,
                "total_credit": 10000000,
                "is_balanced": True,
                "journal_id": None,
                "status": "draft",
                "created_by": "user123",
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00"
            }
        }
