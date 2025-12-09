"""
Performance Optimization Utilities

World-class performance optimizations for FaithFlow:
1. MongoDB Index Management - Auto-create indexes at startup
2. In-Memory Caching Layer - TTL-based cache with LRU eviction
3. Query Optimization Helpers - Batch queries, pagination
4. Response Compression Utilities
"""

import asyncio
import hashlib
import json
import time
import logging
from typing import Dict, Any, Optional, List, Callable, TypeVar, Generic
from datetime import datetime, timedelta
from functools import wraps
from collections import OrderedDict
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING, IndexModel

logger = logging.getLogger(__name__)

T = TypeVar('T')


# ============================================================================
# MONGODB INDEX MANAGEMENT
# ============================================================================

class IndexManager:
    """
    Manages MongoDB indexes for optimal query performance.
    Automatically creates indexes at application startup.
    """

    # Define all indexes for each collection
    INDEXES: Dict[str, List[IndexModel]] = {
        # Members collection - most queried
        "members": [
            IndexModel([("church_id", ASCENDING), ("is_active", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("status", ASCENDING)]),
            # Partial index: only enforce uniqueness for non-empty emails
            # This allows multiple members with null/empty email
            IndexModel(
                [("church_id", ASCENDING), ("email", ASCENDING)],
                unique=True,
                partialFilterExpression={"email": {"$type": "string", "$gt": ""}}
            ),
            IndexModel([("church_id", ASCENDING), ("phone", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel([("church_id", ASCENDING), ("membership_status", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("deleted", ASCENDING)]),
            # Compound index for soft-delete queries with status filtering
            IndexModel([("church_id", ASCENDING), ("deleted", ASCENDING), ("status", ASCENDING), ("created_at", DESCENDING)]),
            # Compound index for member activity lookups
            IndexModel([("church_id", ASCENDING), ("member_id", ASCENDING), ("created_at", DESCENDING)]),
            # Text search index
            IndexModel([("first_name", "text"), ("last_name", "text"), ("email", "text")]),
        ],

        # Events collection
        "events": [
            IndexModel([("church_id", ASCENDING), ("is_active", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("start_date", DESCENDING)]),
            IndexModel([("church_id", ASCENDING), ("event_category_id", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("is_active", ASCENDING), ("start_date", DESCENDING)]),
            IndexModel([("church_id", ASCENDING), ("deleted", ASCENDING)]),
        ],

        # Groups collection
        "groups": [
            IndexModel([("church_id", ASCENDING), ("is_active", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("category_id", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("leader_id", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("deleted", ASCENDING)]),
        ],

        # Group members (join table)
        "group_members": [
            IndexModel([("group_id", ASCENDING), ("member_id", ASCENDING)], unique=True),
            IndexModel([("member_id", ASCENDING)]),
            IndexModel([("church_id", ASCENDING)]),
        ],

        # Giving/Donations
        "donations": [
            IndexModel([("church_id", ASCENDING), ("date", DESCENDING)]),
            IndexModel([("church_id", ASCENDING), ("member_id", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("fund_id", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("payment_method", ASCENDING)]),
        ],

        # Counseling
        "counseling_appointments": [
            IndexModel([("church_id", ASCENDING), ("date", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("counselor_id", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("member_id", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("status", ASCENDING)]),
        ],

        "counseling_slots": [
            IndexModel([("church_id", ASCENDING), ("counselor_id", ASCENDING), ("date", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("is_available", ASCENDING)]),
        ],

        "counselors": [
            IndexModel([("church_id", ASCENDING), ("is_active", ASCENDING)]),
            IndexModel([("id", ASCENDING)], unique=True),
        ],

        # Ratings & Reviews
        "ratings_reviews": [
            IndexModel([("church_id", ASCENDING), ("event_id", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("member_id", ASCENDING)]),
            IndexModel([("event_id", ASCENDING), ("created_at", DESCENDING)]),
        ],

        # Articles
        "articles": [
            IndexModel([("church_id", ASCENDING), ("status", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("published_at", DESCENDING)]),
            IndexModel([("church_id", ASCENDING), ("category", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("deleted", ASCENDING)]),
        ],

        # Prayer Requests
        "prayer_requests": [
            IndexModel([("church_id", ASCENDING), ("is_active", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("member_id", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("created_at", DESCENDING)]),
        ],

        # Devotions
        "devotions": [
            IndexModel([("church_id", ASCENDING), ("is_active", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("date", DESCENDING)]),
        ],

        # Explore Content Collections (comprehensive indexes for multi-tenant)
        "explore_devotions": [
            IndexModel([("church_id", ASCENDING), ("deleted", ASCENDING), ("published", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("scheduled_date", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel([("church_id", ASCENDING), ("published", ASCENDING), ("deleted", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel([("church_id", ASCENDING), ("created_by", ASCENDING)]),
        ],

        "explore_verses": [
            IndexModel([("church_id", ASCENDING), ("deleted", ASCENDING), ("published", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("scheduled_date", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel([("church_id", ASCENDING), ("published", ASCENDING), ("deleted", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel([("church_id", ASCENDING), ("created_by", ASCENDING)]),
        ],

        "explore_figures": [
            IndexModel([("church_id", ASCENDING), ("deleted", ASCENDING), ("published", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("scheduled_date", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel([("church_id", ASCENDING), ("published", ASCENDING), ("deleted", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel([("church_id", ASCENDING), ("created_by", ASCENDING)]),
        ],

        "explore_quizzes": [
            IndexModel([("church_id", ASCENDING), ("deleted", ASCENDING), ("published", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("scheduled_date", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel([("church_id", ASCENDING), ("published", ASCENDING), ("deleted", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel([("church_id", ASCENDING), ("created_by", ASCENDING)]),
        ],

        "explore_bible_studies": [
            IndexModel([("church_id", ASCENDING), ("deleted", ASCENDING), ("published", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("scheduled_date", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel([("church_id", ASCENDING), ("published", ASCENDING), ("deleted", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel([("church_id", ASCENDING), ("created_by", ASCENDING)]),
        ],

        "explore_devotion_plans": [
            IndexModel([("church_id", ASCENDING), ("deleted", ASCENDING), ("published", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("scheduled_date", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel([("church_id", ASCENDING), ("published", ASCENDING), ("deleted", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel([("church_id", ASCENDING), ("created_by", ASCENDING)]),
        ],

        "explore_topical_categories": [
            IndexModel([("church_id", ASCENDING), ("deleted", ASCENDING), ("published", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("scheduled_date", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel([("church_id", ASCENDING), ("published", ASCENDING), ("deleted", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel([("church_id", ASCENDING), ("created_by", ASCENDING)]),
        ],

        "explore_topical_verses": [
            IndexModel([("church_id", ASCENDING), ("deleted", ASCENDING), ("published", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("scheduled_date", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel([("church_id", ASCENDING), ("published", ASCENDING), ("deleted", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel([("church_id", ASCENDING), ("created_by", ASCENDING)]),
            IndexModel([("category_id", ASCENDING)]),
        ],

        # User Progress
        "explore_user_progress": [
            IndexModel([("church_id", ASCENDING), ("user_id", ASCENDING), ("content_type", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("user_id", ASCENDING), ("last_accessed", DESCENDING)]),
            IndexModel([("church_id", ASCENDING), ("user_id", ASCENDING), ("content_type", ASCENDING), ("content_id", ASCENDING)], unique=True),
        ],

        # Explore Analytics
        "explore_analytics": [
            IndexModel([("church_id", ASCENDING), ("date", DESCENDING)]),
            IndexModel([("church_id", ASCENDING), ("content_type", ASCENDING), ("content_id", ASCENDING), ("date", DESCENDING)]),
            IndexModel([("church_id", ASCENDING), ("content_type", ASCENDING), ("date", DESCENDING)]),
        ],

        # Content Adoption
        "explore_adoptions": [
            IndexModel([("church_id", ASCENDING), ("content_type", ASCENDING), ("adopted", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("content_type", ASCENDING), ("content_id", ASCENDING)], unique=True),
        ],

        # Church Settings for Explore
        "explore_church_settings": [
            IndexModel([("church_id", ASCENDING)], unique=True),
        ],

        # AI Generation Queue
        "ai_generation_queue": [
            IndexModel([("church_id", ASCENDING), ("user_id", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel([("church_id", ASCENDING), ("status", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel([("status", ASCENDING), ("created_at", ASCENDING)]),
        ],

        # Prompt Configurations
        "explore_prompt_config": [
            IndexModel([("church_id", ASCENDING)], unique=True),
        ],

        # Church Settings
        "church_settings": [
            IndexModel([("church_id", ASCENDING)], unique=True),
        ],

        # System Settings
        "system_settings": [
            IndexModel([("key", ASCENDING)], unique=True),
        ],

        # Webhooks
        "webhooks": [
            IndexModel([("church_id", ASCENDING), ("is_active", ASCENDING)]),
        ],

        "webhook_queue": [
            IndexModel([("status", ASCENDING), ("created_at", ASCENDING)]),
            IndexModel([("church_id", ASCENDING)]),
        ],

        # Audit Logs
        "audit_logs": [
            IndexModel([("church_id", ASCENDING), ("created_at", DESCENDING)]),
            IndexModel([("church_id", ASCENDING), ("user_id", ASCENDING)]),
            IndexModel([("church_id", ASCENDING), ("action", ASCENDING)]),
        ],
    }

    # List of deprecated indexes that should be dropped if they exist
    # Format: {collection_name: [index_name, ...]}
    DEPRECATED_INDEXES: Dict[str, List[str]] = {
        "members": [
            # Old sparse index replaced by partial index for email uniqueness
            "church_id_1_email_1",
        ],
        "ai_generation_queue": [
            # Old index replaced with named version
            "status_1_created_at_1",
        ],
    }

    @classmethod
    async def ensure_indexes(cls, db: AsyncIOMotorDatabase) -> Dict[str, Any]:
        """
        Create all indexes for optimal performance.
        Also removes deprecated indexes that conflict with new ones.

        Returns:
            Dict with creation results per collection
        """
        results = {}
        start_time = time.time()

        logger.info("Starting MongoDB index initialization...")

        # First, drop any deprecated indexes
        for collection_name, deprecated in cls.DEPRECATED_INDEXES.items():
            try:
                collection = db[collection_name]
                existing_indexes = await collection.index_information()

                for index_name in deprecated:
                    if index_name in existing_indexes:
                        await collection.drop_index(index_name)
                        logger.info(f"Dropped deprecated index {index_name} from {collection_name}")
            except Exception as e:
                logger.warning(f"Error dropping deprecated indexes from {collection_name}: {e}")

        # Now create indexes
        for collection_name, indexes in cls.INDEXES.items():
            try:
                collection = db[collection_name]

                # Create indexes (MongoDB ignores duplicates)
                created = await collection.create_indexes(indexes)

                results[collection_name] = {
                    "status": "success",
                    "indexes_created": len(created),
                    "index_names": created
                }

                logger.debug(f"Created {len(created)} indexes for {collection_name}")

            except Exception as e:
                results[collection_name] = {
                    "status": "error",
                    "error": str(e)
                }
                logger.warning(f"Failed to create indexes for {collection_name}: {e}")

        elapsed = time.time() - start_time
        logger.info(f"Index initialization completed in {elapsed:.2f}s")

        return results

    @classmethod
    async def get_index_stats(cls, db: AsyncIOMotorDatabase) -> Dict[str, Any]:
        """Get statistics about current indexes."""
        stats = {}

        for collection_name in cls.INDEXES.keys():
            try:
                collection = db[collection_name]
                indexes = await collection.index_information()
                stats[collection_name] = {
                    "index_count": len(indexes),
                    "indexes": list(indexes.keys())
                }
            except Exception as e:
                stats[collection_name] = {"error": str(e)}

        return stats


# ============================================================================
# IN-MEMORY CACHING LAYER
# ============================================================================

class LRUCache(Generic[T]):
    """
    Thread-safe LRU cache with TTL support.
    Suitable for caching database results, computed values, etc.
    """

    def __init__(self, max_size: int = 1000, default_ttl: int = 300):
        """
        Initialize the cache.

        Args:
            max_size: Maximum number of items to store
            default_ttl: Default time-to-live in seconds
        """
        self._cache: OrderedDict[str, Dict[str, Any]] = OrderedDict()
        self._max_size = max_size
        self._default_ttl = default_ttl
        self._hits = 0
        self._misses = 0
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[T]:
        """Get item from cache."""
        async with self._lock:
            if key not in self._cache:
                self._misses += 1
                return None

            item = self._cache[key]

            # Check TTL
            if item["expires_at"] < time.time():
                del self._cache[key]
                self._misses += 1
                return None

            # Move to end (most recently used)
            self._cache.move_to_end(key)
            self._hits += 1

            return item["value"]

    async def set(self, key: str, value: T, ttl: Optional[int] = None) -> None:
        """Set item in cache."""
        async with self._lock:
            ttl = ttl or self._default_ttl
            expires_at = time.time() + ttl

            # Remove oldest if at capacity
            while len(self._cache) >= self._max_size:
                self._cache.popitem(last=False)

            self._cache[key] = {
                "value": value,
                "expires_at": expires_at,
                "created_at": time.time()
            }

    async def delete(self, key: str) -> bool:
        """Delete item from cache."""
        async with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False

    async def clear(self) -> None:
        """Clear all items from cache."""
        async with self._lock:
            self._cache.clear()

    async def clear_pattern(self, pattern: str) -> int:
        """Clear items matching pattern (prefix match)."""
        async with self._lock:
            keys_to_delete = [k for k in self._cache.keys() if k.startswith(pattern)]
            for key in keys_to_delete:
                del self._cache[key]
            return len(keys_to_delete)

    def stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        total = self._hits + self._misses
        hit_rate = (self._hits / total * 100) if total > 0 else 0

        return {
            "size": len(self._cache),
            "max_size": self._max_size,
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": f"{hit_rate:.1f}%"
        }


# Global cache instance
_cache = LRUCache(max_size=2000, default_ttl=300)


def get_cache() -> LRUCache:
    """Get the global cache instance."""
    return _cache


def cache_key(*args, **kwargs) -> str:
    """Generate a cache key from arguments."""
    key_data = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True, default=str)
    return hashlib.md5(key_data.encode()).hexdigest()


def cached(ttl: int = 300, key_prefix: str = ""):
    """
    Decorator to cache function results.

    Usage:
        @cached(ttl=60, key_prefix="members")
        async def get_members(church_id: str):
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            full_key = f"{key_prefix}:{cache_key(*args, **kwargs)}"

            # Try to get from cache
            cache = get_cache()
            result = await cache.get(full_key)

            if result is not None:
                return result

            # Execute function and cache result
            result = await func(*args, **kwargs)
            await cache.set(full_key, result, ttl)

            return result
        return wrapper
    return decorator


async def invalidate_cache(pattern: str) -> int:
    """Invalidate cache entries matching pattern."""
    cache = get_cache()
    return await cache.clear_pattern(pattern)


# ============================================================================
# QUERY OPTIMIZATION HELPERS
# ============================================================================

class QueryOptimizer:
    """Helpers for optimizing database queries."""

    @staticmethod
    def paginate_params(
        page: int = 1,
        page_size: int = 50,
        max_page_size: int = 500
    ) -> Dict[str, int]:
        """
        Calculate pagination parameters.

        Returns:
            Dict with skip and limit values
        """
        page = max(1, page)
        page_size = min(max(1, page_size), max_page_size)

        return {
            "skip": (page - 1) * page_size,
            "limit": page_size
        }

    @staticmethod
    async def batch_lookup(
        db: AsyncIOMotorDatabase,
        collection: str,
        ids: List[str],
        id_field: str = "id",
        projection: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Batch lookup to avoid N+1 queries.

        Args:
            db: Database instance
            collection: Collection name
            ids: List of IDs to fetch
            id_field: Field name for ID (default "id")
            projection: Fields to return

        Returns:
            Dict mapping ID to document
        """
        if not ids:
            return {}

        # Deduplicate IDs
        unique_ids = list(set(ids))

        # Fetch all at once
        cursor = db[collection].find(
            {id_field: {"$in": unique_ids}},
            projection
        )

        # Build lookup dict
        result = {}
        async for doc in cursor:
            result[doc.get(id_field)] = doc

        return result

    @staticmethod
    async def count_with_estimate(
        db: AsyncIOMotorDatabase,
        collection: str,
        query: Dict,
        threshold: int = 10000
    ) -> int:
        """
        Get count with estimated count for large collections.
        Uses estimated_document_count for better performance on large collections.
        """
        coll = db[collection]

        # If query is simple (just church_id), use estimated count for large collections
        if len(query) <= 1:
            estimated = await coll.estimated_document_count()
            if estimated > threshold:
                # For large collections, do exact count only if needed
                return estimated

        return await coll.count_documents(query)


# ============================================================================
# RESPONSE OPTIMIZATION
# ============================================================================

# MongoDB projection dictionaries for list queries
# Use these to reduce data transfer when full documents aren't needed

class Projections:
    """
    MongoDB projection dictionaries for optimized list queries.

    Usage:
        from utils.performance import Projections

        # For member lists (excludes large fields like photo_base64, documents)
        members = await db.members.find(query, Projections.MEMBER_LIST).to_list(100)

        # For event lists (excludes description, seat_layout)
        events = await db.events.find(query, Projections.EVENT_LIST).to_list(100)
    """

    # Member list - excludes large fields (documents, custom_fields, face_descriptors)
    # Note: has_face_descriptors is computed via aggregation in routes/members.py
    # Note: photo_base64 included for legacy compatibility (members without photo_url)
    MEMBER_LIST = {
        "_id": 0,
        "id": 1,
        "church_id": 1,
        "full_name": 1,
        "first_name": 1,
        "last_name": 1,
        "email": 1,
        "phone_whatsapp": 1,
        "gender": 1,
        "date_of_birth": 1,
        "address": 1,
        "marital_status": 1,
        "baptism_date": 1,
        "member_status": 1,
        "membership_status": 1,
        "demographic_category": 1,
        "is_active": 1,
        "created_at": 1,
        "updated_at": 1,
        "photo_url": 1,           # Preferred: SeaweedFS URL
        "photo_thumbnail_url": 1,
        "photo_base64": 1,        # Legacy: base64 encoded photo
        "personal_id_code": 1,
        "face_checkin_enabled": 1,  # Boolean for face check-in feature toggle
        # Trash bin fields - needed for deleted members list
        "deleted_at": 1,
        "deleted_by": 1,
        "is_deleted": 1,
    }

    # Member card - minimal fields for cards/avatars
    MEMBER_CARD = {
        "_id": 0,
        "id": 1,
        "full_name": 1,
        "photo_url": 1,
        "photo_thumbnail_url": 1,
        "member_status": 1,
    }

    # Event list - excludes description, seat_layout, full RSVP/attendance lists
    EVENT_LIST = {
        "_id": 0,
        "id": 1,
        "church_id": 1,
        "name": 1,
        "event_type": 1,
        "event_date": 1,
        "event_end_date": 1,
        "location": 1,
        "event_photo": 1,
        "event_category_id": 1,
        "is_active": 1,
        "requires_rsvp": 1,
        "enable_seat_selection": 1,
        "seat_layout_id": 1,
        "seat_capacity": 1,
        "reservation_start": 1,
        "reservation_end": 1,
        "sessions": 1,
        "created_at": 1,
        "updated_at": 1,
    }

    # Article list - excludes full content
    ARTICLE_LIST = {
        "_id": 0,
        "id": 1,
        "church_id": 1,
        "title": 1,
        "slug": 1,
        "excerpt": 1,
        "featured_image": 1,
        "category_ids": 1,
        "tag_ids": 1,
        "status": 1,
        "publish_date": 1,
        "scheduled_publish_date": 1,
        "schedule_status": 1,
        "reading_time": 1,
        "views_count": 1,
        "allow_comments": 1,
        "created_by": 1,
        "updated_by": 1,
        "created_at": 1,
        "updated_at": 1,
    }

    # Community/Group list - excludes member list
    COMMUNITY_LIST = {
        "_id": 0,
        "id": 1,
        "church_id": 1,
        "name": 1,
        "description": 1,
        "cover_image": 1,
        "category": 1,
        "meeting_schedule": 1,
        "location": 1,
        "leader_member_ids": 1,
        "leader_member_id": 1,  # Backward compat
        "leader_name": 1,  # Backward compat
        "is_active": 1,
        "created_at": 1,
        "updated_at": 1,
    }


class ResponseOptimizer:
    """Helpers for optimizing API responses."""

    @staticmethod
    def slim_member(member: Dict) -> Dict:
        """Return slimmed down member data for lists."""
        return {
            "id": member.get("id"),
            "first_name": member.get("first_name"),
            "last_name": member.get("last_name"),
            "email": member.get("email"),
            "phone": member.get("phone"),
            "status": member.get("status"),
            "membership_status": member.get("membership_status"),
            "profile_picture": member.get("profile_picture"),
        }

    @staticmethod
    def slim_event(event: Dict) -> Dict:
        """Return slimmed down event data for lists."""
        return {
            "id": event.get("id"),
            "name": event.get("name"),
            "event_type": event.get("event_type"),
            "event_date": event.get("event_date"),
            "event_end_date": event.get("event_end_date"),
            "location": event.get("location"),
            "event_photo": event.get("event_photo"),
            "event_category_id": event.get("event_category_id"),
            "is_active": event.get("is_active"),
            "requires_rsvp": event.get("requires_rsvp"),
        }

    @staticmethod
    def add_cache_headers(
        response,
        max_age: int = 0,
        private: bool = True,
        etag: Optional[str] = None
    ):
        """Add caching headers to response."""
        cache_control = "private" if private else "public"
        if max_age > 0:
            cache_control += f", max-age={max_age}"
        else:
            cache_control += ", no-cache"

        response.headers["Cache-Control"] = cache_control

        if etag:
            response.headers["ETag"] = f'"{etag}"'

        return response


# ============================================================================
# PERFORMANCE MONITORING
# ============================================================================

class PerformanceMonitor:
    """Simple performance monitoring utilities."""

    _query_times: List[float] = []
    _max_stored = 1000

    @classmethod
    def record_query_time(cls, duration: float):
        """Record a query execution time."""
        cls._query_times.append(duration)
        if len(cls._query_times) > cls._max_stored:
            cls._query_times.pop(0)

    @classmethod
    def get_stats(cls) -> Dict[str, Any]:
        """Get performance statistics."""
        if not cls._query_times:
            return {"message": "No queries recorded"}

        times = cls._query_times
        return {
            "query_count": len(times),
            "avg_ms": sum(times) / len(times) * 1000,
            "max_ms": max(times) * 1000,
            "min_ms": min(times) * 1000,
            "p95_ms": sorted(times)[int(len(times) * 0.95)] * 1000 if len(times) > 20 else None,
        }


def timed_query(func):
    """Decorator to time database queries."""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start = time.time()
        try:
            return await func(*args, **kwargs)
        finally:
            duration = time.time() - start
            PerformanceMonitor.record_query_time(duration)
            if duration > 1.0:  # Log slow queries (>1s)
                logger.warning(f"Slow query: {func.__name__} took {duration:.2f}s")
    return wrapper


# ============================================================================
# STARTUP INITIALIZATION
# ============================================================================

async def initialize_performance_optimizations(db: AsyncIOMotorDatabase) -> Dict[str, Any]:
    """
    Initialize all performance optimizations at startup.
    Call this from server.py startup event.
    """
    results = {
        "timestamp": datetime.utcnow().isoformat(),
        "optimizations": {}
    }

    # 1. Create indexes
    logger.info("Initializing database indexes...")
    index_results = await IndexManager.ensure_indexes(db)
    results["optimizations"]["indexes"] = {
        "status": "completed",
        "collections_processed": len(index_results),
        "details": index_results
    }

    # 2. Initialize cache
    cache = get_cache()
    results["optimizations"]["cache"] = {
        "status": "initialized",
        "max_size": cache._max_size,
        "default_ttl": cache._default_ttl
    }

    logger.info("Performance optimizations initialized successfully")
    return results
