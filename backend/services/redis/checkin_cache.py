"""
Redis Check-In Cache Service

Provides O(1) check-in deduplication and RSVP lookup for high-throughput
event check-in operations. Uses Redis SETs and HASHes for optimal performance.

Key Patterns:
- checkin:{event_id}:{session_id} - SET of checked-in member IDs
- rsvp:{event_id} - HASH of confirmation_code -> RSVP data
- checkin:stats:{event_id} - HASH of method counts for analytics
"""

import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

from config.redis import get_redis
from .utils import redis_key, TTL

# Use centralized msgspec-based serialization
from utils.serialization import redis_encode, redis_decode

logger = logging.getLogger(__name__)


# TTL for check-in cache (event duration + buffer)
CHECKIN_CACHE_TTL = TTL.HOURS_12  # 12 hours - covers most event durations
RSVP_CACHE_TTL = TTL.DAY_1  # 24 hours - RSVPs valid until event ends


def _checkin_key(event_id: str, session_id: Optional[str] = None) -> str:
    """Build check-in cache key."""
    session = session_id or "default"
    return redis_key("checkin", event_id, session)


def _rsvp_key(event_id: str) -> str:
    """Build RSVP cache key."""
    return redis_key("rsvp", event_id)


def _stats_key(event_id: str) -> str:
    """Build check-in stats key."""
    return redis_key("checkin", "stats", event_id)


# =============================================================================
# Check-In Deduplication Cache
# =============================================================================

async def is_checked_in(
    event_id: str,
    member_id: str,
    session_id: Optional[str] = None,
) -> bool:
    """
    Check if member is already checked in to event/session.

    O(1) lookup using Redis SISMEMBER.

    Args:
        event_id: Event identifier
        member_id: Member identifier
        session_id: Session identifier (for series events)

    Returns:
        bool: True if already checked in
    """
    try:
        redis = await get_redis()
        key = _checkin_key(event_id, session_id)
        return await redis.sismember(key, member_id)
    except Exception as e:
        logger.error(f"Check-in cache lookup failed: {e}")
        return False  # Fail open - let DB handle dedup


async def mark_checked_in(
    event_id: str,
    member_id: str,
    session_id: Optional[str] = None,
    method: str = "manual",
    ttl: int = CHECKIN_CACHE_TTL,
) -> bool:
    """
    Mark member as checked in to event/session.

    O(1) operation using Redis SADD.

    Args:
        event_id: Event identifier
        member_id: Member identifier
        session_id: Session identifier (for series events)
        method: Check-in method (face, qr, manual, quick_add)
        ttl: Cache TTL in seconds

    Returns:
        bool: True if newly added (was not already checked in)
    """
    try:
        redis = await get_redis()
        key = _checkin_key(event_id, session_id)

        # Add to set and set TTL if key is new
        pipe = redis.pipeline()
        pipe.sadd(key, member_id)
        pipe.expire(key, ttl)

        # Track stats by method
        stats_key = _stats_key(event_id)
        pipe.hincrby(stats_key, method, 1)
        pipe.expire(stats_key, ttl)

        results = await pipe.execute()

        # SADD returns 1 if newly added, 0 if already existed
        return results[0] == 1

    except Exception as e:
        logger.error(f"Check-in cache mark failed: {e}")
        return True  # Assume success to not block check-in


async def remove_checked_in(
    event_id: str,
    member_id: str,
    session_id: Optional[str] = None,
) -> bool:
    """
    Remove member from check-in cache (for undo functionality).

    Args:
        event_id: Event identifier
        member_id: Member identifier
        session_id: Session identifier

    Returns:
        bool: True if removed
    """
    try:
        redis = await get_redis()
        key = _checkin_key(event_id, session_id)
        result = await redis.srem(key, member_id)
        return result > 0
    except Exception as e:
        logger.error(f"Check-in cache remove failed: {e}")
        return False


async def get_checked_in_count(
    event_id: str,
    session_id: Optional[str] = None,
) -> int:
    """
    Get count of checked-in members.

    Args:
        event_id: Event identifier
        session_id: Session identifier

    Returns:
        int: Number of checked-in members
    """
    try:
        redis = await get_redis()
        key = _checkin_key(event_id, session_id)
        return await redis.scard(key)
    except Exception as e:
        logger.error(f"Check-in count failed: {e}")
        return 0


async def get_checked_in_members(
    event_id: str,
    session_id: Optional[str] = None,
) -> List[str]:
    """
    Get all checked-in member IDs.

    Args:
        event_id: Event identifier
        session_id: Session identifier

    Returns:
        List[str]: Member IDs
    """
    try:
        redis = await get_redis()
        key = _checkin_key(event_id, session_id)
        members = await redis.smembers(key)
        return list(members)
    except Exception as e:
        logger.error(f"Get checked-in members failed: {e}")
        return []


async def get_checkin_stats(event_id: str) -> Dict[str, int]:
    """
    Get check-in statistics by method.

    Args:
        event_id: Event identifier

    Returns:
        Dict with method counts: {"face": 10, "qr": 25, "manual": 5}
    """
    try:
        redis = await get_redis()
        key = _stats_key(event_id)
        stats = await redis.hgetall(key)
        return {k: int(v) for k, v in stats.items()}
    except Exception as e:
        logger.error(f"Get check-in stats failed: {e}")
        return {}


# =============================================================================
# RSVP Lookup Cache
# =============================================================================

