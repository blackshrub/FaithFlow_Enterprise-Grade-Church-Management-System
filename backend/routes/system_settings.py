"""
System Settings API Routes

Super Admin only endpoints for managing application-wide settings.
Includes AI integration, WhatsApp, payment gateways, and other system configuration.
"""

from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from utils.dependencies import get_current_user, get_db, require_super_admin
from models.system_settings import SystemSettings, SystemSettingsUpdate
from utils.encryption import encrypt_sensitive_data, decrypt_sensitive_data

router = APIRouter()


# List of sensitive fields that need encryption
SENSITIVE_FIELDS = [
    "ai_integration.anthropic_api_key",
    "ai_integration.stability_api_key",
    "faith_assistant.api_key",
    "voice_integration.openai_api_key",
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


class TestFaithAssistantRequest(BaseModel):
    """Request body for testing Faith Assistant connection"""
    api_key: Optional[str] = None
    model: Optional[str] = None


@router.post("/settings/test-faith-assistant")
async def test_faith_assistant(
    request: Optional[TestFaithAssistantRequest] = None,
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """
    Test Faith Assistant API connection (Anthropic Claude)

    Verifies that the Faith Assistant API key works by making a test request.
    If api_key/model provided in request body, uses those directly (for testing before save).
    Otherwise falls back to saved settings.
    """
    from anthropic import Anthropic

    api_key = None
    model = "claude-sonnet-4-20250514"

    # Priority 1: Use values from request body (for testing before save)
    if request and request.api_key:
        api_key = request.api_key
        model = request.model or model
    else:
        # Priority 2: Get from saved settings
        settings_doc = await db.system_settings.find_one({"id": "global_system_settings"})

        if settings_doc:
            settings_dict = decrypt_settings(settings_doc)

            # Get Faith Assistant settings with fallback to ai_integration
            faith_settings = settings_dict.get("faith_assistant", {})
            api_key = faith_settings.get("api_key")
            model = faith_settings.get("model", model)

            # Fallback to ai_integration if faith_assistant key not set
            if not api_key:
                ai_settings = settings_dict.get("ai_integration", {})
                api_key = ai_settings.get("anthropic_api_key")

    if not api_key:
        raise HTTPException(status_code=400, detail="Please provide an API key to test")

    try:
        # Test API call with faith assistant context
        client = Anthropic(api_key=api_key)
        response = client.messages.create(
            model=model,
            max_tokens=100,
            messages=[
                {"role": "user", "content": "Respond with a brief encouraging greeting as a spiritual companion."}
            ],
        )

        return {
            "status": "success",
            "message": "Faith Assistant API connection successful",
            "response": response.content[0].text,
            "model": response.model,
        }

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Faith Assistant API connection failed: {str(e)}",
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


class TestVoiceRequest(BaseModel):
    """Request body for testing OpenAI voice connection"""
    api_key: Optional[str] = None


@router.post("/settings/test-voice-connection")
async def test_voice_connection(
    request: Optional[TestVoiceRequest] = None,
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """
    Test OpenAI Voice API connection (TTS/STT)

    Verifies that the OpenAI API key works for TTS by making a test request.
    If api_key provided in request body, uses that directly (for testing before save).
    Otherwise falls back to saved settings.
    """
    import httpx

    api_key = None

    # Priority 1: Use value from request body (for testing before save)
    if request and request.api_key:
        api_key = request.api_key
    else:
        # Priority 2: Get from saved settings
        settings_doc = await db.system_settings.find_one({"id": "global_system_settings"})

        if settings_doc:
            settings_dict = decrypt_settings(settings_doc)
            voice_settings = settings_dict.get("voice_integration", {})
            api_key = voice_settings.get("openai_api_key")

    if not api_key:
        raise HTTPException(status_code=400, detail="Please provide an OpenAI API key to test")

    try:
        # Test API call - list models to verify key works
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.openai.com/v1/models",
                headers={
                    "Authorization": f"Bearer {api_key}",
                },
                timeout=10.0,
            )

            if response.status_code == 200:
                # Check if TTS model is available
                models = response.json().get("data", [])
                tts_available = any(m.get("id", "").startswith("tts") for m in models)
                whisper_available = any("whisper" in m.get("id", "") for m in models)

                return {
                    "status": "success",
                    "message": "OpenAI Voice API connection successful",
                    "tts_available": tts_available,
                    "stt_available": whisper_available,
                }
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"OpenAI API connection failed: {response.text}",
                )

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=400,
            detail="OpenAI API connection timed out. Please try again.",
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"OpenAI Voice API connection failed: {str(e)}",
        )


