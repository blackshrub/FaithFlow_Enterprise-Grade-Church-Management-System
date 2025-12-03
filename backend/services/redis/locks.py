"""
Distributed Locks with Redis

Provides distributed locking to prevent race conditions
across multiple backend instances.

Uses Redis SETNX for atomic lock acquisition.
"""

import uuid
import asyncio
import logging
from typing import Optional
from contextlib import asynccontextmanager

from config.redis import get_redis
from .utils import redis_key, TTL

logger = logging.getLogger(__name__)


class LockAcquisitionError(Exception):
    """Raised when lock cannot be acquired."""
    pass


class LockReleaseError(Exception):
    """Raised when lock cannot be released."""
    pass


class DistributedLock:
    """
    Redis-backed distributed lock.

    Provides mutual exclusion across multiple backend instances
    to prevent race conditions in critical sections.
    """

    def __init__(self):
        """Initialize distributed lock manager."""
        pass

    def _make_key(self, name: str) -> str:
        """Create lock key."""
        return redis_key("lock", name)

    async def acquire(
        self,
        name: str,
        timeout: int = TTL.LOCK_DEFAULT,
        blocking: bool = True,
        blocking_timeout: float = 10.0,
    ) -> Optional[str]:
        """
        Acquire a distributed lock.

        Args:
            name: Lock name
            timeout: Lock expiration in seconds (prevents deadlocks)
            blocking: Whether to wait for lock
            blocking_timeout: Max time to wait in seconds

        Returns:
            Lock token if acquired, None if not

        Raises:
            LockAcquisitionError: If blocking=True and lock cannot be acquired
        """
        token = str(uuid.uuid4())
        key = self._make_key(name)

        try:
            redis = await get_redis()

            if blocking:
                # Try to acquire with retry
                start = asyncio.get_event_loop().time()
                while True:
                    acquired = await redis.set(key, token, ex=timeout, nx=True)

                    if acquired:
                        logger.debug(f"Acquired lock: {name}")
                        return token

                    # Check timeout
                    elapsed = asyncio.get_event_loop().time() - start
                    if elapsed >= blocking_timeout:
                        raise LockAcquisitionError(
                            f"Failed to acquire lock '{name}' within {blocking_timeout}s"
                        )

                    # Wait before retry
                    await asyncio.sleep(0.1)
            else:
                # Non-blocking acquire
                acquired = await redis.set(key, token, ex=timeout, nx=True)
                if acquired:
                    logger.debug(f"Acquired lock: {name}")
                    return token
                return None

        except LockAcquisitionError:
            raise
        except Exception as e:
            logger.error(f"Lock acquisition error: {e}")
            if blocking:
                raise LockAcquisitionError(f"Lock acquisition failed: {e}")
            return None

    async def release(self, name: str, token: str) -> bool:
        """
        Release a distributed lock.

        Only releases if the token matches (prevents releasing
        someone else's lock).

        Args:
            name: Lock name
            token: Token returned from acquire()

        Returns:
            bool: True if released, False if token didn't match
        """
        key = self._make_key(name)

        try:
            redis = await get_redis()

            # Lua script for atomic check-and-delete
            script = """
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            else
                return 0
            end
            """

            result = await redis.eval(script, 1, key, token)

            if result:
                logger.debug(f"Released lock: {name}")
                return True
            else:
                logger.warning(f"Lock release failed (token mismatch): {name}")
                return False

        except Exception as e:
            logger.error(f"Lock release error: {e}")
            return False

    async def extend(
        self,
        name: str,
        token: str,
        additional_time: int,
    ) -> bool:
        """
        Extend lock expiration time.

        Args:
            name: Lock name
            token: Token returned from acquire()
            additional_time: Seconds to add to expiration

        Returns:
            bool: True if extended, False if token didn't match
        """
        key = self._make_key(name)

        try:
            redis = await get_redis()

            # Lua script for atomic check-and-extend
            script = """
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("expire", KEYS[1], ARGV[2])
            else
                return 0
            end
            """

            current_ttl = await redis.ttl(key)
            new_ttl = max(current_ttl, 0) + additional_time

            result = await redis.eval(script, 1, key, token, new_ttl)

            if result:
                logger.debug(f"Extended lock: {name} by {additional_time}s")
                return True
            else:
                logger.warning(f"Lock extend failed (token mismatch): {name}")
                return False

        except Exception as e:
            logger.error(f"Lock extend error: {e}")
            return False

    async def is_locked(self, name: str) -> bool:
        """Check if a lock is currently held."""
        key = self._make_key(name)

        try:
            redis = await get_redis()
            return await redis.exists(key) > 0
        except Exception as e:
            logger.error(f"Lock check error: {e}")
            return False

    async def force_release(self, name: str) -> bool:
        """
        Force release a lock (admin operation).

        Use with caution - this can cause race conditions
        if another process holds the lock.

        Args:
            name: Lock name

        Returns:
            bool: True if deleted
        """
        key = self._make_key(name)

        try:
            redis = await get_redis()
            await redis.delete(key)
            logger.warning(f"Force released lock: {name}")
            return True
        except Exception as e:
            logger.error(f"Force release error: {e}")
            return False

    @asynccontextmanager
    async def lock(
        self,
        name: str,
        timeout: int = TTL.LOCK_DEFAULT,
        blocking: bool = True,
        blocking_timeout: float = 10.0,
    ):
        """
        Context manager for acquiring and releasing locks.

        Usage:
            async with distributed_lock.lock("my_operation"):
                # Critical section
                await do_something()

        Args:
            name: Lock name
            timeout: Lock expiration in seconds
            blocking: Whether to wait for lock
            blocking_timeout: Max time to wait

        Yields:
            Lock token

        Raises:
            LockAcquisitionError: If lock cannot be acquired
        """
        token = await self.acquire(
            name,
            timeout=timeout,
            blocking=blocking,
            blocking_timeout=blocking_timeout,
        )

        if token is None:
            raise LockAcquisitionError(f"Failed to acquire lock: {name}")

        try:
            yield token
        finally:
            await self.release(name, token)


# Global instance
distributed_lock = DistributedLock()


# Convenience functions for common lock scenarios

@asynccontextmanager
async def ai_generation_lock(church_id: str, content_type: str):
    """Lock for AI content generation to prevent duplicates."""
    lock_name = f"ai_generation:{church_id}:{content_type}"
    async with distributed_lock.lock(lock_name, timeout=TTL.LOCK_LONG):
        yield


@asynccontextmanager
async def status_automation_lock(church_id: str):
    """Lock for status automation to prevent race conditions."""
    lock_name = f"status_automation:{church_id}"
    async with distributed_lock.lock(lock_name, timeout=TTL.LOCK_DEFAULT):
        yield


@asynccontextmanager
async def webhook_processing_lock(webhook_id: str):
    """Lock for webhook processing to prevent double delivery."""
    lock_name = f"webhook:{webhook_id}"
    async with distributed_lock.lock(lock_name, timeout=60, blocking_timeout=5):
        yield


@asynccontextmanager
async def bulk_import_lock(church_id: str):
    """Lock for bulk import operations."""
    lock_name = f"bulk_import:{church_id}"
    async with distributed_lock.lock(lock_name, timeout=TTL.LOCK_LONG, blocking_timeout=30):
        yield


@asynccontextmanager
async def report_generation_lock(church_id: str, report_type: str):
    """Lock for report generation."""
    lock_name = f"report:{church_id}:{report_type}"
    async with distributed_lock.lock(lock_name, timeout=TTL.LOCK_DEFAULT):
        yield
