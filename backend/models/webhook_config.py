from pydantic import BaseModel, Field, ConfigDict, HttpUrl
from typing import Optional, List, Dict
from datetime import datetime, timezone
import uuid


class WebhookConfigBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="Webhook name/description")
    webhook_url: str = Field(..., description="External app webhook endpoint URL")
    secret_key: str = Field(..., min_length=16, description="Secret key for HMAC signature")
    events: List[str] = Field(default_factory=lambda: ["member.created", "member.updated", "member.deleted"])
    is_active: bool = Field(default=True, description="Enable/disable webhook")
    retry_count: int = Field(default=3, ge=0, le=10, description="Max retry attempts")
    timeout_seconds: int = Field(default=30, ge=5, le=120, description="Request timeout")
    custom_headers: Dict[str, str] = Field(default_factory=dict, description="Custom HTTP headers")


class WebhookConfigCreate(WebhookConfigBase):
    church_id: str


class WebhookConfigUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    webhook_url: Optional[str] = None
    secret_key: Optional[str] = Field(None, min_length=16)
    events: Optional[List[str]] = None
    is_active: Optional[bool] = None
    retry_count: Optional[int] = Field(None, ge=0, le=10)
    timeout_seconds: Optional[int] = Field(None, ge=5, le=120)
    custom_headers: Optional[Dict[str, str]] = None


class WebhookConfig(WebhookConfigBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
