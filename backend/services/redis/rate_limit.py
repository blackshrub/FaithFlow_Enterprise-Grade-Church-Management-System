"""
Distributed Rate Limiting with Redis

Implements sliding window rate limiting that works across
multiple backend instances.

Supports:
- Per-user rate limiting
- Per-IP rate limiting
- Per-endpoint rate limiting
- Custom rate limit keys
"""

import time
import logging
from typing import Optional, Tuple, Literal
from dataclasses import dataclass
from enum import Enum

from config.redis import get_redis
from .utils import redis_key

logger = logging.getLogger(__name__)


class RateLimitPreset(Enum):
    """Predefined rate limit configurations."""

    # Very strict - for sensitive operations
    STRICT = (5, 60)           # 5 requests per minute

    # Moderate - for general API usage
    MODERATE = (30, 60)        # 30 requests per minute

    # Relaxed - for high-volume endpoints
    RELAXED = (100, 60)        # 100 requests per minute

    # Authentication
    LOGIN = (5, 900)           # 5 attempts per 15 minutes
    OTP = (3, 3600)            # 3 OTP requests per hour

    # Faith Assistant
    CHAT = (30, 60)            # 30 messages per minute
    REALTIME_TOKEN = (5, 3600) # 5 realtime sessions per hour

    # AI Operations
    AI_GENERATION = (10, 3600) # 10 generation jobs per hour

    # File Operations
    UPLOAD = (20, 3600)        # 20 uploads per hour
    EXPORT = (5, 3600)         # 5 exports per hour

    # WebHooks
    WEBHOOK = (100, 60)        # 100 webhook calls per minute


@dataclass
class RateLimitResult:
    """Result of a rate limit check."""

    allowed: bool              # Whether the request is allowed
    remaining: int             # Remaining requests in window
    limit: int                 # Maximum requests allowed
    reset_at: int              # Unix timestamp when window resets
    retry_after: Optional[int] # Seconds to wait if denied

    @property
    def headers(self) -> dict:
        """Get headers for HTTP response."""
        headers = {
            "X-RateLimit-Limit": str(self.limit),
            "X-RateLimit-Remaining": str(max(0, self.remaining)),
            "X-RateLimit-Reset": str(self.reset_at),
        }
        if self.retry_after is not None:
            headers["Retry-After"] = str(self.retry_after)
        return headers


class RateLimiter:
    """
    Redis-backed distributed rate limiter.

    Uses sliding window algorithm for accurate rate limiting
    across multiple backend instances.
    """

    def __init__(self):
        """Initialize rate limiter."""
        pass

    def _make_key(self, *parts: str) -> str:
        """Create Redis key for rate limit counter."""
        return redis_key("rate_limit", *parts)

    async def check(
        self,
        key: str,
        limit: int,
        window: int,
    ) -> RateLimitResult:
        """
        Check rate limit using sliding window algorithm.

        Args:
            key: Unique identifier for the rate limit (e.g., "user:123", "ip:1.2.3.4")
            limit: Maximum number of requests allowed
            window: Time window in seconds

        Returns:
            RateLimitResult with allowed status and metadata
        """
        try:
            redis = await get_redis()
            full_key = self._make_key(key)

            now = time.time()
            window_start = now - window

            # Use pipeline for atomic operations
            pipe = redis.pipeline()

            # Remove old entries outside the window
            pipe.zremrangebyscore(full_key, 0, window_start)

            # Count current requests in window
            pipe.zcard(full_key)

            # Add current request with timestamp as score
            pipe.zadd(full_key, {str(now): now})

            # Set expiry on the key
            pipe.expire(full_key, window + 1)

            results = await pipe.execute()
            current_count = results[1]

            # Check if over limit (count before adding current request)
            allowed = current_count < limit
            remaining = max(0, limit - current_count - 1) if allowed else 0
            reset_at = int(now + window)
            retry_after = None if allowed else window

            if not allowed:
                # Remove the request we just added since it's denied
                await redis.zrem(full_key, str(now))

                logger.warning(f"Rate limit exceeded for key: {key}")

            return RateLimitResult(
                allowed=allowed,
                remaining=remaining,
                limit=limit,
                reset_at=reset_at,
                retry_after=retry_after,
            )

        except Exception as e:
            logger.error(f"Rate limit check failed: {e}")
            # On error, allow the request (fail open)
            return RateLimitResult(
                allowed=True,
                remaining=limit - 1,
                limit=limit,
                reset_at=int(time.time() + window),
                retry_after=None,
            )

    async def check_preset(
        self,
        key: str,
        preset: RateLimitPreset,
    ) -> RateLimitResult:
        """
        Check rate limit using a preset configuration.

        Args:
            key: Unique identifier for the rate limit
            preset: RateLimitPreset enum value

        Returns:
            RateLimitResult
        """
        limit, window = preset.value
        return await self.check(key, limit, window)

    async def check_user(
        self,
        user_id: str,
        action: str,
        limit: int,
        window: int,
    ) -> RateLimitResult:
        """
        Check rate limit for a specific user and action.

        Args:
            user_id: User identifier
            action: Action being rate limited (e.g., "chat", "upload")
            limit: Maximum requests allowed
            window: Time window in seconds

        Returns:
            RateLimitResult
        """
        key = f"user:{user_id}:{action}"
        return await self.check(key, limit, window)

    async def check_ip(
        self,
        ip_address: str,
        action: str,
        limit: int,
        window: int,
    ) -> RateLimitResult:
        """
        Check rate limit for a specific IP address.

        Args:
            ip_address: Client IP address
            action: Action being rate limited
            limit: Maximum requests allowed
            window: Time window in seconds

        Returns:
            RateLimitResult
        """
        key = f"ip:{ip_address}:{action}"
        return await self.check(key, limit, window)

    async def check_church(
        self,
        church_id: str,
        action: str,
        limit: int,
        window: int,
    ) -> RateLimitResult:
        """
        Check rate limit for a church (tenant-level limiting).

        Args:
            church_id: Church identifier
            action: Action being rate limited
            limit: Maximum requests allowed
            window: Time window in seconds

        Returns:
            RateLimitResult
        """
        key = f"church:{church_id}:{action}"
        return await self.check(key, limit, window)

    async def reset(self, key: str) -> bool:
        """
        Reset rate limit counter for a key.

        Args:
            key: Rate limit key to reset

        Returns:
            bool: True if reset successfully
        """
        try:
            redis = await get_redis()
            full_key = self._make_key(key)
            await redis.delete(full_key)
            return True
        except Exception as e:
            logger.error(f"Failed to reset rate limit: {e}")
            return False

    async def get_remaining(
        self,
        key: str,
        limit: int,
        window: int,
    ) -> int:
        """
        Get remaining requests without incrementing counter.

        Args:
            key: Rate limit key
            limit: Maximum requests allowed
            window: Time window in seconds

        Returns:
            int: Number of remaining requests
        """
        try:
            redis = await get_redis()
            full_key = self._make_key(key)

            now = time.time()
            window_start = now - window

            # Count requests in current window
            count = await redis.zcount(full_key, window_start, now)

            return max(0, limit - count)

        except Exception as e:
            logger.error(f"Failed to get remaining: {e}")
            return limit


