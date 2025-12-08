"""
WhatsApp Message Template Model

Stores customizable message templates for automated WhatsApp notifications.
Each church can customize their own templates with variable placeholders.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
import uuid


class WhatsAppTemplateType(str, Enum):
    """Types of WhatsApp message templates"""
    ACCEPT_JESUS_CONFIRMATION = "accept_jesus_confirmation"
    BAPTISM_CONFIRMATION = "baptism_confirmation"
    CHILD_DEDICATION_CONFIRMATION = "child_dedication_confirmation"
    HOLY_MATRIMONY_CONFIRMATION = "holy_matrimony_confirmation"


# Available placeholders for each template type
TEMPLATE_PLACEHOLDERS: Dict[WhatsAppTemplateType, List[str]] = {
    WhatsAppTemplateType.ACCEPT_JESUS_CONFIRMATION: [
        "name", "phone", "church_name", "commitment_type"
    ],
    WhatsAppTemplateType.BAPTISM_CONFIRMATION: [
        "name", "phone", "church_name", "preferred_date"
    ],
    WhatsAppTemplateType.CHILD_DEDICATION_CONFIRMATION: [
        "name", "child_name", "child_gender", "father_name", "mother_name", "church_name"
    ],
    WhatsAppTemplateType.HOLY_MATRIMONY_CONFIRMATION: [
        "name", "partner_name", "both_baptized", "planned_date", "church_name"
    ],
}


# Default templates (English)
DEFAULT_TEMPLATES_EN: Dict[WhatsAppTemplateType, str] = {
    WhatsAppTemplateType.ACCEPT_JESUS_CONFIRMATION: """*{{church_name}}*

Dear {{name}},

Thank you for your decision to follow Jesus! Your commitment has been recorded.

Our pastoral team will contact you within 3x24 hours to guide you on your next steps.

God bless you!""",

    WhatsAppTemplateType.BAPTISM_CONFIRMATION: """*{{church_name}}*

Dear {{name}},

Thank you for your baptism request! We have received your registration.

Our team will contact you within 3x24 hours to discuss baptism preparation and scheduling.

God bless you!""",

    WhatsAppTemplateType.CHILD_DEDICATION_CONFIRMATION: """*{{church_name}}*

Dear {{name}},

Thank you for your child dedication request for {{child_name}}!

Parents:
- Father: {{father_name}}
- Mother: {{mother_name}}

Our pastoral team will contact you within 3x24 hours to discuss the dedication ceremony.

God bless your family!""",

    WhatsAppTemplateType.HOLY_MATRIMONY_CONFIRMATION: """*{{church_name}}*

Dear {{name}},

Congratulations! Your holy matrimony request has been received.

Couple: {{name}} & {{partner_name}}

Our pastoral team will contact you within 3x24 hours to discuss pre-marital counseling and wedding preparation.

God bless your union!""",
}


# Default templates (Indonesian)
DEFAULT_TEMPLATES_ID: Dict[WhatsAppTemplateType, str] = {
    WhatsAppTemplateType.ACCEPT_JESUS_CONFIRMATION: """*{{church_name}}*

Kepada {{name}},

Terima kasih atas keputusan Anda untuk mengikut Yesus! Komitmen Anda telah tercatat.

Tim pastoral kami akan menghubungi Anda dalam waktu 3x24 jam untuk membimbing langkah selanjutnya.

Tuhan memberkati!""",

    WhatsAppTemplateType.BAPTISM_CONFIRMATION: """*{{church_name}}*

Kepada {{name}},

Terima kasih atas permohonan baptisan Anda! Pendaftaran Anda telah kami terima.

Tim kami akan menghubungi Anda dalam waktu 3x24 jam untuk membahas persiapan dan jadwal baptisan.

Tuhan memberkati!""",

    WhatsAppTemplateType.CHILD_DEDICATION_CONFIRMATION: """*{{church_name}}*

Kepada {{name}},

Terima kasih atas permohonan penyerahan anak untuk {{child_name}}!

