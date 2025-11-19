from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid
import secrets
import string


class APIKeyBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="API key name/description")
    is_active: bool = Field(default=True, description="Enable/disable API key")


class APIKeyCreate(APIKeyBase):
    church_id: str


class APIKeyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    is_active: Optional[bool] = None


class APIKey(APIKeyBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: str
    api_username: str = Field(..., description="Random generated username for API")
    api_key: str = Field(..., description="Random generated API key")
    api_key_hash: str = Field(..., description="Hashed API key for verification")
    last_used_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    @staticmethod
    def generate_api_username(church_name: str = "church") -> str:
        """Generate random API username"""
        # Format: api_abc123_churchname
        random_part = ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(8))
        church_part = church_name.lower().replace(' ', '')[:10]
        return f"api_{random_part}_{church_part}"
    
    @staticmethod
    def generate_api_key() -> str:
        """Generate random API key (64 characters)"""
        # Format: ffa_abc123...xyz789 (64 chars total)
        chars = string.ascii_letters + string.digits
        key = 'ffa_' + ''.join(secrets.choice(chars) for _ in range(60))
        return key
    
    @staticmethod
    def hash_api_key(api_key: str) -> str:
        """Hash API key for storage"""
        import hashlib
        return hashlib.sha256(api_key.encode()).hexdigest()
