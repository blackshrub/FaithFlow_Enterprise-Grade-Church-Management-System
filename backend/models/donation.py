from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal
from datetime import datetime, timezone
import uuid
from decimal import Decimal


class DonationBase(BaseModel):
    member_id: str
    amount: float = Field(..., gt=0)
    donation_type: Optional[str] = Field(None, description="e.g., Tithe, Offering, Building Fund")
    payment_method: Literal['cash', 'bank_transfer', 'online', 'other'] = 'cash'
    transaction_id: Optional[str] = None
    notes: Optional[str] = None
    donation_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DonationCreate(DonationBase):
    church_id: str


class DonationUpdate(BaseModel):
    member_id: Optional[str] = None
    amount: Optional[float] = Field(None, gt=0)
    donation_type: Optional[str] = None
    payment_method: Optional[Literal['cash', 'bank_transfer', 'online', 'other']] = None
    transaction_id: Optional[str] = None
    notes: Optional[str] = None
    donation_date: Optional[datetime] = None


class Donation(DonationBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: str
    receipt_generated: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
