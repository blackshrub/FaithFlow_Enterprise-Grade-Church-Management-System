"""
Notification Template Models for Reusable Push Notification Content.

Templates allow admins to create and save notification content for reuse.
Supports variable substitution for personalization.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
import uuid


# =============================================================================
# TEMPLATE VARIABLES
# =============================================================================

class TemplateVariable(BaseModel):
    """A variable that can be substituted in templates."""
    key: str = Field(..., description="Variable key (e.g., 'member_name')")
    description: str = Field(..., description="Human-readable description")
    example: str = Field(..., description="Example value for preview")
    default: Optional[str] = Field(None, description="Default value if not provided")


# Available system variables for templates
SYSTEM_VARIABLES: List[TemplateVariable] = [
    TemplateVariable(
        key="member_name",
        description="Member's full name",
        example="John Doe"
    ),
    TemplateVariable(
        key="first_name",
        description="Member's first name",
        example="John"
    ),
    TemplateVariable(
        key="church_name",
        description="Church name",
        example="Grace Community Church"
    ),
    TemplateVariable(
        key="event_name",
        description="Event name (when linking to event)",
        example="Sunday Service"
    ),
    TemplateVariable(
        key="event_date",
        description="Event date formatted",
        example="Sunday, January 15"
    ),
    TemplateVariable(
        key="group_name",
        description="Cell group name",
        example="Youth Fellowship"
    ),
    TemplateVariable(
        key="current_date",
        description="Today's date",
        example="January 15, 2025"
    ),
    TemplateVariable(
        key="current_day",
        description="Day of the week",
        example="Sunday"
    ),
]


# =============================================================================
# TEMPLATE MODELS
# =============================================================================

class NotificationTemplateCreate(BaseModel):
    """Model for creating a notification template."""
    name: str = Field(..., min_length=1, max_length=100, description="Template name")
    description: Optional[str] = Field(None, max_length=500, description="Template description")
    category: str = Field(
        default="general",
        description="Template category for organization"
    )

    # Template content
    title: str = Field(..., min_length=1, max_length=100, description="Notification title (supports {{variables}})")
    body: str = Field(..., min_length=1, max_length=500, description="Notification body (supports {{variables}})")

    # Optional defaults
    image_url: Optional[str] = Field(None, description="Default image URL")
    action_type: Literal["none", "article", "event", "url", "screen"] = Field(
        default="none", description="Default action type"
    )
    action_data: Optional[Dict[str, Any]] = Field(None, description="Default action data")
    priority: Literal["normal", "high"] = Field(default="normal", description="Default priority")

    # Custom variables (beyond system variables)
    custom_variables: List[TemplateVariable] = Field(
        default_factory=list,
        description="Custom variables used in this template"
    )

    # Tags for filtering
    tags: List[str] = Field(default_factory=list, description="Tags for categorization")


class NotificationTemplateUpdate(BaseModel):
    """Model for updating a notification template."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    category: Optional[str] = None
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    body: Optional[str] = Field(None, min_length=1, max_length=500)
    image_url: Optional[str] = None
    action_type: Optional[Literal["none", "article", "event", "url", "screen"]] = None
    action_data: Optional[Dict[str, Any]] = None
    priority: Optional[Literal["normal", "high"]] = None
    custom_variables: Optional[List[TemplateVariable]] = None
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None


class NotificationTemplate(BaseModel):
    """Full notification template model."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: str = Field(..., description="Church ID for multi-tenant isolation")

    # Template metadata
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    category: str = "general"

    # Template content
    title: str = Field(..., min_length=1, max_length=100)
    body: str = Field(..., min_length=1, max_length=500)

    # Defaults
    image_url: Optional[str] = None
    action_type: Literal["none", "article", "event", "url", "screen"] = "none"
    action_data: Optional[Dict[str, Any]] = None
    priority: Literal["normal", "high"] = "normal"

    # Variables
    custom_variables: List[TemplateVariable] = Field(default_factory=list)

    # Organization
    tags: List[str] = Field(default_factory=list)
    is_active: bool = True

    # Usage tracking
    usage_count: int = Field(default=0, description="Number of times this template has been used")
    last_used_at: Optional[datetime] = None

    # Audit fields
    created_by: str = Field(..., description="User ID who created the template")
    updated_by: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# =============================================================================
# API RESPONSE MODELS
# =============================================================================

class NotificationTemplateResponse(BaseModel):
    """Response model for single template."""
    id: str
    church_id: str
    name: str
    description: Optional[str] = None
    category: str
    title: str
    body: str
    image_url: Optional[str] = None
    action_type: str
    action_data: Optional[Dict[str, Any]] = None
    priority: str
    custom_variables: List[TemplateVariable] = []
    tags: List[str] = []
    is_active: bool
    usage_count: int
    last_used_at: Optional[datetime] = None
    created_by: str
    created_at: datetime
    updated_at: datetime


class NotificationTemplateListResponse(BaseModel):
    """Response model for template list with pagination."""
    data: List[NotificationTemplateResponse]
    total: int
    limit: int
    offset: int


class TemplatePreviewRequest(BaseModel):
    """Request model for previewing a template with variables."""
    variables: Dict[str, str] = Field(
        default_factory=dict,
        description="Variable values for substitution"
    )


class TemplatePreviewResponse(BaseModel):
    """Response model for template preview."""
    title: str
    body: str
    image_url: Optional[str] = None
    action_type: str
    action_data: Optional[Dict[str, Any]] = None


class SystemVariablesResponse(BaseModel):
    """Response model for available system variables."""
    variables: List[TemplateVariable]


class CreateFromTemplateRequest(BaseModel):
    """Request to create a campaign from a template."""
    variables: Dict[str, str] = Field(
        default_factory=dict,
        description="Variable values for substitution"
    )
    # Optional overrides
    title_override: Optional[str] = None
    body_override: Optional[str] = None
    image_url_override: Optional[str] = None
