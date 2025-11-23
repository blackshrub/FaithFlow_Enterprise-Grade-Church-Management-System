"""
iPaymu Payment Gateway Integration Service.

Handles payment creation, status checking, and callback verification.
Reference: https://ipaymu.com/en/api-documentation/
"""

import hashlib
import hmac
import json
import logging
from typing import Dict, Optional, Tuple
from datetime import datetime, timedelta
import httpx
from decimal import Decimal

from models.giving import GivingTransactionCreate

logger = logging.getLogger(__name__)


class IPaymuService:
    """iPaymu payment gateway service."""

    def __init__(
        self,
        va_number: str,
        api_key: str,
        environment: str = "production"
    ):
        """
        Initialize iPaymu service.

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

    def _generate_signature(
        self,
        body: Dict,
        method: str = "POST"
    ) -> str:
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
        body_string = json.dumps(body, separators=(',', ':'))

        # Hash the body with SHA256
        encrypt_body = hashlib.sha256(body_string.encode()).hexdigest()

        # Create string to sign: METHOD:VA:HASH:APIKEY
        string_to_sign = f"{method.upper()}:{self.va_number}:{encrypt_body}:{self.api_key}"

        # Generate HMAC SHA256
        signature = hmac.new(
            self.api_key.encode('utf-8'),
            string_to_sign.encode('utf-8'),
            hashlib.sha256
        ).hexdigest().lower()

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
        timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')

        return {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "signature": signature,
            "va": self.va_number,
            "timestamp": timestamp
        }

    async def create_payment(
        self,
        transaction_id: str,
        member_name: str,
        member_phone: str,
        member_email: str,
        amount: Decimal,
        payment_method: str,
        fund_name: str,
        notify_url: str,
        return_url: str,
        cancel_url: str,
        expired_duration: int = 24  # hours
    ) -> Tuple[bool, Optional[Dict], Optional[str]]:
        """
        Create payment transaction with iPaymu.

        Args:
            transaction_id: Our transaction ID (reference)
            member_name: Member name
            member_phone: Member phone
            member_email: Member email
            amount: Amount in IDR
            payment_method: Payment method code
            fund_name: Giving fund name (product description)
            notify_url: Callback URL for payment notification
            return_url: Success return URL
            cancel_url: Cancel return URL
            expired_duration: Expiry time in hours

        Returns:
            Tuple of (success, response_data, error_message)
        """
        try:
            # Map our payment methods to iPaymu codes
            payment_code_map = {
                "virtual_account": "va",
                "qris": "qris",
                "credit_card": "cc",
                "gopay": "gopay",
                "ovo": "ovo",
                "dana": "dana",
                "bank_transfer": "va"
            }

            ipaymu_payment_code = payment_code_map.get(payment_method, "va")

            # Calculate expiry
            expired_at = datetime.utcnow() + timedelta(hours=expired_duration)

            # Build request body (based on official SDK format)
            body = {
                "name": member_name,
                "phone": member_phone,
                "email": member_email,
                "amount": int(amount),
                "notifyUrl": notify_url,
                "returnUrl": return_url,
                "cancelUrl": cancel_url,
                "comments": fund_name,
                "referenceId": transaction_id,
                "paymentMethod": ipaymu_payment_code,
                "paymentChannel": "bag" if ipaymu_payment_code == "va" else None  # bag = all banks
            }

            # Remove None values
            body = {k: v for k, v in body.items() if v is not None}

            # Get headers with signature
            headers = self._get_headers(body)

            # Make API request
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/payment/direct",
                    json=body,
                    headers=headers
                )

                response_data = response.json()

                if response.status_code == 200 and response_data.get("Status") == 200:
                    # Success
                    data = response_data.get("Data", {})

                    result = {
                        "transaction_id": data.get("TransactionId"),
                        "session_id": data.get("SessionID"),
                        "payment_url": data.get("Url"),
                        "va_number": data.get("Via"),  # VA number if VA method
                        "qr_string": data.get("QRString"),  # QR string if QRIS
                        "amount": amount,
                        "expired_at": expired_at,
                        "payment_method": payment_method
                    }

                    logger.info(f"Payment created successfully: {transaction_id}")
                    return True, result, None

                else:
                    # Error
                    error_msg = response_data.get("Message", "Unknown error")
                    logger.error(f"iPaymu payment creation failed: {error_msg}")
                    return False, None, error_msg

        except httpx.TimeoutException:
            logger.error("iPaymu API timeout")
            return False, None, "Payment gateway timeout. Please try again."

        except httpx.HTTPError as e:
            logger.error(f"iPaymu HTTP error: {e}")
            return False, None, "Payment gateway connection error."

        except Exception as e:
            logger.error(f"iPaymu unexpected error: {e}")
            return False, None, "Unexpected error occurred."

    async def check_transaction_status(
        self,
        ipaymu_transaction_id: str
    ) -> Tuple[bool, Optional[Dict], Optional[str]]:
        """
        Check transaction status from iPaymu.

        Args:
            ipaymu_transaction_id: iPaymu transaction ID

        Returns:
            Tuple of (success, status_data, error_message)
        """
        try:
            body = {
                "transactionId": ipaymu_transaction_id
            }

            headers = self._get_headers(body)

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/transaction",
                    json=body,
                    headers=headers
                )

                response_data = response.json()

                if response.status_code == 200 and response_data.get("Status") == 200:
                    data = response_data.get("Data", {})

                    result = {
                        "transaction_id": data.get("TransactionId"),
                        "session_id": data.get("SessionID"),
                        "reference_id": data.get("ReferenceId"),
                        "status": data.get("Status"),
                        "status_desc": data.get("StatusDesc"),
                        "amount": data.get("Amount"),
                        "payment_method": data.get("Via"),
                        "paid_at": data.get("PaidDate")
                    }

                    return True, result, None

                else:
                    error_msg = response_data.get("Message", "Unknown error")
                    logger.error(f"Transaction status check failed: {error_msg}")
                    return False, None, error_msg

        except Exception as e:
            logger.error(f"Transaction status check error: {e}")
            return False, None, str(e)

    def verify_callback_signature(
        self,
        callback_data: Dict,
        signature: str
    ) -> bool:
        """
        Verify iPaymu callback signature.

        Args:
            callback_data: Callback payload
            signature: Signature from callback header

        Returns:
            True if signature is valid
        """
        try:
            # Create string to verify
            # Format: POST + VA + BODY + APIKEY
            body_string = json.dumps(callback_data, separators=(',', ':'))
            string_to_verify = f"POST{self.va_number}{body_string}{self.api_key}"

            # Generate signature
            expected_signature = hmac.new(
                self.api_key.encode('utf-8'),
                string_to_verify.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()

            # Compare
            return hmac.compare_digest(signature, expected_signature)

        except Exception as e:
            logger.error(f"Signature verification error: {e}")
            return False

    def get_payment_instructions(self, payment_method: str) -> str:
        """
        Get payment instructions text for member.

        Args:
            payment_method: Payment method code

        Returns:
            Instructions text
        """
        instructions = {
            "virtual_account": (
                "1. Copy nomor Virtual Account\n"
                "2. Buka aplikasi mobile banking atau ATM\n"
                "3. Pilih menu Transfer/Bayar\n"
                "4. Masukkan nomor Virtual Account\n"
                "5. Konfirmasi pembayaran\n"
                "6. Simpan bukti transfer"
            ),
            "qris": (
                "1. Buka aplikasi e-wallet Anda (GoPay, OVO, Dana, dll)\n"
                "2. Pilih menu Scan QR\n"
                "3. Scan QR code yang ditampilkan\n"
                "4. Konfirmasi pembayaran\n"
                "5. Pembayaran selesai"
            ),
            "gopay": (
                "1. Anda akan diarahkan ke aplikasi GoPay\n"
                "2. Konfirmasi pembayaran\n"
                "3. Masukkan PIN GoPay\n"
                "4. Pembayaran selesai"
            ),
            "ovo": (
                "1. Anda akan menerima notifikasi push dari OVO\n"
                "2. Buka aplikasi OVO\n"
                "3. Konfirmasi pembayaran\n"
                "4. Masukkan PIN OVO\n"
                "5. Pembayaran selesai"
            ),
            "dana": (
                "1. Anda akan diarahkan ke aplikasi DANA\n"
                "2. Konfirmasi pembayaran\n"
                "3. Masukkan PIN DANA\n"
                "4. Pembayaran selesai"
            ),
            "credit_card": (
                "1. Masukkan informasi kartu kredit\n"
                "2. Masukkan kode OTP dari bank\n"
                "3. Konfirmasi pembayaran\n"
                "4. Pembayaran selesai"
            )
        }

        return instructions.get(payment_method, "Ikuti instruksi pembayaran yang ditampilkan.")


# Singleton instance (will be initialized in main.py with config)
ipaymu_service: Optional[IPaymuService] = None


def get_ipaymu_service() -> IPaymuService:
    """Get iPaymu service instance."""
    if ipaymu_service is None:
        raise RuntimeError("iPaymu service not initialized. Check environment variables.")
    return ipaymu_service