# Convenience functions for common rate limiting scenarios

async def check_login_rate_limit(
    identifier: str,
    identifier_type: Literal["user", "ip"] = "ip",
) -> RateLimitResult:
    """
    Check login attempt rate limit.

    Args:
        identifier: User ID or IP address
        identifier_type: Type of identifier

    Returns:
        RateLimitResult
    """
    key = f"{identifier_type}:{identifier}:login"
    return await rate_limiter.check_preset(key, RateLimitPreset.LOGIN)


async def check_otp_rate_limit(phone: str) -> RateLimitResult:
    """
    Check OTP request rate limit.

    Args:
        phone: Phone number

    Returns:
        RateLimitResult
    """
    key = f"phone:{phone}:otp"
    return await rate_limiter.check_preset(key, RateLimitPreset.OTP)


async def check_chat_rate_limit(
    church_id: str,
    user_id: str,
) -> RateLimitResult:
    """
    Check Faith Assistant chat rate limit.

    Args:
        church_id: Church identifier
        user_id: User identifier

    Returns:
        RateLimitResult
    """
    key = f"church:{church_id}:user:{user_id}:chat"
    return await rate_limiter.check_preset(key, RateLimitPreset.CHAT)


async def check_realtime_token_rate_limit(
    church_id: str,
    user_id: str,
) -> RateLimitResult:
    """
    Check OpenAI Realtime token generation rate limit.

    Args:
        church_id: Church identifier
        user_id: User identifier

    Returns:
        RateLimitResult
    """
    key = f"church:{church_id}:user:{user_id}:realtime_token"
    return await rate_limiter.check_preset(key, RateLimitPreset.REALTIME_TOKEN)


async def check_ai_generation_rate_limit(
    church_id: str,
) -> RateLimitResult:
    """
    Check AI content generation rate limit (per church).

    Args:
        church_id: Church identifier

    Returns:
        RateLimitResult
    """
    key = f"church:{church_id}:ai_generation"
    return await rate_limiter.check_preset(key, RateLimitPreset.AI_GENERATION)


async def check_upload_rate_limit(
    church_id: str,
    user_id: str,
) -> RateLimitResult:
    """
    Check file upload rate limit.

    Args:
        church_id: Church identifier
        user_id: User identifier

    Returns:
        RateLimitResult
    """
    key = f"church:{church_id}:user:{user_id}:upload"
    return await rate_limiter.check_preset(key, RateLimitPreset.UPLOAD)


# Global instance
rate_limiter = RateLimiter()
