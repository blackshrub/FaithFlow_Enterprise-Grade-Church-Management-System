"""
Faith Assistant Session Cache

Stores AI conversation session data including:
- Mode (pastoral, scholarly, youth, neutral)
- Language preference (en, id)
- Temperature and reply length settings
- Persona vector for personalization
- Last messages for context

TTL: 2 hours (active conversation window)

Uses msgspec for ~20% faster serialization compared to orjson.
"""

import logging
from typing import Optional, Dict, Any, Literal
from dataclasses import dataclass, asdict, field
from datetime import datetime

from config.redis import get_redis
from .utils import redis_key, TTL

# Use centralized msgspec-based serialization
from utils.serialization import json_dumps_str, json_loads

logger = logging.getLogger(__name__)


# Type definitions
ChatMode = Literal["pastoral", "scholarly", "youth", "neutral"]
Language = Literal["en", "id"]
ReplyLength = Literal["short", "medium", "long"]


@dataclass
class FaithAssistantSession:
    """Faith Assistant session data structure."""

    # Core settings
    mode: ChatMode = "pastoral"
    language: Language = "id"
    temperature: float = 0.7
    reply_length: ReplyLength = "medium"

    # Personalization
    persona_vector: Dict[str, float] = field(default_factory=dict)

    # Context
    conv_summary: str = ""
    last_user_msg: str = ""
    last_assistant_msg: str = ""

    # Metadata
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    message_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for Redis storage."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "FaithAssistantSession":
        """Create from dictionary."""
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})

    def update_timestamp(self) -> None:
        """Update the updated_at timestamp."""
        self.updated_at = datetime.utcnow().isoformat()


class SessionCache:
    """
    Redis-backed session cache for Faith Assistant.

    Stores and retrieves conversation session data with automatic
    serialization and TTL management.
    """

    def __init__(self, ttl: int = TTL.SESSION):
        """
        Initialize session cache.

        Args:
            ttl: Time-to-live in seconds (default: 2 hours)
        """
        self.ttl = ttl

    def _make_key(self, church_id: str, user_id: str) -> str:
        """Create Redis key for session."""
        return redis_key("faith_assistant", "session", church_id, user_id)

    async def save(
        self,
        church_id: str,
        user_id: str,
        session: FaithAssistantSession,
    ) -> bool:
        """
        Save session to Redis.

        Args:
            church_id: Church identifier for multi-tenant isolation
            user_id: User identifier
            session: Session data to save

        Returns:
            bool: True if saved successfully
        """
        try:
            redis = await get_redis()
            key = self._make_key(church_id, user_id)

            session.update_timestamp()
            data = json_dumps_str(session.to_dict())

            await redis.set(key, data, ex=self.ttl)

            logger.debug(f"Saved session for user {user_id} in church {church_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to save session: {e}")
            return False

    async def load(
        self,
        church_id: str,
        user_id: str,
    ) -> Optional[FaithAssistantSession]:
        """
        Load session from Redis.

        Args:
            church_id: Church identifier
            user_id: User identifier

        Returns:
            FaithAssistantSession or None if not found
        """
        try:
            redis = await get_redis()
            key = self._make_key(church_id, user_id)

            data = await redis.get(key)

            if data is None:
                logger.debug(f"No session found for user {user_id}")
                return None

            session_dict = json_loads(data)
            session = FaithAssistantSession.from_dict(session_dict)

            logger.debug(f"Loaded session for user {user_id}")
            return session

        except Exception as e:
            logger.error(f"Failed to load session: {e}")
            return None

    async def load_or_create(
        self,
        church_id: str,
        user_id: str,
        defaults: Dict[str, Any] = None,
    ) -> FaithAssistantSession:
        """
        Load existing session or create new one with defaults.

        Args:
            church_id: Church identifier
            user_id: User identifier
            defaults: Default values for new session

        Returns:
            FaithAssistantSession
        """
        session = await self.load(church_id, user_id)

        if session is None:
            session = FaithAssistantSession(**(defaults or {}))
            await self.save(church_id, user_id, session)

        return session

    async def update(
        self,
        church_id: str,
        user_id: str,
        updates: Dict[str, Any],
    ) -> Optional[FaithAssistantSession]:
        """
        Update specific fields in session.

        Args:
            church_id: Church identifier
            user_id: User identifier
            updates: Dictionary of fields to update

        Returns:
            Updated session or None if not found
        """
        session = await self.load(church_id, user_id)

        if session is None:
            return None

        for key, value in updates.items():
            if hasattr(session, key):
                setattr(session, key, value)

        await self.save(church_id, user_id, session)
        return session

    async def update_context(
        self,
        church_id: str,
        user_id: str,
        user_msg: str,
        assistant_msg: str,
        summary: str = None,
    ) -> Optional[FaithAssistantSession]:
        """
        Update conversation context after a message exchange.

        Args:
            church_id: Church identifier
            user_id: User identifier
            user_msg: User's message
            assistant_msg: Assistant's response
            summary: Optional updated conversation summary

        Returns:
            Updated session
        """
        session = await self.load(church_id, user_id)

        if session is None:
            session = FaithAssistantSession()

        session.last_user_msg = user_msg
        session.last_assistant_msg = assistant_msg
        session.message_count += 1

        if summary:
            session.conv_summary = summary

        await self.save(church_id, user_id, session)
        return session

    async def clear(self, church_id: str, user_id: str) -> bool:
        """
        Clear session from Redis.

        Args:
            church_id: Church identifier
            user_id: User identifier

        Returns:
            bool: True if cleared successfully
        """
        try:
            redis = await get_redis()
            key = self._make_key(church_id, user_id)

            await redis.delete(key)

            logger.debug(f"Cleared session for user {user_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to clear session: {e}")
            return False

    async def exists(self, church_id: str, user_id: str) -> bool:
        """Check if session exists."""
        try:
            redis = await get_redis()
            key = self._make_key(church_id, user_id)
            return await redis.exists(key) > 0
        except Exception as e:
            logger.error(f"Failed to check session existence: {e}")
            return False

    async def refresh_ttl(self, church_id: str, user_id: str) -> bool:
        """Refresh the TTL on an existing session."""
        try:
            redis = await get_redis()
            key = self._make_key(church_id, user_id)
            return await redis.expire(key, self.ttl)
        except Exception as e:
            logger.error(f"Failed to refresh TTL: {e}")
            return False

    async def get_ttl(self, church_id: str, user_id: str) -> int:
        """Get remaining TTL for a session."""
        try:
            redis = await get_redis()
            key = self._make_key(church_id, user_id)
            return await redis.ttl(key)
        except Exception as e:
            logger.error(f"Failed to get TTL: {e}")
            return -1


# Global instance
session_cache = SessionCache()
