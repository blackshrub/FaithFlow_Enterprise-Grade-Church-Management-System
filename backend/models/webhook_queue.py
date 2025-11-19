from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import uuid


class WebhookQueueItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    webhook_config_id: str
    event_type: str
    payload: Dict[str, Any]
    status: str = Field(default="pending", description="pending, delivered, failed")
    retry_count: int = Field(default=0)
    max_retries: int = Field(default=3)
    next_retry_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_error: Optional[str] = None
    delivered_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
