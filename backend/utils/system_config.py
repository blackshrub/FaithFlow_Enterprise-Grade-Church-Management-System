"""
System Configuration Utility

Provides access to system-wide settings stored in database.
These settings are managed via the System Settings page in the admin dashboard.
Falls back to environment variables if database settings are not available.
"""

import os
from typing import Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from utils.encryption import decrypt_sensitive_data
from utils.logger import get_logger

logger = get_logger(__name__)

# Cache for system settings (refresh every 5 minutes)
_settings_cache: Dict[str, Any] = {}
_cache_timestamp: float = 0
CACHE_TTL_SECONDS = 300  # 5 minutes


async def get_system_settings(db: AsyncIOMotorDatabase, force_refresh: bool = False) -> Dict[str, Any]:
    """
    Get system settings from database with caching.
    Falls back to environment variables if database settings are not available.

    Args:
        db: Database connection
        force_refresh: If True, bypass cache and fetch from DB

    Returns:
        Dictionary with system settings
    """
    import time
    global _settings_cache, _cache_timestamp

    # Check cache
    current_time = time.time()
    if not force_refresh and _settings_cache and (current_time - _cache_timestamp) < CACHE_TTL_SECONDS:
        return _settings_cache

    try:
        # Fetch from database
        settings_doc = await db.system_settings.find_one({"id": "global_system_settings"})

        if settings_doc:
            settings_doc.pop("_id", None)

            # Decrypt sensitive fields
            settings = _decrypt_settings(settings_doc)

            # Update cache
            _settings_cache = settings
            _cache_timestamp = current_time

            return settings
    except Exception as e:
        logger.error(f"Error fetching system settings from DB: {e}")

    # Fallback to environment variables
    return _get_env_fallback_settings()


def _decrypt_settings(settings: dict) -> dict:
    """Decrypt sensitive fields in settings"""
    decrypted = settings.copy()

    sensitive_fields = [
        ("ai_integration", "anthropic_api_key"),
        ("ai_integration", "stability_api_key"),
        ("whatsapp_integration", "whatsapp_api_key"),
        ("payment_integration", "ipaymu_api_key"),
    ]

    for section, key in sensitive_fields:
        if section in decrypted and key in decrypted[section]:
            value = decrypted[section][key]
            if value:
                try:
                    decrypted[section][key] = decrypt_sensitive_data(value)
                except Exception:
                    # If decryption fails, assume it's already decrypted
                    pass

    return decrypted


def _get_env_fallback_settings() -> Dict[str, Any]:
    """Get settings from environment variables as fallback"""
    return {
        "ai_integration": {
            "anthropic_api_key": os.getenv("ANTHROPIC_API_KEY"),
            "anthropic_model": os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022"),
            "stability_api_key": os.getenv("STABILITY_API_KEY"),
            "ai_generation_enabled": os.getenv("AI_GENERATION_ENABLED", "true").lower() == "true",
            "monthly_budget_usd": float(os.getenv("AI_MONTHLY_BUDGET", "50.0")),
        },
        "whatsapp_integration": {
            "whatsapp_api_url": os.getenv("WHATSAPP_API_URL"),
            "whatsapp_api_key": os.getenv("WHATSAPP_API_KEY"),
            "whatsapp_from_number": os.getenv("WHATSAPP_FROM_NUMBER"),
            "whatsapp_enabled": os.getenv("WHATSAPP_ENABLED", "true").lower() == "true",
        },
        "payment_integration": {
            "ipaymu_va": os.getenv("IPAYMU_VA"),
            "ipaymu_api_key": os.getenv("IPAYMU_API_KEY"),
            "ipaymu_env": os.getenv("IPAYMU_ENV", "sandbox"),
            "ipaymu_enabled": os.getenv("IPAYMU_ENABLED", "true").lower() == "true",
        },
    }


async def get_ai_settings(db: AsyncIOMotorDatabase) -> Dict[str, Any]:
    """Get AI integration settings"""
    settings = await get_system_settings(db)
    return settings.get("ai_integration", {})


async def get_whatsapp_settings(db: AsyncIOMotorDatabase) -> Dict[str, Any]:
    """Get WhatsApp integration settings"""
    settings = await get_system_settings(db)
    return settings.get("whatsapp_integration", {})


async def get_payment_settings(db: AsyncIOMotorDatabase) -> Dict[str, Any]:
    """Get Payment integration settings"""
    settings = await get_system_settings(db)
    return settings.get("payment_integration", {})


def clear_settings_cache():
    """Clear the settings cache (useful after updates)"""
    global _settings_cache, _cache_timestamp
    _settings_cache = {}
    _cache_timestamp = 0
