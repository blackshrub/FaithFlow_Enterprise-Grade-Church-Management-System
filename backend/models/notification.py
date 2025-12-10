"""
Push Notification Models for FaithFlow Mobile App.

Handles FCM device tokens and notification delivery.
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, Literal
from datetime import datetime


class DeviceToken(BaseModel):
    """FCM device token registration."""
    id: str
    member_id: str
    church_id: str
    fcm_token: str
    device_type: Literal["ios", "android"]
    device_name: Optional[str] = None
    app_version: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_used_at: Optional[datetime] = None


class DeviceTokenRegister(BaseModel):
    """Register new device token."""
    fcm_token: str = Field(..., description="FCM device token from Expo")
    device_type: Literal["ios", "android"]
    device_name: Optional[str] = None
    app_version: Optional[str] = None


class NotificationPreferences(BaseModel):
    """Member notification preferences."""
    id: str
    member_id: str
    church_id: str

    # Notification types
    events_enabled: bool = True
    groups_enabled: bool = True
    prayers_enabled: bool = True
    devotions_enabled: bool = True
    announcements_enabled: bool = True
    giving_receipts_enabled: bool = True

    # Delivery preferences
    push_enabled: bool = True
    whatsapp_enabled: bool = True

    updated_at: datetime = Field(default_factory=datetime.utcnow)


class NotificationPreferencesUpdate(BaseModel):
    """Update notification preferences."""
    events_enabled: Optional[bool] = None
    groups_enabled: Optional[bool] = None
    prayers_enabled: Optional[bool] = None
    devotions_enabled: Optional[bool] = None
    announcements_enabled: Optional[bool] = None
    giving_receipts_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None
    whatsapp_enabled: Optional[bool] = None


class PushNotification(BaseModel):
    """Push notification record."""
    id: str
    church_id: str
    member_id: str
    title: str
    body: str
    data: Optional[Dict[str, Any]] = None  # Custom data payload
    notification_type: Literal[
        "event", "group", "prayer", "devotion",
        "announcement", "giving", "general", "broadcast"
    ]
    sent_at: datetime = Field(default_factory=datetime.utcnow)
    read_at: Optional[datetime] = None
    is_read: bool = False

    # Campaign reference (for broadcast notifications)
    campaign_id: Optional[str] = None
    image_url: Optional[str] = None

    # Deep linking
    action_type: Optional[Literal["none", "article", "event", "url", "screen"]] = None
    action_data: Optional[Dict[str, Any]] = None

    # Delivery tracking
    delivery_status: Literal["pending", "sent", "delivered", "failed"] = "pending"
    delivery_error: Optional[str] = None
    delivered_at: Optional[datetime] = None
    opened_at: Optional[datetime] = None
    is_opened: bool = False


class SendNotificationRequest(BaseModel):
    """Send push notification request (admin only)."""
    member_ids: list[str] = Field(..., description="List of member IDs to send to")
    title: str = Field(..., min_length=1, max_length=100)
    body: str = Field(..., min_length=1, max_length=500)
    notification_type: str = "general"
    data: Optional[Dict[str, Any]] = None
