from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import uuid


class WebhookDeliveryLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    webhook_config_id: str
    event_type: str
    event_id: str
    payload: Dict[str, Any]
    response_status: Optional[int] = None
    response_body: Optional[str] = None
    delivered_at: Optional[datetime] = None
    retry_count: int = Field(default=0)
    error_message: Optional[str] = None
    delivery_time_ms: Optional[int] = None  # Time taken to deliver
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
