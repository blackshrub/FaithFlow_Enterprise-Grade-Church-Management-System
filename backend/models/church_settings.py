from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal
from datetime import datetime, timezone
import uuid


class ChurchSettingsBase(BaseModel):
    date_format: Literal['DD-MM-YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD'] = 'DD-MM-YYYY'
    time_format: Literal['12h', '24h'] = '24h'
    currency: str = Field(default='USD', max_length=10)
    timezone: str = Field(default='UTC', max_length=50)
    default_language: Literal['en', 'id'] = 'en'  # Default system language
    
    # WhatsApp Notifications
    enable_whatsapp_notifications: bool = Field(default=False, description="Enable WhatsApp notifications (global switch)")
    whatsapp_send_rsvp_confirmation: bool = Field(default=True, description="Send confirmation when RSVP is registered")
    whatsapp_send_group_notifications: bool = Field(default=True, description="Send WhatsApp notifications for group join/leave approvals")
    whatsapp_api_url: str = Field(default='', description="WhatsApp API Gateway URL")
    whatsapp_username: str = Field(default='', description="WhatsApp API Username")
    whatsapp_password: str = Field(default='', description="WhatsApp API Password")
    
    # Group module configuration
    group_categories: dict = Field(
        default_factory=lambda: {
            "cell_group": "Cell Group / Small Group",
            "ministry_team": "Ministry Team",
            "activity": "Activity Group",
            "support_group": "Support Group",
        },
        description="Mapping of group category code to display label",
    )
    
    # Member Status Automation
    status_automation_enabled: bool = Field(
        default=False,
        description="Enable automatic member status updates based on rules"
    )
    status_automation_schedule: str = Field(
        default="00:00",
        description="Daily time to run automation (24h format: HH:MM)"
    )
    last_status_automation_run: Optional[datetime] = Field(
        None,
        description="Last time status automation was executed"
    )

    # Payment Gateway Configuration
    payment_online_enabled: bool = Field(
        default=False,
        description="Enable online payment gateway (if False, show manual payment only)"
    )
    payment_provider: Optional[Literal['ipaymu', 'xendit', 'midtrans', 'stripe']] = Field(
        default='ipaymu',
        description="Payment gateway provider"
    )
    payment_provider_config: dict = Field(
        default_factory=dict,
        description="Provider-specific configuration (API keys, VA numbers, etc.)"
    )
    payment_manual_bank_accounts: list = Field(
        default_factory=list,
        description="Manual bank account list for offline giving (when online disabled)"
    )

    # Explore Feature Configuration
    explore_enabled: bool = Field(
        default=False,
        description="Enable Explore feature for members (devotions, quizzes, etc.)"
    )
    explore_features: dict = Field(
        default_factory=lambda: {
            "daily_devotion": True,
            "verse_of_the_day": True,
            "bible_figure_of_the_day": True,
            "daily_quiz": True,
            "bible_study": True,
            "topical_verses": True,
            "devotion_plans": True,
        },
        description="Toggle individual Explore content types"
    )
    explore_allow_church_content: bool = Field(
        default=False,
        description="Allow church to create custom Explore content"
    )


class ChurchSettingsCreate(ChurchSettingsBase):
    church_id: str


class ChurchSettingsUpdate(BaseModel):
    date_format: Optional[Literal['DD-MM-YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD']] = None
    time_format: Optional[Literal['12h', '24h']] = None
    currency: Optional[str] = Field(None, max_length=10)
    timezone: Optional[str] = Field(None, max_length=50)
    default_language: Optional[Literal['en', 'id']] = None
    enable_whatsapp_notifications: Optional[bool] = None
    whatsapp_send_rsvp_confirmation: Optional[bool] = None
    whatsapp_send_group_notifications: Optional[bool] = None
    whatsapp_api_url: Optional[str] = None
    whatsapp_username: Optional[str] = None
    whatsapp_password: Optional[str] = None
    group_categories: Optional[dict] = None
    status_automation_enabled: Optional[bool] = None
    status_automation_schedule: Optional[str] = None
    last_status_automation_run: Optional[datetime] = None
    payment_online_enabled: Optional[bool] = None
    payment_provider: Optional[Literal['ipaymu', 'xendit', 'midtrans', 'stripe']] = None
    payment_provider_config: Optional[dict] = None
    payment_manual_bank_accounts: Optional[list] = None
    # Kiosk settings (nested object with all kiosk configuration)
    kiosk_settings: Optional[dict] = None
    # Explore settings
    explore_enabled: Optional[bool] = None
    explore_features: Optional[dict] = None
    explore_allow_church_content: Optional[bool] = None


class ChurchSettings(ChurchSettingsBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
