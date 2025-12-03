"""
Authentication Redis Services

Provides Redis-backed services for:
- JWT token caching (reduce DB queries)
- Login attempt tracking (brute force protection)
- Session management (track active sessions)
- Token invalidation (logout all devices)
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
class UserSession:
    """Active user session data."""

    session_id: str
    user_id: str
    device_name: str = "Unknown"
    device_type: str = "unknown"  # web, mobile, kiosk
    ip_address: str = ""
    user_agent: str = ""
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    last_active: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "UserSession":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


class AuthRedis:
    """
    Redis-backed authentication services.
    """

    def __init__(self):
        """Initialize auth Redis service."""
        pass

    # ==================== JWT Token Cache ====================

    async def cache_validated_token(
        self,
        token_hash: str,
        user_data: Dict[str, Any],
        ttl: int = TTL.JWT_CACHE,
    ) -> bool:
        """
        Cache a validated JWT token to avoid repeated validation.

        Args:
            token_hash: Hash of the JWT token
            user_data: Validated user data from token
            ttl: Cache TTL in seconds

        Returns:
            bool: True if cached successfully
        """
        try:
            redis = await get_redis()
            key = redis_key("auth", "jwt_cache", token_hash)

            await redis.set(key, json.dumps(user_data), ex=ttl)
            return True

        except Exception as e:
            logger.error(f"Failed to cache token: {e}")
            return False

    async def get_cached_token(
        self,
        token_hash: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Get cached token validation result.

        Args:
            token_hash: Hash of the JWT token

        Returns:
            Cached user data or None
        """
        try:
            redis = await get_redis()
            key = redis_key("auth", "jwt_cache", token_hash)

            data = await redis.get(key)

            if data:
                return json.loads(data)
            return None

        except Exception as e:
            logger.error(f"Failed to get cached token: {e}")
            return None

    async def invalidate_token(self, token_hash: str) -> bool:
        """Invalidate a cached token."""
        try:
            redis = await get_redis()
            key = redis_key("auth", "jwt_cache", token_hash)
            await redis.delete(key)
            return True
        except Exception as e:
            logger.error(f"Failed to invalidate token: {e}")
            return False

    # ==================== Token Invalidation (Password Change) ====================

    async def set_token_invalidation_time(
        self,
        user_id: str,
        timestamp: datetime = None,
    ) -> bool:
        """
        Set timestamp for token invalidation.

        All tokens issued before this timestamp are considered invalid.
        Used when user changes password.

        Args:
            user_id: User identifier
            timestamp: Invalidation timestamp (default: now)

        Returns:
            bool: True if set successfully
        """
        try:
            redis = await get_redis()
            key = redis_key("auth", "token_invalidated_at", user_id)

            ts = (timestamp or datetime.utcnow()).isoformat()
            # Long TTL - needs to persist for token lifetime
            await redis.set(key, ts, ex=TTL.DAYS_30)

            logger.info(f"Set token invalidation for user {user_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to set token invalidation: {e}")
            return False

    async def get_token_invalidation_time(
        self,
        user_id: str,
    ) -> Optional[datetime]:
        """
        Get token invalidation timestamp.

        Args:
            user_id: User identifier

        Returns:
            Datetime or None if not set
        """
        try:
            redis = await get_redis()
            key = redis_key("auth", "token_invalidated_at", user_id)

            ts = await redis.get(key)

            if ts:
                return datetime.fromisoformat(ts)
            return None

        except Exception as e:
            logger.error(f"Failed to get token invalidation: {e}")
            return None

    async def is_token_valid(
        self,
        user_id: str,
        token_issued_at: datetime,
    ) -> bool:
        """
        Check if a token is still valid based on invalidation timestamp.

        Args:
            user_id: User identifier
            token_issued_at: When the token was issued

        Returns:
            bool: True if token is valid
        """
        invalidation_time = await self.get_token_invalidation_time(user_id)

        if invalidation_time is None:
            return True

        return token_issued_at > invalidation_time

    # ==================== Login Attempt Tracking ====================

    async def record_login_attempt(
        self,
        identifier: str,
        success: bool,
    ) -> int:
        """
        Record a login attempt.

        Args:
            identifier: User ID or IP address
            success: Whether login was successful

        Returns:
            int: Number of failed attempts (0 if successful)
        """
        try:
            redis = await get_redis()

            if success:
                # Clear failed attempts on success
                key = redis_key("auth", "login_attempts", identifier)
                await redis.delete(key)
                return 0
            else:
                # Increment failed attempts
                key = redis_key("auth", "login_attempts", identifier)
                count = await redis.incr(key)

                # Set expiry if this is the first attempt
                if count == 1:
                    await redis.expire(key, TTL.LOGIN_ATTEMPTS)

                return count

        except Exception as e:
            logger.error(f"Failed to record login attempt: {e}")
            return 0

    async def get_failed_attempts(self, identifier: str) -> int:
        """Get number of failed login attempts."""
        try:
            redis = await get_redis()
            key = redis_key("auth", "login_attempts", identifier)

            count = await redis.get(key)
            return int(count) if count else 0

        except Exception as e:
            logger.error(f"Failed to get login attempts: {e}")
            return 0

    async def is_locked_out(
        self,
        identifier: str,
        max_attempts: int = 5,
    ) -> bool:
        """Check if identifier is locked out due to too many failed attempts."""
        attempts = await self.get_failed_attempts(identifier)
        return attempts >= max_attempts

    async def clear_login_attempts(self, identifier: str) -> bool:
        """Clear failed login attempts."""
        try:
            redis = await get_redis()
            key = redis_key("auth", "login_attempts", identifier)
            await redis.delete(key)
            return True
        except Exception as e:
            logger.error(f"Failed to clear login attempts: {e}")
            return False

    # ==================== Session Management ====================

    async def create_session(
        self,
        user_id: str,
        session: UserSession,
        ttl: int = TTL.SESSION_WEB,
    ) -> bool:
        """
        Create a user session.

        Args:
            user_id: User identifier
            session: Session data
            ttl: Session TTL in seconds

        Returns:
            bool: True if created successfully
        """
        try:
            redis = await get_redis()

            # Store session data
            session_key = redis_key("auth", "session", session.session_id)
            await redis.set(session_key, json.dumps(session.to_dict()), ex=ttl)

            # Add to user's session set
            user_sessions_key = redis_key("auth", "user_sessions", user_id)
            await redis.sadd(user_sessions_key, session.session_id)
            await redis.expire(user_sessions_key, ttl)

            return True

        except Exception as e:
            logger.error(f"Failed to create session: {e}")
            return False

    async def get_session(
        self,
        session_id: str,
    ) -> Optional[UserSession]:
        """Get session by ID."""
        try:
            redis = await get_redis()
            key = redis_key("auth", "session", session_id)

            data = await redis.get(key)

            if data:
                return UserSession.from_dict(json.loads(data))
            return None

        except Exception as e:
            logger.error(f"Failed to get session: {e}")
            return None

    async def update_session_activity(
        self,
        session_id: str,
    ) -> bool:
        """Update session last activity time."""
        try:
            redis = await get_redis()
            key = redis_key("auth", "session", session_id)

            data = await redis.get(key)
            if not data:
                return False

            session = UserSession.from_dict(json.loads(data))
            session.last_active = datetime.utcnow().isoformat()

            # Get current TTL and preserve it
            current_ttl = await redis.ttl(key)
            if current_ttl > 0:
                await redis.set(key, json.dumps(session.to_dict()), ex=current_ttl)

            return True

        except Exception as e:
            logger.error(f"Failed to update session: {e}")
            return False

    async def delete_session(
        self,
        session_id: str,
        user_id: str = None,
    ) -> bool:
        """Delete a specific session."""
        try:
            redis = await get_redis()

            # Delete session data
            session_key = redis_key("auth", "session", session_id)
            await redis.delete(session_key)

            # Remove from user's session set
            if user_id:
                user_sessions_key = redis_key("auth", "user_sessions", user_id)
                await redis.srem(user_sessions_key, session_id)

            return True

        except Exception as e:
            logger.error(f"Failed to delete session: {e}")
            return False

    async def get_user_sessions(
        self,
        user_id: str,
    ) -> List[UserSession]:
        """Get all active sessions for a user."""
        try:
            redis = await get_redis()
            user_sessions_key = redis_key("auth", "user_sessions", user_id)

            session_ids = await redis.smembers(user_sessions_key)

            sessions = []
            for sid in session_ids:
                session = await self.get_session(sid)
                if session:
                    sessions.append(session)
                else:
                    # Clean up stale reference
                    await redis.srem(user_sessions_key, sid)

            return sessions

        except Exception as e:
            logger.error(f"Failed to get user sessions: {e}")
            return []

    async def delete_all_user_sessions(
        self,
        user_id: str,
        except_session_id: str = None,
    ) -> int:
        """
        Delete all sessions for a user.

        Args:
            user_id: User identifier
            except_session_id: Optional session to keep

        Returns:
            int: Number of sessions deleted
        """
        try:
            redis = await get_redis()
            user_sessions_key = redis_key("auth", "user_sessions", user_id)

            session_ids = await redis.smembers(user_sessions_key)
            deleted = 0

            for sid in session_ids:
                if sid != except_session_id:
                    session_key = redis_key("auth", "session", sid)
                    await redis.delete(session_key)
                    await redis.srem(user_sessions_key, sid)
                    deleted += 1

            logger.info(f"Deleted {deleted} sessions for user {user_id}")
            return deleted

        except Exception as e:
            logger.error(f"Failed to delete user sessions: {e}")
            return 0

    # ==================== Device Revocation ====================

    async def revoke_device(
        self,
        user_id: str,
        device_id: str,
    ) -> bool:
        """
        Revoke a specific device.

        Args:
            user_id: User identifier
            device_id: Device identifier to revoke

        Returns:
            bool: True if revoked
        """
        try:
            redis = await get_redis()
            key = redis_key("auth", "revoked_devices", user_id)

            await redis.sadd(key, device_id)
            await redis.expire(key, TTL.DAYS_30)

            return True

        except Exception as e:
            logger.error(f"Failed to revoke device: {e}")
            return False

    async def is_device_revoked(
        self,
        user_id: str,
        device_id: str,
    ) -> bool:
        """Check if a device is revoked."""
        try:
            redis = await get_redis()
            key = redis_key("auth", "revoked_devices", user_id)

            return await redis.sismember(key, device_id)

        except Exception as e:
            logger.error(f"Failed to check device revocation: {e}")
            return False


# Global instance
auth_redis = AuthRedis()
