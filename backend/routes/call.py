"""
Call Routes

FastAPI endpoints for voice/video calling functionality.

Endpoints:
- POST /api/calls - Initiate a new call
- POST /api/calls/{call_id}/accept - Accept incoming call
- POST /api/calls/{call_id}/reject - Reject incoming call
- POST /api/calls/{call_id}/cancel - Cancel outgoing call
- POST /api/calls/{call_id}/end - End active call
- PATCH /api/calls/{call_id}/participant - Update participant status
- GET /api/calls/active - Get active call
- GET /api/calls/history - Get call history
- GET /api/calls/stats - Get call statistics
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel

from models.call import (
    CallType,
    CallResponse,
    CallHistoryResponse,
    ActiveCallInfo,
    CallStatsResponse
)
from services.call_service import CallService, get_call_service
from utils.dependencies import (
    get_current_user,
    get_db,
    get_session_church_id
)

router = APIRouter(prefix="/api/calls", tags=["calls"])


# =============================================================================
# Request/Response Models
# =============================================================================

class InitiateCallRequest(BaseModel):
    """Request to initiate a new call."""
    callee_ids: List[str]
    call_type: CallType
    community_id: Optional[str] = None
    subgroup_id: Optional[str] = None


class RejectCallRequest(BaseModel):
    """Request to reject a call."""
    reason: str = "rejected"  # "rejected" or "busy"


class EndCallRequest(BaseModel):
    """Request to end a call."""
    reason: str = "normal"  # "normal", "failed", "network_error"


class UpdateParticipantRequest(BaseModel):
    """Request to update participant status."""
    is_muted: Optional[bool] = None
    is_video_enabled: Optional[bool] = None
    is_speaker_on: Optional[bool] = None


# =============================================================================
# Routes
# =============================================================================

@router.post("", response_model=CallResponse)
async def initiate_call(
    request: InitiateCallRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """
    Initiate a new voice or video call.

    - Validates caller is not already in a call
    - Checks callees availability
    - Creates LiveKit room and generates tokens
    - Sends call invitations via MQTT
    """
    church_id = get_session_church_id(current_user)
    caller_id = current_user.get("member_id") or current_user.get("sub")

    if not caller_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Member ID not found in token"
        )

    service = get_call_service(db)

    return await service.initiate_call(
        church_id=church_id,
        caller_id=caller_id,
        callee_ids=request.callee_ids,
        call_type=request.call_type,
        community_id=request.community_id,
        subgroup_id=request.subgroup_id
    )


@router.post("/{call_id}/accept", response_model=CallResponse)
async def accept_call(
    call_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """
    Accept an incoming call.

    - Validates call is in ringing state
    - Generates LiveKit token for callee
    - Updates call status to connecting
    - Notifies caller via MQTT
    """
    church_id = get_session_church_id(current_user)
    callee_id = current_user.get("member_id") or current_user.get("sub")

    if not callee_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Member ID not found in token"
        )

    service = get_call_service(db)

    return await service.accept_call(
        church_id=church_id,
        call_id=call_id,
        callee_id=callee_id
    )


@router.post("/{call_id}/reject")
async def reject_call(
    call_id: str,
    request: RejectCallRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """
    Reject an incoming call.

    - Notifies caller of rejection
    - For single callee: ends call
    - For group calls: removes callee from call
    """
    church_id = get_session_church_id(current_user)
    callee_id = current_user.get("member_id") or current_user.get("sub")

    if not callee_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Member ID not found in token"
        )

    service = get_call_service(db)

    await service.reject_call(
        church_id=church_id,
        call_id=call_id,
        callee_id=callee_id,
        reason=request.reason
    )

    return {"message": "Call rejected"}


@router.post("/{call_id}/cancel")
async def cancel_call(
    call_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """
    Cancel an outgoing call before it's answered.

    - Only caller can cancel
    - Notifies all callees
    - Marks call as cancelled
    """
    church_id = get_session_church_id(current_user)
    caller_id = current_user.get("member_id") or current_user.get("sub")

    if not caller_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Member ID not found in token"
        )

    service = get_call_service(db)

    await service.cancel_call(
        church_id=church_id,
        call_id=call_id,
        caller_id=caller_id
    )

    return {"message": "Call cancelled"}


@router.post("/{call_id}/end")
async def end_call(
    call_id: str,
    request: EndCallRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """
    End an active call.

    - Any participant can end the call
    - Deletes LiveKit room
    - Notifies all participants
    - Records call duration
    """
    church_id = get_session_church_id(current_user)
    member_id = current_user.get("member_id") or current_user.get("sub")

    if not member_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Member ID not found in token"
        )

    service = get_call_service(db)

    await service.end_call(
        church_id=church_id,
        call_id=call_id,
        ended_by=member_id,
        reason=request.reason
    )

    return {"message": "Call ended"}


@router.post("/{call_id}/connected")
async def mark_connected(
    call_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """
    Mark call as connected when WebRTC connection is established.

    Called by client after successfully connecting to LiveKit.
    """
    church_id = get_session_church_id(current_user)
    member_id = current_user.get("member_id") or current_user.get("sub")

    if not member_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Member ID not found in token"
        )

    service = get_call_service(db)

    await service.mark_call_connected(
        church_id=church_id,
        call_id=call_id,
        participant_id=member_id
    )

    return {"message": "Call connected"}


@router.patch("/{call_id}/participant")
async def update_participant(
    call_id: str,
    request: UpdateParticipantRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """
    Update participant status (mute, video, speaker).

    - Updates local state
    - Broadcasts change to other participants via MQTT
    """
    church_id = get_session_church_id(current_user)
    member_id = current_user.get("member_id") or current_user.get("sub")

    if not member_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Member ID not found in token"
        )

    service = get_call_service(db)

    await service.update_participant_status(
        church_id=church_id,
        call_id=call_id,
        participant_id=member_id,
        is_muted=request.is_muted,
        is_video_enabled=request.is_video_enabled,
        is_speaker_on=request.is_speaker_on
    )

    return {"message": "Participant updated"}


@router.get("/active", response_model=Optional[ActiveCallInfo])
async def get_active_call(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """
    Get active call for current user.

    Returns None if user is not in an active call.
    """
    church_id = get_session_church_id(current_user)
    member_id = current_user.get("member_id") or current_user.get("sub")

    if not member_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Member ID not found in token"
        )

    service = get_call_service(db)

    return await service.get_active_call(
        church_id=church_id,
        member_id=member_id
    )


@router.get("/history", response_model=CallHistoryResponse)
async def get_call_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    call_type: Optional[CallType] = None,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """
    Get call history for current user.

    - Paginated results
    - Optional filter by call type
    - Sorted by most recent first
    """
    church_id = get_session_church_id(current_user)
    member_id = current_user.get("member_id") or current_user.get("sub")

    if not member_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Member ID not found in token"
        )

    service = get_call_service(db)

    return await service.get_call_history(
        church_id=church_id,
        member_id=member_id,
        page=page,
        page_size=page_size,
        call_type=call_type
    )


@router.get("/stats", response_model=CallStatsResponse)
async def get_call_stats(
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """
    Get call statistics for current user.

    - Total calls, duration, missed calls
    - Voice vs video breakdown
    - Configurable time range
    """
    church_id = get_session_church_id(current_user)
    member_id = current_user.get("member_id") or current_user.get("sub")

    if not member_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Member ID not found in token"
        )

    service = get_call_service(db)

    return await service.get_call_stats(
        church_id=church_id,
        member_id=member_id,
        days=days
    )
