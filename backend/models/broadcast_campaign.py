"""
Broadcast Campaign Models for Push Notification Management.

Handles campaign creation, audience targeting, scheduling, and delivery tracking.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
import uuid


# =============================================================================
# AUDIENCE TARGETING
# =============================================================================

class AudienceFilter(BaseModel):
    """
    Audience targeting configuration for broadcast campaigns.

    Supports multiple targeting methods:
    - all: Send to all active members
    - groups: Send to members in specific cell groups
    - status: Send to members with specific membership status
    - demographics: Filter by age, gender, marital status
    - custom: Send to specific member list
    """
    target_type: Literal["all", "groups", "status", "demographics", "custom"] = "all"

    # Target by cell group
    group_ids: List[str] = Field(default_factory=list, description="Cell group IDs to target")

    # Target by member status
    member_status_ids: List[str] = Field(default_factory=list, description="Member status IDs to target")

    # Target by demographics
    gender: Optional[Literal["Male", "Female"]] = Field(None, description="Filter by gender")
    age_min: Optional[int] = Field(None, ge=0, le=150, description="Minimum age")
    age_max: Optional[int] = Field(None, ge=0, le=150, description="Maximum age")
    marital_status: Optional[Literal["Married", "Not Married", "Widower", "Widow"]] = Field(
        None, description="Filter by marital status"
    )

    # Custom member list
    member_ids: List[str] = Field(default_factory=list, description="Specific member IDs to target")

    # Exclusion list (works with all target types)
    exclude_member_ids: List[str] = Field(default_factory=list, description="Member IDs to exclude")


# =============================================================================
# DELIVERY STATISTICS
# =============================================================================

class DeliveryStats(BaseModel):
    """Delivery statistics for a broadcast campaign."""
    total_recipients: int = Field(default=0, description="Total members targeted")
    sent_count: int = Field(default=0, description="Successfully sent")
    failed_count: int = Field(default=0, description="Failed to send")
    pending_count: int = Field(default=0, description="Pending delivery")


# =============================================================================
# CAMPAIGN CREATE/UPDATE MODELS
# =============================================================================

class BroadcastCampaignCreate(BaseModel):
    """Model for creating a new broadcast campaign."""
    title: str = Field(..., min_length=1, max_length=100, description="Notification title")
    body: str = Field(..., min_length=1, max_length=500, description="Notification body/message")

    # Rich media
    image_url: Optional[str] = Field(None, description="Image URL for rich notification (SeaweedFS)")
    image_fid: Optional[str] = Field(None, description="SeaweedFS file ID for the image")

    # Deep linking - what happens when user taps notification
    action_type: Literal["none", "article", "event", "url", "screen"] = Field(
        default="none", description="Action to perform on tap"
    )
    action_data: Optional[Dict[str, Any]] = Field(
        None,
        description="Action configuration: article_slug, event_id, url, or screen_name"
    )

    # Audience targeting
    audience: AudienceFilter = Field(default_factory=AudienceFilter)

    # Scheduling
    send_type: Literal["immediate", "scheduled"] = Field(
        default="immediate", description="Send immediately or schedule for later"
    )
    scheduled_at: Optional[datetime] = Field(None, description="Scheduled send time (UTC)")
    scheduled_timezone: Optional[str] = Field(
        None,
        description="Timezone for scheduled time (e.g., 'Asia/Jakarta', 'America/New_York')"
    )

    # Notification settings
    notification_type: str = Field(default="announcement", description="Notification channel type")
    priority: Literal["normal", "high"] = Field(default="normal", description="Notification priority")


class BroadcastCampaignUpdate(BaseModel):
    """Model for updating an existing broadcast campaign."""
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    body: Optional[str] = Field(None, min_length=1, max_length=500)
    image_url: Optional[str] = None
    image_fid: Optional[str] = None
    action_type: Optional[Literal["none", "article", "event", "url", "screen"]] = None
    action_data: Optional[Dict[str, Any]] = None
    audience: Optional[AudienceFilter] = None
    send_type: Optional[Literal["immediate", "scheduled"]] = None
    scheduled_at: Optional[datetime] = None
    scheduled_timezone: Optional[str] = None
    priority: Optional[Literal["normal", "high"]] = None


# =============================================================================
# FULL CAMPAIGN MODEL
# =============================================================================

class BroadcastCampaign(BaseModel):
    """Full broadcast campaign model with all fields."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    church_id: str = Field(..., description="Church ID for multi-tenant isolation")

    # Content
    title: str = Field(..., min_length=1, max_length=100)
    body: str = Field(..., min_length=1, max_length=500)
    image_url: Optional[str] = None
    image_fid: Optional[str] = None

    # Deep linking
    action_type: Literal["none", "article", "event", "url", "screen"] = "none"
    action_data: Optional[Dict[str, Any]] = None

    # Targeting
    audience: AudienceFilter = Field(default_factory=AudienceFilter)

    # Scheduling
    send_type: Literal["immediate", "scheduled"] = "immediate"
    scheduled_at: Optional[datetime] = None
    scheduled_timezone: Optional[str] = None

    # Status
    status: Literal["draft", "scheduled", "sending", "sent", "cancelled", "failed"] = "draft"

    # Notification settings
    notification_type: str = "announcement"
    priority: Literal["normal", "high"] = "normal"

    # Template reference (if created from template)
    template_id: Optional[str] = Field(None, description="ID of template used to create this campaign")

    # Delivery statistics
    stats: DeliveryStats = Field(default_factory=DeliveryStats)

    # Failed recipient details (for debugging)
    failed_recipients: List[Dict[str, Any]] = Field(default_factory=list)
    error_message: Optional[str] = None

    # Archive fields (for bulk archive)
    archived: bool = Field(default=False, description="Whether campaign is archived")
    archived_at: Optional[datetime] = None
    archived_by: Optional[str] = None

    # Audit fields
    created_by: str = Field(..., description="User ID who created the campaign")
    updated_by: Optional[str] = None
    sent_by: Optional[str] = None
    sent_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    cancelled_by: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# =============================================================================
