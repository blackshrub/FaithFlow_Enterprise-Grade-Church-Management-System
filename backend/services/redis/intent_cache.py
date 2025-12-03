"""
Faith Assistant Intent Classification Cache

Caches the last N classified intents per user for:
- Improving intent classification accuracy
- Detecting conversation patterns
- Personalization based on common query types

TTL: 1 hour

Uses msgspec for ~20% faster serialization compared to orjson.
"""

import logging
from typing import Optional, List, Dict, Any, Literal
from dataclasses import dataclass, asdict
from datetime import datetime

from config.redis import get_redis
from .utils import redis_key, TTL

# Use centralized msgspec-based serialization
from utils.serialization import json_dumps_str, json_loads

logger = logging.getLogger(__name__)


# Intent types for Faith Assistant
IntentType = Literal[
    "pastoral",       # Seeking spiritual guidance
    "scholarly",      # Bible study, theological questions
    "prayer",         # Prayer requests
    "emotional",      # Emotional support, encouragement
    "practical",      # Practical faith application
    "question",       # General questions about faith
    "greeting",       # Greetings, small talk
    "farewell",       # Ending conversation
    "unclear",        # Intent not clear
]


@dataclass
class ClassifiedIntent:
    """Single classified intent entry."""

    text: str                    # User's message
    intent: IntentType           # Classified intent
    confidence: float = 1.0      # Classification confidence (0-1)
    timestamp: str = ""          # When classified

    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.utcnow().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ClassifiedIntent":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


class IntentCache:
    """
    Redis-backed cache for intent classification history.

    Stores the last N classified intents per user to improve
    classification accuracy and enable pattern detection.
    """

    def __init__(
        self,
        ttl: int = TTL.INTENT,
        max_intents: int = 30,
    ):
        """
        Initialize intent cache.

        Args:
            ttl: Time-to-live in seconds (default: 1 hour)
            max_intents: Maximum intents to store per user (default: 30)
        """
        self.ttl = ttl
        self.max_intents = max_intents

    def _make_key(self, church_id: str, user_id: str) -> str:
        """Create Redis key for intent cache."""
        return redis_key("faith_assistant", "intent", church_id, user_id)

    async def add(
        self,
        church_id: str,
        user_id: str,
        text: str,
        intent: IntentType,
        confidence: float = 1.0,
    ) -> bool:
        """
        Add a classified intent to the cache.

        Maintains a rolling window of the last N intents.

        Args:
            church_id: Church identifier
            user_id: User identifier
            text: Original user message
            intent: Classified intent type
            confidence: Classification confidence

        Returns:
            bool: True if added successfully
        """
        try:
            redis = await get_redis()
            key = self._make_key(church_id, user_id)

            entry = ClassifiedIntent(
                text=text[:500],  # Limit text length
                intent=intent,
                confidence=confidence,
            )

            # Add to list (newest first)
            await redis.lpush(key, json_dumps_str(entry.to_dict()))

            # Trim to max size
            await redis.ltrim(key, 0, self.max_intents - 1)

            # Set/refresh TTL
            await redis.expire(key, self.ttl)

            logger.debug(f"Added intent '{intent}' for user {user_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to add intent: {e}")
            return False

    async def get(
        self,
        church_id: str,
        user_id: str,
        limit: int = None,
    ) -> List[ClassifiedIntent]:
        """
        Get cached intents for a user.

        Args:
            church_id: Church identifier
            user_id: User identifier
            limit: Maximum intents to return (default: all)

        Returns:
            List of ClassifiedIntent, newest first
        """
        try:
            redis = await get_redis()
            key = self._make_key(church_id, user_id)

            end = (limit - 1) if limit else -1
            data = await redis.lrange(key, 0, end)

            intents = []
            for item in data:
                try:
                    intent_dict = json_loads(item)
                    intents.append(ClassifiedIntent.from_dict(intent_dict))
                except json.JSONDecodeError:
                    continue

            return intents

        except Exception as e:
            logger.error(f"Failed to get intents: {e}")
            return []

    async def get_distribution(
        self,
        church_id: str,
        user_id: str,
    ) -> Dict[str, int]:
        """
        Get intent distribution for a user.

        Useful for understanding user's common query patterns.

        Args:
            church_id: Church identifier
            user_id: User identifier

        Returns:
            Dict mapping intent types to counts
        """
        intents = await self.get(church_id, user_id)

        distribution = {}
        for intent in intents:
            distribution[intent.intent] = distribution.get(intent.intent, 0) + 1

        return distribution

    async def get_dominant_intent(
        self,
        church_id: str,
        user_id: str,
    ) -> Optional[IntentType]:
        """
        Get the most common intent for a user.

        Args:
            church_id: Church identifier
            user_id: User identifier

        Returns:
            Most common intent type or None
        """
        distribution = await self.get_distribution(church_id, user_id)

        if not distribution:
            return None

        return max(distribution, key=distribution.get)

    async def get_recent_pattern(
        self,
        church_id: str,
        user_id: str,
        window: int = 5,
    ) -> List[IntentType]:
        """
        Get recent intent pattern.

        Useful for detecting conversation flow.

        Args:
            church_id: Church identifier
            user_id: User identifier
            window: Number of recent intents to return

        Returns:
            List of recent intent types
        """
        intents = await self.get(church_id, user_id, limit=window)
        return [i.intent for i in intents]

    async def clear(self, church_id: str, user_id: str) -> bool:
        """
        Clear intent cache for a user.

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

            logger.debug(f"Cleared intents for user {user_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to clear intents: {e}")
            return False

    async def count(self, church_id: str, user_id: str) -> int:
        """Get number of cached intents."""
        try:
            redis = await get_redis()
            key = self._make_key(church_id, user_id)
            return await redis.llen(key)
        except Exception as e:
            logger.error(f"Failed to count intents: {e}")
            return 0


# Global instance
intent_cache = IntentCache()
