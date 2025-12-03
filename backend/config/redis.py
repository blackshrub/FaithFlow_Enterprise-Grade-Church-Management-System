"""
Redis Configuration and Connection Management

Provides async Redis client with connection pooling for high-performance
caching, session management, rate limiting, and real-time features.

Features:
- Async/await support for non-blocking operations
- Connection pooling for efficient resource usage
- Automatic reconnection on connection loss
- Health checking
- Graceful shutdown

Usage:
    from config.redis import get_redis, redis_client

    # Option 1: Use global client
    await redis_client.set("key", "value")
    value = await redis_client.get("key")

    # Option 2: Use dependency injection (FastAPI)
    @app.get("/")
    async def handler(redis: Redis = Depends(get_redis)):
        await redis.set("key", "value")
"""

import os
import logging
from typing import Optional
from dataclasses import dataclass

import redis.asyncio as redis
from redis.asyncio import Redis, ConnectionPool
from redis.exceptions import ConnectionError, TimeoutError

logger = logging.getLogger(__name__)


@dataclass
class RedisConfig:
    """Redis configuration settings."""

    url: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    max_connections: int = int(os.getenv("REDIS_MAX_CONNECTIONS", "50"))
    socket_timeout: float = float(os.getenv("REDIS_SOCKET_TIMEOUT", "5.0"))
    socket_connect_timeout: float = float(os.getenv("REDIS_CONNECT_TIMEOUT", "5.0"))
    retry_on_timeout: bool = True
    health_check_interval: int = int(os.getenv("REDIS_HEALTH_CHECK_INTERVAL", "30"))
    decode_responses: bool = True  # Return strings instead of bytes

    # Key prefixes for namespacing
    prefix: str = os.getenv("REDIS_KEY_PREFIX", "faithflow")

    @property
    def connection_kwargs(self) -> dict:
        """Get connection kwargs for Redis."""
        return {
            "max_connections": self.max_connections,
            "socket_timeout": self.socket_timeout,
            "socket_connect_timeout": self.socket_connect_timeout,
            "retry_on_timeout": self.retry_on_timeout,
            "health_check_interval": self.health_check_interval,
            "decode_responses": self.decode_responses,
        }


# Global configuration instance
config = RedisConfig()

# Global connection pool and client
_pool: Optional[ConnectionPool] = None
_client: Optional[Redis] = None


async def init_redis() -> Redis:
    """
    Initialize Redis connection pool and client.

    Should be called during application startup.

    Returns:
        Redis: Async Redis client instance

    Raises:
        ConnectionError: If unable to connect to Redis
    """
    global _pool, _client

    if _client is not None:
        return _client

    try:
        logger.info(f"Connecting to Redis at {config.url}...")

        # Create connection pool
        _pool = ConnectionPool.from_url(
            config.url,
            **config.connection_kwargs
        )

        # Create client with pool
        _client = Redis(connection_pool=_pool)

        # Test connection
        await _client.ping()

        logger.info("Redis connection established successfully")
        return _client

    except (ConnectionError, TimeoutError) as e:
        logger.error(f"Failed to connect to Redis: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error connecting to Redis: {e}")
        raise


async def close_redis() -> None:
    """
    Close Redis connection pool.

    Should be called during application shutdown.
    """
    global _pool, _client

    if _client is not None:
        try:
            await _client.close()
            logger.info("Redis connection closed")
        except Exception as e:
            logger.warning(f"Error closing Redis connection: {e}")
        finally:
            _client = None

    if _pool is not None:
        try:
            await _pool.disconnect()
        except Exception as e:
            logger.warning(f"Error disconnecting Redis pool: {e}")
        finally:
            _pool = None


async def get_redis() -> Redis:
    """
    Get Redis client instance.

    Initializes connection if not already connected.
    Use this as a FastAPI dependency.

    Returns:
        Redis: Async Redis client instance

    Example:
        @app.get("/")
        async def handler(redis: Redis = Depends(get_redis)):
            await redis.set("key", "value")
    """
    global _client

    if _client is None:
        await init_redis()

    return _client


