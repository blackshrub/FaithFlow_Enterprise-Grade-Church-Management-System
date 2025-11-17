from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Optional, Literal, List
from datetime import datetime, date, timezone
import uuid


class MemberBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    full_name: Optional[str] = None  # Can be provided instead of first/last, will be parsed
    email: Optional[EmailStr] = None
    phone_whatsapp: str = Field(..., description="WhatsApp number in international format")
    date_of_birth: Optional[date] = None
    gender: Optional[Literal['Male', 'Female']] = None  # Simplified to Male/Female only
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    marital_status: Optional[Literal['Married', 'Not Married', 'Widower', 'Widow']] = None  # Simplified options
    occupation: Optional[str] = None
    baptism_date: Optional[date] = None
    membership_date: Optional[date] = None
    is_active: bool = True
    household_id: Optional[str] = None
    notes: Optional[str] = None
    demographic_category: Optional[str] = None  # Auto-assigned based on age
    blood_type: Optional[Literal['A', 'B', 'AB', 'O']] = None  # Simplified blood types
    photo_filename: Optional[str] = None  # Profile photo filename for matching
    photo_base64: Optional[str] = None  # Profile photo in base64
    personal_document: Optional[str] = None  # Personal document filename or base64
    documents: List[str] = Field(default_factory=list)  # List of document URLs or base64


class MemberCreate(MemberBase):
    church_id: str


class MemberUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    phone_whatsapp: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[Literal['male', 'female', 'other']] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    marital_status: Optional[Literal['single', 'married', 'divorced', 'widowed']] = None
    occupation: Optional[str] = None
    baptism_date: Optional[date] = None
    membership_date: Optional[date] = None
    is_active: Optional[bool] = None
    household_id: Optional[str] = None
    notes: Optional[str] = None
    demographic_category: Optional[str] = None  # Auto-assigned based on age
    blood_type: Optional[Literal['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']] = None
    photo_base64: Optional[str] = None  # Profile photo in base64
    documents: Optional[List[str]] = None  # List of document URLs or base64


class Member(MemberBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
