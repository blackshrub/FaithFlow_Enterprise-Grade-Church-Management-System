"""
Real-time Presence Service

Tracks online/offline status and activity for users and members.
Uses Redis sorted sets for efficient presence tracking.
"""

import time
import logging
from typing import Optional, List, Dict, Any, Set
from dataclasses import dataclass
from datetime import datetime

from config.redis import get_redis
from .utils import redis_key, TTL

logger = logging.getLogger(__name__)


@dataclass
class PresenceInfo:
    """User presence information."""

    user_id: str
    status: str  # online, away, offline
    last_seen: float  # Unix timestamp
    device: str = "unknown"
    activity: str = ""  # Current activity (viewing members, in chat, etc.)

    @property
    def is_online(self) -> bool:
        """Check if user is currently online."""
        return time.time() - self.last_seen < TTL.PRESENCE * 2

    @property
    def last_seen_datetime(self) -> datetime:
        """Get last seen as datetime."""
        return datetime.fromtimestamp(self.last_seen)


class PresenceService:
    """
    Redis-backed presence tracking service.

    Tracks user online status with heartbeat-based updates.
    Uses sorted sets for efficient range queries.
    """

    def __init__(self):
        """Initialize presence service."""
        pass

    def _online_key(self, church_id: str) -> str:
        """Get key for online users set."""
        return redis_key("presence", "online", church_id)

    def _user_key(self, church_id: str, user_id: str) -> str:
        """Get key for user presence data."""
        return redis_key("presence", "user", church_id, user_id)

    def _typing_key(self, church_id: str, channel_id: str) -> str:
        """Get key for typing indicators."""
        return redis_key("presence", "typing", church_id, channel_id)

    # ==================== Online Status ====================

    async def set_online(
        self,
        church_id: str,
        user_id: str,
        device: str = "unknown",
        activity: str = "",
    ) -> bool:
        """
        Mark user as online.

        Should be called periodically (heartbeat) to maintain status.

        Args:
            church_id: Church identifier
            user_id: User identifier
            device: Device type
            activity: Current activity

        Returns:
            bool: True if updated successfully
        """
        try:
            redis = await get_redis()
            now = time.time()

            # Add to online users sorted set (score = timestamp)
            online_key = self._online_key(church_id)
            await redis.zadd(online_key, {user_id: now})

            # Store user presence details
            user_key = self._user_key(church_id, user_id)
            await redis.hset(user_key, mapping={
                "status": "online",
                "last_seen": str(now),
                "device": device,
                "activity": activity,
            })
            await redis.expire(user_key, TTL.PRESENCE * 3)

            return True

        except Exception as e:
            logger.error(f"Failed to set online status: {e}")
            return False

    async def set_offline(
        self,
        church_id: str,
        user_id: str,
    ) -> bool:
        """
        Mark user as offline.

        Args:
            church_id: Church identifier
            user_id: User identifier

        Returns:
            bool: True if updated successfully
        """
        try:
            redis = await get_redis()

            # Remove from online set
            online_key = self._online_key(church_id)
            await redis.zrem(online_key, user_id)

            # Update user status
            user_key = self._user_key(church_id, user_id)
            await redis.hset(user_key, "status", "offline")
            await redis.hset(user_key, "last_seen", str(time.time()))

            return True

        except Exception as e:
            logger.error(f"Failed to set offline status: {e}")
            return False

    async def set_away(
        self,
        church_id: str,
        user_id: str,
    ) -> bool:
        """Mark user as away."""
        try:
            redis = await get_redis()

            user_key = self._user_key(church_id, user_id)
            await redis.hset(user_key, "status", "away")

            return True

        except Exception as e:
            logger.error(f"Failed to set away status: {e}")
            return False

    async def get_status(
        self,
        church_id: str,
        user_id: str,
    ) -> Optional[PresenceInfo]:
        """
        Get user's presence status.

        Args:
            church_id: Church identifier
            user_id: User identifier

        Returns:
            PresenceInfo or None
        """
        try:
            redis = await get_redis()
            user_key = self._user_key(church_id, user_id)

            data = await redis.hgetall(user_key)

            if not data:
                return None

            return PresenceInfo(
                user_id=user_id,
                status=data.get("status", "offline"),
                last_seen=float(data.get("last_seen", 0)),
                device=data.get("device", "unknown"),
                activity=data.get("activity", ""),
            )

        except Exception as e:
            logger.error(f"Failed to get status: {e}")
            return None

    async def is_online(
        self,
        church_id: str,
        user_id: str,
    ) -> bool:
        """Check if user is currently online."""
        try:
            redis = await get_redis()
            online_key = self._online_key(church_id)

            # Check if in online set and recent
            score = await redis.zscore(online_key, user_id)

            if score is None:
                return False

            return time.time() - score < TTL.PRESENCE * 2

        except Exception as e:
            logger.error(f"Failed to check online status: {e}")
            return False

    async def get_online_users(
        self,
        church_id: str,
        limit: int = 100,
    ) -> List[str]:
        """
        Get list of online user IDs.

        Args:
            church_id: Church identifier
            limit: Maximum users to return

        Returns:
            List of user IDs
        """
        try:
            redis = await get_redis()
            online_key = self._online_key(church_id)

            # Clean up stale entries first
            cutoff = time.time() - (TTL.PRESENCE * 2)
            await redis.zremrangebyscore(online_key, 0, cutoff)

            # Get online users
            users = await redis.zrevrange(online_key, 0, limit - 1)

            return list(users)

        except Exception as e:
            logger.error(f"Failed to get online users: {e}")
            return []

    async def get_online_count(
        self,
        church_id: str,
    ) -> int:
        """Get count of online users."""
        try:
            redis = await get_redis()
            online_key = self._online_key(church_id)

            # Clean up stale entries
            cutoff = time.time() - (TTL.PRESENCE * 2)
            await redis.zremrangebyscore(online_key, 0, cutoff)

            return await redis.zcard(online_key)

        except Exception as e:
            logger.error(f"Failed to get online count: {e}")
            return 0

    # ==================== Typing Indicators ====================

    async def set_typing(
        self,
        church_id: str,
        channel_id: str,
        user_id: str,
    ) -> bool:
        """
        Set typing indicator for user in a channel.

        Args:
            church_id: Church identifier
            channel_id: Chat channel/conversation ID
            user_id: User who is typing

        Returns:
            bool: True if set successfully
        """
        try:
            redis = await get_redis()
            key = self._typing_key(church_id, channel_id)

            await redis.zadd(key, {user_id: time.time()})
            await redis.expire(key, TTL.TYPING * 2)

            return True

        except Exception as e:
            logger.error(f"Failed to set typing: {e}")
            return False

    async def clear_typing(
        self,
        church_id: str,
        channel_id: str,
        user_id: str,
    ) -> bool:
        """Clear typing indicator for user."""
        try:
            redis = await get_redis()
            key = self._typing_key(church_id, channel_id)

            await redis.zrem(key, user_id)
            return True

        except Exception as e:
            logger.error(f"Failed to clear typing: {e}")
            return False

    async def get_typing_users(
        self,
        church_id: str,
        channel_id: str,
    ) -> List[str]:
        """
        Get users currently typing in a channel.

        Args:
            church_id: Church identifier
            channel_id: Chat channel ID

        Returns:
            List of user IDs who are typing
        """
        try:
            redis = await get_redis()
            key = self._typing_key(church_id, channel_id)

            # Clean up stale typing indicators
            cutoff = time.time() - TTL.TYPING
            await redis.zremrangebyscore(key, 0, cutoff)

            users = await redis.zrange(key, 0, -1)
            return list(users)

        except Exception as e:
            logger.error(f"Failed to get typing users: {e}")
            return []

    # ==================== Unread Counts ====================

    async def increment_unread(
        self,
        church_id: str,
        user_id: str,
        channel_type: str = "messages",
    ) -> int:
        """
        Increment unread count for a user.

        Args:
            church_id: Church identifier
            user_id: User identifier
            channel_type: Type of unread (messages, notifications, etc.)

        Returns:
            int: New unread count
        """
        try:
            redis = await get_redis()
            key = redis_key("presence", "unread", church_id, user_id, channel_type)

            count = await redis.incr(key)
            await redis.expire(key, TTL.DAYS_7)

            return count

        except Exception as e:
            logger.error(f"Failed to increment unread: {e}")
            return 0

    async def get_unread(
        self,
        church_id: str,
        user_id: str,
        channel_type: str = "messages",
    ) -> int:
        """Get unread count."""
        try:
            redis = await get_redis()
            key = redis_key("presence", "unread", church_id, user_id, channel_type)

            count = await redis.get(key)
            return int(count) if count else 0

        except Exception as e:
            logger.error(f"Failed to get unread: {e}")
            return 0

    async def clear_unread(
        self,
        church_id: str,
        user_id: str,
        channel_type: str = "messages",
    ) -> bool:
        """Clear unread count."""
        try:
            redis = await get_redis()
            key = redis_key("presence", "unread", church_id, user_id, channel_type)

            await redis.delete(key)
            return True

        except Exception as e:
            logger.error(f"Failed to clear unread: {e}")
            return False

    async def get_all_unread(
        self,
        church_id: str,
        user_id: str,
    ) -> Dict[str, int]:
        """Get all unread counts for a user."""
        try:
            redis = await get_redis()
            pattern = redis_key("presence", "unread", church_id, user_id, "*")

            counts = {}
            async for key in redis.scan_iter(match=pattern):
                channel_type = key.split(":")[-1]
                value = await redis.get(key)
                counts[channel_type] = int(value) if value else 0

            return counts

        except Exception as e:
            logger.error(f"Failed to get all unread: {e}")
            return {}


# Global instance
presence_service = PresenceService()
