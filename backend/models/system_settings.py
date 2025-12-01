"""
System Settings Models

For storing application-wide configuration that should be managed via UI instead of .env files.
Settings are encrypted before storage for security.
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class AIIntegrationSettings(BaseModel):
    """AI Integration Settings for Explore Feature"""

    # Anthropic Claude API
    anthropic_api_key: Optional[str] = Field(
        None,
        description="Anthropic Claude API key for AI-generated content (devotions, quizzes, etc.)"
    )
    anthropic_model: str = Field(
        "claude-3-5-sonnet-20241022",
        description="Claude model to use (sonnet, opus, haiku)"
    )
    anthropic_max_tokens: int = Field(
        4000,
        description="Maximum tokens per AI generation request"
    )

    # Stability AI
    stability_api_key: Optional[str] = Field(
        None,
        description="Stability AI API key for AI-generated images"
    )
    stability_model: str = Field(
        "ultra",
        description="Stability AI model (ultra, core, sd3)"
    )

    # Cost controls
    ai_generation_enabled: bool = Field(
        False,
        description="Master switch for AI content generation (disable to save costs)"
    )
    monthly_budget_usd: float = Field(
        50.0,
        description="Monthly budget limit for AI API calls (USD)"
    )
    current_month_spend: float = Field(
        0.0,
        description="Current month's spend so far (auto-tracked)"
    )


class WhatsAppIntegrationSettings(BaseModel):
    """WhatsApp Integration Settings"""

    whatsapp_api_url: Optional[str] = Field(
        None,
        description="WhatsApp API endpoint URL"
    )
    whatsapp_api_key: Optional[str] = Field(
        None,
        description="WhatsApp API authentication key"
    )
    whatsapp_from_number: Optional[str] = Field(
        None,
        description="WhatsApp sender phone number (format: +6281234567890)"
    )
    whatsapp_enabled: bool = Field(
        True,
        description="Enable WhatsApp notifications and OTP"
    )


class FaithAssistantSettings(BaseModel):
    """Faith Assistant (Pendamping Iman) Settings"""

    api_key: Optional[str] = Field(
        None,
        description="Anthropic Claude API key for Faith Assistant (uses ai_integration key as fallback)"
    )
    model: str = Field(
        "claude-sonnet-4-20250514",
        description="Claude model to use for Faith Assistant"
    )
    max_tokens: int = Field(
        2048,
        description="Maximum tokens per response"
    )
    enabled: bool = Field(
        True,
        description="Enable Faith Assistant feature"
    )


class VoiceIntegrationSettings(BaseModel):
    """Voice Features Integration Settings (TTS/STT)"""

    # Google Cloud TTS API key (for text-to-speech)
    google_tts_api_key: Optional[str] = Field(
        None,
        description="Google Cloud TTS API key for Text-to-Speech"
    )

    # OpenAI API for STT fallback (when Groq not available)
    openai_api_key: Optional[str] = Field(
        None,
        description="OpenAI API key for Speech-to-Text fallback"
    )

    # Groq API for fast STT (~10x faster than OpenAI)
    groq_api_key: Optional[str] = Field(
        None,
        description="Groq API key for fast Speech-to-Text (STT) - 10x faster than OpenAI"
    )

    # STT provider preference
    stt_provider: str = Field(
        "groq",
        description="Preferred STT provider: 'groq' (faster) or 'openai' (fallback)"
    )

    # Google TTS voice for Indonesian content (Chirp3-HD recommended)
    tts_voice: str = Field(
        "id-ID-Chirp3-HD-Sulafat",
        description="Default Google TTS voice for Indonesian (Chirp3-HD: Sulafat, Aoede, Puck, Kore)"
    )

    # Google TTS voice for English content
    tts_voice_en: str = Field(
        "en-US-Chirp-HD-F",
        description="Default Google TTS voice for English (Chirp-HD: F, D, O or Chirp3-HD: Despina, Aoede, Puck)"
    )

    tts_speed: float = Field(
        1.0,
        description="TTS speech speed (0.25 to 4.0)"
    )
    tts_pitch: float = Field(
        0.0,
        description="TTS pitch adjustment (-20.0 to 20.0 semitones)"
    )
    stt_model: str = Field(
        "whisper-1",
        description="OpenAI STT model for voice input (fallback)"
    )
    voice_enabled: bool = Field(
        True,
        description="Enable voice features in mobile app"
    )


class PaymentIntegrationSettings(BaseModel):
    """Payment Gateway Integration Settings"""

    # iPaymu
    ipaymu_va: Optional[str] = Field(
        None,
        description="iPaymu Virtual Account number"
    )
    ipaymu_api_key: Optional[str] = Field(
        None,
        description="iPaymu API key"
    )
    ipaymu_env: str = Field(
        "sandbox",
        description="iPaymu environment (sandbox or production)"
    )
    ipaymu_enabled: bool = Field(
        True,
        description="Enable iPaymu payment gateway"
    )


class SystemSettings(BaseModel):
    """Main System Settings Document"""

    id: str = Field(default="global_system_settings", description="Always 'global_system_settings' (singleton)")

    # Integration settings
    ai_integration: AIIntegrationSettings = Field(
        default_factory=AIIntegrationSettings,
        description="AI integration settings for Explore content generation (Anthropic, Stability AI)"
    )
    faith_assistant: FaithAssistantSettings = Field(
        default_factory=FaithAssistantSettings,
        description="Faith Assistant (Pendamping Iman) chat settings"
    )
    voice_integration: VoiceIntegrationSettings = Field(
        default_factory=VoiceIntegrationSettings,
        description="Voice features settings (TTS/STT using OpenAI)"
    )
    whatsapp_integration: WhatsAppIntegrationSettings = Field(
        default_factory=WhatsAppIntegrationSettings,
        description="WhatsApp integration settings"
    )
    payment_integration: PaymentIntegrationSettings = Field(
        default_factory=PaymentIntegrationSettings,
        description="Payment gateway settings"
    )

    # Application settings
    app_name: str = Field("FaithFlow", description="Application name")
    app_version: str = Field("1.0.0", description="Application version")
    maintenance_mode: bool = Field(False, description="Enable maintenance mode")
    maintenance_message: Dict[str, str] = Field(
        default={"en": "System under maintenance", "id": "Sistem dalam pemeliharaan"},
        description="Maintenance mode message (bilingual)"
    )

    # Rate limiting
    rate_limit_login: int = Field(5, description="Login attempts per minute")
    rate_limit_otp: int = Field(3, description="OTP requests per minute")
    rate_limit_api: int = Field(100, description="API requests per minute")

    # Security
    jwt_access_token_expire_minutes: int = Field(
        43200,  # 30 days
        description="JWT access token expiration (minutes)"
    )

    # Metadata
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None  # User ID who last updated

    class Config:
        json_schema_extra = {
            "example": {
                "id": "global_system_settings",
                "ai_integration": {
                    "anthropic_api_key": "sk-ant-api03-xxxxx",
                    "anthropic_model": "claude-3-5-sonnet-20241022",
                    "stability_api_key": "sk-xxxxx",
                    "ai_generation_enabled": True,
                    "monthly_budget_usd": 50.0
                },
                "whatsapp_integration": {
                    "whatsapp_api_url": "https://api.whatsapp.com",
                    "whatsapp_enabled": True
                },
                "payment_integration": {
                    "ipaymu_va": "1179000899",
                    "ipaymu_env": "sandbox",
                    "ipaymu_enabled": True
                },
                "maintenance_mode": False
            }
        }


class SystemSettingsUpdate(BaseModel):
    """Update model for system settings (all fields optional)"""

    ai_integration: Optional[AIIntegrationSettings] = None
    faith_assistant: Optional[FaithAssistantSettings] = None
    voice_integration: Optional[VoiceIntegrationSettings] = None
    whatsapp_integration: Optional[WhatsAppIntegrationSettings] = None
    payment_integration: Optional[PaymentIntegrationSettings] = None
    app_name: Optional[str] = None
    app_version: Optional[str] = None
    maintenance_mode: Optional[bool] = None
    maintenance_message: Optional[Dict[str, str]] = None
    rate_limit_login: Optional[int] = None
    rate_limit_otp: Optional[int] = None
    rate_limit_api: Optional[int] = None
    jwt_access_token_expire_minutes: Optional[int] = None