Orang Tua:
- Ayah: {{father_name}}
- Ibu: {{mother_name}}

Tim pastoral kami akan menghubungi Anda dalam waktu 3x24 jam untuk membahas upacara penyerahan.

Tuhan memberkati keluarga Anda!""",

    WhatsAppTemplateType.HOLY_MATRIMONY_CONFIRMATION: """*{{church_name}}*

Kepada {{name}},

Selamat! Permohonan pemberkatan nikah Anda telah diterima.

Pasangan: {{name}} & {{partner_name}}

Tim pastoral kami akan menghubungi Anda dalam waktu 3x24 jam untuk membahas konseling pranikah dan persiapan pernikahan.

Tuhan memberkati persatuan Anda!""",
}


class WhatsAppTemplateCreate(BaseModel):
    """Schema for creating a new WhatsApp template"""
    template_type: WhatsAppTemplateType
    name: str = Field(..., min_length=1, max_length=100)
    message_template_en: str = Field(..., min_length=1)
    message_template_id: str = Field(..., min_length=1)
    attachment_type: Optional[str] = None  # "image" or "pdf"
    is_active: bool = True


class WhatsAppTemplateUpdate(BaseModel):
    """Schema for updating a WhatsApp template"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    message_template_en: Optional[str] = Field(None, min_length=1)
    message_template_id: Optional[str] = Field(None, min_length=1)
    attachment_type: Optional[str] = None
    is_active: Optional[bool] = None


class WhatsAppTemplateAttachment(BaseModel):
    """Schema for template attachment"""
    attachment_type: str  # "image" or "pdf"
    attachment_url: str
    attachment_fid: Optional[str] = None  # SeaweedFS file ID
    attachment_filename: Optional[str] = None


class WhatsAppTemplate(BaseModel):
    """Full WhatsApp template model (database document)"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: str
    template_type: WhatsAppTemplateType
    name: str
    message_template_en: str  # English template
    message_template_id: str  # Indonesian template
    attachment_type: Optional[str] = None  # "image" or "pdf"
    attachment_url: Optional[str] = None  # SeaweedFS URL
    attachment_fid: Optional[str] = None  # SeaweedFS file ID
    attachment_filename: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class WhatsAppTemplateResponse(BaseModel):
    """Response schema for WhatsApp template"""
    id: str
    church_id: str
    template_type: str
    name: str
    message_template_en: str
    message_template_id: str
    attachment_type: Optional[str] = None
    attachment_url: Optional[str] = None
    attachment_filename: Optional[str] = None
    is_active: bool
    available_placeholders: List[str] = []
    created_at: str
    updated_at: str


def get_default_templates(language: str = "en") -> Dict[WhatsAppTemplateType, str]:
    """Get default templates for a specific language"""
    if language == "id":
        return DEFAULT_TEMPLATES_ID
    return DEFAULT_TEMPLATES_EN


def render_template(template: str, variables: Dict[str, Any]) -> str:
    """
    Render a template by replacing {{variable}} placeholders with actual values.

    Args:
        template: The message template string with {{variable}} placeholders
        variables: Dictionary of variable names and values

    Returns:
        The rendered message with placeholders replaced
    """
    rendered = template
    for key, value in variables.items():
        placeholder = "{{" + key + "}}"
        rendered = rendered.replace(placeholder, str(value) if value else "")
    return rendered


def get_template_name(template_type: WhatsAppTemplateType) -> str:
    """Get human-readable name for a template type"""
    names = {
        WhatsAppTemplateType.ACCEPT_JESUS_CONFIRMATION: "Accept Jesus Confirmation",
        WhatsAppTemplateType.BAPTISM_CONFIRMATION: "Baptism Confirmation",
        WhatsAppTemplateType.CHILD_DEDICATION_CONFIRMATION: "Child Dedication Confirmation",
        WhatsAppTemplateType.HOLY_MATRIMONY_CONFIRMATION: "Holy Matrimony Confirmation",
    }
    return names.get(template_type, template_type.value)
