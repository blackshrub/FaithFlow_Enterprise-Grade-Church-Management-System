"""
Call Models

MongoDB schemas for voice/video calling functionality.
Stores call logs, participant info, and call history.
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field


class CallType(str, Enum):
    """Type of call"""
    VOICE = "voice"
    VIDEO = "video"


class CallStatus(str, Enum):
    """Call lifecycle status"""
    RINGING = "ringing"        # Call initiated, waiting for answer
    CONNECTING = "connecting"  # Call accepted, establishing connection
    ACTIVE = "active"          # Call in progress
    ENDED = "ended"            # Call ended normally
    MISSED = "missed"          # Call not answered
    REJECTED = "rejected"      # Call declined by recipient
    FAILED = "failed"          # Technical failure
    BUSY = "busy"              # Recipient on another call


class CallEndReason(str, Enum):
    """Reason why call ended"""
    NORMAL = "normal"              # Normal hang up
    MISSED = "missed"              # Not answered (timeout)
    REJECTED = "rejected"          # Declined by recipient
    BUSY = "busy"                  # Recipient busy
    FAILED = "failed"              # Technical failure
    NETWORK_ERROR = "network_error"
    TIMEOUT = "timeout"
    CANCELLED = "cancelled"        # Caller cancelled before answer


class ParticipantRole(str, Enum):
    """Role in the call"""
    CALLER = "caller"
    CALLEE = "callee"


class CallParticipant(BaseModel):
    """Participant in a call"""
    member_id: str
    member_name: str
    member_avatar: Optional[str] = None
    role: ParticipantRole
    joined_at: Optional[datetime] = None
    left_at: Optional[datetime] = None
    is_muted: bool = False
    is_video_enabled: bool = True
    is_speaker_on: bool = False


class CallCreate(BaseModel):
    """Request to create a new call"""
    call_type: CallType
    caller_id: str
    callee_ids: List[str]  # Support group calls
    community_id: Optional[str] = None
    subgroup_id: Optional[str] = None


class CallResponse(BaseModel):
    """Response after call action"""
    call_id: str
    room_name: str
    livekit_token: str
    livekit_url: str
    call_type: CallType
    participants: List[CallParticipant]


class CallLog(BaseModel):
    """Complete call log entry stored in MongoDB"""
    call_id: str = Field(..., description="Unique call identifier")
    church_id: str = Field(..., description="Church tenant ID")
    room_name: str = Field(..., description="LiveKit room name")
    call_type: CallType
    status: CallStatus = CallStatus.RINGING

    # Participants
    caller: CallParticipant
    callees: List[CallParticipant]

    # Context (optional - for community calls)
    community_id: Optional[str] = None
    community_name: Optional[str] = None
    subgroup_id: Optional[str] = None
    subgroup_name: Optional[str] = None

    # Timestamps
    initiated_at: datetime = Field(default_factory=datetime.utcnow)
    answered_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_seconds: int = 0

    # End reason
    end_reason: Optional[CallEndReason] = None

    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class CallHistoryItem(BaseModel):
    """Simplified call history for listing"""
    call_id: str
    call_type: CallType
    status: CallStatus
    caller_id: str
    caller_name: str
    caller_avatar: Optional[str] = None
    callee_ids: List[str]
    callee_names: List[str]
    initiated_at: datetime
    duration_seconds: int
    end_reason: Optional[CallEndReason] = None
    is_incoming: bool  # Relative to the querying user


class CallHistoryResponse(BaseModel):
    """Paginated call history response"""
    calls: List[CallHistoryItem]
    total: int
    page: int
    page_size: int
    has_more: bool


class ActiveCallInfo(BaseModel):
    """Info about an active call"""
    call_id: str
    room_name: str
    call_type: CallType
    status: CallStatus
    participants: List[CallParticipant]
    started_at: datetime
    duration_seconds: int


class CallStatsResponse(BaseModel):
    """Call statistics for analytics"""
    total_calls: int
    total_duration_seconds: int
    voice_calls: int
    video_calls: int
    missed_calls: int
    average_duration_seconds: float
