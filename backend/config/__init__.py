"""
FaithFlow Configuration Module

Contains configuration for external services like Redis, etc.
"""

from .redis import (
    redis_client,
    get_redis,
    init_redis,
    close_redis,
    RedisConfig,
)

__all__ = [
    "redis_client",
    "get_redis",
    "init_redis",
    "close_redis",
    "RedisConfig",
]
