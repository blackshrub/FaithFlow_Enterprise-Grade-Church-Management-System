"""
Crash Log Model

Stores mobile app crash reports and errors for monitoring and debugging.
Used by the admin dashboard to track app health and user experience issues.
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List, Literal
from datetime import datetime
import uuid


class DeviceInfo(BaseModel):
    """Device information for crash context"""
    platform: Literal["ios", "android", "web"] = Field(..., description="Platform")
    os_version: Optional[str] = Field(None, description="OS version (e.g., '17.1', '14')")
    device_model: Optional[str] = Field(None, description="Device model (e.g., 'iPhone 15', 'Pixel 8')")
    app_version: str = Field(..., description="App version (e.g., '1.0.0')")
    build_number: Optional[str] = Field(None, description="Build number")
    locale: Optional[str] = Field(None, description="Device locale (e.g., 'en-US', 'id-ID')")
    timezone: Optional[str] = Field(None, description="Device timezone")
    is_tablet: bool = Field(False, description="Whether device is a tablet")


class UserContext(BaseModel):
    """User context for crash attribution"""
    member_id: Optional[str] = Field(None, description="Member ID if logged in")
    church_id: Optional[str] = Field(None, description="Church ID if known")
    is_authenticated: bool = Field(False, description="Whether user was authenticated")
    session_duration_ms: Optional[int] = Field(None, description="Session duration before crash")


class CrashLogBase(BaseModel):
    """Base model for crash log entry"""
    # Error details
    error_type: str = Field(..., description="Error type/name (e.g., 'TypeError', 'NetworkError')")
    error_message: str = Field(..., description="Error message")
    stack_trace: Optional[str] = Field(None, description="Full stack trace")

    # Context
    screen_name: Optional[str] = Field(None, description="Screen where crash occurred")
    component_name: Optional[str] = Field(None, description="Component that threw error")
    action: Optional[str] = Field(None, description="User action that triggered crash")

    # Device & user info
    device_info: DeviceInfo = Field(..., description="Device information")
    user_context: Optional[UserContext] = Field(None, description="User context")

    # Network state
    is_online: bool = Field(True, description="Whether device was online")
    network_type: Optional[str] = Field(None, description="Network type (wifi, cellular)")

    # Additional data
    extra_data: Optional[Dict[str, Any]] = Field(None, description="Additional debug data")
    breadcrumbs: Optional[List[str]] = Field(None, description="User action breadcrumbs before crash")


class CrashLogCreate(CrashLogBase):
    """Model for creating a crash log entry (public endpoint, no auth required)"""
    pass


class CrashLog(CrashLogBase):
    """Full crash log model with server-generated fields"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique ID")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="When crash occurred")
    reported_at: datetime = Field(default_factory=datetime.utcnow, description="When crash was reported")
    ip_address: Optional[str] = Field(None, description="Client IP address")

    # Admin tracking
    status: Literal["new", "investigating", "resolved", "ignored"] = Field(
        default="new", description="Resolution status"
    )
    resolved_at: Optional[datetime] = Field(None, description="When issue was resolved")
    resolved_by: Optional[str] = Field(None, description="Admin who resolved the issue")
    notes: Optional[str] = Field(None, description="Admin notes")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "crash_123e4567-e89b-12d3-a456-426614174000",
                "error_type": "TypeError",
                "error_message": "Cannot read property 'map' of undefined",
                "stack_trace": "TypeError: Cannot read property 'map' of undefined\n    at EventList (/app/screens/events.tsx:42:15)",
                "screen_name": "events",
                "component_name": "EventList",
                "device_info": {
                    "platform": "ios",
                    "os_version": "17.1",
                    "device_model": "iPhone 15 Pro",
                    "app_version": "1.0.0",
                    "locale": "id-ID"
                },
                "user_context": {
                    "member_id": "member_123",
                    "church_id": "church_456",
                    "is_authenticated": True
                },
                "is_online": True,
                "timestamp": "2024-11-30T10:30:00Z",
                "status": "new"
            }
        }


class CrashLogUpdate(BaseModel):
    """Model for updating crash log status (admin only)"""
    status: Optional[Literal["new", "investigating", "resolved", "ignored"]] = None
    notes: Optional[str] = None


class CrashLogStats(BaseModel):
    """Aggregated crash statistics"""
    total_crashes: int = Field(0, description="Total crash count")
    crashes_today: int = Field(0, description="Crashes in last 24 hours")
    crashes_this_week: int = Field(0, description="Crashes in last 7 days")
    affected_users: int = Field(0, description="Unique affected users")
    top_errors: List[Dict[str, Any]] = Field(default_factory=list, description="Most common errors")
    crashes_by_platform: Dict[str, int] = Field(default_factory=dict, description="Crashes by platform")
    crashes_by_version: Dict[str, int] = Field(default_factory=dict, description="Crashes by app version")
    crashes_by_screen: Dict[str, int] = Field(default_factory=dict, description="Crashes by screen")
    resolution_rate: float = Field(0.0, description="Percentage of resolved crashes")
