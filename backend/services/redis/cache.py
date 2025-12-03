"""
Redis Cache Layer

Replaces in-memory caching with distributed Redis caching.
Provides decorator-based caching and cache invalidation.

Uses msgspec for ~20% faster serialization compared to orjson.
"""

import hashlib
import logging
import functools
from typing import Optional, Any, Callable, Union
from datetime import datetime

from config.redis import get_redis
from .utils import redis_key, TTL

# Use centralized msgspec-based serialization
from utils.serialization import redis_encode, redis_decode

logger = logging.getLogger(__name__)


class RedisCache:
    """
    Redis-backed distributed cache.

    Provides caching functionality that works across multiple
    backend instances with automatic serialization using msgspec.
    """

    def __init__(self):
        """Initialize Redis cache."""
        pass

    def _make_key(self, namespace: str, *parts: str) -> str:
        """Create cache key."""
        return redis_key("cache", namespace, *parts)

    def _serialize(self, value: Any) -> str:
        """Serialize value for Redis storage using msgspec."""
        return redis_encode(value)

    def _deserialize(self, data: str) -> Any:
        """Deserialize value from Redis using msgspec."""
        return redis_decode(data)

    async def get(
        self,
        namespace: str,
        key: str,
    ) -> Optional[Any]:
        """
        Get cached value.

        Args:
            namespace: Cache namespace (e.g., "church_settings")
            key: Cache key

        Returns:
            Cached value or None if not found
        """
        try:
            redis = await get_redis()
            full_key = self._make_key(namespace, key)

            data = await redis.get(full_key)

            if data is None:
                return None

            return self._deserialize(data)

        except Exception as e:
            logger.error(f"Cache get failed: {e}")
            return None

    async def set(
        self,
        namespace: str,
        key: str,
        value: Any,
        ttl: int = TTL.HOUR_1,
    ) -> bool:
        """
        Set cached value.

        Args:
            namespace: Cache namespace
            key: Cache key
            value: Value to cache
            ttl: Time-to-live in seconds

        Returns:
            bool: True if set successfully
        """
        try:
            redis = await get_redis()
            full_key = self._make_key(namespace, key)

            data = self._serialize(value)
            await redis.set(full_key, data, ex=ttl)

            return True

        except Exception as e:
            logger.error(f"Cache set failed: {e}")
            return False

    async def delete(
        self,
        namespace: str,
        key: str,
    ) -> bool:
        """
        Delete cached value.

        Args:
            namespace: Cache namespace
            key: Cache key

        Returns:
            bool: True if deleted
        """
        try:
            redis = await get_redis()
            full_key = self._make_key(namespace, key)

            await redis.delete(full_key)
            return True

        except Exception as e:
            logger.error(f"Cache delete failed: {e}")
            return False

    async def invalidate_pattern(
        self,
        namespace: str,
        pattern: str = "*",
    ) -> int:
        """
        Invalidate all keys matching pattern in namespace.

        Args:
            namespace: Cache namespace
            pattern: Pattern to match (default: all in namespace)

        Returns:
            int: Number of keys deleted
        """
        try:
            redis = await get_redis()
            full_pattern = self._make_key(namespace, pattern)

            # Find matching keys
            keys = []
            async for key in redis.scan_iter(match=full_pattern):
                keys.append(key)

            if keys:
                deleted = await redis.delete(*keys)
                logger.info(f"Invalidated {deleted} keys matching {full_pattern}")
                return deleted

            return 0

        except Exception as e:
            logger.error(f"Cache invalidation failed: {e}")
            return 0

    async def invalidate_church(self, church_id: str) -> int:
        """
        Invalidate all cache entries for a church.

        Args:
            church_id: Church identifier

        Returns:
            int: Number of keys deleted
        """
        return await self.invalidate_pattern("*", f"*{church_id}*")

    async def exists(
        self,
        namespace: str,
        key: str,
    ) -> bool:
        """Check if cache entry exists."""
        try:
            redis = await get_redis()
            full_key = self._make_key(namespace, key)
            return await redis.exists(full_key) > 0
        except Exception as e:
            logger.error(f"Cache exists check failed: {e}")
            return False

    async def get_or_set(
        self,
        namespace: str,
        key: str,
        factory: Callable,
        ttl: int = TTL.HOUR_1,
    ) -> Any:
        """
        Get cached value or compute and cache it.

        Args:
            namespace: Cache namespace
            key: Cache key
            factory: Async function to compute value if not cached
            ttl: Time-to-live in seconds

        Returns:
            Cached or computed value
        """
        # Try to get from cache
        value = await self.get(namespace, key)

        if value is not None:
            return value

        # Compute value
        if callable(factory):
            value = await factory() if asyncio.iscoroutinefunction(factory) else factory()
        else:
            value = factory

        # Cache it
        await self.set(namespace, key, value, ttl)

        return value