# API RESPONSE MODELS
# =============================================================================

class BroadcastCampaignResponse(BaseModel):
    """Response model for single campaign."""
    id: str
    church_id: str
    title: str
    body: str
    image_url: Optional[str] = None
    image_fid: Optional[str] = None
    action_type: str
    action_data: Optional[Dict[str, Any]] = None
    audience: AudienceFilter
    send_type: str
    scheduled_at: Optional[datetime] = None
    scheduled_timezone: Optional[str] = None
    status: str
    notification_type: str = "announcement"
    priority: str = "normal"
    stats: DeliveryStats
    template_id: Optional[str] = None
    archived: bool = False
    archived_at: Optional[datetime] = None
    created_by: str
    created_at: datetime
    updated_at: datetime
    sent_at: Optional[datetime] = None


class BroadcastCampaignListResponse(BaseModel):
    """Response model for campaign list with pagination."""
    data: List[BroadcastCampaignResponse]
    total: int
    limit: int
    offset: int


class AudienceEstimateRequest(BaseModel):
    """Request model for audience estimation."""
    audience: AudienceFilter


class AudienceEstimateResponse(BaseModel):
    """Response model for audience estimation."""
    total_members: int = Field(description="Total members matching criteria")
    with_push_enabled: int = Field(description="Members with push notifications enabled")
    with_active_devices: int = Field(description="Members with active device tokens")


class BroadcastAnalyticsSummary(BaseModel):
    """Summary analytics for all campaigns."""
    total_campaigns: int
    campaigns_by_status: Dict[str, int]
    total_notifications_sent: int
    total_delivered: int
    total_failed: int
    delivery_rate: float = Field(description="Percentage delivered successfully")


class SendCampaignResponse(BaseModel):
    """Response after sending/scheduling a campaign."""
    success: bool
    message: str
    campaign_id: str
    status: str
    stats: Optional[DeliveryStats] = None
