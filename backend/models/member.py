from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Optional, Literal, List, Dict, Any
from datetime import datetime, date, timezone
import uuid


class MemberBase(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=200, description="Full name of member")
    first_name: Optional[str] = Field(None, max_length=100, description="Auto-generated from full_name if not provided")
    last_name: Optional[str] = Field(None, max_length=100, description="Auto-generated from full_name if not provided")
    email: Optional[EmailStr] = None
    phone_whatsapp: Optional[str] = Field(None, description="WhatsApp number, will be normalized to 62XXXXXXXXX format if provided")
    date_of_birth: Optional[date] = None
    gender: Optional[Literal['Male', 'Female']] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    marital_status: Optional[Literal['Married', 'Not Married', 'Widower', 'Widow']] = None
    occupation: Optional[str] = None
    baptism_date: Optional[date] = None
    membership_date: Optional[date] = None
    is_active: bool = True
    is_deleted: bool = Field(default=False, description="Soft delete flag - member in trash bin")
    deleted_at: Optional[datetime] = Field(None, description="When member was moved to trash")
    deleted_by: Optional[str] = Field(None, description="User ID who deleted the member")
    household_id: Optional[str] = None
    notes: Optional[str] = None
    demographic_category: Optional[str] = None  # Auto-assigned based on age
    member_status: Optional[str] = None  # Member status name (for backward compatibility)
    current_status_id: Optional[str] = Field(None, description="FK to member_statuses.id")
    participate_in_automation: bool = Field(True, description="If false, automation engine skips this member")
    blood_type: Optional[Literal['A', 'B', 'AB', 'O']] = None
    photo_filename: Optional[str] = None  # Profile photo filename for matching
    photo_base64: Optional[str] = None  # DEPRECATED: Profile photo in base64 (use photo_url)
    photo_url: Optional[str] = None  # SeaweedFS URL for profile photo
    photo_thumbnail_url: Optional[str] = None  # SeaweedFS URL for thumbnail
    photo_fid: Optional[str] = None  # SeaweedFS file ID
    photo_path: Optional[str] = None  # SeaweedFS path
    personal_document: Optional[str] = None  # Personal document filename
    personal_document_base64: Optional[str] = None  # DEPRECATED: Personal document in base64
    documents: List[Dict[str, Any]] = Field(default_factory=list)  # List of document objects with URLs
    custom_fields: Dict[str, Any] = Field(default_factory=dict)  # Custom fields defined by church
    
    # Personal QR Code (Universal Member ID)
    personal_qr_code: Optional[str] = None  # Base64 QR code image
    personal_qr_data: Optional[str] = None  # QR data string: MEMBER|member_id|unique_code
    personal_id_code: Optional[str] = None  # Unique 6-digit code for member
    preferred_language: Optional[Literal['en', 'id']] = None  # Member's preferred language for communications


class MemberCreate(MemberBase):
    church_id: str


class MemberUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=200)
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None
    phone_whatsapp: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[Literal['Male', 'Female']] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    marital_status: Optional[Literal['Married', 'Not Married', 'Widower', 'Widow']] = None
    occupation: Optional[str] = None
    baptism_date: Optional[date] = None
    membership_date: Optional[date] = None
    is_active: Optional[bool] = None
    household_id: Optional[str] = None
    notes: Optional[str] = None
    demographic_category: Optional[str] = None
    member_status: Optional[str] = None
    current_status_id: Optional[str] = None
    participate_in_automation: Optional[bool] = None
    blood_type: Optional[Literal['A', 'B', 'AB', 'O']] = None
    photo_filename: Optional[str] = None
    photo_base64: Optional[str] = None  # DEPRECATED
    photo_url: Optional[str] = None  # SeaweedFS URL
    photo_thumbnail_url: Optional[str] = None
    photo_fid: Optional[str] = None
    photo_path: Optional[str] = None
    personal_document: Optional[str] = None
    personal_document_base64: Optional[str] = None  # DEPRECATED
    documents: Optional[List[Dict[str, Any]]] = None
    custom_fields: Optional[Dict[str, Any]] = None


class Member(MemberBase):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
