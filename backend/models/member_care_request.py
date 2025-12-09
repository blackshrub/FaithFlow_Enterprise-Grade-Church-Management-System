"""
Member Care Request Models

This module defines Pydantic models for the 4 member care request types:
1. Accept Jesus / Make Commitment Again
2. Baptism Request
3. Child Dedication
4. Holy Matrimony

All requests share a common base with type-specific fields stored in nested objects.
Uses single collection with `request_type` discriminator pattern.
"""

from pydantic import BaseModel, Field, ConfigDict, EmailStr, field_validator
from typing import Optional, Literal, List, Dict, Any, Union
from datetime import datetime, date, timezone
from enum import Enum
import uuid


# =============================================================================
# ENUM TYPES
# =============================================================================

class RequestType(str, Enum):
    """Types of member care requests."""
    ACCEPT_JESUS = "accept_jesus"
    BAPTISM = "baptism"
    CHILD_DEDICATION = "child_dedication"
    HOLY_MATRIMONY = "holy_matrimony"


class CommitmentType(str, Enum):
    """Types of commitment for Accept Jesus requests."""
    FIRST_TIME = "first_time"
    RECOMMITMENT = "recommitment"


class RequestStatus(str, Enum):
    """Status workflow for member care requests."""
    NEW = "new"
    CONTACTED = "contacted"
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class RequestSource(str, Enum):
    """Source of the request submission."""
    KIOSK = "kiosk"
    MOBILE_APP = "mobile_app"
    ADMIN_INPUT = "admin_input"


# Type aliases for Literal types (used in models)
RequestTypeLiteral = Literal["accept_jesus", "baptism", "child_dedication", "holy_matrimony"]
CommitmentTypeLiteral = Literal["first_time", "recommitment"]
RequestStatusLiteral = Literal["new", "contacted", "scheduled", "completed", "cancelled"]
RequestSourceLiteral = Literal["kiosk", "mobile_app", "admin_input"]


# =============================================================================
# PERSON MODELS (Reusable Components)
# =============================================================================

class PersonInfo(BaseModel):
    """Generic person information used in various request types."""
    model_config = ConfigDict(extra="ignore")

    name: str = Field(..., min_length=1, max_length=200, description="Person's full name")
    phone: Optional[str] = Field(None, max_length=20, description="Phone number (WhatsApp)")
    member_id: Optional[str] = Field(None, description="Linked member ID if existing member")
    is_baptized: Optional[bool] = Field(None, description="Whether person is baptized (for matrimony)")
    photo_url: Optional[str] = Field(None, description="Photo URL (enriched from member record)")


class PersonInfoCreate(BaseModel):
    """Person info for creation - allows optional fields."""
    model_config = ConfigDict(extra="ignore")

    name: str = Field(..., min_length=1, max_length=200)
    phone: Optional[str] = Field(None, max_length=20)
    member_id: Optional[str] = Field(None)
    is_baptized: Optional[bool] = Field(None)


class ChildInfo(BaseModel):
    """Child information for dedication requests."""
    model_config = ConfigDict(extra="ignore")

    name: str = Field(..., min_length=1, max_length=200, description="Child's full name")
    birth_date: date = Field(..., description="Child's date of birth")
    gender: Optional[Literal["male", "female"]] = Field(None, description="Child's gender")
    photo_url: str = Field(..., description="Child photo URL (required)")
    photo_fid: Optional[str] = Field(None, description="SeaweedFS file ID")
    photo_thumbnail_url: Optional[str] = Field(None, description="Thumbnail URL")


class ChildInfoCreate(BaseModel):
    """Child info for creation requests."""
    model_config = ConfigDict(extra="ignore")

    name: str = Field(..., min_length=1, max_length=200)
    birth_date: date = Field(...)
    gender: Optional[Literal["male", "female"]] = Field(None)
    photo_url: str = Field(...)
    photo_fid: Optional[str] = Field(None)
    photo_thumbnail_url: Optional[str] = Field(None)


# =============================================================================
# TYPE-SPECIFIC FIELD MODELS
# =============================================================================

class AcceptJesusData(BaseModel):
    """Fields specific to Accept Jesus / Recommitment requests."""
    model_config = ConfigDict(extra="ignore")

    commitment_type: CommitmentTypeLiteral = Field(
        ...,
        description="First time decision or recommitment"
    )
    prayer_read: bool = Field(
        default=False,
        description="Whether the guided prayer was read/prayed"
    )
    guided_prayer_text: Optional[str] = Field(
        None,
        description="The guided prayer text shown to the user"
    )
    follow_up_requested: bool = Field(
        default=True,
        description="Whether the person wants follow-up contact"
    )


