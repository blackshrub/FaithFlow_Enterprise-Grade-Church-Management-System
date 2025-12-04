"""
WebSocket Connection Manager for Real-time Updates

Provides multi-tenant safe real-time communication:
- Live attendance updates during check-in
- Real-time giving notifications
- Live event participant counts
- Admin dashboard live metrics

Uses Redis pub/sub for cross-instance broadcasting in production.
"""

from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set, Optional
import asyncio
import json
from datetime import datetime

from services.redis.pubsub import RedisPubSub


class ConnectionManager:
    """
    Multi-tenant WebSocket connection manager.

    Connections are scoped by church_id to ensure data isolation.
    Uses Redis pub/sub for horizontal scaling across multiple instances.
    """

    def __init__(self):
        # church_id -> set of (websocket, user_id, roles)
        self.active_connections: Dict[str, Set[tuple]] = {}
        self.pubsub: Optional[RedisPubSub] = None
        self._subscriber_task: Optional[asyncio.Task] = None

    async def initialize(self, pubsub: RedisPubSub):
        """Initialize with Redis pub/sub for cross-instance communication."""
        self.pubsub = pubsub
        # Subscribe to broadcast channel
        self._subscriber_task = asyncio.create_task(
            self._listen_for_broadcasts()
        )

    async def _listen_for_broadcasts(self):
        """Listen for broadcasts from other instances via Redis."""
        if not self.pubsub:
            return

        async for message in self.pubsub.subscribe("ws:broadcast"):
            try:
                data = json.loads(message)
                church_id = data.get("church_id")
                payload = data.get("payload")
                if church_id and payload:
                    await self._local_broadcast(church_id, payload)
            except Exception:
                pass  # Ignore malformed messages

    async def connect(
        self,
        websocket: WebSocket,
        church_id: str,
        user_id: str,
        roles: list
    ):
        """
        Accept a WebSocket connection for a specific church.

        Args:
            websocket: The WebSocket connection
            church_id: Church ID for tenant isolation
            user_id: User ID for targeted messages
            roles: User roles for permission-based broadcasts
        """
        await websocket.accept()

        if church_id not in self.active_connections:
            self.active_connections[church_id] = set()

        self.active_connections[church_id].add((websocket, user_id, tuple(roles)))

        # Send connection confirmation
        await websocket.send_json({
            "type": "connected",
            "timestamp": datetime.utcnow().isoformat(),
            "church_id": church_id
        })

    def disconnect(self, websocket: WebSocket, church_id: str):
        """Remove a WebSocket connection."""
        if church_id in self.active_connections:
            # Find and remove the connection tuple
            to_remove = None
            for conn in self.active_connections[church_id]:
                if conn[0] == websocket:
                    to_remove = conn
                    break
            if to_remove:
                self.active_connections[church_id].discard(to_remove)

            # Clean up empty church sets
            if not self.active_connections[church_id]:
                del self.active_connections[church_id]

    async def _local_broadcast(self, church_id: str, message: dict):
        """Broadcast to local connections only."""
        if church_id not in self.active_connections:
            return

        dead_connections = []

        for conn in self.active_connections[church_id]:
            websocket, user_id, roles = conn
            try:
                await websocket.send_json(message)
            except Exception:
                dead_connections.append(conn)

        # Clean up dead connections
        for conn in dead_connections:
            self.active_connections[church_id].discard(conn)

    async def broadcast_to_church(self, church_id: str, message: dict):
        """
        Broadcast to all connections for a specific church.
        Uses Redis pub/sub for cross-instance broadcasting.

        Args:
            church_id: Target church ID
            message: Message payload to broadcast
        """
        # Add metadata
        message["timestamp"] = datetime.utcnow().isoformat()
        message["church_id"] = church_id

        # Broadcast via Redis for other instances
        if self.pubsub:
            await self.pubsub.publish("ws:broadcast", json.dumps({
                "church_id": church_id,
                "payload": message
            }))

        # Also broadcast locally
        await self._local_broadcast(church_id, message)

    async def send_to_user(self, church_id: str, user_id: str, message: dict):
        """
        Send a message to a specific user within a church.

        Args:
            church_id: Church ID for tenant isolation
            user_id: Target user ID
            message: Message payload
        """
        if church_id not in self.active_connections:
            return

        message["timestamp"] = datetime.utcnow().isoformat()

        for conn in self.active_connections[church_id]:
            websocket, uid, roles = conn
            if uid == user_id:
                try:
                    await websocket.send_json(message)
                except Exception:
                    pass

    async def broadcast_to_roles(
        self,
        church_id: str,
        roles: list,
        message: dict
    ):
        """
        Broadcast to users with specific roles within a church.

        Args:
            church_id: Church ID for tenant isolation
            roles: List of roles to target (any match)
            message: Message payload
        """
        if church_id not in self.active_connections:
            return

        message["timestamp"] = datetime.utcnow().isoformat()
        target_roles = set(roles)

        for conn in self.active_connections[church_id]:
            websocket, user_id, user_roles = conn
            if target_roles.intersection(set(user_roles)):
                try:
                    await websocket.send_json(message)
                except Exception:
                    pass

    def get_connection_count(self, church_id: Optional[str] = None) -> int:
        """Get number of active connections."""
        if church_id:
            return len(self.active_connections.get(church_id, set()))
        return sum(len(conns) for conns in self.active_connections.values())

    def get_connected_churches(self) -> list:
        """Get list of churches with active connections."""
        return list(self.active_connections.keys())


# Singleton instance
ws_manager = ConnectionManager()


# Event type constants for type safety
class WSEventTypes:
    # Attendance events
    ATTENDANCE_UPDATE = "attendance:update"
    ATTENDANCE_CHECKED_IN = "attendance:checked_in"

    # Giving events
    GIVING_RECEIVED = "giving:received"
    GIVING_GOAL_PROGRESS = "giving:goal_progress"

    # Event events
    EVENT_PARTICIPANT_COUNT = "event:participant_count"
    EVENT_STATUS_CHANGE = "event:status_change"

    # Notification events
    NOTIFICATION_NEW = "notification:new"

    # Prayer request events
    PRAYER_NEW = "prayer:new"
    PRAYER_UPDATE = "prayer:update"

    # Member events
    MEMBER_NEW = "member:new"
    MEMBER_UPDATE = "member:update"


# Helper functions for common broadcasts
async def broadcast_attendance_update(church_id: str, event_id: str, count: int):
    """Broadcast attendance count update."""
    await ws_manager.broadcast_to_church(church_id, {
        "type": WSEventTypes.ATTENDANCE_UPDATE,
        "event_id": event_id,
        "count": count
    })


async def broadcast_giving_received(
    church_id: str,
    amount: float,
    currency: str,
    anonymous: bool = False
):
    """Broadcast new giving notification to admins."""
    await ws_manager.broadcast_to_roles(church_id, ["admin", "finance"], {
        "type": WSEventTypes.GIVING_RECEIVED,
        "amount": amount,
        "currency": currency,
        "anonymous": anonymous
    })


async def broadcast_new_prayer_request(church_id: str, prayer_id: str, category: str):
    """Broadcast new prayer request to prayer team."""
    await ws_manager.broadcast_to_roles(church_id, ["admin", "prayer_team"], {
        "type": WSEventTypes.PRAYER_NEW,
        "prayer_id": prayer_id,
        "category": category
    })
