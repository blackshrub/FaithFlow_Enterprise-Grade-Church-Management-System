from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from datetime import datetime
from decimal import Decimal
import uuid


class AccountType(str):
    """Account type enum"""
    ASSET = "Asset"
    LIABILITY = "Liability"
    EQUITY = "Equity"
    INCOME = "Income"
    EXPENSE = "Expense"


class NormalBalance(str):
    """Normal balance enum"""
    DEBIT = "Debit"
    CREDIT = "Credit"


class ChartOfAccountBase(BaseModel):
    """Base model for Chart of Accounts"""
    code: str = Field(..., min_length=1, max_length=50, description="Account code")
    name: str = Field(..., min_length=1, max_length=200, description="Account name")
    description: Optional[str] = Field(None, max_length=500)
    account_type: Literal["Asset", "Liability", "Equity", "Income", "Expense"] = Field(..., description="Account type")
    normal_balance: Literal["Debit", "Credit"] = Field(..., description="Normal balance type")
    parent_id: Optional[str] = Field(None, description="Parent account ID for hierarchy")
    level: int = Field(default=0, ge=0, description="Hierarchy level (0=root)")
    is_active: bool = Field(default=True, description="Active status")
    tags: List[str] = Field(default_factory=list, description="Tags for categorization")
    default_responsibility_center_id: Optional[str] = Field(None, description="Default responsibility center")

    @field_validator('code')
    @classmethod
    def validate_code(cls, v: str) -> str:
        """Validate account code format"""
        if not v or not v.strip():
            raise ValueError("Account code cannot be empty")
        return v.strip().upper()


class ChartOfAccountCreate(ChartOfAccountBase):
    """Model for creating a new account"""
    church_id: str = Field(..., description="Church ID")


class ChartOfAccountUpdate(BaseModel):
    """Model for updating an account"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=500)
    # These fields are protected if account is used in journals
    account_type: Optional[Literal["Asset", "Liability", "Equity", "Income", "Expense"]] = None
    normal_balance: Optional[Literal["Debit", "Credit"]] = None
    parent_id: Optional[str] = None
    is_active: Optional[bool] = None
    tags: Optional[List[str]] = None
    default_responsibility_center_id: Optional[str] = None


class ChartOfAccount(ChartOfAccountBase):
    """Full Chart of Account model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique ID")
    church_id: str = Field(..., description="Church ID")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "church_id": "church123",
                "code": "1100",
                "name": "Kas",
                "description": "Cash on hand",
                "account_type": "Asset",
                "normal_balance": "Debit",
                "parent_id": None,
                "level": 0,
                "is_active": True,
                "tags": ["cash", "current-asset"],
                "default_responsibility_center_id": None,
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00"
            }
        }


class ChartOfAccountTreeNode(ChartOfAccount):
    """COA with children for tree structure"""
    children: List['ChartOfAccountTreeNode'] = Field(default_factory=list)