class BaptismData(BaseModel):
    """Fields specific to Baptism requests."""
    model_config = ConfigDict(extra="ignore")

    preferred_date: Optional[date] = Field(
        None,
        description="Preferred baptism date"
    )
    scheduled_date: Optional[date] = Field(
        None,
        description="Confirmed scheduled date (set by admin)"
    )
    baptism_location: Optional[str] = Field(
        None,
        max_length=500,
        description="Baptism location"
    )
    previous_baptism: bool = Field(
        default=False,
        description="Whether person has been baptized before"
    )
    testimony: Optional[str] = Field(
        None,
        max_length=2000,
        description="Brief testimony or reason for baptism"
    )


class ChildDedicationData(BaseModel):
    """Fields specific to Child Dedication requests."""
    model_config = ConfigDict(extra="ignore")

    # Father info
    father: PersonInfo = Field(..., description="Father information")
    # Mother info
    mother: PersonInfo = Field(..., description="Mother information")
    # Child info
    child: ChildInfo = Field(..., description="Child information")
    # Scheduling
    preferred_date: Optional[date] = Field(
        None,
        description="Preferred dedication date"
    )
    scheduled_date: Optional[date] = Field(
        None,
        description="Confirmed scheduled date"
    )
    dedication_location: Optional[str] = Field(
        None,
        max_length=500,
        description="Dedication ceremony location"
    )


class HolyMatrimonyData(BaseModel):
    """Fields specific to Holy Matrimony requests."""
    model_config = ConfigDict(extra="ignore")

    # Person A (typically the one submitting)
    person_a: PersonInfo = Field(..., description="First person (typically submitter)")
    # Person B (partner)
    person_b: PersonInfo = Field(..., description="Second person (partner)")
    # Wedding details
    planned_wedding_date: Optional[date] = Field(
        None,
        description="Planned wedding date"
    )
    scheduled_date: Optional[date] = Field(
        None,
        description="Confirmed scheduled date"
    )
    wedding_location: Optional[str] = Field(
        None,
        max_length=500,
        description="Wedding ceremony location"
    )
    venue_preference: Optional[Literal["church", "offsite", "undecided"]] = Field(
        None,
        description="Venue preference"
    )
    # Both must be baptized for church wedding (computed)
    both_baptized: bool = Field(
        default=False,
        description="Calculated: both persons are baptized"
    )


# =============================================================================
# BASE REQUEST MODEL
# =============================================================================

class MemberCareRequestBase(BaseModel):
    """Base model for all member care requests."""
    model_config = ConfigDict(extra="ignore")

    # Request type discriminator
    request_type: RequestTypeLiteral = Field(
        ...,
        description="Type of member care request"
    )

    # Requester info (the person submitting, always required)
    member_id: str = Field(..., description="Member ID of the requester")
    full_name: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Requester full name"
    )
    phone: str = Field(..., max_length=20, description="Requester phone (WhatsApp)")
    email: Optional[EmailStr] = Field(None, description="Requester email (optional)")

    # Notes
    notes: Optional[str] = Field(
        None,
        max_length=2000,
        description="Requester notes or additional info"
    )

    @field_validator('email', mode='before')
    @classmethod
    def empty_string_to_none(cls, v):
        """Convert empty string to None for optional email."""
        if v == '' or v is None:
            return None
        return v


# =============================================================================
# CREATE MODELS (For submission)
# =============================================================================

class AcceptJesusCreate(BaseModel):
    """Create model for Accept Jesus requests (public/kiosk submission)."""
    model_config = ConfigDict(extra="ignore")

    # Requester info
    member_id: str = Field(...)
    full_name: str = Field(..., min_length=1, max_length=200)
    phone: str = Field(..., max_length=20)
    email: Optional[EmailStr] = Field(None)
    notes: Optional[str] = Field(None, max_length=2000)

    # Type-specific data
    commitment_type: CommitmentTypeLiteral = Field(...)
    prayer_read: bool = Field(default=False)
    follow_up_requested: bool = Field(default=True)

    @field_validator('email', mode='before')
    @classmethod
    def empty_string_to_none(cls, v):
        if v == '' or v is None:
            return None
        return v


class BaptismCreate(BaseModel):
    """Create model for Baptism requests (public/kiosk submission)."""
    model_config = ConfigDict(extra="ignore")

    # Requester info
    member_id: str = Field(...)
    full_name: str = Field(..., min_length=1, max_length=200)
    phone: str = Field(..., max_length=20)
    email: Optional[EmailStr] = Field(None)
    notes: Optional[str] = Field(None, max_length=2000)

    # Type-specific data
    preferred_date: Optional[date] = Field(None)
    previous_baptism: bool = Field(default=False)
    testimony: Optional[str] = Field(None, max_length=2000)

    @field_validator('email', mode='before')
    @classmethod
    def empty_string_to_none(cls, v):
        if v == '' or v is None:
            return None
        return v


