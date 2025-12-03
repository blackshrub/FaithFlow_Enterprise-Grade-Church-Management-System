"""
Redis Pub/Sub for Cache Invalidation

Provides distributed cache invalidation across multiple backend instances.
When data changes, a message is published to notify all instances to
invalidate their local caches.

Usage:
    # Publish invalidation
    await pubsub.publish_invalidation("church_settings", "church_123")

    # Subscribe in startup (runs in background)
    await pubsub.start_subscriber()
"""

import asyncio
import json
import logging
from typing import Optional, Callable, Dict, Any, List
from dataclasses import dataclass
from datetime import datetime
from enum import Enum

from config.redis import get_redis
from .utils import redis_key

logger = logging.getLogger(__name__)


class InvalidationType(str, Enum):
    """Types of cache invalidation events."""

    # Church-level invalidations
    CHURCH_SETTINGS = "church_settings"
    MEMBER_STATUSES = "member_statuses"
    DEMOGRAPHICS = "demographics"
    EVENT_CATEGORIES = "event_categories"
    GROUP_CATEGORIES = "group_categories"

    # Member-level invalidations
    MEMBER = "member"
    MEMBER_LIST = "member_list"

    # Content invalidations
    ARTICLE = "article"
    EVENT = "event"
    GROUP = "group"
    COMMUNITY = "community"

    # User/Auth invalidations
    USER_SESSION = "user_session"
    USER_PERMISSIONS = "user_permissions"

    # Explore content
    DEVOTION = "devotion"
    BIBLE_STUDY = "bible_study"
    QUIZ = "quiz"

    # System-wide
    SYSTEM_SETTINGS = "system_settings"


@dataclass
class InvalidationMessage:
    """Cache invalidation message structure."""

    type: InvalidationType
    church_id: str = ""
    entity_id: str = ""
    timestamp: str = ""
    source: str = ""  # Which instance published this

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.type.value if isinstance(self.type, InvalidationType) else self.type,
            "church_id": self.church_id,
            "entity_id": self.entity_id,
            "timestamp": self.timestamp or datetime.utcnow().isoformat(),
            "source": self.source,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "InvalidationMessage":
        return cls(
            type=InvalidationType(data["type"]) if data.get("type") else InvalidationType.CHURCH_SETTINGS,
            church_id=data.get("church_id", ""),
            entity_id=data.get("entity_id", ""),
            timestamp=data.get("timestamp", ""),
            source=data.get("source", ""),
        )


# Type alias for invalidation handlers
InvalidationHandler = Callable[[InvalidationMessage], None]