async def health_check() -> dict:
    """
    Check Redis health status.

    Returns:
        dict: Health status information
    """
    try:
        client = await get_redis()

        # Ping Redis
        ping_ok = await client.ping()

        # Get server info
        info = await client.info("server")

        # Get memory info
        memory = await client.info("memory")

        return {
            "status": "healthy" if ping_ok else "unhealthy",
            "ping": ping_ok,
            "version": info.get("redis_version", "unknown"),
            "uptime_seconds": info.get("uptime_in_seconds", 0),
            "connected_clients": info.get("connected_clients", 0),
            "used_memory_human": memory.get("used_memory_human", "unknown"),
            "used_memory_peak_human": memory.get("used_memory_peak_human", "unknown"),
        }

    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
        }


class RedisClient:
    """
    Redis client wrapper with additional utility methods.

    Provides a convenient interface for common Redis operations
    with automatic key prefixing and error handling.
    """

    def __init__(self, prefix: str = None):
        """
        Initialize Redis client wrapper.

        Args:
            prefix: Optional key prefix (defaults to config.prefix)
        """
        self.prefix = prefix or config.prefix

    async def _get_client(self) -> Redis:
        """Get the underlying Redis client."""
        return await get_redis()

    def _make_key(self, *parts: str) -> str:
        """
        Create a namespaced key from parts.

        Args:
            *parts: Key parts to join

        Returns:
            str: Namespaced key like "faithflow:part1:part2"
        """
        return ":".join([self.prefix, *parts])

    # String operations
    async def get(self, key: str) -> Optional[str]:
        """Get a string value."""
        client = await self._get_client()
        return await client.get(self._make_key(key))

    async def set(
        self,
        key: str,
        value: str,
        ex: Optional[int] = None,
        px: Optional[int] = None,
        nx: bool = False,
        xx: bool = False,
    ) -> bool:
        """
        Set a string value with optional expiration.

        Args:
            key: Key name
            value: Value to set
            ex: Expire time in seconds
            px: Expire time in milliseconds
            nx: Only set if key doesn't exist
            xx: Only set if key exists

        Returns:
            bool: True if set successfully
        """
        client = await self._get_client()
        result = await client.set(
            self._make_key(key),
            value,
            ex=ex,
            px=px,
            nx=nx,
            xx=xx,
        )
        return result is not None

    async def delete(self, *keys: str) -> int:
        """Delete one or more keys."""
        client = await self._get_client()
        full_keys = [self._make_key(k) for k in keys]
        return await client.delete(*full_keys)

    async def exists(self, *keys: str) -> int:
        """Check if keys exist."""
        client = await self._get_client()
        full_keys = [self._make_key(k) for k in keys]
        return await client.exists(*full_keys)

    async def expire(self, key: str, seconds: int) -> bool:
        """Set expiration on a key."""
        client = await self._get_client()
        return await client.expire(self._make_key(key), seconds)

    async def ttl(self, key: str) -> int:
        """Get time-to-live for a key."""
        client = await self._get_client()
        return await client.ttl(self._make_key(key))

    # Hash operations
    async def hget(self, name: str, key: str) -> Optional[str]:
        """Get a hash field value."""
        client = await self._get_client()
        return await client.hget(self._make_key(name), key)

    async def hset(self, name: str, key: str = None, value: str = None, mapping: dict = None) -> int:
        """Set hash field(s)."""
        client = await self._get_client()
        return await client.hset(self._make_key(name), key=key, value=value, mapping=mapping)

    async def hgetall(self, name: str) -> dict:
        """Get all hash fields and values."""
        client = await self._get_client()
        return await client.hgetall(self._make_key(name))

    async def hdel(self, name: str, *keys: str) -> int:
        """Delete hash fields."""
        client = await self._get_client()
        return await client.hdel(self._make_key(name), *keys)

    # List operations
    async def lpush(self, name: str, *values: str) -> int:
        """Push values to the left of a list."""
        client = await self._get_client()
        return await client.lpush(self._make_key(name), *values)

    async def rpush(self, name: str, *values: str) -> int:
        """Push values to the right of a list."""
        client = await self._get_client()
        return await client.rpush(self._make_key(name), *values)

    async def lrange(self, name: str, start: int, end: int) -> list:
        """Get a range of elements from a list."""
        client = await self._get_client()
        return await client.lrange(self._make_key(name), start, end)

    async def ltrim(self, name: str, start: int, end: int) -> bool:
        """Trim a list to the specified range."""
        client = await self._get_client()
        return await client.ltrim(self._make_key(name), start, end)

    async def llen(self, name: str) -> int:
        """Get the length of a list."""
        client = await self._get_client()
        return await client.llen(self._make_key(name))

    # Set operations
    async def sadd(self, name: str, *values: str) -> int:
        """Add members to a set."""
        client = await self._get_client()
        return await client.sadd(self._make_key(name), *values)

    async def srem(self, name: str, *values: str) -> int:
        """Remove members from a set."""
        client = await self._get_client()
        return await client.srem(self._make_key(name), *values)

    async def smembers(self, name: str) -> set:
        """Get all members of a set."""
        client = await self._get_client()
        return await client.smembers(self._make_key(name))

    async def sismember(self, name: str, value: str) -> bool:
        """Check if value is a member of set."""
        client = await self._get_client()
        return await client.sismember(self._make_key(name), value)

    # Sorted set operations
    async def zadd(self, name: str, mapping: dict, nx: bool = False, xx: bool = False) -> int:
        """Add members to a sorted set."""
        client = await self._get_client()
        return await client.zadd(self._make_key(name), mapping, nx=nx, xx=xx)

    async def zrange(self, name: str, start: int, end: int, withscores: bool = False) -> list:
        """Get a range of members from a sorted set."""
        client = await self._get_client()
        return await client.zrange(self._make_key(name), start, end, withscores=withscores)

    async def zrevrange(self, name: str, start: int, end: int, withscores: bool = False) -> list:
        """Get a range of members from a sorted set in reverse order."""
        client = await self._get_client()
        return await client.zrevrange(self._make_key(name), start, end, withscores=withscores)

    async def zscore(self, name: str, value: str) -> Optional[float]:
        """Get the score of a member in a sorted set."""
        client = await self._get_client()
        return await client.zscore(self._make_key(name), value)

    async def zincrby(self, name: str, amount: float, value: str) -> float:
        """Increment the score of a member in a sorted set."""
        client = await self._get_client()
        return await client.zincrby(self._make_key(name), amount, value)

    async def zrank(self, name: str, value: str) -> Optional[int]:
        """Get the rank of a member in a sorted set (ascending)."""
        client = await self._get_client()
        return await client.zrank(self._make_key(name), value)

    async def zrevrank(self, name: str, value: str) -> Optional[int]:
        """Get the rank of a member in a sorted set (descending)."""
        client = await self._get_client()
        return await client.zrevrank(self._make_key(name), value)

    # Counter operations
    async def incr(self, key: str, amount: int = 1) -> int:
        """Increment a counter."""
        client = await self._get_client()
        return await client.incrby(self._make_key(key), amount)

    async def decr(self, key: str, amount: int = 1) -> int:
        """Decrement a counter."""
        client = await self._get_client()
        return await client.decrby(self._make_key(key), amount)

    # Pub/Sub operations
    async def publish(self, channel: str, message: str) -> int:
        """Publish a message to a channel."""
        client = await self._get_client()
        return await client.publish(self._make_key(channel), message)

    # Pipeline for batch operations
    def pipeline(self):
        """
        Create a pipeline for batch operations.

        Note: Keys must be prefixed manually when using pipeline.

        Example:
            async with redis_client.pipeline() as pipe:
                pipe.set("faithflow:key1", "value1")
                pipe.set("faithflow:key2", "value2")
                results = await pipe.execute()
        """
        # This returns the raw pipeline from the underlying client
        # Keys must be prefixed manually
        return _client.pipeline()


# Global Redis client wrapper instance
redis_client = RedisClient()


# Convenience function for direct access to raw client
async def get_raw_redis() -> Redis:
    """
    Get raw Redis client without key prefixing.

    Use this when you need direct access to Redis commands
    or when using libraries that expect a raw Redis client.
    """
    return await get_redis()
