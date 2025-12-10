from pydantic import BaseModel, Field, ConfigDict, EmailStr, field_validator
from typing import Optional, Literal
from datetime import datetime, timezone
import uuid
import re


# Password policy constants
PASSWORD_MIN_LENGTH = 8
PASSWORD_REQUIRE_UPPERCASE = True
PASSWORD_REQUIRE_LOWERCASE = True
PASSWORD_REQUIRE_DIGIT = True
PASSWORD_REQUIRE_SPECIAL = False  # Optional but recommended


def validate_password_strength(password: str) -> str:
    """
    Validate password meets security requirements.

    Requirements:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit

    Returns the password if valid, raises ValueError if not.
    """
    if len(password) < PASSWORD_MIN_LENGTH:
        raise ValueError(f'Password must be at least {PASSWORD_MIN_LENGTH} characters long')

    if PASSWORD_REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
        raise ValueError('Password must contain at least one uppercase letter')

    if PASSWORD_REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
        raise ValueError('Password must contain at least one lowercase letter')

    if PASSWORD_REQUIRE_DIGIT and not re.search(r'\d', password):
        raise ValueError('Password must contain at least one digit')

    if PASSWORD_REQUIRE_SPECIAL and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        raise ValueError('Password must contain at least one special character')

    # Check for common weak passwords
    weak_passwords = {'password', 'password1', '12345678', 'qwerty123', 'admin123', 'letmein1'}
    if password.lower() in weak_passwords:
        raise ValueError('Password is too common. Please choose a stronger password.')

    return password


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=200)
    role: Literal['super_admin', 'admin', 'staff'] = 'staff'
    is_active: bool = True


class UserCreate(UserBase):
    church_id: str
    password: str = Field(..., min_length=PASSWORD_MIN_LENGTH)

    @field_validator('password')
    @classmethod
    def password_strength(cls, v):
        return validate_password_strength(v)


class UserLogin(BaseModel):
    email: str  # Changed from EmailStr to str to support both email and API username formats
    password: str
    church_id: Optional[str] = None  # Required for super_admin, ignored for regular users


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, min_length=1, max_length=200)
    role: Optional[Literal['super_admin', 'admin', 'staff']] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=PASSWORD_MIN_LENGTH)
    kiosk_pin: Optional[str] = Field(None, min_length=6, max_length=6, pattern="^[0-9]{6}$")
    phone: Optional[str] = Field(None, max_length=20)

    @field_validator('password')
    @classmethod
    def password_strength(cls, v):
        if v is None:
            return v
        return validate_password_strength(v)


class ProfileUpdate(BaseModel):
    """Model for user self-service profile updates"""
    full_name: Optional[str] = Field(None, min_length=1, max_length=200)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    kiosk_pin: Optional[str] = Field(None, min_length=6, max_length=6, pattern="^[0-9]{6}$")
    current_password: Optional[str] = Field(None, min_length=PASSWORD_MIN_LENGTH, description="Required when changing password")
    new_password: Optional[str] = Field(None, min_length=PASSWORD_MIN_LENGTH)

    @field_validator('new_password')
    @classmethod
    def new_password_strength(cls, v):
        if v is None:
            return v
        return validate_password_strength(v)


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
    phone: Optional[str] = None
    kiosk_pin: Optional[str] = None
    created_at: datetime
    updated_at: datetime