class PubSubService:
    """
    Redis Pub/Sub service for distributed cache invalidation.

    Allows multiple backend instances to stay in sync by publishing
    and subscribing to cache invalidation events.
    """

    # Channel name for cache invalidation
    CHANNEL = "faithflow:cache:invalidation"

    def __init__(self):
        """Initialize pub/sub service."""
        self._subscriber_task: Optional[asyncio.Task] = None
        self._handlers: Dict[InvalidationType, List[InvalidationHandler]] = {}
        self._running = False
        self._instance_id = self._generate_instance_id()

    def _generate_instance_id(self) -> str:
        """Generate unique instance identifier."""
        import uuid
        import socket
        try:
            hostname = socket.gethostname()
        except Exception:
            hostname = "unknown"
        return f"{hostname}:{uuid.uuid4().hex[:8]}"

    # ==================== Publishing ====================

    async def publish_invalidation(
        self,
        invalidation_type: InvalidationType,
        church_id: str = "",
        entity_id: str = "",
    ) -> bool:
        """
        Publish a cache invalidation event.

        Args:
            invalidation_type: Type of invalidation
            church_id: Church ID (for scoped invalidations)
            entity_id: Specific entity ID (optional)

        Returns:
            bool: True if published successfully
        """
        try:
            redis = await get_redis()

            message = InvalidationMessage(
                type=invalidation_type,
                church_id=church_id,
                entity_id=entity_id,
                source=self._instance_id,
            )

            payload = json.dumps(message.to_dict())
            count = await redis.publish(self.CHANNEL, payload)

            logger.debug(
                f"Published invalidation: {invalidation_type.value} "
                f"(church={church_id}, entity={entity_id}) to {count} subscribers"
            )
            return True

        except Exception as e:
            logger.error(f"Failed to publish invalidation: {e}")
            return False

    async def publish_church_settings_changed(self, church_id: str) -> bool:
        """Convenience: Publish church settings changed."""
        return await self.publish_invalidation(
            InvalidationType.CHURCH_SETTINGS,
            church_id=church_id,
        )

    async def publish_member_changed(self, church_id: str, member_id: str = "") -> bool:
        """Convenience: Publish member changed."""
        return await self.publish_invalidation(
            InvalidationType.MEMBER,
            church_id=church_id,
            entity_id=member_id,
        )

    async def publish_member_list_changed(self, church_id: str) -> bool:
        """Convenience: Publish member list changed (any member add/delete/status change)."""
        return await self.publish_invalidation(
            InvalidationType.MEMBER_LIST,
            church_id=church_id,
        )

    async def publish_user_session_invalidated(self, user_id: str) -> bool:
        """Convenience: Publish user session invalidated (logout all devices)."""
        return await self.publish_invalidation(
            InvalidationType.USER_SESSION,
            entity_id=user_id,
        )

    # ==================== Subscribing ====================

    def register_handler(
        self,
        invalidation_type: InvalidationType,
        handler: InvalidationHandler,
    ) -> None:
        """
        Register a handler for specific invalidation type.

        Args:
            invalidation_type: Type to handle
            handler: Callback function (sync or async)
        """
        if invalidation_type not in self._handlers:
            self._handlers[invalidation_type] = []
        self._handlers[invalidation_type].append(handler)
        logger.debug(f"Registered handler for {invalidation_type.value}")

    def unregister_handler(
        self,
        invalidation_type: InvalidationType,
        handler: InvalidationHandler,
    ) -> bool:
        """Unregister a handler."""
        if invalidation_type in self._handlers:
            try:
                self._handlers[invalidation_type].remove(handler)
                return True
            except ValueError:
                pass
        return False

    async def _handle_message(self, message_data: str) -> None:
        """Process incoming invalidation message."""
        try:
            data = json.loads(message_data)
            message = InvalidationMessage.from_dict(data)

            # Skip our own messages (already handled locally)
            if message.source == self._instance_id:
                return

            logger.debug(
                f"Received invalidation: {message.type.value} "
                f"(church={message.church_id}, entity={message.entity_id})"
            )

            # Call registered handlers
            handlers = self._handlers.get(message.type, [])
            for handler in handlers:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        await handler(message)
                    else:
                        handler(message)
                except Exception as e:
                    logger.error(f"Handler error for {message.type.value}: {e}")

        except json.JSONDecodeError as e:
            logger.error(f"Invalid invalidation message format: {e}")
        except Exception as e:
            logger.error(f"Error handling invalidation message: {e}")

    async def start_subscriber(self) -> None:
        """
        Start the background subscriber task.

        Should be called during application startup.
        """
        if self._running:
            logger.warning("Subscriber already running")
            return

        self._running = True
        self._subscriber_task = asyncio.create_task(self._subscriber_loop())
        logger.info(f"Started pub/sub subscriber (instance: {self._instance_id})")

    async def stop_subscriber(self) -> None:
        """
        Stop the background subscriber task.

        Should be called during application shutdown.
        """
        self._running = False

        if self._subscriber_task:
            self._subscriber_task.cancel()
            try:
                await self._subscriber_task
            except asyncio.CancelledError:
                pass
            self._subscriber_task = None

        logger.info("Stopped pub/sub subscriber")

    async def _subscriber_loop(self) -> None:
        """Background loop for receiving invalidation messages."""
        while self._running:
            try:
                redis = await get_redis()
                pubsub = redis.pubsub()

                await pubsub.subscribe(self.CHANNEL)
                logger.debug(f"Subscribed to {self.CHANNEL}")

                async for message in pubsub.listen():
                    if not self._running:
                        break

                    if message["type"] == "message":
                        await self._handle_message(message["data"])

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Subscriber error: {e}")
                if self._running:
                    # Wait before reconnecting
                    await asyncio.sleep(5)

        logger.debug("Subscriber loop ended")


