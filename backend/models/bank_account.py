from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
import uuid


class BankAccountBase(BaseModel):
    """Base model for Bank Account"""
    name: str = Field(..., min_length=1, max_length=200, description="Account name")
    bank_name: str = Field(..., min_length=1, max_length=200, description="Bank name")
    account_number: str = Field(..., min_length=1, max_length=50, description="Account number")
    linked_coa_id: str = Field(..., description="Linked Chart of Account ID")
    is_active: bool = Field(default=True, description="Active status")

    @field_validator('account_number')
    @classmethod
    def validate_account_number(cls, v: str) -> str:
        """Validate account number"""
        if not v or not v.strip():
            raise ValueError("Account number cannot be empty")
        return v.strip()


class BankAccountCreate(BankAccountBase):
    """Model for creating a new bank account"""
    church_id: str = Field(..., description="Church ID")


class BankAccountUpdate(BaseModel):
    """Model for updating a bank account"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    bank_name: Optional[str] = Field(None, min_length=1, max_length=200)
    linked_coa_id: Optional[str] = None
    is_active: Optional[bool] = None


class BankAccount(BankAccountBase):
    """Full Bank Account model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique ID")
    church_id: str = Field(..., description="Church ID")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "church_id": "church123",
                "name": "Main Operating Account",
                "bank_name": "Bank BCA",
                "account_number": "1234567890",
                "linked_coa_id": "coa123",
                "is_active": True,
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00"
            }
        }