class ChildDedicationCreate(BaseModel):
    """Create model for Child Dedication requests (public/kiosk submission)."""
    model_config = ConfigDict(extra="ignore")

    # Requester info (the submitting parent)
    member_id: str = Field(...)
    full_name: str = Field(..., min_length=1, max_length=200)
    phone: str = Field(..., max_length=20)
    email: Optional[EmailStr] = Field(None)
    notes: Optional[str] = Field(None, max_length=2000)

    # Father info
    father: PersonInfoCreate = Field(...)
    # Mother info
    mother: PersonInfoCreate = Field(...)
    # Child info (photo required)
    child: ChildInfoCreate = Field(...)

    # Optional scheduling
    preferred_date: Optional[date] = Field(None)

    @field_validator('email', mode='before')
    @classmethod
    def empty_string_to_none(cls, v):
        if v == '' or v is None:
            return None
        return v


class HolyMatrimonyCreate(BaseModel):
    """Create model for Holy Matrimony requests (public/kiosk submission)."""
    model_config = ConfigDict(extra="ignore")

    # Requester info
    member_id: str = Field(...)
    full_name: str = Field(..., min_length=1, max_length=200)
    phone: str = Field(..., max_length=20)
    email: Optional[EmailStr] = Field(None)
    notes: Optional[str] = Field(None, max_length=2000)

    # Person A (submitter)
    person_a: PersonInfoCreate = Field(...)
    # Person B (partner)
    person_b: PersonInfoCreate = Field(...)

    # Wedding details
    planned_wedding_date: Optional[date] = Field(None)
    venue_preference: Optional[Literal["church", "offsite", "undecided"]] = Field(None)

    @field_validator('email', mode='before')
    @classmethod
    def empty_string_to_none(cls, v):
        if v == '' or v is None:
            return None
        return v


# =============================================================================
# UPDATE MODEL
# =============================================================================

class MemberCareRequestUpdate(BaseModel):
    """Update model for any member care request (admin operations)."""
    model_config = ConfigDict(extra="ignore")

    # Status update
    status: Optional[RequestStatusLiteral] = Field(None)

    # Assignment
    assigned_to_user_id: Optional[str] = Field(None)

    # Notes
    internal_notes: Optional[str] = Field(None, max_length=2000)
    notes: Optional[str] = Field(None, max_length=2000)

    # Scheduling (for baptism, child dedication, matrimony)
    scheduled_date: Optional[date] = Field(None)
    location: Optional[str] = Field(None, max_length=500)

    # Type-specific updates (only one should be provided based on request_type)
    accept_jesus_data: Optional[AcceptJesusData] = Field(None)
    baptism_data: Optional[BaptismData] = Field(None)
    child_dedication_data: Optional[ChildDedicationData] = Field(None)
    holy_matrimony_data: Optional[HolyMatrimonyData] = Field(None)


# =============================================================================
# FULL MODEL (Database Document)
# =============================================================================

class MemberCareRequest(BaseModel):
    """Full member care request model for database storage."""
    model_config = ConfigDict(extra="ignore")

    # Identity
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: str = Field(..., description="Church ID for multi-tenant isolation")
    request_type: RequestTypeLiteral = Field(..., description="Type of request")

    # Requester info
    member_id: str = Field(..., description="Member ID of the requester")
    full_name: str = Field(..., min_length=1, max_length=200)
    phone: str = Field(..., max_length=20)
    email: Optional[EmailStr] = Field(None)

    # Status workflow
    status: RequestStatusLiteral = Field(default="new")

    # Assignment
    assigned_to_user_id: Optional[str] = Field(None, description="Staff member assigned")

    # Notes
    notes: Optional[str] = Field(None, max_length=2000, description="Requester notes")
    internal_notes: Optional[str] = Field(None, max_length=2000, description="Staff internal notes")

    # Source tracking
    source: RequestSourceLiteral = Field(default="kiosk", description="Source of submission")

    # Type-specific data (only one populated based on request_type)
    accept_jesus_data: Optional[AcceptJesusData] = Field(None)
    baptism_data: Optional[BaptismData] = Field(None)
    child_dedication_data: Optional[ChildDedicationData] = Field(None)
    holy_matrimony_data: Optional[HolyMatrimonyData] = Field(None)

    # Timestamps for status transitions
    contacted_at: Optional[datetime] = Field(None)
    scheduled_at: Optional[datetime] = Field(None)
    completed_at: Optional[datetime] = Field(None)
    cancelled_at: Optional[datetime] = Field(None)

    # Tracking
    created_by: Optional[str] = Field(None, description="User/member who created")
    updated_by: Optional[str] = Field(None, description="User who last updated")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # WhatsApp notification tracking
    staff_notified: bool = Field(default=False, description="Whether staff was notified")
    staff_notified_at: Optional[datetime] = Field(None)
    notification_message_id: Optional[str] = Field(None, description="WhatsApp message ID")