# Global instance
pubsub_service = PubSubService()


# ==================== Default Handlers ====================
# These handlers integrate with the cache service

async def _handle_church_settings_invalidation(message: InvalidationMessage) -> None:
    """Handle church settings invalidation."""
    from .cache import redis_cache
    await redis_cache.delete("church_settings", message.church_id)


async def _handle_member_statuses_invalidation(message: InvalidationMessage) -> None:
    """Handle member statuses invalidation."""
    from .cache import redis_cache
    await redis_cache.delete("member_statuses", message.church_id)


async def _handle_demographics_invalidation(message: InvalidationMessage) -> None:
    """Handle demographics invalidation."""
    from .cache import redis_cache
    await redis_cache.delete("demographics", message.church_id)


async def _handle_member_list_invalidation(message: InvalidationMessage) -> None:
    """Handle member list invalidation."""
    from .cache import redis_cache
    # Invalidate all member-related caches for this church
    await redis_cache.invalidate_pattern("members", f"*{message.church_id}*")


async def _handle_user_session_invalidation(message: InvalidationMessage) -> None:
    """Handle user session invalidation."""
    from .auth import auth_redis
    # Clear all sessions for this user
    if message.entity_id:
        await auth_redis.delete_all_user_sessions(message.entity_id)


def register_default_handlers() -> None:
    """Register default cache invalidation handlers."""
    pubsub_service.register_handler(
        InvalidationType.CHURCH_SETTINGS,
        _handle_church_settings_invalidation,
    )
    pubsub_service.register_handler(
        InvalidationType.MEMBER_STATUSES,
        _handle_member_statuses_invalidation,
    )
    pubsub_service.register_handler(
        InvalidationType.DEMOGRAPHICS,
        _handle_demographics_invalidation,
    )
    pubsub_service.register_handler(
        InvalidationType.MEMBER_LIST,
        _handle_member_list_invalidation,
    )
    pubsub_service.register_handler(
        InvalidationType.USER_SESSION,
        _handle_user_session_invalidation,
    )

    logger.info("Registered default cache invalidation handlers")


# ==================== Convenience Functions ====================

async def invalidate_church_cache(church_id: str) -> None:
    """Invalidate all caches for a church."""
    await pubsub_service.publish_invalidation(InvalidationType.CHURCH_SETTINGS, church_id)
    await pubsub_service.publish_invalidation(InvalidationType.MEMBER_STATUSES, church_id)
    await pubsub_service.publish_invalidation(InvalidationType.DEMOGRAPHICS, church_id)
    await pubsub_service.publish_invalidation(InvalidationType.MEMBER_LIST, church_id)


async def invalidate_on_settings_change(church_id: str) -> None:
    """Call when church settings are updated."""
    await pubsub_service.publish_church_settings_changed(church_id)


async def invalidate_on_member_change(church_id: str, member_id: str = "") -> None:
    """Call when a member is created/updated/deleted."""
    if member_id:
        await pubsub_service.publish_member_changed(church_id, member_id)
    await pubsub_service.publish_member_list_changed(church_id)


async def invalidate_user_sessions(user_id: str) -> None:
    """Call to invalidate all sessions for a user (password change, etc.)."""
    await pubsub_service.publish_user_session_invalidated(user_id)
