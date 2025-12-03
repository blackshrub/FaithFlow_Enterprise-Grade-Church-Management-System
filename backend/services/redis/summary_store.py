"""
Faith Assistant Conversation Summary Store

Stores rolling conversation summaries for context management.
Summaries are generated periodically to compress conversation history
and reduce token usage with Claude API.

TTL: 24 hours
"""

import json
import logging
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, asdict, field
from datetime import datetime

from config.redis import get_redis
from .utils import redis_key, TTL

logger = logging.getLogger(__name__)


@dataclass
class ConversationSummary:
    """Conversation summary data structure."""

    # Main summary text
    summary: str = ""

    # Key topics discussed
    topics: List[str] = field(default_factory=list)

    # User's emotional state/needs detected
    emotional_context: str = ""

    # Bible verses mentioned
    verses_mentioned: List[str] = field(default_factory=list)

    # Prayer requests if any
    prayer_requests: List[str] = field(default_factory=list)

    # Number of messages summarized
    messages_summarized: int = 0

    # Timestamps
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for Redis storage."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ConversationSummary":
        """Create from dictionary."""
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})

    def to_prompt_context(self) -> str:
        """
        Format summary for inclusion in AI prompt.

        Returns:
            str: Formatted summary text for prompt injection
        """
        parts = []

        if self.summary:
            parts.append(f"Previous conversation: {self.summary}")

        if self.emotional_context:
            parts.append(f"User's current state: {self.emotional_context}")

        if self.topics:
            parts.append(f"Topics discussed: {', '.join(self.topics[:5])}")

        if self.verses_mentioned:
            parts.append(f"Bible verses referenced: {', '.join(self.verses_mentioned[:3])}")

        if self.prayer_requests:
            parts.append(f"Prayer needs: {', '.join(self.prayer_requests[:3])}")

        return " | ".join(parts) if parts else ""


class SummaryStore:
    """
    Redis-backed store for conversation summaries.

    Manages rolling conversation summaries that compress chat history
    to reduce token usage while maintaining context.
    """

    def __init__(self, ttl: int = TTL.SUMMARY):
        """
        Initialize summary store.

        Args:
            ttl: Time-to-live in seconds (default: 24 hours)
        """
        self.ttl = ttl

    def _make_key(self, church_id: str, user_id: str) -> str:
        """Create Redis key for summary."""
        return redis_key("faith_assistant", "summary", church_id, user_id)

    async def get(
        self,
        church_id: str,
        user_id: str,
    ) -> Optional[ConversationSummary]:
        """
        Get conversation summary.

        Args:
            church_id: Church identifier
            user_id: User identifier

        Returns:
            ConversationSummary or None if not found
        """
        try:
            redis = await get_redis()
            key = self._make_key(church_id, user_id)

            data = await redis.get(key)

            if data is None:
                return None

            summary_dict = json.loads(data)
            return ConversationSummary.from_dict(summary_dict)

        except Exception as e:
            logger.error(f"Failed to get summary: {e}")
            return None

    async def get_prompt_context(
        self,
        church_id: str,
        user_id: str,
    ) -> str:
        """
        Get summary formatted for prompt injection.

        Args:
            church_id: Church identifier
            user_id: User identifier

        Returns:
            str: Formatted summary or empty string
        """
        summary = await self.get(church_id, user_id)
        return summary.to_prompt_context() if summary else ""

    async def set(
        self,
        church_id: str,
        user_id: str,
        summary: ConversationSummary,
    ) -> bool:
        """
        Save conversation summary.

        Args:
            church_id: Church identifier
            user_id: User identifier
            summary: Summary data to save

        Returns:
            bool: True if saved successfully
        """
        try:
            redis = await get_redis()
            key = self._make_key(church_id, user_id)

            summary.updated_at = datetime.utcnow().isoformat()
            data = json.dumps(summary.to_dict())

            await redis.set(key, data, ex=self.ttl)

            logger.debug(f"Saved summary for user {user_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to save summary: {e}")
            return False

    async def update(
        self,
        church_id: str,
        user_id: str,
        new_summary_text: str,
        topics: List[str] = None,
        emotional_context: str = None,
        verses: List[str] = None,
        prayer_requests: List[str] = None,
        messages_count: int = 0,
    ) -> Optional[ConversationSummary]:
        """
        Update summary with new content.

        Merges new information with existing summary data.

        Args:
            church_id: Church identifier
            user_id: User identifier
            new_summary_text: New or updated summary text
            topics: Topics to add
            emotional_context: Updated emotional context
            verses: Bible verses to add
            prayer_requests: Prayer requests to add
            messages_count: Number of messages being summarized

        Returns:
            Updated summary or None on error
        """
        try:
            # Get existing or create new
            summary = await self.get(church_id, user_id)

            if summary is None:
                summary = ConversationSummary()

            # Update fields
            summary.summary = new_summary_text
            summary.messages_summarized += messages_count

            if emotional_context:
                summary.emotional_context = emotional_context

            # Merge lists (keep unique, limit size)
            if topics:
                existing = set(summary.topics)
                existing.update(topics)
                summary.topics = list(existing)[:20]  # Max 20 topics

            if verses:
                existing = set(summary.verses_mentioned)
                existing.update(verses)
                summary.verses_mentioned = list(existing)[:10]  # Max 10 verses

            if prayer_requests:
                existing = set(summary.prayer_requests)
                existing.update(prayer_requests)
                summary.prayer_requests = list(existing)[:5]  # Max 5 requests

            await self.set(church_id, user_id, summary)
            return summary

        except Exception as e:
            logger.error(f"Failed to update summary: {e}")
            return None

    async def clear(self, church_id: str, user_id: str) -> bool:
        """
        Clear conversation summary.

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

            logger.debug(f"Cleared summary for user {user_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to clear summary: {e}")
            return False

    async def exists(self, church_id: str, user_id: str) -> bool:
        """Check if summary exists."""
        try:
            redis = await get_redis()
            key = self._make_key(church_id, user_id)
            return await redis.exists(key) > 0
        except Exception as e:
            logger.error(f"Failed to check summary existence: {e}")
            return False


# Global instance
summary_store = SummaryStore()
