"""
Base Payment Provider Interface.

Defines the contract that all payment providers must implement.
"""

from abc import ABC, abstractmethod
from typing import Dict, Optional, Tuple, List
from enum import Enum
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel


class PaymentMethod(str, Enum):
    """Supported payment methods across all providers."""
    VIRTUAL_ACCOUNT = "virtual_account"
    QRIS = "qris"
    CREDIT_CARD = "credit_card"
    GOPAY = "gopay"
    OVO = "ovo"
    DANA = "dana"
    BANK_TRANSFER = "bank_transfer"


class PaymentStatus(str, Enum):
    """Payment transaction status."""
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class PaymentResult(BaseModel):
    """Result from payment creation."""
    success: bool
    transaction_id: Optional[str] = None
    session_id: Optional[str] = None
    payment_url: Optional[str] = None
    va_number: Optional[str] = None
    qr_string: Optional[str] = None
    amount: Optional[Decimal] = None
    expired_at: Optional[datetime] = None
    payment_method: Optional[str] = None
    error_message: Optional[str] = None


class PaymentStatusResult(BaseModel):
    """Result from payment status check."""
    success: bool
    transaction_id: Optional[str] = None
    reference_id: Optional[str] = None
    status: Optional[PaymentStatus] = None
    status_description: Optional[str] = None
    amount: Optional[Decimal] = None
    payment_method: Optional[str] = None
    paid_at: Optional[datetime] = None
    error_message: Optional[str] = None


class PaymentProvider(ABC):
    """
    Abstract base class for payment providers.

    All payment gateway integrations must implement this interface.
    """

    @abstractmethod
    async def create_payment(
        self,
        transaction_id: str,
        customer_name: str,
        customer_phone: str,
        customer_email: str,
        amount: Decimal,
        payment_method: PaymentMethod,
        description: str,
        notify_url: str,
        return_url: str,
        cancel_url: str,
        expired_duration: int = 24,
    ) -> PaymentResult:
        """
        Create a payment transaction.

        Args:
            transaction_id: Our internal transaction ID (reference)
            customer_name: Customer name
            customer_phone: Customer phone number
            customer_email: Customer email
            amount: Payment amount
            payment_method: Payment method to use
            description: Payment description/product name
            notify_url: Webhook callback URL
            return_url: Success return URL
            cancel_url: Cancel/failure URL
            expired_duration: Payment expiry time in hours

        Returns:
            PaymentResult with payment details or error
        """
        pass

    @abstractmethod
    async def check_transaction_status(
        self,
        provider_transaction_id: str,
    ) -> PaymentStatusResult:
        """
        Check payment transaction status.

        Args:
            provider_transaction_id: Provider's transaction ID

        Returns:
            PaymentStatusResult with current status
        """
        pass

    @abstractmethod
    def verify_webhook_signature(
        self,
        payload: Dict,
        signature: str,
    ) -> bool:
        """
        Verify webhook callback signature.

        Args:
            payload: Webhook payload
            signature: Signature from webhook header

        Returns:
            True if signature is valid
        """
        pass

    @abstractmethod
    def parse_webhook_payload(
        self,
        payload: Dict,
    ) -> Dict:
        """
        Parse webhook payload into standardized format.

        Args:
            payload: Raw webhook payload

        Returns:
            Standardized dict with:
            - reference_id: Our transaction ID
            - status: Payment status
            - amount: Paid amount
            - provider_transaction_id: Provider's transaction ID
        """
        pass

    @abstractmethod
    def get_payment_instructions(
        self,
        payment_method: PaymentMethod,
        language: str = "id",
    ) -> str:
        """
        Get payment instructions for customer.

        Args:
            payment_method: Payment method
            language: Language code (id/en)

        Returns:
            Localized payment instructions
        """
        pass

    @abstractmethod
    def get_supported_methods(self) -> List[PaymentMethod]:
        """
        Get list of payment methods supported by this provider.

        Returns:
            List of supported PaymentMethod enums
        """
        pass

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Provider name identifier."""
        pass
