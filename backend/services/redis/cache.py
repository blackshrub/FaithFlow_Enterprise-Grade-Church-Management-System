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


# =============================================================================
# Redis Pipeline Operations - Batch multiple operations for performance
# =============================================================================

class RedisPipeline:
    """
    Redis pipeline helper for batching multiple operations.

    Pipelines reduce network round-trips by sending multiple commands
    at once, significantly improving performance for bulk operations.

    Example:
        async with RedisPipeline() as pipe:
            await pipe.cache_set("ns", "key1", value1, ttl=300)
            await pipe.cache_set("ns", "key2", value2, ttl=300)
            await pipe.cache_delete("ns", "old_key")
            results = await pipe.execute()
    """

    def __init__(self):
        self._pipeline = None
        self._operations = []

    async def __aenter__(self):
        redis = await get_redis()
        self._pipeline = redis.pipeline()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        self._pipeline = None
        self._operations = []
        return False

    def _make_key(self, namespace: str, key: str) -> str:
        """Create cache key."""
        return redis_key("cache", namespace, key)

    async def cache_get(self, namespace: str, key: str) -> 'RedisPipeline':
        """Queue a GET operation."""
        full_key = self._make_key(namespace, key)
        self._pipeline.get(full_key)
        self._operations.append(("get", namespace, key))
        return self

    async def cache_set(
        self,
        namespace: str,
        key: str,
        value: Any,
        ttl: int = TTL.HOUR_1,
    ) -> 'RedisPipeline':
        """Queue a SET operation."""
        full_key = self._make_key(namespace, key)
        data = redis_encode(value)
        self._pipeline.set(full_key, data, ex=ttl)
        self._operations.append(("set", namespace, key))
        return self

    async def cache_delete(self, namespace: str, key: str) -> 'RedisPipeline':
        """Queue a DELETE operation."""
        full_key = self._make_key(namespace, key)
        self._pipeline.delete(full_key)
        self._operations.append(("delete", namespace, key))
        return self

    async def execute(self) -> list:
        """
        Execute all queued operations and return results.

        Returns:
            list: Results in order of operations queued.
                  GET operations return deserialized values or None.
                  SET operations return True/False.
                  DELETE operations return count of deleted keys.
        """
        if not self._pipeline:
            return []

        try:
            raw_results = await self._pipeline.execute()

            # Process results based on operation type
            results = []
            for i, (op_type, _, _) in enumerate(self._operations):
                if i >= len(raw_results):
                    results.append(None)
                    continue

                raw = raw_results[i]

                if op_type == "get":
                    # Deserialize GET results
                    if raw is not None:
                        try:
                            results.append(redis_decode(raw))
                        except Exception:
                            results.append(None)
                    else:
                        results.append(None)
                elif op_type == "set":
                    results.append(raw is not None)
                else:
                    results.append(raw)

            return results

        except Exception as e:
            logger.error(f"Pipeline execute failed: {e}")
            return [None] * len(self._operations)


async def mget(
    namespace: str,
    keys: list[str],
) -> dict[str, Any]:
    """
    Get multiple cached values in a single round-trip.

    Uses Redis MGET for efficient bulk retrieval.

    Args:
        namespace: Cache namespace
        keys: List of cache keys

    Returns:
        dict: Mapping of key -> value (None for missing keys)

    Example:
        values = await mget("church_settings", ["church1", "church2", "church3"])
        # Returns: {"church1": {...}, "church2": {...}, "church3": None}
    """
    if not keys:
        return {}

    try:
        redis = await get_redis()

        # Build full keys
        full_keys = [redis_key("cache", namespace, k) for k in keys]

        # MGET all at once
        raw_values = await redis.mget(full_keys)

        # Map back to original keys and deserialize
        result = {}
        for i, key in enumerate(keys):
            raw = raw_values[i] if i < len(raw_values) else None
            if raw is not None:
                try:
                    result[key] = redis_decode(raw)
                except Exception:
                    result[key] = None
            else:
                result[key] = None

        return result

    except Exception as e:
        logger.error(f"mget failed: {e}")
        return {k: None for k in keys}


