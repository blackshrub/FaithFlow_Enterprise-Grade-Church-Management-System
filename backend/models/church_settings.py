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


class ChurchSettings(ChurchSettingsBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
