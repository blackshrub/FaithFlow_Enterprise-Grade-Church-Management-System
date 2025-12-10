"""
LiveKit Service

Handles LiveKit WebRTC SFU operations:
- Token generation for clients
- Room creation/management
- Participant management
- Recording (optional)

Requires: pip install livekit-api
"""

import os
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import uuid

from livekit.api import (
    AccessToken,
    VideoGrants,
    LiveKitAPI,
    CreateRoomRequest,
    DeleteRoomRequest,
    ListRoomsRequest,
    ListParticipantsRequest,
    RoomParticipantIdentity,
    MuteRoomTrackRequest,
    SendDataRequest,
    UpdateRoomMetadataRequest,
)

logger = logging.getLogger(__name__)

# Configuration - SECURITY: No hardcoded defaults for secrets
LIVEKIT_URL = os.environ.get("LIVEKIT_URL", "ws://localhost:7880")
LIVEKIT_API_KEY = os.environ.get("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.environ.get("LIVEKIT_API_SECRET")

# Validate required environment variables at module load
if not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
    logger.warning(
        "LIVEKIT_API_KEY and LIVEKIT_API_SECRET environment variables not set. "
        "LiveKit features will be disabled until configured."
    )
    LIVEKIT_ENABLED = False
else:
    LIVEKIT_ENABLED = True

# Token expiry
TOKEN_TTL_SECONDS = 3600 * 4  # 4 hours max call duration


class LiveKitServiceError(Exception):
    """Base exception for LiveKit operations."""
    pass


class LiveKitService:
    """
    Service for managing LiveKit WebRTC rooms and participants.

    Used for:
    1. Generating access tokens for call participants
    2. Creating rooms for calls
    3. Managing active participants
    4. Getting room statistics
    """

    def __init__(
        self,
        url: Optional[str] = None,
        api_key: Optional[str] = None,
        api_secret: Optional[str] = None
    ):
        """
        Initialize LiveKit service.

        Args:
            url: LiveKit server URL (ws:// or wss://)
            api_key: LiveKit API key
            api_secret: LiveKit API secret

        Raises:
            LiveKitServiceError: If required credentials are not configured
        """
        self.url = url or LIVEKIT_URL
        self.api_key = api_key or LIVEKIT_API_KEY
        self.api_secret = api_secret or LIVEKIT_API_SECRET
        self._api: Optional[LiveKitAPI] = None

        # Validate credentials at initialization
        if not self.api_key or not self.api_secret:
            raise LiveKitServiceError(
                "LiveKit credentials not configured. Set LIVEKIT_API_KEY and "
                "LIVEKIT_API_SECRET environment variables."
            )

    @property
    def http_url(self) -> str:
        """Convert ws URL to http URL for API calls."""
        return self.url.replace("ws://", "http://").replace("wss://", "https://")

    def _get_api(self) -> LiveKitAPI:
        """Get or create LiveKitAPI instance."""
        if self._api is None:
            self._api = LiveKitAPI(
                self.http_url,
                self.api_key,
                self.api_secret
            )
        return self._api

    def generate_room_name(self, church_id: str, call_id: str) -> str:
        """
        Generate unique room name for a call.

        Args:
            church_id: Church tenant ID
            call_id: Call ID

        Returns:
            Unique room name
        """
        return f"faithflow_{church_id}_{call_id}"

    def generate_token(
        self,
        room_name: str,
        participant_id: str,
        participant_name: str,
        is_publisher: bool = True,
        can_subscribe: bool = True,
        is_video_call: bool = True,
        ttl_seconds: int = TOKEN_TTL_SECONDS
    ) -> str:
        """
        Generate access token for a participant to join a room.

        Args:
            room_name: Name of the room to join
            participant_id: Unique participant identifier (member_id)
            participant_name: Display name for the participant
            is_publisher: Whether participant can publish audio/video
            can_subscribe: Whether participant can receive others' streams
            is_video_call: Whether this is a video call (enables video)
            ttl_seconds: Token time-to-live in seconds

        Returns:
            JWT access token string
        """
        # Create video grants
        grants = VideoGrants(
            room=room_name,
            room_join=True,
            room_create=True,  # Allow first participant to create room
            can_publish=is_publisher,
            can_subscribe=can_subscribe,
            can_publish_data=True,  # For data messages
        )

        # Create token
        token = AccessToken(
            api_key=self.api_key,
            api_secret=self.api_secret
        )
        token.identity = participant_id
        token.name = participant_name
        token.add_grants(grants)
        token.ttl = timedelta(seconds=ttl_seconds)

        return token.to_jwt()

    async def create_room(
        self,
        room_name: str,
        empty_timeout: int = 300,  # 5 minutes
        max_participants: int = 10,
        metadata: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a LiveKit room.

        Args:
            room_name: Unique room name
            empty_timeout: Seconds to keep room alive when empty
            max_participants: Maximum participants allowed
            metadata: Optional JSON metadata for the room

        Returns:
            Room info dict
        """
        try:
            api = self._get_api()

            room = await api.room.create_room(
                CreateRoomRequest(
                    name=room_name,
                    empty_timeout=empty_timeout,
                    max_participants=max_participants,
                    metadata=metadata
                )
            )

            logger.info(f"Created LiveKit room: {room_name}")

            return {
                "name": room.name,
                "sid": room.sid,
                "creation_time": room.creation_time,
                "turn_password": room.turn_password,
                "metadata": room.metadata
            }

        except Exception as e:
            logger.error(f"Failed to create room {room_name}: {e}")
            raise LiveKitServiceError(f"Failed to create room: {e}")

    async def delete_room(self, room_name: str) -> bool:
        """
        Delete a LiveKit room.

        Args:
            room_name: Room to delete

        Returns:
            True if deleted successfully
        """
        try:
            api = self._get_api()
            await api.room.delete_room(
                DeleteRoomRequest(room=room_name)
            )
            logger.info(f"Deleted LiveKit room: {room_name}")
            return True

        except Exception as e:
            logger.error(f"Failed to delete room {room_name}: {e}")
            return False

    async def list_rooms(self) -> List[Dict[str, Any]]:
        """
        List all active rooms.

        Returns:
            List of room info dicts
        """
        try:
            api = self._get_api()
            response = await api.room.list_rooms(
                ListRoomsRequest()
            )

            return [
                {
                    "name": room.name,
                    "sid": room.sid,
                    "num_participants": room.num_participants,
                    "creation_time": room.creation_time,
                    "metadata": room.metadata
                }
                for room in response.rooms
            ]

        except Exception as e:
            logger.error(f"Failed to list rooms: {e}")
            return []

    async def get_room(self, room_name: str) -> Optional[Dict[str, Any]]:
        """
        Get room info.

        Args:
            room_name: Room name

        Returns:
            Room info or None if not found
        """
        rooms = await self.list_rooms()
        for room in rooms:
            if room["name"] == room_name:
                return room
        return None

    async def list_participants(self, room_name: str) -> List[Dict[str, Any]]:
        """
        List participants in a room.

        Args:
            room_name: Room name

        Returns:
            List of participant info dicts
        """
        try:
            api = self._get_api()
            response = await api.room.list_participants(
                ListParticipantsRequest(room=room_name)
            )

            return [
                {
                    "sid": p.sid,
                    "identity": p.identity,
                    "name": p.name,
                    "state": p.state,
                    "joined_at": p.joined_at,
                    "is_publisher": p.is_publisher,
                    "metadata": p.metadata
                }
                for p in response.participants
            ]

        except Exception as e:
            logger.error(f"Failed to list participants in {room_name}: {e}")
            return []

    async def get_participant(
        self,
        room_name: str,
        identity: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get specific participant info.

        Args:
            room_name: Room name
            identity: Participant identity

        Returns:
            Participant info or None
        """
        try:
            api = self._get_api()
            p = await api.room.get_participant(
                RoomParticipantIdentity(
                    room=room_name,
                    identity=identity
                )
            )

            return {
                "sid": p.sid,
                "identity": p.identity,
                "name": p.name,
                "state": p.state,
                "joined_at": p.joined_at,
                "is_publisher": p.is_publisher,
                "metadata": p.metadata
            }

        except Exception as e:
            logger.error(f"Failed to get participant {identity} in {room_name}: {e}")
            return None

    async def remove_participant(
        self,
        room_name: str,
        identity: str
    ) -> bool:
        """
        Remove participant from room.

        Args:
            room_name: Room name
            identity: Participant identity to remove

        Returns:
            True if removed successfully
        """
        try:
            api = self._get_api()
            await api.room.remove_participant(
                RoomParticipantIdentity(
                    room=room_name,
                    identity=identity
                )
            )
            logger.info(f"Removed participant {identity} from {room_name}")
            return True

        except Exception as e:
            logger.error(f"Failed to remove participant {identity}: {e}")
            return False

    async def mute_participant(
        self,
        room_name: str,
        identity: str,
        mute_audio: bool = True,
        mute_video: bool = False
    ) -> bool:
        """
        Mute participant's tracks.

        Args:
            room_name: Room name
            identity: Participant identity
            mute_audio: Whether to mute audio
            mute_video: Whether to mute video

        Returns:
            True if muted successfully
        """
        try:
            api = self._get_api()
            from livekit.api import TrackType, AUDIO, VIDEO

            # Get participant tracks
            participant = await api.room.get_participant(
                RoomParticipantIdentity(
                    room=room_name,
                    identity=identity
                )
            )

            for track in participant.tracks:
                should_mute = False
                if track.type == AUDIO and mute_audio:
                    should_mute = True
                elif track.type == VIDEO and mute_video:
                    should_mute = True

                if should_mute:
                    await api.room.mute_published_track(
                        MuteRoomTrackRequest(
                            room=room_name,
                            identity=identity,
                            track_sid=track.sid,
                            muted=True
                        )
                    )

            return True

        except Exception as e:
            logger.error(f"Failed to mute participant {identity}: {e}")
            return False

    async def send_data(
        self,
        room_name: str,
        data: bytes,
        kind: str = "reliable",
        destination_identities: Optional[List[str]] = None
    ) -> bool:
        """
        Send data message to room participants.

        Args:
            room_name: Room name
            data: Data to send (bytes)
            kind: "reliable" or "lossy"
            destination_identities: Specific participants (None = all)

        Returns:
            True if sent successfully
        """
        try:
            api = self._get_api()
            from livekit.api import DataPacket

            await api.room.send_data(
                SendDataRequest(
                    room=room_name,
                    data=data,
                    kind=DataPacket.Kind.RELIABLE if kind == "reliable"
                         else DataPacket.Kind.LOSSY,
                    destination_identities=destination_identities or []
                )
            )

            return True

        except Exception as e:
            logger.error(f"Failed to send data to {room_name}: {e}")
            return False

    async def update_room_metadata(
        self,
        room_name: str,
        metadata: str
    ) -> bool:
        """
        Update room metadata.

        Args:
            room_name: Room name
            metadata: New metadata (JSON string)

        Returns:
            True if updated successfully
        """
        try:
            api = self._get_api()

            await api.room.update_room_metadata(
                UpdateRoomMetadataRequest(
                    room=room_name,
                    metadata=metadata
                )
            )

            return True

        except Exception as e:
            logger.error(f"Failed to update room metadata: {e}")
            return False


# Singleton instance
_livekit_service: Optional[LiveKitService] = None


def get_livekit_service() -> Optional[LiveKitService]:
    """
    Get LiveKit service singleton.

    Returns:
        LiveKitService instance if configured, None otherwise
    """
    global _livekit_service
    if not LIVEKIT_ENABLED:
        return None
    if _livekit_service is None:
        try:
            _livekit_service = LiveKitService()
        except LiveKitServiceError as e:
            logger.error(f"Failed to initialize LiveKit service: {e}")
            return None
    return _livekit_service


# FastAPI dependency
def get_livekit() -> Optional[LiveKitService]:
    """
    FastAPI dependency for LiveKit service.

    Usage:
        @router.post("/calls")
        async def initiate_call(
            livekit: LiveKitService = Depends(get_livekit)
        ):
            if livekit is None:
                raise HTTPException(503, "LiveKit service not configured")
            token = livekit.generate_token(...)
    """
    return get_livekit_service()
