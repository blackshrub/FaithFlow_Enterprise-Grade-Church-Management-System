"""
iPaymu Payment Provider Implementation.

Indonesian payment gateway supporting VA, QRIS, e-wallets, and credit cards.
Reference: https://ipaymu.com/en/api-documentation/
"""

import hashlib
import hmac
import json
import logging
from typing import Dict, List
from datetime import datetime, timedelta
import httpx
from decimal import Decimal

from .base import (
    PaymentProvider,
    PaymentResult,
    PaymentStatusResult,
    PaymentMethod,
    PaymentStatus,
)

logger = logging.getLogger(__name__)


class IPaymuProvider(PaymentProvider):
    """iPaymu payment gateway provider."""

    def __init__(
        self,
        va_number: str,
        api_key: str,
        environment: str = "production",
    ):
        """
        Initialize iPaymu provider.

        Args:
            va_number: iPaymu Virtual Account number
            api_key: iPaymu API key
            environment: "production" or "sandbox"
        """
        self.va_number = va_number
        self.api_key = api_key

        # Base URLs
        if environment == "production":
            self.base_url = "https://my.ipaymu.com/api/v2"
        else:
            self.base_url = "https://sandbox.ipaymu.com/api/v2"

        self.timeout = 30.0

        # Payment method mapping
        self._method_map = {
            PaymentMethod.VIRTUAL_ACCOUNT: "va",
            PaymentMethod.BANK_TRANSFER: "va",
            PaymentMethod.QRIS: "qris",
            PaymentMethod.CREDIT_CARD: "cc",
            PaymentMethod.GOPAY: "gopay",
            PaymentMethod.OVO: "ovo",
            PaymentMethod.DANA: "dana",
        }

    @property
    def provider_name(self) -> str:
        """Provider name identifier."""
        return "ipaymu"

    def _generate_signature(self, body: Dict, method: str = "POST") -> str:
        """
        Generate HMAC SHA256 signature for iPaymu API.

        Correct implementation based on official Python SDK:
        1. Convert body to compact JSON
        2. Hash the JSON with SHA256
        3. Create string: METHOD:VA:HASH:APIKEY
        4. HMAC SHA256 of that string

        Args:
            body: Request body dict
            method: HTTP method

        Returns:
            HMAC signature string
        """
        # Convert body to JSON string (compact format)
        body_string = json.dumps(body, separators=(",", ":"))

        # Hash the body with SHA256
        encrypt_body = hashlib.sha256(body_string.encode()).hexdigest()

        # Create string to sign: METHOD:VA:HASH:APIKEY
        string_to_sign = (
            f"{method.upper()}:{self.va_number}:{encrypt_body}:{self.api_key}"
        )

        # Generate HMAC SHA256
        signature = (
            hmac.new(
                self.api_key.encode("utf-8"),
                string_to_sign.encode("utf-8"),
                hashlib.sha256,
            )
            .hexdigest()
            .lower()
        )

        return signature

    def _get_headers(self, body: Dict, method: str = "POST") -> Dict:
        """
        Get required headers for iPaymu API request.

        Args:
            body: Request body
            method: HTTP method

        Returns:
            Headers dict
        """
        signature = self._generate_signature(body, method)

        # Timestamp format: YYYYMMDDHHmmss (based on official SDK)
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")

        return {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "signature": signature,
            "va": self.va_number,
            "timestamp": timestamp,
        }

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
        Create payment transaction with iPaymu.

        Args:
            transaction_id: Our transaction ID (reference)
            customer_name: Customer name
            customer_phone: Customer phone
            customer_email: Customer email
            amount: Amount in IDR
            payment_method: Payment method enum
            description: Payment description
            notify_url: Callback URL for payment notification
            return_url: Success return URL
            cancel_url: Cancel return URL
            expired_duration: Expiry time in hours

        Returns:
            PaymentResult with payment details or error
        """
        try:
            # Map payment method to iPaymu code
            ipaymu_payment_code = self._method_map.get(payment_method, "va")

            # Calculate expiry
            expired_at = datetime.utcnow() + timedelta(hours=expired_duration)

            # Build request body (based on official SDK format)
            body = {
                "name": customer_name,
                "phone": customer_phone,
                "email": customer_email,
                "amount": int(amount),
                "notifyUrl": notify_url,
                "returnUrl": return_url,
                "cancelUrl": cancel_url,
                "comments": description,
                "referenceId": transaction_id,
                "paymentMethod": ipaymu_payment_code,
                "paymentChannel": (
                    "bag" if ipaymu_payment_code == "va" else None
                ),  # bag = all banks
            }

            # Remove None values
            body = {k: v for k, v in body.items() if v is not None}

            # Get headers with signature
            headers = self._get_headers(body)

            # Make API request
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/payment/direct", json=body, headers=headers
                )

                response_data = response.json()

                if response.status_code == 200 and response_data.get("Status") == 200:
                    # Success
                    data = response_data.get("Data", {})

                    logger.info(f"iPaymu payment created: {transaction_id}")
                    return PaymentResult(
                        success=True,
                        transaction_id=data.get("TransactionId"),
                        session_id=data.get("SessionID"),
                        payment_url=data.get("Url"),
                        va_number=data.get("Via"),  # VA number if VA method
                        qr_string=data.get("QRString"),  # QR string if QRIS
                        amount=amount,
                        expired_at=expired_at,
                        payment_method=payment_method.value,
                    )

                else:
                    # Error
                    error_msg = response_data.get("Message", "Unknown error")
                    logger.error(f"iPaymu payment creation failed: {error_msg}")
                    return PaymentResult(success=False, error_message=error_msg)

        except httpx.TimeoutException:
            logger.error("iPaymu API timeout")
            return PaymentResult(
                success=False,
                error_message="Payment gateway timeout. Please try again.",
            )

        except httpx.HTTPError as e:
            logger.error(f"iPaymu HTTP error: {e}")
            return PaymentResult(
                success=False, error_message="Payment gateway connection error."
            )

        except Exception as e:
            logger.error(f"iPaymu unexpected error: {e}")
            return PaymentResult(success=False, error_message="Unexpected error occurred.")

    async def check_transaction_status(
        self, provider_transaction_id: str
    ) -> PaymentStatusResult:
        """
        Check transaction status from iPaymu.

        Args:
            provider_transaction_id: iPaymu transaction ID

        Returns:
            PaymentStatusResult with current status
        """
        try:
            body = {"transactionId": provider_transaction_id}

            headers = self._get_headers(body)

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/transaction", json=body, headers=headers
                )

                response_data = response.json()

                if response.status_code == 200 and response_data.get("Status") == 200:
                    data = response_data.get("Data", {})

                    # Map iPaymu status to our enum
                    status_map = {
                        "0": PaymentStatus.PENDING,
                        "1": PaymentStatus.SUCCESS,
                        "-1": PaymentStatus.FAILED,
                        "2": PaymentStatus.EXPIRED,
                    }

                    status = status_map.get(
                        str(data.get("Status")), PaymentStatus.PENDING
                    )

                    return PaymentStatusResult(
                        success=True,
                        transaction_id=data.get("TransactionId"),
                        reference_id=data.get("ReferenceId"),
                        status=status,
                        status_description=data.get("StatusDesc"),
                        amount=Decimal(str(data.get("Amount", 0))),
                        payment_method=data.get("Via"),
                        paid_at=data.get("PaidDate"),
                    )

                else:
                    error_msg = response_data.get("Message", "Unknown error")
                    logger.error(f"iPaymu status check failed: {error_msg}")
                    return PaymentStatusResult(success=False, error_message=error_msg)

        except Exception as e:
            logger.error(f"iPaymu status check error: {e}")
            return PaymentStatusResult(success=False, error_message=str(e))

    def verify_webhook_signature(self, payload: Dict, signature: str) -> bool:
        """
        Verify iPaymu callback signature.

        Args:
            payload: Callback payload
            signature: Signature from callback header

        Returns:
            True if signature is valid
        """
        try:
            # Create string to verify
            # Format: POST + VA + BODY + APIKEY
            body_string = json.dumps(payload, separators=(",", ":"))
            string_to_verify = f"POST{self.va_number}{body_string}{self.api_key}"

            # Generate signature
            expected_signature = hmac.new(
                self.api_key.encode("utf-8"),
                string_to_verify.encode("utf-8"),
                hashlib.sha256,
            ).hexdigest()

            # Compare
            return hmac.compare_digest(signature, expected_signature)

        except Exception as e:
            logger.error(f"iPaymu signature verification error: {e}")
            return False

    def parse_webhook_payload(self, payload: Dict) -> Dict:
        """
        Parse iPaymu webhook payload into standardized format.

        Args:
            payload: Raw iPaymu webhook payload

        Returns:
            Standardized dict with payment status update
        """
        # Map iPaymu status codes to our enum
        status_map = {
            "0": PaymentStatus.PENDING,
            "1": PaymentStatus.SUCCESS,
            "-1": PaymentStatus.FAILED,
            "2": PaymentStatus.EXPIRED,
        }

        ipaymu_status = str(payload.get("status", "0"))
        status = status_map.get(ipaymu_status, PaymentStatus.PENDING)

        return {
            "reference_id": payload.get("reference_id"),
            "provider_transaction_id": payload.get("trx_id"),
            "session_id": payload.get("sid"),
            "status": status,
            "status_description": payload.get("status_desc"),
            "amount": Decimal(str(payload.get("amount", 0))),
            "payment_method": payload.get("via"),
            "payment_channel": payload.get("channel"),
            "customer_name": payload.get("buyer_name"),
            "customer_phone": payload.get("buyer_phone"),
            "customer_email": payload.get("buyer_email"),
        }

    def get_payment_instructions(
        self, payment_method: PaymentMethod, language: str = "id"
    ) -> str:
        """
        Get payment instructions for customer.

        Args:
            payment_method: Payment method
            language: Language code (id/en)

        Returns:
            Localized payment instructions
        """
        instructions_id = {
            PaymentMethod.VIRTUAL_ACCOUNT: (
                "1. Copy nomor Virtual Account\n"
                "2. Buka aplikasi mobile banking atau ATM\n"
                "3. Pilih menu Transfer/Bayar\n"
                "4. Masukkan nomor Virtual Account\n"
                "5. Konfirmasi pembayaran\n"
                "6. Simpan bukti transfer"
            ),
            PaymentMethod.BANK_TRANSFER: (
                "1. Copy nomor Virtual Account\n"
                "2. Buka aplikasi mobile banking atau ATM\n"
                "3. Pilih menu Transfer/Bayar\n"
                "4. Masukkan nomor Virtual Account\n"
                "5. Konfirmasi pembayaran\n"
                "6. Simpan bukti transfer"
            ),
            PaymentMethod.QRIS: (
                "1. Buka aplikasi e-wallet Anda (GoPay, OVO, Dana, dll)\n"
                "2. Pilih menu Scan QR\n"
                "3. Scan QR code yang ditampilkan\n"
                "4. Konfirmasi pembayaran\n"
                "5. Pembayaran selesai"
            ),
            PaymentMethod.GOPAY: (
                "1. Anda akan diarahkan ke aplikasi GoPay\n"
                "2. Konfirmasi pembayaran\n"
                "3. Masukkan PIN GoPay\n"
                "4. Pembayaran selesai"
            ),
            PaymentMethod.OVO: (
                "1. Anda akan menerima notifikasi push dari OVO\n"
                "2. Buka aplikasi OVO\n"
                "3. Konfirmasi pembayaran\n"
                "4. Masukkan PIN OVO\n"
                "5. Pembayaran selesai"
            ),
            PaymentMethod.DANA: (
                "1. Anda akan diarahkan ke aplikasi DANA\n"
                "2. Konfirmasi pembayaran\n"
                "3. Masukkan PIN DANA\n"
                "4. Pembayaran selesai"
            ),
            PaymentMethod.CREDIT_CARD: (
                "1. Masukkan informasi kartu kredit\n"
                "2. Masukkan kode OTP dari bank\n"
                "3. Konfirmasi pembayaran\n"
                "4. Pembayaran selesai"
            ),
        }

        instructions_en = {
            PaymentMethod.VIRTUAL_ACCOUNT: (
                "1. Copy the Virtual Account number\n"
                "2. Open your mobile banking app or ATM\n"
                "3. Select Transfer/Payment menu\n"
                "4. Enter the Virtual Account number\n"
                "5. Confirm payment\n"
                "6. Save the receipt"
            ),
            PaymentMethod.BANK_TRANSFER: (
                "1. Copy the Virtual Account number\n"
                "2. Open your mobile banking app or ATM\n"
                "3. Select Transfer/Payment menu\n"
                "4. Enter the Virtual Account number\n"
                "5. Confirm payment\n"
                "6. Save the receipt"
            ),
            PaymentMethod.QRIS: (
                "1. Open your e-wallet app (GoPay, OVO, Dana, etc.)\n"
                "2. Select Scan QR menu\n"
                "3. Scan the displayed QR code\n"
                "4. Confirm payment\n"
                "5. Payment completed"
            ),
            PaymentMethod.GOPAY: (
                "1. You will be redirected to GoPay app\n"
                "2. Confirm payment\n"
                "3. Enter your GoPay PIN\n"
                "4. Payment completed"
            ),
            PaymentMethod.OVO: (
                "1. You will receive a push notification from OVO\n"
                "2. Open OVO app\n"
                "3. Confirm payment\n"
                "4. Enter your OVO PIN\n"
                "5. Payment completed"
            ),
            PaymentMethod.DANA: (
                "1. You will be redirected to DANA app\n"
                "2. Confirm payment\n"
                "3. Enter your DANA PIN\n"
                "4. Payment completed"
            ),
            PaymentMethod.CREDIT_CARD: (
                "1. Enter your credit card information\n"
                "2. Enter OTP code from your bank\n"
                "3. Confirm payment\n"
                "4. Payment completed"
            ),
        }

        instructions = instructions_id if language == "id" else instructions_en

        return instructions.get(
            payment_method,
            "Ikuti instruksi pembayaran yang ditampilkan."
            if language == "id"
            else "Follow the displayed payment instructions.",
        )

    def get_supported_methods(self) -> List[PaymentMethod]:
        """
        Get list of payment methods supported by iPaymu.

        Returns:
            List of supported PaymentMethod enums
        """
        return [
            PaymentMethod.VIRTUAL_ACCOUNT,
            PaymentMethod.BANK_TRANSFER,
            PaymentMethod.QRIS,
            PaymentMethod.CREDIT_CARD,
            PaymentMethod.GOPAY,
            PaymentMethod.OVO,
            PaymentMethod.DANA,
        ]
