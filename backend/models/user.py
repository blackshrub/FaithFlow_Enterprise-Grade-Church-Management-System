from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Optional, Literal
from datetime import datetime, timezone
import uuid


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=200)
    role: Literal['super_admin', 'admin', 'staff'] = 'staff'
    is_active: bool = True


class UserCreate(UserBase):
    church_id: str
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    email: str  # Changed from EmailStr to str to support both email and API username formats
    password: str
    church_id: Optional[str] = None  # Required for super_admin, ignored for regular users


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, min_length=1, max_length=200)
    role: Optional[Literal['super_admin', 'admin', 'staff']] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6)
    kiosk_pin: Optional[str] = Field(None, min_length=6, max_length=6, pattern="^[0-9]{6}$")


class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: Optional[str] = Field(default=None, description="Church ID (None for super_admin, required for admin/staff)")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    email: str
    full_name: str
    role: str
    church_id: Optional[str] = None  # None for super_admin
    is_active: bool
    created_at: datetime
    updated_at: datetime