async def mset(
    namespace: str,
    items: dict[str, Any],
    ttl: int = TTL.HOUR_1,
) -> bool:
    """
    Set multiple cached values in a single round-trip.

    Uses Redis pipeline for efficient bulk setting with TTL.

    Args:
        namespace: Cache namespace
        items: Dict of key -> value pairs to cache
        ttl: Time-to-live in seconds (applies to all)

    Returns:
        bool: True if all set successfully

    Example:
        success = await mset("church_settings", {
            "church1": settings1,
            "church2": settings2,
        }, ttl=600)
    """
    if not items:
        return True

    try:
        redis = await get_redis()
        pipe = redis.pipeline()

        # Queue all SET operations with TTL
        for key, value in items.items():
            full_key = redis_key("cache", namespace, key)
            data = redis_encode(value)
            pipe.set(full_key, data, ex=ttl)

        # Execute all at once
        results = await pipe.execute()

        return all(r is not None for r in results)

    except Exception as e:
        logger.error(f"mset failed: {e}")
        return False


async def mdelete(
    namespace: str,
    keys: list[str],
) -> int:
    """
    Delete multiple cached values in a single round-trip.

    Args:
        namespace: Cache namespace
        keys: List of cache keys to delete

    Returns:
        int: Number of keys actually deleted

    Example:
        deleted = await mdelete("church_settings", ["church1", "church2"])
    """
    if not keys:
        return 0

    try:
        redis = await get_redis()

        # Build full keys
        full_keys = [redis_key("cache", namespace, k) for k in keys]

        # Delete all at once
        return await redis.delete(*full_keys)

    except Exception as e:
        logger.error(f"mdelete failed: {e}")
        return 0


async def pipeline_get_many(
    requests: list[tuple[str, str]],
) -> list[Any]:
    """
    Get multiple values across different namespaces in one round-trip.

    Args:
        requests: List of (namespace, key) tuples

    Returns:
        list: Values in same order as requests (None for missing)

    Example:
        results = await pipeline_get_many([
            ("church_settings", "church1"),
            ("member_statuses", "church1"),
            ("demographics", "church1"),
        ])
        settings, statuses, demographics = results
    """
    if not requests:
        return []

    try:
        redis = await get_redis()
        pipe = redis.pipeline()

        # Queue all GETs
        for namespace, key in requests:
            full_key = redis_key("cache", namespace, key)
            pipe.get(full_key)

        # Execute
        raw_results = await pipe.execute()

        # Deserialize
        results = []
        for raw in raw_results:
            if raw is not None:
                try:
                    results.append(redis_decode(raw))
                except Exception:
                    results.append(None)
            else:
                results.append(None)

        return results

    except Exception as e:
        logger.error(f"pipeline_get_many failed: {e}")
        return [None] * len(requests)


async def pipeline_set_many(
    items: list[tuple[str, str, Any, int]],
) -> bool:
    """
    Set multiple values across different namespaces in one round-trip.

    Args:
        items: List of (namespace, key, value, ttl) tuples

    Returns:
        bool: True if all set successfully

    Example:
        success = await pipeline_set_many([
            ("church_settings", "church1", settings, 600),
            ("member_statuses", "church1", statuses, 1800),
            ("demographics", "church1", demographics, 1800),
        ])
    """
    if not items:
        return True

    try:
        redis = await get_redis()
        pipe = redis.pipeline()

        # Queue all SETs
        for namespace, key, value, ttl in items:
            full_key = redis_key("cache", namespace, key)
            data = redis_encode(value)
            pipe.set(full_key, data, ex=ttl)

        # Execute
        results = await pipe.execute()

        return all(r is not None for r in results)

    except Exception as e:
        logger.error(f"pipeline_set_many failed: {e}")
        return False
