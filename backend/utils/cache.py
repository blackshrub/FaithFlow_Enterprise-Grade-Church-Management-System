"""
Distributed caching utility with Redis backend.

Provides backward-compatible API that now uses Redis instead of in-memory cache.
This enables distributed caching across multiple backend instances.
"""

import json
import logging
from datetime import datetime
from typing import Any, Optional, Callable
from functools import wraps

logger = logging.getLogger(__name__)

# Cache TTL constants (seconds)
TTL_SETTINGS = 600       # 10 minutes - church settings
TTL_STATUSES = 1800      # 30 minutes - member statuses
TTL_DEMOGRAPHICS = 1800  # 30 minutes - demographics
TTL_DEFAULT = 300        # 5 minutes - default


class RedisBackedCache:
    """
    Redis-backed distributed cache with TTL.

    Provides the same API as the old SimpleCache but uses Redis
    for distributed caching across multiple backend instances.
    """

    def __init__(self, key_prefix: str = "cache"):
        self._key_prefix = key_prefix
        self._fallback_cache = {}  # In-memory fallback if Redis unavailable

    def _make_key(self, key: str) -> str:
        """Create Redis key with prefix."""
        return f"faithflow:{self._key_prefix}:{key}"

    async def _get_redis(self):
        """Get Redis connection with fallback."""
        try:
            from config.redis import get_redis
            return await get_redis()
        except Exception as e:
            logger.warning(f"Redis unavailable, using fallback: {e}")
            return None

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired."""
        redis = await self._get_redis()

        if redis:
            try:
                redis_key = self._make_key(key)
                data = await redis.get(redis_key)
                if data:
                    return json.loads(data)
                return None
            except Exception as e:
                logger.error(f"Redis get error: {e}")

        # Fallback to in-memory
        if key in self._fallback_cache:
            value, expiry = self._fallback_cache[key]
            if datetime.now() < expiry:
                return value
            del self._fallback_cache[key]
        return None

    async def set(self, key: str, value: Any, ttl_seconds: int = TTL_DEFAULT):
        """Set value in cache with TTL."""
        redis = await self._get_redis()

        if redis:
            try:
                redis_key = self._make_key(key)
                await redis.set(redis_key, json.dumps(value, default=str), ex=ttl_seconds)
                return
            except Exception as e:
                logger.error(f"Redis set error: {e}")

        # Fallback to in-memory
        from datetime import timedelta
        expiry = datetime.now() + timedelta(seconds=ttl_seconds)
        self._fallback_cache[key] = (value, expiry)

    async def delete(self, key: str):
        """Delete key from cache."""
        redis = await self._get_redis()

        if redis:
            try:
                redis_key = self._make_key(key)
                await redis.delete(redis_key)
            except Exception as e:
                logger.error(f"Redis delete error: {e}")

        # Also clear from fallback
        if key in self._fallback_cache:
            del self._fallback_cache[key]

    async def delete_pattern(self, pattern: str):
        """Delete all keys matching pattern."""
        redis = await self._get_redis()

        if redis:
            try:
                full_pattern = self._make_key(pattern)
                cursor = 0
                while True:
                    cursor, keys = await redis.scan(cursor, match=full_pattern)
                    if keys:
                        await redis.delete(*keys)
                    if cursor == 0:
                        break
            except Exception as e:
                logger.error(f"Redis delete pattern error: {e}")

    async def clear(self):
        """Clear all cache entries (use with caution)."""
        await self.delete_pattern("*")
        self._fallback_cache.clear()

    def get_stats(self) -> dict:
        """Get cache statistics."""
        return {
            "type": "redis_backed",
            "fallback_entries": len(self._fallback_cache)
        }


# Global cache instance
cache = RedisBackedCache()


def cached(ttl_seconds: int = TTL_DEFAULT, key_prefix: str = ""):
    """Decorator to cache async function results.

    Usage:
        @cached(ttl_seconds=600, key_prefix="church_settings")
        async def get_church_settings(church_id: str):
            # Expensive operation
            return settings

    Args:
        ttl_seconds: Time to live in seconds (default 5 minutes)
        key_prefix: Prefix for cache key (helps with invalidation)
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            cache_key = f"{key_prefix}:{func.__name__}:{str(args)}:{str(kwargs)}"

            # Try to get from cache
            cached_value = await cache.get(cache_key)
            if cached_value is not None:
                return cached_value

            # Cache miss - call function
            result = await func(*args, **kwargs)

            # Store in cache
            await cache.set(cache_key, result, ttl_seconds)

            return result

        # Add cache control methods
        async def cache_clear():
            await cache.clear()

        async def cache_delete(key):
            await cache.delete(f"{key_prefix}:{func.__name__}:{key}")

        wrapper.cache_clear = cache_clear
        wrapper.cache_delete = cache_delete

        return wrapper
    return decorator


