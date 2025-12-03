"""
Redis Utility Functions

Provides helper functions for Redis key management and common operations.
"""

import os
from typing import Optional, Tuple
from urllib.parse import urlparse


# Default key prefix for FaithFlow
DEFAULT_PREFIX = os.getenv("REDIS_KEY_PREFIX", "faithflow")


def redis_key(*parts: str, prefix: str = None) -> str:
    """
    Build a namespaced Redis key from parts.

    Joins all parts with colons to create a hierarchical key structure.
    This helps organize keys and prevent collisions.

    Args:
        *parts: Key segments to join
        prefix: Optional prefix (defaults to "faithflow")

    Returns:
        str: Namespaced key like "faithflow:faith_assistant:session:user123"

    Examples:
        >>> redis_key("faith_assistant", "session", "user123")
        'faithflow:faith_assistant:session:user123'

        >>> redis_key("cache", "church_settings", "church456")
        'faithflow:cache:church_settings:church456'

        >>> redis_key("rate_limit", "api", "ip:192.168.1.1")
        'faithflow:rate_limit:api:ip:192.168.1.1'
    """
    key_prefix = prefix or DEFAULT_PREFIX
    filtered_parts = [p for p in parts if p]  # Remove empty parts

    if not filtered_parts:
        return key_prefix

    return ":".join([key_prefix, *filtered_parts])


def church_key(church_id: str, *parts: str) -> str:
    """
    Build a church-scoped Redis key.

    All keys are scoped by church_id for multi-tenant isolation.

    Args:
        church_id: The church identifier
        *parts: Additional key segments

    Returns:
        str: Church-scoped key like "faithflow:church:abc123:members:cache"

    Examples:
        >>> church_key("abc123", "members", "cache")
        'faithflow:church:abc123:members:cache'

        >>> church_key("abc123", "settings")
        'faithflow:church:abc123:settings'
    """
    return redis_key("church", church_id, *parts)


def user_key(user_id: str, *parts: str) -> str:
    """
    Build a user-scoped Redis key.

    Args:
        user_id: The user identifier
        *parts: Additional key segments

    Returns:
        str: User-scoped key like "faithflow:user:user123:session"

    Examples:
        >>> user_key("user123", "session")
        'faithflow:user:user123:session'

        >>> user_key("user123", "faith_assistant", "summary")
        'faithflow:user:user123:faith_assistant:summary'
    """
    return redis_key("user", user_id, *parts)


def member_key(member_id: str, *parts: str) -> str:
    """
    Build a member-scoped Redis key.

    Args:
        member_id: The member identifier
        *parts: Additional key segments

    Returns:
        str: Member-scoped key like "faithflow:member:mem123:presence"

    Examples:
        >>> member_key("mem123", "presence")
        'faithflow:member:mem123:presence'

        >>> member_key("mem123", "unread", "messages")
        'faithflow:member:mem123:unread:messages'
    """
    return redis_key("member", member_id, *parts)


def parse_redis_url(url: str) -> Tuple[str, int, Optional[str], int]:
    """
    Parse a Redis URL into components.

    Args:
        url: Redis URL like "redis://user:password@host:port/db"

    Returns:
        Tuple of (host, port, password, db)

    Examples:
        >>> parse_redis_url("redis://localhost:6379")
        ('localhost', 6379, None, 0)

        >>> parse_redis_url("redis://:mypassword@redis.example.com:6379/1")
        ('redis.example.com', 6379, 'mypassword', 1)
    """
    parsed = urlparse(url)

    host = parsed.hostname or "localhost"
    port = parsed.port or 6379
    password = parsed.password
    db = int(parsed.path.lstrip("/") or 0)

    return host, port, password, db


def ttl_seconds(
    seconds: int = 0,
    minutes: int = 0,
    hours: int = 0,
    days: int = 0,
) -> int:
    """
    Calculate TTL in seconds from time units.

    Args:
        seconds: Number of seconds
        minutes: Number of minutes
        hours: Number of hours
        days: Number of days

    Returns:
        int: Total seconds

    Examples:
        >>> ttl_seconds(hours=2)
        7200

        >>> ttl_seconds(days=1, hours=12)
        129600

        >>> ttl_seconds(minutes=30)
        1800
    """
    return seconds + (minutes * 60) + (hours * 3600) + (days * 86400)


# Common TTL presets
class TTL:
    """Common TTL values in seconds."""

    # Short-lived
    SECONDS_30 = 30
    MINUTE_1 = 60
    MINUTES_5 = 300
    MINUTES_10 = 600
    MINUTES_15 = 900
    MINUTES_30 = 1800

    # Standard
    HOUR_1 = 3600
    HOURS_2 = 7200
    HOURS_4 = 14400
    HOURS_8 = 28800
    HOURS_12 = 43200

    # Long-lived
    DAY_1 = 86400
    DAYS_7 = 604800
    DAYS_14 = 1209600
    DAYS_30 = 2592000

    # Faith Assistant specific
    SESSION = HOURS_2           # 2 hours for active conversations
    SUMMARY = DAY_1             # 24 hours for conversation summaries
    INTENT = HOUR_1             # 1 hour for intent classification
    USER_SETTINGS = DAYS_7      # 7 days for user preferences

    # Auth specific
    JWT_CACHE = MINUTES_30      # Cache validated JWTs
    LOGIN_ATTEMPTS = MINUTES_15  # Track failed login attempts
    OTP_RATE_LIMIT = HOUR_1     # OTP request limiting
    SESSION_WEB = DAY_1         # Web session duration
    REFRESH_TOKEN = DAYS_30     # Refresh token storage

    # Cache specific
    CHURCH_SETTINGS = MINUTES_10  # Church settings cache
    MEMBER_STATUSES = MINUTES_30  # Member statuses list
    DEMOGRAPHICS = MINUTES_30     # Demographics list
    STATIC_CONTENT = HOUR_1       # Static content cache

    # Real-time specific
    PRESENCE = SECONDS_30       # Online presence heartbeat
    TYPING = 5                  # Typing indicator
    UNREAD = MINUTES_5          # Unread counts cache

    # Locks
    LOCK_DEFAULT = MINUTES_5    # Default lock timeout
    LOCK_LONG = MINUTES_30      # Long-running operations


def sanitize_key_part(part: str) -> str:
    """
    Sanitize a string for use in Redis keys.

    Removes or replaces characters that could cause issues in keys.

    Args:
        part: The string to sanitize

    Returns:
        str: Sanitized string safe for use in keys

    Examples:
        >>> sanitize_key_part("user@email.com")
        'user_email.com'

        >>> sanitize_key_part("hello world")
        'hello_world'
    """
    # Replace problematic characters
    replacements = {
        "@": "_",
        " ": "_",
        "\n": "",
        "\r": "",
        "\t": "_",
    }

    result = part
    for old, new in replacements.items():
        result = result.replace(old, new)

    return result