# =============================================================================
# RESPONSE MODELS
# =============================================================================

class MemberCareRequestResponse(MemberCareRequest):
    """Response model with additional computed/enriched fields."""
    model_config = ConfigDict(extra="ignore")

    # Enriched member info (populated by service layer)
    member_info: Optional[Dict[str, Any]] = Field(None, description="Enriched member data")
    assigned_to_info: Optional[Dict[str, Any]] = Field(None, description="Enriched assigned staff data")

    # Convenience field for member photo (enriched from member record)
    member_photo: Optional[str] = Field(None, description="Member photo URL (from member record)")


class MemberCareRequestListResponse(BaseModel):
    """Response model for paginated list of requests."""
    model_config = ConfigDict(extra="ignore")

    data: List[MemberCareRequestResponse] = Field(default_factory=list)
    pagination: Dict[str, Any] = Field(default_factory=dict)


class UnreadCountsResponse(BaseModel):
    """Response model for unread counts per request type."""
    model_config = ConfigDict(extra="ignore")

    accept_jesus: int = Field(default=0)
    baptism: int = Field(default=0)
    child_dedication: int = Field(default=0)
    holy_matrimony: int = Field(default=0)
    total: int = Field(default=0)


class MemberCareSubmissionResponse(BaseModel):
    """Response model for successful submission."""
    model_config = ConfigDict(extra="ignore")

    success: bool = Field(default=True)
    message: str = Field(...)
    message_key: str = Field(..., description="i18n key for message")
    request_id: str = Field(...)
    request_type: RequestTypeLiteral = Field(...)


# =============================================================================
# GUIDED PRAYER MODELS
# =============================================================================

class GuidedPrayerConfig(BaseModel):
    """Configuration for guided prayer in Accept Jesus flow."""
    model_config = ConfigDict(extra="ignore")

    prayer_en: str = Field(..., description="English guided prayer text")
    prayer_id: str = Field(..., description="Indonesian guided prayer text")

    @classmethod
    def get_default(cls) -> "GuidedPrayerConfig":
        """Return default guided prayer texts."""
        return cls(
            prayer_en="""Lord Jesus,

I come to You today acknowledging that I am a sinner in need of a Savior. I believe that You are the Son of God, that You died on the cross for my sins, and that You rose again on the third day.

I confess my sins to You and ask for Your forgiveness. I turn away from my old life and turn to You. I invite You into my heart as my Lord and Savior.

Thank You for Your unconditional love and for the gift of eternal life. Help me to live for You each day, to follow Your ways, and to grow in my relationship with You.

I surrender my life to You completely. Lead me, guide me, and fill me with Your Holy Spirit.

In Jesus' name I pray, Amen.""",

            prayer_id="""Tuhan Yesus,

Saya datang kepada-Mu hari ini mengakui bahwa saya adalah orang berdosa yang membutuhkan Juruselamat. Saya percaya bahwa Engkau adalah Anak Allah, bahwa Engkau mati di kayu salib untuk dosa-dosa saya, dan bahwa Engkau bangkit pada hari ketiga.

Saya mengakui dosa-dosa saya kepada-Mu dan memohon pengampunan-Mu. Saya berpaling dari kehidupan lama saya dan berbalik kepada-Mu. Saya mengundang-Mu masuk ke dalam hati saya sebagai Tuhan dan Juruselamat saya.

Terima kasih untuk kasih-Mu yang tanpa syarat dan untuk karunia hidup kekal. Tolong saya untuk hidup bagi-Mu setiap hari, untuk mengikuti jalan-jalan-Mu, dan untuk bertumbuh dalam hubungan saya dengan-Mu.

Saya menyerahkan hidup saya kepada-Mu sepenuhnya. Pimpin saya, bimbing saya, dan penuhi saya dengan Roh Kudus-Mu.

Dalam nama Yesus saya berdoa, Amin."""
        )


# =============================================================================
# MEMBER SEARCH MODELS
# =============================================================================

class MemberSearchResult(BaseModel):
    """Result item for member search."""
    model_config = ConfigDict(extra="ignore")

    id: str = Field(...)
    full_name: str = Field(...)
    phone_whatsapp: Optional[str] = Field(None)
    photo_url: Optional[str] = Field(None)
    photo_thumbnail_url: Optional[str] = Field(None)
    membership_status: Optional[str] = Field(None)


class MemberSearchResponse(BaseModel):
    """Response model for member search."""
    model_config = ConfigDict(extra="ignore")

    members: List[MemberSearchResult] = Field(default_factory=list)
    total: int = Field(default=0)
    query: str = Field(...)
