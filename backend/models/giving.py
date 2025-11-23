"""
Giving/Offering Models for FaithFlow.

Handles member donations, offerings, and payment tracking.
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Literal
from datetime import datetime
from decimal import Decimal


class GivingFund(BaseModel):
    """Giving fund/purpose (e.g., General Offering, Mission, Building)."""
    id: str
    church_id: str
    name: str
    name_id: Optional[str] = None  # Indonesian translation
    description: Optional[str] = None
    description_id: Optional[str] = None
    is_active: bool = True
    display_order: int = 1
    icon: Optional[str] = None  # Icon name for mobile UI
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class GivingFundCreate(BaseModel):
    """Create new giving fund."""
    name: str = Field(..., min_length=1, max_length=100)
    name_id: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    description_id: Optional[str] = Field(None, max_length=500)
    is_active: bool = True
    display_order: int = 1
    icon: Optional[str] = None


class GivingFundUpdate(BaseModel):
    """Update giving fund."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    name_id: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    description_id: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None
    display_order: Optional[int] = None
    icon: Optional[str] = None


class GivingTransaction(BaseModel):
    """Giving transaction record."""
    id: str
    church_id: str
    member_id: str
    member_name: str
    member_phone: str
    fund_id: str
    fund_name: str

    # Amount
    amount: Decimal = Field(..., ge=0)
    currency: str = "IDR"

    # Payment
    payment_method: Literal[
        "bank_transfer", "virtual_account", "qris",
        "credit_card", "gopay", "ovo", "dana", "cash"
    ]
    payment_status: Literal[
        "pending", "processing", "success", "failed", "expired", "cancelled"
    ] = "pending"

    # iPaymu integration
    ipaymu_transaction_id: Optional[str] = None
    ipaymu_session_id: Optional[str] = None
    ipaymu_payment_url: Optional[str] = None
    ipaymu_va_number: Optional[str] = None
    ipaymu_qr_string: Optional[str] = None

    # Transaction metadata
    notes: Optional[str] = None
    is_anonymous: bool = False

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    paid_at: Optional[datetime] = None
    expired_at: Optional[datetime] = None

    # Audit
    created_by: str = "member"
    ip_address: Optional[str] = None


class GivingTransactionCreate(BaseModel):
    """Create new giving transaction (member-initiated)."""
    fund_id: str = Field(..., description="Fund/purpose ID")
    amount: Decimal = Field(..., ge=10000, description="Amount in IDR (minimum Rp10,000)")
    payment_method: Literal[
        "bank_transfer", "virtual_account", "qris",
        "credit_card", "gopay", "ovo", "dana"
    ]
    notes: Optional[str] = Field(None, max_length=500)
    is_anonymous: bool = False

    @validator('amount')
    def validate_amount(cls, v):
        """Validate amount is at least Rp10,000."""
        if v < 10000:
            raise ValueError("Minimum giving amount is Rp10,000")
        return v


class GivingPaymentIntentResponse(BaseModel):
    """Response from payment intent creation."""
    transaction_id: str
    payment_url: Optional[str] = None
    va_number: Optional[str] = None
    qr_string: Optional[str] = None
    amount: Decimal
    expired_at: datetime
    payment_method: str
    instructions: Optional[str] = None


class GivingTransactionResponse(BaseModel):
    """Giving transaction response for API."""
    id: str
    fund_name: str
    amount: Decimal
    currency: str
    payment_method: str
    payment_status: str
    notes: Optional[str]
    is_anonymous: bool
    created_at: datetime
    paid_at: Optional[datetime]

    # Payment details (if available)
    payment_url: Optional[str] = None
    va_number: Optional[str] = None
    qr_string: Optional[str] = None


class GivingHistoryResponse(BaseModel):
    """Giving history for member."""
    transactions: List[GivingTransactionResponse]
    total_count: int
    total_amount: Decimal
    currency: str = "IDR"


class IPaymuCallback(BaseModel):
    """iPaymu payment callback/notification."""
    trx_id: str  # iPaymu transaction ID
    sid: str  # Session ID
    status: str  # Status code
    status_desc: str  # Status description
    amount: str  # Amount paid
    via: Optional[str] = None  # Payment method
    channel: Optional[str] = None  # Payment channel
    buyer_name: Optional[str] = None
    buyer_phone: Optional[str] = None
    buyer_email: Optional[str] = None
    reference_id: Optional[str] = None  # Our transaction ID


class ManualBankAccount(BaseModel):
    """Manual bank account for offline giving."""
    bank_name: str
    account_number: str
    account_holder: str
    branch: Optional[str] = None


class GivingConfig(BaseModel):
    """Giving configuration for mobile app."""
    online_enabled: bool
    provider: Optional[str] = None
    supported_methods: List[str] = []
    manual_bank_accounts: List[ManualBankAccount] = []
    currency: str = "IDR"
    minimum_amount: Decimal = Field(default=Decimal("10000"), description="Minimum giving amount")
