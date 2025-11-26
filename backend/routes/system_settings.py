"""
System Settings API Routes

Super Admin only endpoints for managing application-wide settings.
Includes AI integration, WhatsApp, payment gateways, and other system configuration.
"""

from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from typing import Optional

from utils.dependencies import get_current_user, get_db, require_super_admin
from models.system_settings import SystemSettings, SystemSettingsUpdate
from utils.encryption import encrypt_sensitive_data, decrypt_sensitive_data

router = APIRouter()


# List of sensitive fields that need encryption
SENSITIVE_FIELDS = [
    "ai_integration.anthropic_api_key",
    "ai_integration.stability_api_key",
    "whatsapp_integration.whatsapp_api_key",
    "payment_integration.ipaymu_api_key",
]


def encrypt_settings(settings: dict) -> dict:
    """Encrypt sensitive fields in settings"""
    encrypted = settings.copy()

    for field_path in SENSITIVE_FIELDS:
        parts = field_path.split(".")
        if len(parts) == 2:
            section, key = parts
            if section in encrypted and key in encrypted[section]:
                value = encrypted[section][key]
                if value:  # Only encrypt non-empty values
                    encrypted[section][key] = encrypt_sensitive_data(value)

    return encrypted


def decrypt_settings(settings: dict) -> dict:
    """Decrypt sensitive fields in settings"""
    decrypted = settings.copy()

    for field_path in SENSITIVE_FIELDS:
        parts = field_path.split(".")
        if len(parts) == 2:
            section, key = parts
            if section in decrypted and key in decrypted[section]:
                value = decrypted[section][key]
                if value:  # Only decrypt non-empty values
                    try:
                        decrypted[section][key] = decrypt_sensitive_data(value)
                    except Exception:
                        # If decryption fails, assume it's already decrypted or corrupted
                        pass

    return decrypted


def mask_sensitive_fields(settings: dict) -> dict:
    """Mask sensitive fields for display (show only last 4 chars)"""
    masked = settings.copy()

    for field_path in SENSITIVE_FIELDS:
        parts = field_path.split(".")
        if len(parts) == 2:
            section, key = parts
            if section in masked and key in masked[section]:
                value = masked[section][key]
                if value and len(value) > 8:
                    # Show only last 4 characters
                    masked[section][key] = "..." + value[-4:]

    return masked


@router.get("/settings")
async def get_system_settings(
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
    include_sensitive: bool = False,
):
    """
    Get system settings (super admin only)

    Args:
        include_sensitive: If True, returns full API keys. If False, returns masked values.
    """
    # Get settings from DB
    settings_doc = await db.system_settings.find_one({"id": "global_system_settings"})

    if not settings_doc:
        # Return default settings
        default_settings = SystemSettings()
        settings_dict = default_settings.model_dump()
    else:
        settings_doc.pop("_id", None)
        settings_dict = settings_doc

        # Decrypt sensitive fields
        settings_dict = decrypt_settings(settings_dict)

    # Mask sensitive fields unless explicitly requested
    if not include_sensitive:
        settings_dict = mask_sensitive_fields(settings_dict)

    return settings_dict


