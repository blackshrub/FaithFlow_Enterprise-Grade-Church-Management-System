"""
Call Service

Business logic for voice/video calling functionality.
Orchestrates LiveKit, MQTT signaling, and MongoDB storage.

Features:
- Call initiation and management
- Participant handling
- Call history and logs
- Statistics and analytics
"""

import logging
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timedelta
import uuid

from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi import HTTPException, status

from models.call import (
    CallCreate,
    CallLog,
    CallResponse,
    CallParticipant,
    CallHistoryItem,
    CallHistoryResponse,
    ActiveCallInfo,
    CallStatsResponse,
    CallType,
    CallStatus,
    CallEndReason,
    ParticipantRole
)
from services.livekit_service import LiveKitService, get_livekit_service
from services.call_signaling_service import CallSignalingService, get_call_signaling_service

logger = logging.getLogger(__name__)

# Configuration
CALL_RING_TIMEOUT_SECONDS = 45  # Time to wait for answer before marking as missed
MAX_CALL_DURATION_SECONDS = 4 * 60 * 60  # 4 hours max


class CallServiceError(Exception):
    """Base exception for call operations."""
    pass


class CallService:
    """
    Service for managing voice/video calls.

    Coordinates:
    - LiveKit room creation and token generation
    - MQTT signaling for call events
    - MongoDB storage for call logs
    - Call state management
    """

    def __init__(
        self,
        db: AsyncIOMotorDatabase,
        livekit: Optional[LiveKitService] = None,
        signaling: Optional[CallSignalingService] = None
    ):
        """
        Initialize call service.

        Args:
            db: MongoDB database instance
            livekit: LiveKit service instance
            signaling: Call signaling service instance
        """
        self.db = db
        self.livekit = livekit or get_livekit_service()
        self.signaling = signaling or get_call_signaling_service()
        self.calls_collection = db.calls

    async def _get_member_info(self, member_id: str) -> Dict[str, Any]:
        """Get member info from database."""
        member = await self.db.members.find_one({"member_id": member_id})
        if not member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Member {member_id} not found"
            )
        return {
            "id": member_id,
            "name": f"{member.get('first_name', '')} {member.get('last_name', '')}".strip(),
            "avatar": member.get("avatar_url")
        }

    async def _check_member_in_call(self, member_id: str) -> Optional[str]:
        """Check if member is already in an active call."""
        active_call = await self.calls_collection.find_one({
            "$or": [
                {"caller.member_id": member_id},
                {"callees.member_id": member_id}
            ],
            "status": {"$in": [
                CallStatus.RINGING.value,
                CallStatus.CONNECTING.value,
                CallStatus.ACTIVE.value
            ]}
        })
        return active_call["call_id"] if active_call else None

    # =========================================================================
    # Call Initiation
    # =========================================================================

    async def initiate_call(
        self,
        church_id: str,
        caller_id: str,
        callee_ids: List[str],
        call_type: CallType,
        community_id: Optional[str] = None,
        subgroup_id: Optional[str] = None
    ) -> CallResponse:
        """
        Initiate a new call.

        Args:
            church_id: Church tenant ID
            caller_id: Caller member ID
            callee_ids: List of callee member IDs
            call_type: Voice or video call
            community_id: Optional community context
            subgroup_id: Optional subgroup context

        Returns:
            CallResponse with room info and token

        Raises:
            HTTPException: If caller is busy or callees not found
        """
        # Check if caller is already in a call
        existing_call = await self._check_member_in_call(caller_id)
        if existing_call:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You are already in an active call"
            )

        # Get caller info
        caller_info = await self._get_member_info(caller_id)

        # Get callee info and check availability
        callees = []
        busy_callees = []
        for callee_id in callee_ids:
            callee_info = await self._get_member_info(callee_id)
            existing_call = await self._check_member_in_call(callee_id)
            if existing_call:
                busy_callees.append(callee_info["name"])
            else:
                callees.append(CallParticipant(
                    member_id=callee_id,
                    member_name=callee_info["name"],
                    member_avatar=callee_info.get("avatar"),
                    role=ParticipantRole.CALLEE
                ))

        if not callees:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"All callees are busy: {', '.join(busy_callees)}"
            )

        # Generate call ID and room name
        call_id = str(uuid.uuid4())
        room_name = self.livekit.generate_room_name(church_id, call_id)

        # Generate caller token
        caller_token = self.livekit.generate_token(
            room_name=room_name,
            participant_id=caller_id,
            participant_name=caller_info["name"],
            is_publisher=True,
            is_video_call=call_type == CallType.VIDEO
        )

        # Create call log
        caller_participant = CallParticipant(
            member_id=caller_id,
            member_name=caller_info["name"],
            member_avatar=caller_info.get("avatar"),
            role=ParticipantRole.CALLER
        )

        call_log = CallLog(
            call_id=call_id,
            church_id=church_id,
            room_name=room_name,
            call_type=call_type,
            status=CallStatus.RINGING,
            caller=caller_participant,
            callees=callees,
            community_id=community_id,
            subgroup_id=subgroup_id
        )

        # Store in MongoDB
        await self.calls_collection.insert_one(call_log.model_dump())

        # Get community info if applicable
        community_name = None
        if community_id:
            community = await self.db.communities.find_one({"community_id": community_id})
            if community:
                community_name = community.get("name")

        # Send call invitations via MQTT
        livekit_url = self.livekit.url.replace("ws://", "wss://").replace("http://", "https://")
        await self.signaling.send_call_invite(
            church_id=church_id,
            call_id=call_id,
            room_name=room_name,
            call_type=call_type.value,
            caller_id=caller_id,
            caller_name=caller_info["name"],
            caller_avatar=caller_info.get("avatar"),
            callee_ids=[c.member_id for c in callees],
            community_id=community_id,
            community_name=community_name,
            livekit_url=livekit_url
        )

        logger.info(f"Call {call_id} initiated by {caller_id} to {[c.member_id for c in callees]}")

        return CallResponse(
            call_id=call_id,
            room_name=room_name,
            livekit_token=caller_token,
            livekit_url=livekit_url,
            call_type=call_type,
            participants=[caller_participant] + callees
        )

    # =========================================================================
    # Call Response Handling
    # =========================================================================

    async def accept_call(
        self,
        church_id: str,
        call_id: str,
        callee_id: str
    ) -> CallResponse:
        """
        Accept an incoming call.

        Args:
            church_id: Church tenant ID
            call_id: Call ID to accept
            callee_id: Callee member ID accepting

        Returns:
            CallResponse with room info and token

        Raises:
            HTTPException: If call not found or already handled
        """
        # Get call from database
        call = await self.calls_collection.find_one({
            "call_id": call_id,
            "church_id": church_id
        })

        if not call:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Call not found"
            )

        if call["status"] != CallStatus.RINGING.value:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Call cannot be accepted (status: {call['status']})"
            )

        # Verify callee is part of the call
        callee = None
        for c in call["callees"]:
            if c["member_id"] == callee_id:
                callee = c
                break

        if not callee:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a participant of this call"
            )

        # Generate token for callee
        callee_token = self.livekit.generate_token(
            room_name=call["room_name"],
            participant_id=callee_id,
            participant_name=callee["member_name"],
            is_publisher=True,
            is_video_call=call["call_type"] == CallType.VIDEO.value
        )

        # Update call status
        now = datetime.utcnow()
        await self.calls_collection.update_one(
            {"call_id": call_id},
            {
                "$set": {
                    "status": CallStatus.CONNECTING.value,
                    "answered_at": now,
                    "updated_at": now
                }
            }
        )

        # Send acceptance signal via MQTT
        await self.signaling.send_call_accept(
            church_id=church_id,
            call_id=call_id,
            callee_id=callee_id,
            callee_name=callee["member_name"],
            livekit_token=callee_token
        )

        logger.info(f"Call {call_id} accepted by {callee_id}")

        livekit_url = self.livekit.url.replace("ws://", "wss://").replace("http://", "https://")

        return CallResponse(
            call_id=call_id,
            room_name=call["room_name"],
            livekit_token=callee_token,
            livekit_url=livekit_url,
            call_type=CallType(call["call_type"]),
            participants=[CallParticipant(**call["caller"])] +
                        [CallParticipant(**c) for c in call["callees"]]
        )

    async def reject_call(
        self,
        church_id: str,
        call_id: str,
        callee_id: str,
        reason: str = "rejected"
    ) -> bool:
        """
        Reject an incoming call.

        Args:
            church_id: Church tenant ID
            call_id: Call ID to reject
            callee_id: Callee member ID rejecting
            reason: Rejection reason

        Returns:
            True if rejected successfully
        """
        call = await self.calls_collection.find_one({
            "call_id": call_id,
            "church_id": church_id,
            "status": CallStatus.RINGING.value
        })

        if not call:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Call not found or already handled"
            )

        # Get callee name
        callee_name = ""
        for c in call["callees"]:
            if c["member_id"] == callee_id:
                callee_name = c["member_name"]
                break

        # For single callee calls, end the call
        # For group calls, just remove this callee
        now = datetime.utcnow()

        if len(call["callees"]) == 1:
            # Single callee - end call
            end_reason = CallEndReason.REJECTED if reason == "rejected" else CallEndReason.BUSY
            await self.calls_collection.update_one(
                {"call_id": call_id},
                {
                    "$set": {
                        "status": CallStatus.REJECTED.value if reason == "rejected" else CallStatus.BUSY.value,
                        "end_reason": end_reason.value,
                        "ended_at": now,
                        "updated_at": now
                    }
                }
            )
        else:
            # Group call - remove this callee
            await self.calls_collection.update_one(
                {"call_id": call_id},
                {
                    "$pull": {"callees": {"member_id": callee_id}},
                    "$set": {"updated_at": now}
                }
            )

        # Send rejection signal
        await self.signaling.send_call_reject(
            church_id=church_id,
            call_id=call_id,
            callee_id=callee_id,
            callee_name=callee_name,
            reason=reason
        )

        logger.info(f"Call {call_id} rejected by {callee_id} (reason: {reason})")
        return True

    async def cancel_call(
        self,
        church_id: str,
        call_id: str,
        caller_id: str
    ) -> bool:
        """
        Cancel an outgoing call (before answer).

        Args:
            church_id: Church tenant ID
            call_id: Call ID to cancel
            caller_id: Caller member ID

        Returns:
            True if cancelled successfully
        """
        call = await self.calls_collection.find_one({
            "call_id": call_id,
            "church_id": church_id,
            "caller.member_id": caller_id,
            "status": CallStatus.RINGING.value
        })

        if not call:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Call not found or already handled"
            )

        now = datetime.utcnow()
        await self.calls_collection.update_one(
            {"call_id": call_id},
            {
                "$set": {
                    "status": CallStatus.ENDED.value,
                    "end_reason": CallEndReason.CANCELLED.value,
                    "ended_at": now,
                    "updated_at": now
                }
            }
        )

        # Notify callees
        callee_ids = [c["member_id"] for c in call["callees"]]
        await self.signaling.send_call_cancel(
            church_id=church_id,
            call_id=call_id,
            caller_id=caller_id,
            callee_ids=callee_ids
        )

        logger.info(f"Call {call_id} cancelled by caller {caller_id}")
        return True

    # =========================================================================
    # Active Call Management
    # =========================================================================

    async def mark_call_connected(
        self,
        church_id: str,
        call_id: str,
        participant_id: str
    ) -> bool:
        """
        Mark call as connected when WebRTC connection is established.

        Args:
            church_id: Church tenant ID
            call_id: Call ID
            participant_id: Participant who connected

        Returns:
            True if updated successfully
        """
        now = datetime.utcnow()

        result = await self.calls_collection.update_one(
            {
                "call_id": call_id,
                "church_id": church_id,
                "status": {"$in": [CallStatus.CONNECTING.value, CallStatus.RINGING.value]}
            },
            {
                "$set": {
                    "status": CallStatus.ACTIVE.value,
                    "updated_at": now
                }
            }
        )

        if result.modified_count > 0:
            # Get call info for signaling
            call = await self.calls_collection.find_one({"call_id": call_id})
            participant_name = ""

            if call["caller"]["member_id"] == participant_id:
                participant_name = call["caller"]["member_name"]
            else:
                for c in call["callees"]:
                    if c["member_id"] == participant_id:
                        participant_name = c["member_name"]
                        break

            await self.signaling.send_participant_joined(
                church_id=church_id,
                call_id=call_id,
                participant_id=participant_id,
                participant_name=participant_name,
                participant_avatar=None
            )

            logger.info(f"Call {call_id} is now active")

        return result.modified_count > 0

    async def end_call(
        self,
        church_id: str,
        call_id: str,
        ended_by: str,
        reason: str = "normal"
    ) -> bool:
        """
        End an active call.

        Args:
            church_id: Church tenant ID
            call_id: Call ID to end
            ended_by: Member ID who ended
            reason: End reason

        Returns:
            True if ended successfully
        """
        call = await self.calls_collection.find_one({
            "call_id": call_id,
            "church_id": church_id
        })

        if not call:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Call not found"
            )

        # Calculate duration
        now = datetime.utcnow()
        duration = 0
        if call.get("answered_at"):
            answered_at = call["answered_at"]
            if isinstance(answered_at, str):
                answered_at = datetime.fromisoformat(answered_at)
            duration = int((now - answered_at).total_seconds())

        # Determine end reason
        end_reason = CallEndReason.NORMAL
        if reason == "missed":
            end_reason = CallEndReason.MISSED
        elif reason == "failed":
            end_reason = CallEndReason.FAILED
        elif reason == "network_error":
            end_reason = CallEndReason.NETWORK_ERROR

        # Update call
        await self.calls_collection.update_one(
            {"call_id": call_id},
            {
                "$set": {
                    "status": CallStatus.ENDED.value,
                    "end_reason": end_reason.value,
                    "ended_at": now,
                    "duration_seconds": duration,
                    "updated_at": now
                }
            }
        )

        # Delete LiveKit room
        await self.livekit.delete_room(call["room_name"])

        # Get all participant IDs
        participant_ids = [call["caller"]["member_id"]] + [c["member_id"] for c in call["callees"]]

        # Send end signal
        await self.signaling.send_call_end(
            church_id=church_id,
            call_id=call_id,
            ended_by=ended_by,
            reason=reason,
            duration_seconds=duration,
            participant_ids=participant_ids
        )

        logger.info(f"Call {call_id} ended by {ended_by} (reason: {reason}, duration: {duration}s)")
        return True

    async def update_participant_status(
        self,
        church_id: str,
        call_id: str,
        participant_id: str,
        is_muted: Optional[bool] = None,
        is_video_enabled: Optional[bool] = None,
        is_speaker_on: Optional[bool] = None
    ) -> bool:
        """
        Update participant status (mute, video, speaker).

        Args:
            church_id: Church tenant ID
            call_id: Call ID
            participant_id: Participant ID
            is_muted: Audio muted state
            is_video_enabled: Video enabled state
            is_speaker_on: Speaker enabled state

        Returns:
            True if updated successfully
        """
        call = await self.calls_collection.find_one({
            "call_id": call_id,
            "church_id": church_id,
            "status": CallStatus.ACTIVE.value
        })

        if not call:
            return False

        # Update the participant in the document
        update_fields = {}
        if is_muted is not None:
            if call["caller"]["member_id"] == participant_id:
                update_fields["caller.is_muted"] = is_muted
            else:
                for i, c in enumerate(call["callees"]):
                    if c["member_id"] == participant_id:
                        update_fields[f"callees.{i}.is_muted"] = is_muted
                        break

            await self.signaling.send_participant_muted(
                church_id=church_id,
                call_id=call_id,
                participant_id=participant_id,
                is_muted=is_muted
            )

        if is_video_enabled is not None:
            if call["caller"]["member_id"] == participant_id:
                update_fields["caller.is_video_enabled"] = is_video_enabled
            else:
                for i, c in enumerate(call["callees"]):
                    if c["member_id"] == participant_id:
                        update_fields[f"callees.{i}.is_video_enabled"] = is_video_enabled
                        break

            await self.signaling.send_participant_video(
                church_id=church_id,
                call_id=call_id,
                participant_id=participant_id,
                is_video_enabled=is_video_enabled
            )

        if is_speaker_on is not None:
            if call["caller"]["member_id"] == participant_id:
                update_fields["caller.is_speaker_on"] = is_speaker_on
            else:
                for i, c in enumerate(call["callees"]):
                    if c["member_id"] == participant_id:
                        update_fields[f"callees.{i}.is_speaker_on"] = is_speaker_on
                        break

            await self.signaling.send_participant_speaker(
                church_id=church_id,
                call_id=call_id,
                participant_id=participant_id,
                is_speaker_on=is_speaker_on
            )

        if update_fields:
            update_fields["updated_at"] = datetime.utcnow()
            await self.calls_collection.update_one(
                {"call_id": call_id},
                {"$set": update_fields}
            )

        return True

    # =========================================================================
    # Call History
    # =========================================================================

    async def get_call_history(
        self,
        church_id: str,
        member_id: str,
        page: int = 1,
        page_size: int = 20,
        call_type: Optional[CallType] = None
    ) -> CallHistoryResponse:
        """
        Get call history for a member.

        Args:
            church_id: Church tenant ID
            member_id: Member ID
            page: Page number (1-based)
            page_size: Items per page
            call_type: Filter by call type

        Returns:
            Paginated call history
        """
        # Build query
        query = {
            "church_id": church_id,
            "$or": [
                {"caller.member_id": member_id},
                {"callees.member_id": member_id}
            ],
            "status": {"$in": [
                CallStatus.ENDED.value,
                CallStatus.MISSED.value,
                CallStatus.REJECTED.value
            ]}
        }

        if call_type:
            query["call_type"] = call_type.value

        # Get total count
        total = await self.calls_collection.count_documents(query)

        # Get paginated results
        skip = (page - 1) * page_size
        cursor = self.calls_collection.find(query).sort("initiated_at", -1).skip(skip).limit(page_size)

        calls = []
        async for call in cursor:
            is_incoming = call["caller"]["member_id"] != member_id

            # Get callee names
            callee_names = [c["member_name"] for c in call["callees"]]

            calls.append(CallHistoryItem(
                call_id=call["call_id"],
                call_type=CallType(call["call_type"]),
                status=CallStatus(call["status"]),
                caller_id=call["caller"]["member_id"],
                caller_name=call["caller"]["member_name"],
                caller_avatar=call["caller"].get("member_avatar"),
                callee_ids=[c["member_id"] for c in call["callees"]],
                callee_names=callee_names,
                initiated_at=call["initiated_at"],
                duration_seconds=call.get("duration_seconds", 0),
                end_reason=CallEndReason(call["end_reason"]) if call.get("end_reason") else None,
                is_incoming=is_incoming
            ))

        return CallHistoryResponse(
            calls=calls,
            total=total,
            page=page,
            page_size=page_size,
            has_more=skip + len(calls) < total
        )

    async def get_active_call(
        self,
        church_id: str,
        member_id: str
    ) -> Optional[ActiveCallInfo]:
        """
        Get active call for a member.

        Args:
            church_id: Church tenant ID
            member_id: Member ID

        Returns:
            Active call info or None
        """
        call = await self.calls_collection.find_one({
            "church_id": church_id,
            "$or": [
                {"caller.member_id": member_id},
                {"callees.member_id": member_id}
            ],
            "status": {"$in": [
                CallStatus.RINGING.value,
                CallStatus.CONNECTING.value,
                CallStatus.ACTIVE.value
            ]}
        })

        if not call:
            return None

        # Calculate current duration
        duration = 0
        if call.get("answered_at"):
            answered_at = call["answered_at"]
            if isinstance(answered_at, str):
                answered_at = datetime.fromisoformat(answered_at)
            duration = int((datetime.utcnow() - answered_at).total_seconds())

        participants = [CallParticipant(**call["caller"])] + [CallParticipant(**c) for c in call["callees"]]

        return ActiveCallInfo(
            call_id=call["call_id"],
            room_name=call["room_name"],
            call_type=CallType(call["call_type"]),
            status=CallStatus(call["status"]),
            participants=participants,
            started_at=call["initiated_at"],
            duration_seconds=duration
        )

    # =========================================================================
    # Statistics
    # =========================================================================

    async def get_call_stats(
        self,
        church_id: str,
        member_id: Optional[str] = None,
        days: int = 30
    ) -> CallStatsResponse:
        """
        Get call statistics.

        Args:
            church_id: Church tenant ID
            member_id: Optional member filter
            days: Number of days to analyze

        Returns:
            Call statistics
        """
        since = datetime.utcnow() - timedelta(days=days)

        query = {
            "church_id": church_id,
            "initiated_at": {"$gte": since}
        }

        if member_id:
            query["$or"] = [
                {"caller.member_id": member_id},
                {"callees.member_id": member_id}
            ]

        pipeline = [
            {"$match": query},
            {
                "$group": {
                    "_id": None,
                    "total_calls": {"$sum": 1},
                    "total_duration": {"$sum": "$duration_seconds"},
                    "voice_calls": {
                        "$sum": {"$cond": [{"$eq": ["$call_type", "voice"]}, 1, 0]}
                    },
                    "video_calls": {
                        "$sum": {"$cond": [{"$eq": ["$call_type", "video"]}, 1, 0]}
                    },
                    "missed_calls": {
                        "$sum": {"$cond": [{"$eq": ["$status", "missed"]}, 1, 0]}
                    }
                }
            }
        ]

        result = await self.calls_collection.aggregate(pipeline).to_list(1)

        if not result:
            return CallStatsResponse(
                total_calls=0,
                total_duration_seconds=0,
                voice_calls=0,
                video_calls=0,
                missed_calls=0,
                average_duration_seconds=0
            )

        stats = result[0]
        avg_duration = stats["total_duration"] / stats["total_calls"] if stats["total_calls"] > 0 else 0

        return CallStatsResponse(
            total_calls=stats["total_calls"],
            total_duration_seconds=stats["total_duration"],
            voice_calls=stats["voice_calls"],
            video_calls=stats["video_calls"],
            missed_calls=stats["missed_calls"],
            average_duration_seconds=round(avg_duration, 1)
        )

    # =========================================================================
    # Cleanup
    # =========================================================================

    async def cleanup_stale_calls(self):
        """
        Mark stale ringing calls as missed.
        Should be called periodically by scheduler.
        """
        timeout = datetime.utcnow() - timedelta(seconds=CALL_RING_TIMEOUT_SECONDS)

        result = await self.calls_collection.update_many(
            {
                "status": CallStatus.RINGING.value,
                "initiated_at": {"$lt": timeout}
            },
            {
                "$set": {
                    "status": CallStatus.MISSED.value,
                    "end_reason": CallEndReason.MISSED.value,
                    "ended_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )

        if result.modified_count > 0:
            logger.info(f"Marked {result.modified_count} stale calls as missed")


# Factory function for FastAPI dependency injection
def get_call_service(db: AsyncIOMotorDatabase) -> CallService:
    """
    Create CallService instance.

    Args:
        db: MongoDB database

    Returns:
        CallService instance
    """
    return CallService(db)
