from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, Literal, List
from datetime import datetime
from datetime import date as DateType
from decimal import Decimal
import uuid


class JournalLine(BaseModel):
    """Individual line in a journal entry"""
    account_id: str = Field(..., description="Chart of Account ID")
    description: str = Field(..., min_length=1, max_length=500, description="Line description")
    debit: Decimal = Field(default=Decimal('0'), ge=0, description="Debit amount")
    credit: Decimal = Field(default=Decimal('0'), ge=0, description="Credit amount")
    responsibility_center_id: Optional[str] = Field(None, description="Responsibility center ID")

    @model_validator(mode='after')
    def validate_debit_or_credit(self):
        """Ensure either debit or credit is non-zero, but not both"""
        if self.debit == 0 and self.credit == 0:
            raise ValueError("Either debit or credit must be non-zero")
        if self.debit > 0 and self.credit > 0:
            raise ValueError("Cannot have both debit and credit on same line")
        return self


class JournalBase(BaseModel):
    """Base model for Journal Entry"""
    date: DateType = Field(..., description="Journal date")
    reference_number: Optional[str] = Field(None, max_length=100, description="External reference number")
    description: str = Field(..., min_length=1, max_length=1000, description="Journal description")
    lines: List[JournalLine] = Field(..., description="Journal lines (minimum 2)")
    journal_type: Literal[
        "general",
        "opening_balance",
        "quick_giving",
        "quick_expense",
        "depreciation",
        "bank_reconciliation",
        "year_end_closing"
    ] = Field(default="general", description="Journal type")

    @model_validator(mode='after')
    def validate_journal_lines(self):
        """Validate journal lines"""
        # Check minimum 2 lines
        if len(self.lines) < 2:
            raise ValueError("Journal must have at least 2 lines")
        
        # Check for duplicate account IDs
        account_ids = [line.account_id for line in self.lines]
        if len(account_ids) != len(set(account_ids)):
            raise ValueError("Duplicate account IDs in journal lines")
        
        # Check if balanced
        total_debit = sum(line.debit for line in self.lines)
        total_credit = sum(line.credit for line in self.lines)
        
        if total_debit != total_credit:
            raise ValueError(f"Journal is not balanced: Debit {total_debit} != Credit {total_credit}")
        
        return self


class JournalCreate(JournalBase):
    """Model for creating a new journal"""
    church_id: str = Field(..., description="Church ID")
    status: Literal["draft", "approved"] = Field(default="draft", description="Journal status")


class JournalUpdate(BaseModel):
    """Model for updating a journal (only if draft)"""
    date: Optional[DateType] = None
    reference_number: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, min_length=1, max_length=1000)
    lines: Optional[List[JournalLine]] = Field(None, description="Journal lines")


class Journal(JournalBase):
    """Full Journal model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique ID")
    church_id: str = Field(..., description="Church ID")
    journal_number: str = Field(..., description="Auto-generated journal number")
    status: Literal["draft", "approved"] = Field(default="draft", description="Journal status")
    total_debit: Decimal = Field(default=Decimal('0'), description="Total debit amount")
    total_credit: Decimal = Field(default=Decimal('0'), description="Total credit amount")
    is_balanced: bool = Field(default=True, description="Balance status")
    approved_by: Optional[str] = Field(None, description="User ID who approved")
    approved_at: Optional[datetime] = Field(None, description="Approval timestamp")
    created_by: str = Field(..., description="User ID who created")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    attachments: List[str] = Field(default_factory=list, description="File attachment IDs")
    
    def calculate_totals(self):
        """Calculate total debit and credit"""
        self.total_debit = sum(line.debit for line in self.lines)
        self.total_credit = sum(line.credit for line in self.lines)
        self.is_balanced = (self.total_debit == self.total_credit)
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "church_id": "church123",
                "journal_number": "JRN-2024-01-0001",
                "date": "2024-01-15",
                "reference_number": "INV-001",
                "description": "Payment for electricity bill",
                "status": "approved",
                "journal_type": "general",
                "lines": [
                    {
                        "account_id": "acc1",
                        "description": "Electricity expense",
                        "debit": 1000000,
                        "credit": 0,
                        "responsibility_center_id": None
                    },
                    {
                        "account_id": "acc2",
                        "description": "Cash payment",
                        "debit": 0,
                        "credit": 1000000,
                        "responsibility_center_id": None
                    }
                ],
                "total_debit": 1000000,
                "total_credit": 1000000,
                "is_balanced": True,
                "attachments": [],
                "created_by": "user123",
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00"
            }
        }
