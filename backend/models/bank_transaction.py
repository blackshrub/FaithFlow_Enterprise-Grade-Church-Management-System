from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from datetime import datetime, date
from decimal import Decimal
import uuid


class BankTransactionBase(BaseModel):
    """Base model for Bank Transaction"""
    bank_account_id: str = Field(..., description="Bank account ID")
    transaction_date: date = Field(..., description="Transaction date")
    description: str = Field(..., min_length=1, max_length=500, description="Transaction description")
    amount: Decimal = Field(..., description="Transaction amount")
    type: Literal["debit", "credit"] = Field(..., description="Transaction type")
    balance: Decimal = Field(..., description="Balance after transaction")

    @field_validator('transaction_date')
    @classmethod
    def validate_date(cls, v: date) -> date:
        """Validate transaction date is not in the future"""
        if v > date.today():
            raise ValueError("Transaction date cannot be in the future")
        return v


class BankTransactionCreate(BankTransactionBase):
    """Model for creating a new bank transaction"""
    church_id: str = Field(..., description="Church ID")


class BankTransactionUpdate(BaseModel):
    """Model for updating a bank transaction"""
    description: Optional[str] = Field(None, min_length=1, max_length=500)


class BankTransaction(BankTransactionBase):
    """Full Bank Transaction model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique ID")
    church_id: str = Field(..., description="Church ID")
    is_reconciled: bool = Field(default=False, description="Reconciliation status")
    matched_journal_id: Optional[str] = Field(None, description="Matched journal ID")
    reconciled_at: Optional[datetime] = Field(None, description="Reconciliation timestamp")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    attachments: list[str] = Field(default_factory=list, description="File attachment IDs")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "church_id": "church123",
                "bank_account_id": "bank123",
                "transaction_date": "2024-01-15",
                "description": "Payment from donor",
                "amount": 1000000,
                "type": "credit",
                "balance": 10000000,
                "is_reconciled": False,
                "matched_journal_id": None,
                "reconciled_at": None,
                "attachments": [],
                "created_at": "2024-01-15T10:00:00",
                "updated_at": "2024-01-15T10:00:00"
            }
        }