# Global instance
redis_cache = RedisCache()


# Import asyncio for get_or_set
import asyncio


def cached(
    namespace: str,
    ttl: int = TTL.HOUR_1,
    key_builder: Callable = None,
):
    """
    Decorator for caching async function results.

    Args:
        namespace: Cache namespace
        ttl: Time-to-live in seconds
        key_builder: Optional function to build cache key from args

    Example:
        @cached("church_settings", ttl=600)
        async def get_church_settings(church_id: str):
            # Expensive database query
            return await db.church_settings.find_one(...)

        @cached("members", key_builder=lambda cid, **kw: f"{cid}:{kw.get('status', 'all')}")
        async def get_members(church_id: str, status: str = None):
            return await db.members.find(...)
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Build cache key
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                # Default key: hash of function name + args
                key_parts = [func.__name__] + [str(a) for a in args]
                key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
                cache_key = hashlib.md5(":".join(key_parts).encode()).hexdigest()

            # Try cache
            cached_value = await redis_cache.get(namespace, cache_key)
            if cached_value is not None:
                return cached_value

            # Call function
            result = await func(*args, **kwargs)

            # Cache result
            if result is not None:
                await redis_cache.set(namespace, cache_key, result, ttl)

            return result

        # Add cache control methods
        wrapper.invalidate = lambda *args, **kwargs: redis_cache.delete(
            namespace,
            key_builder(*args, **kwargs) if key_builder else hashlib.md5(
                ":".join([func.__name__] + [str(a) for a in args] +
                        [f"{k}={v}" for k, v in sorted(kwargs.items())]).encode()
            ).hexdigest()
        )
        wrapper.invalidate_all = lambda: redis_cache.invalidate_pattern(namespace)

        return wrapper
    return decorator


# Convenience functions for common cache operations

async def get_cached_church_settings(church_id: str) -> Optional[dict]:
    """Get cached church settings."""
    return await redis_cache.get("church_settings", church_id)


async def set_cached_church_settings(church_id: str, settings: dict) -> bool:
    """Cache church settings."""
    return await redis_cache.set("church_settings", church_id, settings, TTL.CHURCH_SETTINGS)


async def invalidate_church_settings(church_id: str) -> bool:
    """Invalidate church settings cache."""
    return await redis_cache.delete("church_settings", church_id)


async def get_cached_member_statuses(church_id: str) -> Optional[list]:
    """Get cached member statuses."""
    return await redis_cache.get("member_statuses", church_id)


async def set_cached_member_statuses(church_id: str, statuses: list) -> bool:
    """Cache member statuses."""
    return await redis_cache.set("member_statuses", church_id, statuses, TTL.MEMBER_STATUSES)


async def invalidate_member_statuses(church_id: str) -> bool:
    """Invalidate member statuses cache."""
    return await redis_cache.delete("member_statuses", church_id)


async def get_cached_demographics(church_id: str) -> Optional[list]:
    """Get cached demographics."""
    return await redis_cache.get("demographics", church_id)


async def set_cached_demographics(church_id: str, demographics: list) -> bool:
    """Cache demographics."""
    return await redis_cache.set("demographics", church_id, demographics, TTL.DEMOGRAPHICS)


async def invalidate_demographics(church_id: str) -> bool:
    """Invalidate demographics cache."""
    return await redis_cache.delete("demographics", church_id)
