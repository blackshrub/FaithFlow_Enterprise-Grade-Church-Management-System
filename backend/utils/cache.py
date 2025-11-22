"""Simple in-memory caching utility with TTL support."""
from datetime import datetime, timedelta
from typing import Any, Optional, Callable
import asyncio
from functools import wraps


class SimpleCache:
    """Thread-safe in-memory cache with TTL.

    For production with multiple workers, consider Redis.
    This is suitable for single-instance deployments.
    """

    def __init__(self):
        self._cache = {}  # {key: (value, expiry_time)}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired."""
        async with self._lock:
            if key in self._cache:
                value, expiry = self._cache[key]
                if datetime.now() < expiry:
                    return value
                # Expired, remove it
                del self._cache[key]
            return None

    async def set(self, key: str, value: Any, ttl_seconds: int = 300):
        """Set value in cache with TTL (default 5 minutes)."""
        async with self._lock:
            expiry = datetime.now() + timedelta(seconds=ttl_seconds)
            self._cache[key] = (value, expiry)

    async def delete(self, key: str):
        """Delete key from cache."""
        async with self._lock:
            if key in self._cache:
                del self._cache[key]

    async def clear(self):
        """Clear all cache entries."""
        async with self._lock:
            self._cache.clear()

    async def cleanup_expired(self):
        """Remove expired entries (call periodically)."""
        async with self._lock:
            now = datetime.now()
            expired_keys = [
                key for key, (_, expiry) in self._cache.items()
                if now >= expiry
            ]
            for key in expired_keys:
                del self._cache[key]

    def get_stats(self) -> dict:
        """Get cache statistics."""
        now = datetime.now()
        total = len(self._cache)
        expired = sum(1 for _, expiry in self._cache.values() if now >= expiry)
        return {
            "total_entries": total,
            "active_entries": total - expired,
            "expired_entries": expired
        }


# Global cache instance
cache = SimpleCache()


def cached(ttl_seconds: int = 300, key_prefix: str = ""):
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
        wrapper.cache_clear = lambda: cache.clear()
        wrapper.cache_delete = lambda key: cache.delete(f"{key_prefix}:{func.__name__}:{key}")

        return wrapper
    return decorator


# Convenience functions for common use cases
async def get_cached_settings(church_id: str, fetcher: Callable) -> Any:
    """Get church settings with caching.

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
    await cache.set(cache_key, value, ttl_seconds=600)  # 10 minutes

    return value


async def get_cached_statuses(church_id: str, fetcher: Callable) -> Any:
    """Get member statuses with caching."""
    cache_key = f"statuses:{church_id}"
    cached_value = await cache.get(cache_key)

    if cached_value is not None:
        return cached_value

    value = await fetcher()
    await cache.set(cache_key, value, ttl_seconds=1800)  # 30 minutes

    return value


async def get_cached_demographics(church_id: str, fetcher: Callable) -> Any:
    """Get demographics with caching."""
    cache_key = f"demographics:{church_id}"
    cached_value = await cache.get(cache_key)

    if cached_value is not None:
        return cached_value

    value = await fetcher()
    await cache.set(cache_key, value, ttl_seconds=1800)  # 30 minutes

    return value


async def invalidate_church_cache(church_id: str):
    """Invalidate all cache entries for a church."""
    await cache.delete(f"settings:{church_id}")
    await cache.delete(f"statuses:{church_id}")
    await cache.delete(f"demographics:{church_id}")