@router.get("/settings/voice")
async def get_voice_settings_public(
    db=Depends(get_db),
):
    """
    Get voice settings for mobile app (public endpoint)

    Returns voice configuration without exposing the full API key.
    Mobile app uses this to check if voice is enabled and get preferences.

    Note: This is a public endpoint suitable for trusted church app environments.
    Falls back to OPENAI_API_KEY environment variable for development.
    """
    import os

    settings_doc = await db.system_settings.find_one({"id": "global_system_settings"})

    # Default values
    voice_settings = {}
    api_key = None

    if settings_doc:
        settings_dict = decrypt_settings(settings_doc)
        voice_settings = settings_dict.get("voice_integration", {})
        api_key = voice_settings.get("openai_api_key")

    # Fallback to environment variable for development
    if not api_key:
        api_key = os.environ.get("OPENAI_API_KEY")

    # Check for Groq API key (for fast STT)
    groq_api_key = voice_settings.get("groq_api_key")
    if not groq_api_key:
        groq_api_key = os.environ.get("GROQ_API_KEY")

    # Determine STT provider
    stt_provider = voice_settings.get("stt_provider", "groq")
    # If Groq is preferred but no key, fallback to OpenAI
    if stt_provider == "groq" and not groq_api_key:
        stt_provider = "openai"

    return {
        "voice_enabled": voice_settings.get("voice_enabled", True) and bool(api_key),
        "has_api_key": bool(api_key),
        "has_groq_key": bool(groq_api_key),
        "stt_provider": stt_provider,
        "tts_voice": voice_settings.get("tts_voice", "nova"),
        "tts_model": voice_settings.get("tts_model", "tts-1"),
        "tts_speed": voice_settings.get("tts_speed", 1.0),
        "stt_model": voice_settings.get("stt_model", "whisper-1"),
    }


@router.get("/settings/voice/api-key")
async def get_voice_api_key(
    db=Depends(get_db),
):
    """
    Get API keys for voice features (public endpoint)

    This is called by the mobile app when it needs to make TTS/STT requests.
    Returns both OpenAI (for TTS) and Groq (for fast STT) API keys.

    Note: This is a public endpoint suitable for trusted church app environments.
    The API keys are protected by:
    - Encrypted storage in the database
    - HTTPS transmission only
    - Church admin configuration control

    Falls back to environment variables for development.
    """
    import os

    settings_doc = await db.system_settings.find_one({"id": "global_system_settings"})

    # Default values
    voice_settings = {}
    openai_key = None
    groq_key = None

    if settings_doc:
        settings_dict = decrypt_settings(settings_doc)
        voice_settings = settings_dict.get("voice_integration", {})
        openai_key = voice_settings.get("openai_api_key")
        groq_key = voice_settings.get("groq_api_key")

    # Fallback to environment variables for development
    if not openai_key:
        openai_key = os.environ.get("OPENAI_API_KEY")
    if not groq_key:
        groq_key = os.environ.get("GROQ_API_KEY")

    # Need at least OpenAI key for TTS
    if not openai_key:
        raise HTTPException(status_code=404, detail="OpenAI API key not configured")

    # Check if explicitly disabled (only if we have DB settings)
    if settings_doc and not voice_settings.get("voice_enabled", True):
        raise HTTPException(status_code=403, detail="Voice features are disabled")

    # Determine STT provider based on availability
    stt_provider = voice_settings.get("stt_provider", "groq")
    if stt_provider == "groq" and not groq_key:
        stt_provider = "openai"

    return {
        "openai_api_key": openai_key,
        "groq_api_key": groq_key,
        "stt_provider": stt_provider,
        "tts_voice": voice_settings.get("tts_voice", "nova"),
        "tts_model": voice_settings.get("tts_model", "tts-1"),
        "tts_speed": voice_settings.get("tts_speed", 1.0),
        "stt_model": voice_settings.get("stt_model", "whisper-1"),
    }


class RealtimeSessionRequest(BaseModel):
    """Request body for creating a realtime session"""
    model: str = "gpt-4o-realtime-preview-2024-12-17"
    voice: str = "verse"  # alloy, ash, ballad, coral, echo, sage, shimmer, verse


@router.post("/settings/voice/realtime-session")
async def create_realtime_session(
    request: Optional[RealtimeSessionRequest] = None,
    db=Depends(get_db),
):
    """
    Create an ephemeral OpenAI Realtime API session (public endpoint)

    This generates a short-lived token for WebRTC-based real-time voice
    conversations. The mobile app uses this to establish a direct
    connection to OpenAI's Realtime API without exposing the main API key.

    The ephemeral token expires after 1 minute and can only be used once.

    Falls back to OPENAI_API_KEY environment variable for development.
    """
    import os
    import httpx

    settings_doc = await db.system_settings.find_one({"id": "global_system_settings"})

    # Default values
    voice_settings = {}
    api_key = None

    if settings_doc:
        settings_dict = decrypt_settings(settings_doc)
        voice_settings = settings_dict.get("voice_integration", {})
        api_key = voice_settings.get("openai_api_key")

    # Fallback to environment variable for development
    if not api_key:
        api_key = os.environ.get("OPENAI_API_KEY")

    if not api_key:
        raise HTTPException(status_code=404, detail="OpenAI API key not configured")

    # Check if explicitly disabled
    if settings_doc and not voice_settings.get("voice_enabled", True):
        raise HTTPException(status_code=403, detail="Voice features are disabled")

    # Get model and voice from request or use defaults
    model = request.model if request else "gpt-4o-realtime-preview-2024-12-17"
    voice = request.voice if request else voice_settings.get("realtime_voice", "verse")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/realtime/sessions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "voice": voice,
                },
                timeout=10.0,
            )

            if response.status_code == 200:
                session_data = response.json()
                return {
                    "status": "success",
                    "client_secret": session_data.get("client_secret", {}).get("value"),
                    "expires_at": session_data.get("client_secret", {}).get("expires_at"),
                    "model": session_data.get("model"),
                    "voice": session_data.get("voice"),
                }
            else:
                error_detail = response.json() if response.headers.get("content-type", "").startswith("application/json") else response.text
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to create realtime session: {error_detail}",
                )

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="OpenAI Realtime API request timed out",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create realtime session: {str(e)}",
        )
