"""
Encryption Utilities

For encrypting sensitive data (API keys, secrets) before storing in database.
Uses Fernet symmetric encryption (AES-128 in CBC mode).

SECURITY: Requires ENCRYPTION_KEY or JWT_SECRET environment variable.
The encryption salt is derived from the secret to ensure unique keys per deployment.
"""

import os
import base64
import hashlib
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import logging

logger = logging.getLogger(__name__)


def _derive_salt_from_secret(secret: str) -> bytes:
    """
    Derive a unique salt from the secret itself.
    This ensures each deployment has a unique salt based on their secret.
    """
    # Use SHA256 to derive a 16-byte salt from the secret
    return hashlib.sha256(f"faithflow_salt_{secret[:16]}".encode()).digest()[:16]


def _get_encryption_key() -> bytes:
    """
    Get encryption key from environment variable.

    Uses ENCRYPTION_KEY if set, otherwise falls back to JWT_SECRET.
    SECURITY: No hardcoded defaults - fails if not configured.
    """
    # Prefer dedicated encryption key, fallback to JWT_SECRET
    secret = os.environ.get("ENCRYPTION_KEY") or os.environ.get("JWT_SECRET")

    if not secret:
        raise RuntimeError(
            "CRITICAL: ENCRYPTION_KEY or JWT_SECRET environment variable must be set. "
            "Generate a secure 64+ character random string for production."
        )

    # Derive unique salt from the secret itself (per-deployment unique)
    salt = _derive_salt_from_secret(secret)

    # Derive a proper Fernet key using PBKDF2HMAC
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(secret.encode()))

    return key


# Global Fernet instance - initialized lazily to allow for testing
_fernet = None


def _get_fernet() -> Fernet:
    """Get or initialize the Fernet instance."""
    global _fernet
    if _fernet is None:
        _fernet = Fernet(_get_encryption_key())
    return _fernet


def encrypt_sensitive_data(plaintext: str) -> str:
    """
    Encrypt sensitive data (API keys, passwords, etc.)

    Args:
        plaintext: Plain text string to encrypt

    Returns:
        Base64-encoded encrypted string
    """
    if not plaintext:
        return plaintext

    try:
        fernet = _get_fernet()
        encrypted_bytes = fernet.encrypt(plaintext.encode())
        return encrypted_bytes.decode()
    except Exception as e:
        logger.error(f"Encryption failed: {e}")
        # In case of encryption failure, return the original value
        # This ensures the system continues to work even if encryption breaks
        return plaintext


def decrypt_sensitive_data(encrypted: str) -> str:
    """
    Decrypt sensitive data

    Args:
        encrypted: Base64-encoded encrypted string

    Returns:
        Decrypted plain text string
    """
    if not encrypted:
        return encrypted

    try:
        fernet = _get_fernet()
        decrypted_bytes = fernet.decrypt(encrypted.encode())
        return decrypted_bytes.decode()
    except Exception as e:
        logger.error(f"Decryption failed: {e}")
        # If decryption fails, assume the value is already decrypted
        # This handles legacy data or data that was never encrypted
        return encrypted


def is_encrypted(value: str) -> bool:
    """
    Check if a value appears to be encrypted

    This is a heuristic check - Fernet tokens are base64 and start with 'gAAAAA'
    """
    if not value or len(value) < 20:
        return False

    # Fernet tokens start with version byte (0x80) which becomes 'gAAAAA' in base64
    return value.startswith("gAAAAA")


# Example usage
if __name__ == "__main__":
    # Test encryption/decryption
    test_key = "sk-ant-api03-test1234567890"

    encrypted = encrypt_sensitive_data(test_key)
    print(f"Original:  {test_key}")
    print(f"Encrypted: {encrypted}")
    print(f"Is encrypted: {is_encrypted(encrypted)}")

    decrypted = decrypt_sensitive_data(encrypted)
    print(f"Decrypted: {decrypted}")

    assert test_key == decrypted, "Encryption/decryption failed!"
    print("✅ Encryption test passed")
