"""
MQTT Service for FaithFlow Community Real-time Messaging.

This service handles MQTT publishing from the backend to EMQX broker
for real-time message delivery to mobile clients.

Features:
- Publish messages to community channels
- Publish typing indicators
- Publish read receipts
- Publish reactions
- Update member presence
- System notifications

Topic Structure:
- faithflow/{church_id}/presence/{member_id}
- faithflow/{church_id}/community/{community_id}/announcements
- faithflow/{church_id}/community/{community_id}/general
- faithflow/{church_id}/community/{community_id}/subgroup/{subgroup_id}
- faithflow/{church_id}/community/{community_id}/typing
- faithflow/{church_id}/community/{community_id}/read
- faithflow/{church_id}/community/{community_id}/reactions

Configuration:
- MQTT_BROKER_HOST: EMQX broker host (default: localhost)
- MQTT_BROKER_PORT: EMQX broker port (default: 1883)
- MQTT_USERNAME: System client username
- MQTT_PASSWORD: System client password or JWT token
"""

import asyncio
import json
import logging
import os
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid

try:
    import paho.mqtt.client as mqtt
    from paho.mqtt.enums import CallbackAPIVersion
    PAHO_V2 = True
except ImportError:
    import paho.mqtt.client as mqtt
    PAHO_V2 = False

logger = logging.getLogger(__name__)

# Configuration
MQTT_BROKER_HOST = os.environ.get("MQTT_BROKER_HOST", "localhost")
MQTT_BROKER_PORT = int(os.environ.get("MQTT_BROKER_PORT", "1883"))
MQTT_USERNAME = os.environ.get("MQTT_USERNAME", "faithflow-system")
MQTT_PASSWORD = os.environ.get("MQTT_PASSWORD", "")
MQTT_CLIENT_ID = os.environ.get("MQTT_CLIENT_ID", f"faithflow-backend-{uuid.uuid4().hex[:8]}")

# QoS Levels
QOS_AT_MOST_ONCE = 0   # Fire and forget (typing indicators)
QOS_AT_LEAST_ONCE = 1  # Guaranteed delivery (reactions, read receipts)
QOS_EXACTLY_ONCE = 2   # Exactly once (messages)

# Topic prefix
TOPIC_PREFIX = "faithflow"


class MQTTServiceError(Exception):
    """Base exception for MQTT operations."""
    pass


