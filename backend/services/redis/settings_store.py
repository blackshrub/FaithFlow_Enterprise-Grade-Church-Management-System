"""
Faith Assistant User Settings Store

Stores user preferences for AI interactions:
- Temperature (creativity level)
- Reply length preference
- Mode preference (pastoral, scholarly, etc.)
- Language preference

TTL: 7 days (user preferences persist longer)
"""

import json
import logging
from typing import Optional, Dict, Any, Literal
from dataclasses import dataclass, asdict, field
from datetime import datetime

from config.redis import get_redis
from .utils import redis_key, TTL

logger = logging.getLogger(__name__)


# Type definitions
ChatMode = Literal["pastoral", "scholarly", "youth", "neutral"]
Language = Literal["en", "id"]
ReplyLength = Literal["short", "medium", "long"]


@dataclass
class UserAISettings:
    """User AI preference settings."""

    # Core settings
    temperature: float = 0.7
    reply_length: ReplyLength = "medium"
    mode: ChatMode = "pastoral"
    language: Language = "id"

    # Voice settings
    voice_enabled: bool = True
    voice_speed: float = 1.0       # 0.5 to 2.0
    voice_pitch: float = 1.0       # 0.5 to 2.0

    # Personalization
    preferred_bible_version: str = "NIV"
    include_verses: bool = True
    include_prayers: bool = True

    # Accessibility
    simple_language: bool = False  # Use simpler vocabulary

    # Metadata
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for Redis storage."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "UserAISettings":
        """Create from dictionary."""
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})

    def get_system_prompt_modifiers(self) -> Dict[str, Any]:
        """
        Get modifiers to apply to system prompt.

        Returns:
            Dict with prompt modification instructions
        """
        modifiers = {
            "mode": self.mode,
            "language": self.language,
        }

        # Reply length instructions
        if self.reply_length == "short":
            modifiers["length_instruction"] = "Keep responses very brief, 1-2 sentences."
        elif self.reply_length == "long":
            modifiers["length_instruction"] = "Provide detailed, thorough responses."
        else:
            modifiers["length_instruction"] = "Provide balanced responses of moderate length."

        # Include verses
        if self.include_verses:
            modifiers["verses_instruction"] = "Include relevant Bible verses when helpful."
        else:
            modifiers["verses_instruction"] = "Focus on guidance without citing specific verses."

        # Include prayers
        if self.include_prayers:
            modifiers["prayer_instruction"] = "Offer to pray with the user when appropriate."
        else:
            modifiers["prayer_instruction"] = "Focus on guidance without prayer suggestions."

        # Simple language
        if self.simple_language:
            modifiers["language_style"] = "Use simple, easy-to-understand vocabulary."

        return modifiers


class SettingsStore:
    """
    Redis-backed store for user AI settings.

    Stores and retrieves user preferences for Faith Assistant
    interactions with longer TTL than session data.
    """

    def __init__(self, ttl: int = TTL.USER_SETTINGS):
        """
        Initialize settings store.

        Args:
            ttl: Time-to-live in seconds (default: 7 days)
        """
        self.ttl = ttl

    def _make_key(self, church_id: str, user_id: str) -> str:
        """Create Redis key for settings."""
        return redis_key("faith_assistant", "settings", church_id, user_id)

    async def save(
        self,
        church_id: str,
        user_id: str,
        settings: UserAISettings,
    ) -> bool:
        """
        Save user settings to Redis.

        Args:
            church_id: Church identifier
            user_id: User identifier
            settings: Settings to save

        Returns:
            bool: True if saved successfully
        """
        try:
            redis = await get_redis()
            key = self._make_key(church_id, user_id)

            settings.updated_at = datetime.utcnow().isoformat()
            data = json.dumps(settings.to_dict())

            await redis.set(key, data, ex=self.ttl)

            logger.debug(f"Saved settings for user {user_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to save settings: {e}")
            return False

    async def load(
        self,
        church_id: str,
        user_id: str,
    ) -> Optional[UserAISettings]:
        """
        Load user settings from Redis.

        Args:
            church_id: Church identifier
            user_id: User identifier

        Returns:
            UserAISettings or None if not found
        """
        try:
            redis = await get_redis()
            key = self._make_key(church_id, user_id)

            data = await redis.get(key)

            if data is None:
                return None

            settings_dict = json.loads(data)
            return UserAISettings.from_dict(settings_dict)

        except Exception as e:
            logger.error(f"Failed to load settings: {e}")
            return None

    async def load_or_default(
        self,
        church_id: str,
        user_id: str,
    ) -> UserAISettings:
        """
        Load settings or return defaults.

        Args:
            church_id: Church identifier
            user_id: User identifier

        Returns:
            UserAISettings (existing or default)
        """
        settings = await self.load(church_id, user_id)
        return settings if settings else UserAISettings()

    async def update(
        self,
        church_id: str,
        user_id: str,
        updates: Dict[str, Any],
    ) -> Optional[UserAISettings]:
        """
        Update specific settings fields.

        Args:
            church_id: Church identifier
            user_id: User identifier
            updates: Dictionary of fields to update

        Returns:
            Updated settings or None on error
        """
        try:
            settings = await self.load_or_default(church_id, user_id)

            for key, value in updates.items():
                if hasattr(settings, key):
                    setattr(settings, key, value)

            await self.save(church_id, user_id, settings)
            return settings

        except Exception as e:
            logger.error(f"Failed to update settings: {e}")
            return None

    async def set_temperature(
        self,
        church_id: str,
        user_id: str,
        temperature: float,
    ) -> bool:
        """
        Set temperature preference.

        Args:
            church_id: Church identifier
            user_id: User identifier
            temperature: Value between 0.0 and 2.0

        Returns:
            bool: True if set successfully
        """
        # Validate range
        temperature = max(0.0, min(2.0, temperature))
        result = await self.update(church_id, user_id, {"temperature": temperature})
        return result is not None

    async def set_reply_length(
        self,
        church_id: str,
        user_id: str,
        length: ReplyLength,
    ) -> bool:
        """
        Set reply length preference.

        Args:
            church_id: Church identifier
            user_id: User identifier
            length: "short", "medium", or "long"

        Returns:
            bool: True if set successfully
        """
        result = await self.update(church_id, user_id, {"reply_length": length})
        return result is not None

    async def set_mode(
        self,
        church_id: str,
        user_id: str,
        mode: ChatMode,
    ) -> bool:
        """
        Set chat mode preference.

        Args:
            church_id: Church identifier
            user_id: User identifier
            mode: "pastoral", "scholarly", "youth", or "neutral"

        Returns:
            bool: True if set successfully
        """
        result = await self.update(church_id, user_id, {"mode": mode})
        return result is not None

    async def set_language(
        self,
        church_id: str,
        user_id: str,
        language: Language,
    ) -> bool:
        """
        Set language preference.

        Args:
            church_id: Church identifier
            user_id: User identifier
            language: "en" or "id"

        Returns:
            bool: True if set successfully
        """
        result = await self.update(church_id, user_id, {"language": language})
        return result is not None

    async def clear(self, church_id: str, user_id: str) -> bool:
        """
        Clear user settings.

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

            logger.debug(f"Cleared settings for user {user_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to clear settings: {e}")
            return False

    async def exists(self, church_id: str, user_id: str) -> bool:
        """Check if settings exist for user."""
        try:
            redis = await get_redis()
            key = self._make_key(church_id, user_id)
            return await redis.exists(key) > 0
        except Exception as e:
            logger.error(f"Failed to check settings existence: {e}")
            return False


# Global instance
settings_store = SettingsStore()
