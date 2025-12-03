"""
FaithFlow Redis Services

Provides Redis-backed services for:
- Faith Assistant: Session cache, conversation summaries, intent classification, settings
- Authentication: JWT cache, login rate limiting, session management
- Real-time: Online presence, unread counts, typing indicators
- Performance: Distributed caching, rate limiting, locks
- Gamification: Leaderboards, streak tracking
- Pub/Sub: Distributed cache invalidation across instances
"""

from .utils import redis_key, parse_redis_url
from .session_cache import SessionCache, session_cache
from .summary_store import SummaryStore, summary_store
from .intent_cache import IntentCache, intent_cache
from .settings_store import SettingsStore, settings_store
from .rate_limit import RateLimiter, rate_limiter
from .cache import RedisCache, redis_cache
from .locks import DistributedLock, distributed_lock
from .auth import AuthRedis, auth_redis
from .presence import PresenceService, presence_service
from .leaderboard import LeaderboardService, leaderboard_service
from .pubsub import (
    PubSubService,
    pubsub_service,
    InvalidationType,
    register_default_handlers,
    invalidate_church_cache,
    invalidate_on_settings_change,
    invalidate_on_member_change,
    invalidate_user_sessions,
)
from .queues import (
    JobQueue,
    job_queue,
    Job,
    JobStatus,
    JobPriority,
    QueueType,
    enqueue_ai_job,
    enqueue_webhook_job,
    enqueue_notification_job,
    enqueue_whatsapp_job,
    get_queue_stats,
)

__all__ = [
    # Utilities
    "redis_key",
    "parse_redis_url",
    # Faith Assistant
    "SessionCache",
    "session_cache",
    "SummaryStore",
    "summary_store",
    "IntentCache",
    "intent_cache",
    "SettingsStore",
    "settings_store",
    # Rate Limiting
    "RateLimiter",
    "rate_limiter",
    # Caching
    "RedisCache",
    "redis_cache",
    # Locks
    "DistributedLock",
    "distributed_lock",
    # Auth
    "AuthRedis",
    "auth_redis",
    # Real-time
    "PresenceService",
    "presence_service",
    # Leaderboards
    "LeaderboardService",
    "leaderboard_service",
    # Pub/Sub
    "PubSubService",
    "pubsub_service",
    "InvalidationType",
    "register_default_handlers",
    "invalidate_church_cache",
    "invalidate_on_settings_change",
    "invalidate_on_member_change",
    "invalidate_user_sessions",
    # Job Queues
    "JobQueue",
    "job_queue",
    "Job",
    "JobStatus",
    "JobPriority",
    "QueueType",
    "enqueue_ai_job",
    "enqueue_webhook_job",
    "enqueue_notification_job",
    "enqueue_whatsapp_job",
    "get_queue_stats",
]