async def cache_rsvp(
    event_id: str,
    confirmation_code: str,
    rsvp_data: Dict[str, Any],
    ttl: int = RSVP_CACHE_TTL,
) -> bool:
    """
    Cache RSVP data for O(1) lookup by confirmation code.

    Args:
        event_id: Event identifier
        confirmation_code: RSVP confirmation code (from QR)
        rsvp_data: RSVP details (member_id, session_id, seat, etc.)
        ttl: Cache TTL in seconds

    Returns:
        bool: True if cached successfully
    """
    try:
        redis = await get_redis()
        key = _rsvp_key(event_id)

        # Store as JSON in hash field
        data = redis_encode(rsvp_data)
        pipe = redis.pipeline()
        pipe.hset(key, confirmation_code, data)
        pipe.expire(key, ttl)
        await pipe.execute()

        return True
    except Exception as e:
        logger.error(f"RSVP cache set failed: {e}")
        return False


async def get_cached_rsvp(
    event_id: str,
    confirmation_code: str,
) -> Optional[Dict[str, Any]]:
    """
    Get RSVP data by confirmation code.

    O(1) lookup using Redis HGET.

    Args:
        event_id: Event identifier
        confirmation_code: RSVP confirmation code

    Returns:
        RSVP data dict or None if not found
    """
    try:
        redis = await get_redis()
        key = _rsvp_key(event_id)

        data = await redis.hget(key, confirmation_code)
        if data:
            return redis_decode(data)
        return None
    except Exception as e:
        logger.error(f"RSVP cache get failed: {e}")
        return None


async def cache_rsvp_bulk(
    event_id: str,
    rsvps: List[Dict[str, Any]],
    ttl: int = RSVP_CACHE_TTL,
) -> bool:
    """
    Cache multiple RSVPs at once.

    Args:
        event_id: Event identifier
        rsvps: List of RSVP dicts, each must have 'confirmation_code'
        ttl: Cache TTL in seconds

    Returns:
        bool: True if cached successfully
    """
    if not rsvps:
        return True

    try:
        redis = await get_redis()
        key = _rsvp_key(event_id)

        # Build hash mapping
        mapping = {}
        for rsvp in rsvps:
            code = rsvp.get("confirmation_code")
            if code:
                mapping[code] = redis_encode(rsvp)

        if mapping:
            pipe = redis.pipeline()
            pipe.hset(key, mapping=mapping)
            pipe.expire(key, ttl)
            await pipe.execute()

        return True
    except Exception as e:
        logger.error(f"RSVP bulk cache failed: {e}")
        return False


async def invalidate_rsvp(
    event_id: str,
    confirmation_code: Optional[str] = None,
) -> bool:
    """
    Invalidate RSVP cache entry or entire event cache.

    Args:
        event_id: Event identifier
        confirmation_code: Specific code to invalidate, or None for all

    Returns:
        bool: True if invalidated
    """
    try:
        redis = await get_redis()
        key = _rsvp_key(event_id)

        if confirmation_code:
            await redis.hdel(key, confirmation_code)
        else:
            await redis.delete(key)

        return True
    except Exception as e:
        logger.error(f"RSVP cache invalidation failed: {e}")
        return False


# =============================================================================
# Cache Warming (Pre-load for Events)
# =============================================================================

async def warm_event_cache(
    event_id: str,
    rsvps: List[Dict[str, Any]],
    existing_attendance: List[str],
    session_id: Optional[str] = None,
) -> bool:
    """
    Pre-warm cache for an event with RSVPs and existing attendance.

    Call this when opening kiosk for an event to ensure fast check-ins.

    Args:
        event_id: Event identifier
        rsvps: List of RSVP records
        existing_attendance: List of already checked-in member IDs
        session_id: Session identifier

    Returns:
        bool: True if warmed successfully
    """
    try:
        redis = await get_redis()
        pipe = redis.pipeline()

        # Cache RSVPs
        rsvp_key = _rsvp_key(event_id)
        rsvp_mapping = {}
        for rsvp in rsvps:
            code = rsvp.get("confirmation_code")
            if code:
                rsvp_mapping[code] = redis_encode(rsvp)

        if rsvp_mapping:
            pipe.hset(rsvp_key, mapping=rsvp_mapping)
            pipe.expire(rsvp_key, RSVP_CACHE_TTL)

        # Cache existing attendance
        if existing_attendance:
            checkin_key = _checkin_key(event_id, session_id)
            pipe.sadd(checkin_key, *existing_attendance)
            pipe.expire(checkin_key, CHECKIN_CACHE_TTL)

        await pipe.execute()

        logger.info(
            f"Warmed cache for event {event_id}: "
            f"{len(rsvp_mapping)} RSVPs, {len(existing_attendance)} attended"
        )
        return True

    except Exception as e:
        logger.error(f"Cache warming failed: {e}")
        return False


async def invalidate_event_cache(event_id: str) -> bool:
    """
    Invalidate all cache entries for an event.

    Call after event ends or when resetting.

    Args:
        event_id: Event identifier

    Returns:
        bool: True if invalidated
    """
    try:
        redis = await get_redis()

        # Find all keys for this event
        pattern = redis_key("*", event_id, "*")
        keys_to_delete = []

        async for key in redis.scan_iter(match=pattern):
            keys_to_delete.append(key)

        # Also delete the main keys
        keys_to_delete.extend([
            _rsvp_key(event_id),
            _stats_key(event_id),
            _checkin_key(event_id, None),
        ])

        if keys_to_delete:
            await redis.delete(*keys_to_delete)

        logger.info(f"Invalidated {len(keys_to_delete)} cache keys for event {event_id}")
        return True

    except Exception as e:
        logger.error(f"Event cache invalidation failed: {e}")
        return False
