"""
Call Signaling Service

Handles MQTT-based call signaling for voice/video calls.
Extends the base MQTT service with call-specific topics and payloads.

Topic Structure:
- faithflow/{church_id}/call/{call_id}/signal
- faithflow/{church_id}/call/{call_id}/participants
- faithflow/{church_id}/member/{member_id}/incoming_call
- faithflow/{church_id}/member/{member_id}/call_status

Signal Types:
- call_invite: Incoming call notification
- call_accept: Call accepted
- call_reject: Call rejected
- call_busy: Callee is busy
- call_end: Call ended
- call_cancel: Caller cancelled
- participant_joined: Participant joined the call
- participant_left: Participant left the call
- participant_muted: Participant muted/unmuted
- participant_video: Participant video on/off
"""

import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

from services.mqtt_service import (
    MQTTService,
    get_mqtt_service,
    QOS_AT_LEAST_ONCE,
    QOS_EXACTLY_ONCE,
    TOPIC_PREFIX
)

logger = logging.getLogger(__name__)


class CallSignalType(str, Enum):
    """Call signal types"""
    INVITE = "call_invite"
    ACCEPT = "call_accept"
    REJECT = "call_reject"
    BUSY = "call_busy"
    END = "call_end"
    CANCEL = "call_cancel"
    RINGING = "call_ringing"  # Acknowledgement that callee received invite
    CONNECTING = "call_connecting"  # WebRTC connection in progress
    CONNECTED = "call_connected"  # WebRTC connection established
    PARTICIPANT_JOINED = "participant_joined"
    PARTICIPANT_LEFT = "participant_left"
    PARTICIPANT_MUTED = "participant_muted"
    PARTICIPANT_VIDEO = "participant_video"
    PARTICIPANT_SPEAKER = "participant_speaker"
    NETWORK_QUALITY = "network_quality"