class MQTTService:
    """
    Service for publishing messages to EMQX MQTT broker.

    This service is used by the backend to:
    1. Publish chat messages after storing in MongoDB
    2. Send typing indicators
    3. Send read receipts
    4. Send reactions
    5. Update presence information
    6. Send system notifications
    """

    def __init__(
        self,
        broker_host: str = MQTT_BROKER_HOST,
        broker_port: int = MQTT_BROKER_PORT,
        username: str = MQTT_USERNAME,
        password: str = MQTT_PASSWORD,
        client_id: str = MQTT_CLIENT_ID
    ):
        """
        Initialize MQTT service.

        Args:
            broker_host: MQTT broker hostname
            broker_port: MQTT broker port
            username: MQTT username
            password: MQTT password or JWT token
            client_id: Unique client ID
        """
        self.broker_host = broker_host
        self.broker_port = broker_port
        self.username = username
        self.password = password
        self.client_id = client_id
        self._client: Optional[mqtt.Client] = None
        self._connected = False
        self._lock = asyncio.Lock()

    def _create_client(self) -> mqtt.Client:
        """Create and configure MQTT client."""
        if PAHO_V2:
            client = mqtt.Client(
                callback_api_version=CallbackAPIVersion.VERSION2,
                client_id=self.client_id,
                protocol=mqtt.MQTTv311
            )
        else:
            client = mqtt.Client(
                client_id=self.client_id,
                protocol=mqtt.MQTTv311
            )

        # Set credentials
        if self.username:
            client.username_pw_set(self.username, self.password)

        # Set callbacks
        client.on_connect = self._on_connect
        client.on_disconnect = self._on_disconnect
        client.on_publish = self._on_publish

        return client

    def _on_connect(self, client, userdata, flags, rc, *args):
        """Callback when connected to broker."""
        if rc == 0:
            logger.info(f"Connected to MQTT broker at {self.broker_host}:{self.broker_port}")
            self._connected = True
        else:
            logger.error(f"MQTT connection failed with code: {rc}")
            self._connected = False

    def _on_disconnect(self, client, userdata, rc, *args):
        """Callback when disconnected from broker."""
        logger.warning(f"Disconnected from MQTT broker (rc={rc})")
        self._connected = False

    def _on_publish(self, client, userdata, mid, *args):
        """Callback when message is published."""
        logger.debug(f"Message published (mid={mid})")

    async def connect(self) -> bool:
        """
        Connect to MQTT broker.

        Returns:
            True if connected successfully
        """
        async with self._lock:
            if self._connected:
                return True

            try:
                self._client = self._create_client()
                self._client.connect(self.broker_host, self.broker_port, keepalive=60)
                self._client.loop_start()

                # Wait for connection
                for _ in range(10):  # 5 second timeout
                    if self._connected:
                        return True
                    await asyncio.sleep(0.5)

                logger.error("MQTT connection timeout")
                return False

            except Exception as e:
                logger.error(f"Failed to connect to MQTT broker: {e}")
                return False

    async def disconnect(self):
        """Disconnect from MQTT broker."""
        if self._client:
            self._client.loop_stop()
            self._client.disconnect()
            self._connected = False
            logger.info("Disconnected from MQTT broker")

    async def _ensure_connected(self):
        """Ensure client is connected before publishing."""
        if not self._connected:
            connected = await self.connect()
            if not connected:
                raise MQTTServiceError("Failed to connect to MQTT broker")

    def _build_topic(self, *parts: str) -> str:
        """Build topic string from parts."""
        return "/".join([TOPIC_PREFIX] + list(parts))

    async def publish(
        self,
        topic: str,
        payload: Dict[str, Any],
        qos: int = QOS_AT_LEAST_ONCE,
        retain: bool = False
    ) -> bool:
        """
        Publish message to MQTT topic.

        Args:
            topic: MQTT topic
            payload: Message payload (will be JSON encoded)
            qos: Quality of Service level
            retain: Whether to retain message

        Returns:
            True if published successfully
        """
        await self._ensure_connected()

        try:
            message = json.dumps(payload, default=str)
            result = self._client.publish(topic, message, qos=qos, retain=retain)

            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                logger.debug(f"Published to {topic}: {message[:100]}...")
                return True
            else:
                logger.error(f"Failed to publish to {topic}: rc={result.rc}")
                return False

        except Exception as e:
            logger.error(f"Error publishing to {topic}: {e}")
            return False

    # =========================================================================
    # Community Message Publishing
    # =========================================================================

    async def publish_message(
        self,
        church_id: str,
        community_id: str,
        message: Dict[str, Any],
        channel_type: str = "general",
        subgroup_id: Optional[str] = None
    ) -> bool:
        """
        Publish a chat message to community channel.

        Args:
            church_id: Church ID
            community_id: Community ID
            message: Message object with id, sender, text, etc.
            channel_type: Channel type (general, announcements, subgroup)
            subgroup_id: Subgroup ID if channel_type is subgroup

        Returns:
            True if published successfully
        """
        if channel_type == "subgroup" and subgroup_id:
            topic = self._build_topic(
                church_id, "community", community_id, "subgroup", subgroup_id
            )
        elif channel_type == "announcements":
            topic = self._build_topic(
                church_id, "community", community_id, "announcements"
            )
        else:
            topic = self._build_topic(
                church_id, "community", community_id, "general"
            )

        payload = {
            "type": "message",
            "data": message,
            "timestamp": datetime.utcnow().isoformat()
        }

        return await self.publish(topic, payload, qos=QOS_EXACTLY_ONCE)

    async def publish_typing_indicator(
        self,
        church_id: str,
        community_id: str,
        member_id: str,
        member_name: str,
        is_typing: bool,
        subgroup_id: Optional[str] = None
    ) -> bool:
        """
        Publish typing indicator to community.

        Args:
            church_id: Church ID
            community_id: Community ID
            member_id: Member ID who is typing
            member_name: Member's display name
            is_typing: Whether member is typing
            subgroup_id: Subgroup ID if in subgroup chat

        Returns:
            True if published successfully
        """
        if subgroup_id:
            topic = self._build_topic(
                church_id, "community", community_id, "subgroup", subgroup_id, "typing"
            )
        else:
            topic = self._build_topic(
                church_id, "community", community_id, "typing"
            )

        payload = {
            "member_id": member_id,
            "member_name": member_name,
            "is_typing": is_typing,
            "timestamp": datetime.utcnow().isoformat()
        }

        return await self.publish(topic, payload, qos=QOS_AT_MOST_ONCE)

    async def publish_read_receipt(
        self,
        church_id: str,
        community_id: str,
        member_id: str,
        message_id: str,
        subgroup_id: Optional[str] = None
    ) -> bool:
        """
        Publish read receipt for a message.

        Args:
            church_id: Church ID
            community_id: Community ID
            member_id: Member who read the message
            message_id: ID of message that was read
            subgroup_id: Subgroup ID if applicable

        Returns:
            True if published successfully
        """
        topic = self._build_topic(
            church_id, "community", community_id, "read"
        )

        payload = {
            "member_id": member_id,
            "message_id": message_id,
            "subgroup_id": subgroup_id,
            "read_at": datetime.utcnow().isoformat()
        }

        return await self.publish(topic, payload, qos=QOS_AT_LEAST_ONCE)

    async def publish_reaction(
        self,
        church_id: str,
        community_id: str,
        message_id: str,
        member_id: str,
        member_name: str,
        emoji: str,
        action: str = "add"  # "add" or "remove"
    ) -> bool:
        """
        Publish reaction to a message.

        Args:
            church_id: Church ID
            community_id: Community ID
            message_id: Message ID
            member_id: Member who reacted
            member_name: Member's display name
            emoji: Reaction emoji
            action: "add" or "remove"

        Returns:
            True if published successfully
        """
        topic = self._build_topic(
            church_id, "community", community_id, "reactions"
        )

        payload = {
            "message_id": message_id,
            "member_id": member_id,
            "member_name": member_name,
            "emoji": emoji,
            "action": action,
            "timestamp": datetime.utcnow().isoformat()
        }

        return await self.publish(topic, payload, qos=QOS_AT_LEAST_ONCE)

    async def publish_message_update(
        self,
        church_id: str,
        community_id: str,
        message_id: str,
        update_type: str,
        data: Dict[str, Any],
        subgroup_id: Optional[str] = None
    ) -> bool:
        """
        Publish message update (edit, delete).

        Args:
            church_id: Church ID
            community_id: Community ID
            message_id: Message ID
            update_type: Type of update (edit, delete)
            data: Update data
            subgroup_id: Subgroup ID if applicable

        Returns:
            True if published successfully
        """
        if subgroup_id:
            topic = self._build_topic(
                church_id, "community", community_id, "subgroup", subgroup_id
            )
        else:
            topic = self._build_topic(
                church_id, "community", community_id, "general"
            )

        payload = {
            "type": f"message_{update_type}",
            "message_id": message_id,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }

        return await self.publish(topic, payload, qos=QOS_EXACTLY_ONCE)

    # =========================================================================
    # Presence Publishing
    # =========================================================================

    async def publish_presence(
        self,
        church_id: str,
        member_id: str,
        is_online: bool,
        active_community_id: Optional[str] = None,
        active_subgroup_id: Optional[str] = None
    ) -> bool:
        """
        Publish member presence status.

        Args:
            church_id: Church ID
            member_id: Member ID
            is_online: Whether member is online
            active_community_id: Currently active community
            active_subgroup_id: Currently active subgroup

        Returns:
            True if published successfully
        """
        topic = self._build_topic(church_id, "presence", member_id)

        payload = {
            "online": is_online,
            "last_seen": datetime.utcnow().isoformat(),
            "active_community_id": active_community_id,
            "active_subgroup_id": active_subgroup_id
        }

        # Retain presence messages so new subscribers see current status
        return await self.publish(topic, payload, qos=QOS_AT_LEAST_ONCE, retain=True)

    # =========================================================================
    # System Notifications
    # =========================================================================

    async def publish_system_notification(
        self,
        church_id: str,
        community_id: str,
        notification_type: str,
        data: Dict[str, Any],
        subgroup_id: Optional[str] = None
    ) -> bool:
        """
        Publish system notification to community.

        Args:
            church_id: Church ID
            community_id: Community ID
            notification_type: Type of notification (member_joined, member_left, etc.)
            data: Notification data
            subgroup_id: Subgroup ID if applicable

        Returns:
            True if published successfully
        """
        if subgroup_id:
            topic = self._build_topic(
                church_id, "community", community_id, "subgroup", subgroup_id
            )
        else:
            topic = self._build_topic(
                church_id, "community", community_id, "general"
            )

        payload = {
            "type": "system",
            "notification_type": notification_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }

        return await self.publish(topic, payload, qos=QOS_AT_LEAST_ONCE)

    async def broadcast_to_community_members(
        self,
        church_id: str,
        community_id: str,
        member_ids: List[str],
        notification: Dict[str, Any]
    ) -> int:
        """
        Broadcast notification to specific community members.
        Used for targeted notifications like @mentions.

        Args:
            church_id: Church ID
            community_id: Community ID
            member_ids: List of member IDs to notify
            notification: Notification payload

        Returns:
            Number of successful publishes
        """
        success_count = 0

        for member_id in member_ids:
            topic = self._build_topic(
                church_id, "member", member_id, "notifications"
            )
            if await self.publish(topic, notification, qos=QOS_AT_LEAST_ONCE):
                success_count += 1

        return success_count

    # =========================================================================
    # Poll and Event Updates
    # =========================================================================

    async def publish_poll_update(
        self,
        church_id: str,
        community_id: str,
        poll_id: str,
        message_id: str,
        update_type: str,
        data: Dict[str, Any]
    ) -> bool:
        """
        Publish poll update (vote, close).

        Args:
            church_id: Church ID
            community_id: Community ID
            poll_id: Poll ID
            message_id: Associated message ID
            update_type: Type of update (vote, close)
            data: Update data

        Returns:
            True if published successfully
        """
        topic = self._build_topic(
            church_id, "community", community_id, "general"
        )

        payload = {
            "type": f"poll_{update_type}",
            "poll_id": poll_id,
            "message_id": message_id,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }

        return await self.publish(topic, payload, qos=QOS_AT_LEAST_ONCE)

    async def publish_event_update(
        self,
        church_id: str,
        community_id: str,
        event_id: str,
        message_id: str,
        update_type: str,
        data: Dict[str, Any]
    ) -> bool:
        """
        Publish event update (rsvp, update, reminder).

        Args:
            church_id: Church ID
            community_id: Community ID
            event_id: Event ID
            message_id: Associated message ID
            update_type: Type of update (rsvp, update, reminder)
            data: Update data

        Returns:
            True if published successfully
        """
        topic = self._build_topic(
            church_id, "community", community_id, "general"
        )

        payload = {
            "type": f"event_{update_type}",
            "event_id": event_id,
            "message_id": message_id,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }

        return await self.publish(topic, payload, qos=QOS_AT_LEAST_ONCE)


# Singleton instance
_mqtt_service: Optional[MQTTService] = None


def get_mqtt_service() -> MQTTService:
    """
    Get MQTT service singleton.

    Returns:
        MQTTService instance
    """
    global _mqtt_service
    if _mqtt_service is None:
        _mqtt_service = MQTTService()
    return _mqtt_service


# FastAPI dependency
async def get_mqtt() -> MQTTService:
    """
    FastAPI dependency for MQTT service.

    Usage:
        @router.post("/messages")
        async def send_message(
            mqtt: MQTTService = Depends(get_mqtt)
        ):
            await mqtt.publish_message(...)
    """
    service = get_mqtt_service()
    await service.connect()
    return service


# Startup/shutdown hooks for FastAPI
async def mqtt_startup():
    """Call on FastAPI startup to connect MQTT."""
    service = get_mqtt_service()
    await service.connect()
    logger.info("MQTT service connected on startup")


async def mqtt_shutdown():
    """Call on FastAPI shutdown to disconnect MQTT."""
    service = get_mqtt_service()
    await service.disconnect()
    logger.info("MQTT service disconnected on shutdown")