# ============================================================================
# CONVENIENCE FUNCTIONS FOR COMMON CACHING PATTERNS
# ============================================================================

async def get_cached_settings(church_id: str, fetcher: Callable) -> Any:
    """
    Get church settings with Redis caching.

    Usage:
        settings = await get_cached_settings(
            church_id,
            lambda: db.church_settings.find_one({"church_id": church_id})
        )
    """
    cache_key = f"settings:{church_id}"
    cached_value = await cache.get(cache_key)

    if cached_value is not None:
        return cached_value

    # Fetch from database
    value = await fetcher()
    if value:
        await cache.set(cache_key, value, ttl_seconds=TTL_SETTINGS)

    return value


async def get_cached_statuses(church_id: str, fetcher: Callable) -> Any:
    """Get member statuses with Redis caching."""
    cache_key = f"statuses:{church_id}"
    cached_value = await cache.get(cache_key)

    if cached_value is not None:
        return cached_value

    value = await fetcher()
    if value:
        await cache.set(cache_key, value, ttl_seconds=TTL_STATUSES)

    return value


async def get_cached_demographics(church_id: str, fetcher: Callable) -> Any:
    """Get demographics with Redis caching."""
    cache_key = f"demographics:{church_id}"
    cached_value = await cache.get(cache_key)

    if cached_value is not None:
        return cached_value

    value = await fetcher()
    if value:
        await cache.set(cache_key, value, ttl_seconds=TTL_DEMOGRAPHICS)

    return value


async def get_cached_categories(church_id: str, category_type: str, fetcher: Callable) -> Any:
    """
    Get categories with Redis caching.

    Args:
        church_id: Church identifier
        category_type: Type of category (event, article, group)
        fetcher: Async function to fetch from database
    """
    cache_key = f"categories:{category_type}:{church_id}"
    cached_value = await cache.get(cache_key)

    if cached_value is not None:
        return cached_value

    value = await fetcher()
    if value:
        await cache.set(cache_key, value, ttl_seconds=TTL_STATUSES)  # 30 min

    return value


async def get_cached_church(church_id: str, fetcher: Callable) -> Any:
    """Get church data with Redis caching."""
    cache_key = f"church:{church_id}"
    cached_value = await cache.get(cache_key)

    if cached_value is not None:
        return cached_value

    value = await fetcher()
    if value:
        await cache.set(cache_key, value, ttl_seconds=3600)  # 1 hour

    return value


# ============================================================================
# CACHE INVALIDATION FUNCTIONS
# ============================================================================

async def invalidate_church_cache(church_id: str):
    """Invalidate all cache entries for a church."""
    await cache.delete(f"settings:{church_id}")
    await cache.delete(f"statuses:{church_id}")
    await cache.delete(f"demographics:{church_id}")
    await cache.delete(f"church:{church_id}")

    # Also notify other instances via pub/sub
    try:
        from services.redis import invalidate_church_cache as pubsub_invalidate
        await pubsub_invalidate(church_id)
    except ImportError:
        pass  # Pub/sub not available


async def invalidate_settings_cache(church_id: str):
    """Invalidate only settings cache for a church."""
    await cache.delete(f"settings:{church_id}")

    # Also notify via pub/sub
    try:
        from services.redis import invalidate_on_settings_change
        await invalidate_on_settings_change(church_id)
    except ImportError:
        pass


async def invalidate_statuses_cache(church_id: str):
    """Invalidate member statuses cache for a church."""
    await cache.delete(f"statuses:{church_id}")


async def invalidate_demographics_cache(church_id: str):
    """Invalidate demographics cache for a church."""
    await cache.delete(f"demographics:{church_id}")


async def invalidate_categories_cache(church_id: str, category_type: str = None):
    """Invalidate categories cache for a church."""
    if category_type:
        await cache.delete(f"categories:{category_type}:{church_id}")
    else:
        # Invalidate all category types
        for cat_type in ["event", "article", "group"]:
            await cache.delete(f"categories:{cat_type}:{church_id}")