class CallSignalingService:
    """
    Service for call signaling over MQTT.

    Handles all call-related real-time signals:
    - Incoming call invitations
    - Call acceptance/rejection
    - Call end notifications
    - Participant updates
    """

    def __init__(self, mqtt_service: Optional[MQTTService] = None):
        """
        Initialize call signaling service.

        Args:
            mqtt_service: MQTT service instance (uses singleton if not provided)
        """
        self.mqtt = mqtt_service or get_mqtt_service()

    def _build_call_topic(self, church_id: str, call_id: str, suffix: str = "signal") -> str:
        """Build call-specific topic."""
        return f"{TOPIC_PREFIX}/{church_id}/call/{call_id}/{suffix}"

    def _build_member_topic(self, church_id: str, member_id: str, suffix: str) -> str:
        """Build member-specific topic for call notifications."""
        return f"{TOPIC_PREFIX}/{church_id}/member/{member_id}/{suffix}"

    # =========================================================================
    # Call Invitation Signals
    # =========================================================================

    async def send_call_invite(
        self,
        church_id: str,
        call_id: str,
        room_name: str,
        call_type: str,  # "voice" or "video"
        caller_id: str,
        caller_name: str,
        caller_avatar: Optional[str],
        callee_ids: List[str],
        community_id: Optional[str] = None,
        community_name: Optional[str] = None,
        livekit_url: str = "",
    ) -> int:
        """
        Send call invitation to callee(s).

        Publishes to each callee's personal incoming_call topic.

        Args:
            church_id: Church ID
            call_id: Unique call ID
            room_name: LiveKit room name
            call_type: "voice" or "video"
            caller_id: Caller member ID
            caller_name: Caller display name
            caller_avatar: Caller avatar URL
            callee_ids: List of callee member IDs
            community_id: Optional community context
            community_name: Optional community name
            livekit_url: LiveKit server URL

        Returns:
            Number of successful invitations sent
        """
        await self.mqtt.connect()

        payload = {
            "type": CallSignalType.INVITE.value,
            "call_id": call_id,
            "room_name": room_name,
            "call_type": call_type,
            "caller": {
                "id": caller_id,
                "name": caller_name,
                "avatar": caller_avatar
            },
            "callee_ids": callee_ids,
            "community_id": community_id,
            "community_name": community_name,
            "livekit_url": livekit_url,
            "timestamp": datetime.utcnow().isoformat()
        }

        success_count = 0
        for callee_id in callee_ids:
            topic = self._build_member_topic(church_id, callee_id, "incoming_call")
            if await self.mqtt.publish(topic, payload, qos=QOS_EXACTLY_ONCE):
                success_count += 1
                logger.info(f"Sent call invite to {callee_id} for call {call_id}")
            else:
                logger.error(f"Failed to send call invite to {callee_id}")

        # Also publish to the call's signal topic for tracking
        call_topic = self._build_call_topic(church_id, call_id)
        await self.mqtt.publish(call_topic, payload, qos=QOS_EXACTLY_ONCE)

        return success_count

    async def send_call_ringing(
        self,
        church_id: str,
        call_id: str,
        callee_id: str,
        callee_name: str
    ) -> bool:
        """
        Send ringing acknowledgement (callee received invite).

        Args:
            church_id: Church ID
            call_id: Call ID
            callee_id: Callee member ID
            callee_name: Callee display name

        Returns:
            True if sent successfully
        """
        await self.mqtt.connect()

        payload = {
            "type": CallSignalType.RINGING.value,
            "call_id": call_id,
            "callee_id": callee_id,
            "callee_name": callee_name,
            "timestamp": datetime.utcnow().isoformat()
        }

        topic = self._build_call_topic(church_id, call_id)
        return await self.mqtt.publish(topic, payload, qos=QOS_AT_LEAST_ONCE)

    # =========================================================================
    # Call Response Signals
    # =========================================================================

    async def send_call_accept(
        self,
        church_id: str,
        call_id: str,
        callee_id: str,
        callee_name: str,
        livekit_token: str
    ) -> bool:
        """
        Send call acceptance signal.

        Args:
            church_id: Church ID
            call_id: Call ID
            callee_id: Accepting callee ID
            callee_name: Callee display name
            livekit_token: LiveKit token for the callee

        Returns:
            True if sent successfully
        """
        await self.mqtt.connect()

        payload = {
            "type": CallSignalType.ACCEPT.value,
            "call_id": call_id,
            "callee_id": callee_id,
            "callee_name": callee_name,
            "livekit_token": livekit_token,
            "timestamp": datetime.utcnow().isoformat()
        }

        topic = self._build_call_topic(church_id, call_id)
        return await self.mqtt.publish(topic, payload, qos=QOS_EXACTLY_ONCE)

    async def send_call_reject(
        self,
        church_id: str,
        call_id: str,
        callee_id: str,
        callee_name: str,
        reason: str = "rejected"  # "rejected", "busy", "unavailable"
    ) -> bool:
        """
        Send call rejection signal.

        Args:
            church_id: Church ID
            call_id: Call ID
            callee_id: Rejecting callee ID
            callee_name: Callee display name
            reason: Rejection reason

        Returns:
            True if sent successfully
        """
        await self.mqtt.connect()

        signal_type = CallSignalType.BUSY.value if reason == "busy" else CallSignalType.REJECT.value

        payload = {
            "type": signal_type,
            "call_id": call_id,
            "callee_id": callee_id,
            "callee_name": callee_name,
            "reason": reason,
            "timestamp": datetime.utcnow().isoformat()
        }

        topic = self._build_call_topic(church_id, call_id)
        return await self.mqtt.publish(topic, payload, qos=QOS_EXACTLY_ONCE)

    async def send_call_cancel(
        self,
        church_id: str,
        call_id: str,
        caller_id: str,
        callee_ids: List[str]
    ) -> int:
        """
        Send call cancellation (caller hung up before answer).

        Args:
            church_id: Church ID
            call_id: Call ID
            caller_id: Caller ID who cancelled
            callee_ids: List of callee IDs to notify

        Returns:
            Number of successful notifications
        """
        await self.mqtt.connect()

        payload = {
            "type": CallSignalType.CANCEL.value,
            "call_id": call_id,
            "caller_id": caller_id,
            "timestamp": datetime.utcnow().isoformat()
        }

        success_count = 0

        # Notify each callee
        for callee_id in callee_ids:
            topic = self._build_member_topic(church_id, callee_id, "call_status")
            if await self.mqtt.publish(topic, payload, qos=QOS_EXACTLY_ONCE):
                success_count += 1

        # Also publish to call topic
        call_topic = self._build_call_topic(church_id, call_id)
        await self.mqtt.publish(call_topic, payload, qos=QOS_EXACTLY_ONCE)

        return success_count

    # =========================================================================
    # Call End Signals
    # =========================================================================

    async def send_call_end(
        self,
        church_id: str,
        call_id: str,
        ended_by: str,
        reason: str,  # "normal", "missed", "failed", "network_error"
        duration_seconds: int,
        participant_ids: List[str]
    ) -> int:
        """
        Send call end signal to all participants.

        Args:
            church_id: Church ID
            call_id: Call ID
            ended_by: Member ID who ended the call
            reason: End reason
            duration_seconds: Call duration
            participant_ids: All participant IDs to notify

        Returns:
            Number of successful notifications
        """
        await self.mqtt.connect()

        payload = {
            "type": CallSignalType.END.value,
            "call_id": call_id,
            "ended_by": ended_by,
            "reason": reason,
            "duration_seconds": duration_seconds,
            "timestamp": datetime.utcnow().isoformat()
        }

        success_count = 0

        # Notify each participant
        for participant_id in participant_ids:
            topic = self._build_member_topic(church_id, participant_id, "call_status")
            if await self.mqtt.publish(topic, payload, qos=QOS_EXACTLY_ONCE):
                success_count += 1

        # Also publish to call topic
        call_topic = self._build_call_topic(church_id, call_id)
        await self.mqtt.publish(call_topic, payload, qos=QOS_EXACTLY_ONCE)

        return success_count

    # =========================================================================
    # Participant Update Signals
    # =========================================================================

    async def send_participant_joined(
        self,
        church_id: str,
        call_id: str,
        participant_id: str,
        participant_name: str,
        participant_avatar: Optional[str]
    ) -> bool:
        """
        Send participant joined signal.

        Args:
            church_id: Church ID
            call_id: Call ID
            participant_id: Joined participant ID
            participant_name: Participant display name
            participant_avatar: Participant avatar URL

        Returns:
            True if sent successfully
        """
        await self.mqtt.connect()

        payload = {
            "type": CallSignalType.PARTICIPANT_JOINED.value,
            "call_id": call_id,
            "participant": {
                "id": participant_id,
                "name": participant_name,
                "avatar": participant_avatar
            },
            "timestamp": datetime.utcnow().isoformat()
        }

        topic = self._build_call_topic(church_id, call_id, "participants")
        return await self.mqtt.publish(topic, payload, qos=QOS_AT_LEAST_ONCE)

    async def send_participant_left(
        self,
        church_id: str,
        call_id: str,
        participant_id: str,
        participant_name: str
    ) -> bool:
        """
        Send participant left signal.

        Args:
            church_id: Church ID
            call_id: Call ID
            participant_id: Left participant ID
            participant_name: Participant display name

        Returns:
            True if sent successfully
        """
        await self.mqtt.connect()

        payload = {
            "type": CallSignalType.PARTICIPANT_LEFT.value,
            "call_id": call_id,
            "participant_id": participant_id,
            "participant_name": participant_name,
            "timestamp": datetime.utcnow().isoformat()
        }

        topic = self._build_call_topic(church_id, call_id, "participants")
        return await self.mqtt.publish(topic, payload, qos=QOS_AT_LEAST_ONCE)

    async def send_participant_muted(
        self,
        church_id: str,
        call_id: str,
        participant_id: str,
        is_muted: bool
    ) -> bool:
        """
        Send participant mute status signal.

        Args:
            church_id: Church ID
            call_id: Call ID
            participant_id: Participant ID
            is_muted: Whether audio is muted

        Returns:
            True if sent successfully
        """
        await self.mqtt.connect()

        payload = {
            "type": CallSignalType.PARTICIPANT_MUTED.value,
            "call_id": call_id,
            "participant_id": participant_id,
            "is_muted": is_muted,
            "timestamp": datetime.utcnow().isoformat()
        }

        topic = self._build_call_topic(church_id, call_id, "participants")
        return await self.mqtt.publish(topic, payload, qos=QOS_AT_LEAST_ONCE)

    async def send_participant_video(
        self,
        church_id: str,
        call_id: str,
        participant_id: str,
        is_video_enabled: bool
    ) -> bool:
        """
        Send participant video status signal.

        Args:
            church_id: Church ID
            call_id: Call ID
            participant_id: Participant ID
            is_video_enabled: Whether video is enabled

        Returns:
            True if sent successfully
        """
        await self.mqtt.connect()

        payload = {
            "type": CallSignalType.PARTICIPANT_VIDEO.value,
            "call_id": call_id,
            "participant_id": participant_id,
            "is_video_enabled": is_video_enabled,
            "timestamp": datetime.utcnow().isoformat()
        }

        topic = self._build_call_topic(church_id, call_id, "participants")
        return await self.mqtt.publish(topic, payload, qos=QOS_AT_LEAST_ONCE)

    async def send_participant_speaker(
        self,
        church_id: str,
        call_id: str,
        participant_id: str,
        is_speaker_on: bool
    ) -> bool:
        """
        Send participant speaker status signal.

        Args:
            church_id: Church ID
            call_id: Call ID
            participant_id: Participant ID
            is_speaker_on: Whether speaker is on

        Returns:
            True if sent successfully
        """
        await self.mqtt.connect()

        payload = {
            "type": CallSignalType.PARTICIPANT_SPEAKER.value,
            "call_id": call_id,
            "participant_id": participant_id,
            "is_speaker_on": is_speaker_on,
            "timestamp": datetime.utcnow().isoformat()
        }

        topic = self._build_call_topic(church_id, call_id, "participants")
        return await self.mqtt.publish(topic, payload, qos=QOS_AT_LEAST_ONCE)

    # =========================================================================
    # Network Quality Signals
    # =========================================================================

    async def send_network_quality(
        self,
        church_id: str,
        call_id: str,
        participant_id: str,
        quality: str,  # "excellent", "good", "fair", "poor"
        latency_ms: int,
        packet_loss_percent: float
    ) -> bool:
        """
        Send network quality update.

        Args:
            church_id: Church ID
            call_id: Call ID
            participant_id: Participant ID
            quality: Quality level
            latency_ms: Latency in milliseconds
            packet_loss_percent: Packet loss percentage

        Returns:
            True if sent successfully
        """
        await self.mqtt.connect()

        payload = {
            "type": CallSignalType.NETWORK_QUALITY.value,
            "call_id": call_id,
            "participant_id": participant_id,
            "quality": quality,
            "latency_ms": latency_ms,
            "packet_loss_percent": packet_loss_percent,
            "timestamp": datetime.utcnow().isoformat()
        }

        topic = self._build_call_topic(church_id, call_id, "participants")
        return await self.mqtt.publish(topic, payload, qos=QOS_AT_LEAST_ONCE)


# Singleton instance
_call_signaling_service: Optional[CallSignalingService] = None


def get_call_signaling_service() -> CallSignalingService:
    """
    Get call signaling service singleton.

    Returns:
        CallSignalingService instance
    """
    global _call_signaling_service
    if _call_signaling_service is None:
        _call_signaling_service = CallSignalingService()
    return _call_signaling_service


# FastAPI dependency
def get_call_signaling() -> CallSignalingService:
    """
    FastAPI dependency for call signaling service.

    Usage:
        @router.post("/calls/{call_id}/accept")
        async def accept_call(
            signaling: CallSignalingService = Depends(get_call_signaling)
        ):
            await signaling.send_call_accept(...)
    """
    return get_call_signaling_service()