@router.put("/settings")
async def update_system_settings(
    updates: SystemSettingsUpdate,
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """
    Update system settings (super admin only)

    Only updates provided fields. API keys are encrypted before storage.
    """
    # Get existing settings
    existing = await db.system_settings.find_one({"id": "global_system_settings"})

    if existing:
        existing.pop("_id", None)
        settings_dict = existing
    else:
        # Create default settings
        default_settings = SystemSettings()
        settings_dict = default_settings.model_dump()

    # Update with new values (only non-None fields)
    update_dict = updates.model_dump(exclude_none=True)

    # Merge updates into existing settings
    for key, value in update_dict.items():
        if isinstance(value, dict) and key in settings_dict:
            # Merge nested dicts (for ai_integration, whatsapp_integration, etc.)
            settings_dict[key].update(value)
        else:
            settings_dict[key] = value

    # Add metadata
    settings_dict["updated_at"] = datetime.now()
    settings_dict["updated_by"] = current_user["id"]

    if "created_at" not in settings_dict or settings_dict["created_at"] is None:
        settings_dict["created_at"] = datetime.now()

    # Encrypt sensitive fields
    encrypted_settings = encrypt_settings(settings_dict)

    # Upsert to database
    await db.system_settings.update_one(
        {"id": "global_system_settings"},
        {"$set": encrypted_settings},
        upsert=True,
    )

    # Return updated settings (decrypted and masked)
    decrypted_settings = decrypt_settings(encrypted_settings)
    masked_settings = mask_sensitive_fields(decrypted_settings)

    return {
        "status": "success",
        "message": "System settings updated successfully",
        "settings": masked_settings,
    }


@router.post("/settings/test-ai-connection")
async def test_ai_connection(
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """
    Test AI API connection (Anthropic Claude)

    Verifies that the API key works by making a test request.
    """
    import os
    from anthropic import Anthropic

    # Get settings from DB
    settings_doc = await db.system_settings.find_one({"id": "global_system_settings"})

    if not settings_doc:
        raise HTTPException(status_code=404, detail="System settings not found. Please configure AI settings first.")

    settings_dict = decrypt_settings(settings_doc)
    api_key = settings_dict.get("ai_integration", {}).get("anthropic_api_key")

    if not api_key:
        raise HTTPException(status_code=400, detail="Anthropic API key not configured")

    try:
        # Test API call
        client = Anthropic(api_key=api_key)
        response = client.messages.create(
            model=settings_dict.get("ai_integration", {}).get("anthropic_model", "claude-3-5-sonnet-20241022"),
            max_tokens=50,
            messages=[
                {"role": "user", "content": "Say 'API connection successful' in one sentence."}
            ],
        )

        return {
            "status": "success",
            "message": "AI API connection successful",
            "response": response.content[0].text,
            "model": response.model,
        }

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"AI API connection failed: {str(e)}",
        )


@router.post("/settings/test-stability-connection")
async def test_stability_connection(
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """
    Test Stability AI API connection

    Verifies that the API key works by checking account info.
    """
    import httpx

    # Get settings from DB
    settings_doc = await db.system_settings.find_one({"id": "global_system_settings"})

    if not settings_doc:
        raise HTTPException(status_code=404, detail="System settings not found. Please configure AI settings first.")

    settings_dict = decrypt_settings(settings_doc)
    api_key = settings_dict.get("ai_integration", {}).get("stability_api_key")

    if not api_key:
        raise HTTPException(status_code=400, detail="Stability AI API key not configured")

    try:
        # Test API call - get account info
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.stability.ai/v1/user/account",
                headers={
                    "Authorization": f"Bearer {api_key}",
                },
            )

            if response.status_code == 200:
                account_data = response.json()
                return {
                    "status": "success",
                    "message": "Stability AI API connection successful",
                    "account_email": account_data.get("email"),
                }
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Stability AI API connection failed: {response.text}",
                )

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Stability AI API connection failed: {str(e)}",
        )


@router.get("/settings/ai-usage")
async def get_ai_usage_stats(
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """
    Get AI usage statistics for current month

    Returns total spend, budget, and usage breakdown.
    """
    settings_doc = await db.system_settings.find_one({"id": "global_system_settings"})

    if not settings_doc:
        return {
            "current_month_spend": 0.0,
            "monthly_budget": 50.0,
            "budget_remaining": 50.0,
            "budget_used_percentage": 0.0,
        }

    ai_settings = settings_doc.get("ai_integration", {})
    current_spend = ai_settings.get("current_month_spend", 0.0)
    monthly_budget = ai_settings.get("monthly_budget_usd", 50.0)

    return {
        "current_month_spend": current_spend,
        "monthly_budget": monthly_budget,
        "budget_remaining": max(0, monthly_budget - current_spend),
        "budget_used_percentage": min(100, (current_spend / monthly_budget * 100) if monthly_budget > 0 else 0),
    }
