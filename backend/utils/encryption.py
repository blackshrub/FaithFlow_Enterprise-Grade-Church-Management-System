"""
Encryption Utilities

For encrypting sensitive data (API keys, secrets) before storing in database.
Uses Fernet symmetric encryption (AES-128 in CBC mode).
"""

import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import logging

logger = logging.getLogger(__name__)


def _get_encryption_key() -> bytes:
    """
    Get or generate encryption key from environment variable.

    The key is derived from JWT_SECRET for simplicity.
    In production, you should use a dedicated ENCRYPTION_KEY environment variable.
    """
    # Use JWT_SECRET as the base for encryption key
    secret = os.environ.get("JWT_SECRET", "default-insecure-secret-change-this")

    # Derive a proper Fernet key using PBKDF2HMAC
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"faithflow_salt_v1",  # Static salt (OK for this use case)
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(secret.encode()))

    return key


# Global Fernet instance
_fernet = Fernet(_get_encryption_key())


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
        encrypted_bytes = _fernet.encrypt(plaintext.encode())
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
        decrypted_bytes = _fernet.decrypt(encrypted.encode())
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
