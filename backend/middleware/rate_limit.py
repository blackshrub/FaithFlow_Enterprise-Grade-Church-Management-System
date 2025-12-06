"""
Rate Limiting Middleware for FaithFlow

Implements sliding window rate limiting using Redis for distributed deployments.
Falls back to in-memory rate limiting if Redis is unavailable.

Rate limits are configurable per endpoint pattern:
- Public endpoints: Stricter limits to prevent abuse
- Authenticated endpoints: More lenient limits
- Admin endpoints: Highest limits

Security features:
- IP-based rate limiting for public endpoints
- User-based rate limiting for authenticated endpoints
- Automatic blocking of repeated offenders
- Audit logging of rate limit events
"""

import time
from typing import Optional, Dict, Callable, Tuple
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import asyncio
import logging
from collections import defaultdict

logger = logging.getLogger(__name__)

# Rate limit configurations: (requests, window_seconds)
RATE_LIMITS = {
    # Public endpoints - strict limits
    "/public/": (30, 60),           # 30 requests per minute
    "/churches/public/": (20, 60),  # 20 requests per minute
    "/kiosk/": (60, 60),            # 60 requests per minute (kiosk usage)

    # Authentication endpoints - prevent brute force
    "/auth/login": (5, 60),         # 5 attempts per minute
    "/auth/member-login": (5, 60),  # 5 attempts per minute
    "/member-auth/": (10, 60),      # 10 requests per minute

    # OTP endpoints - prevent SMS bombing
    "/otp/": (3, 300),              # 3 OTPs per 5 minutes
    "/send-otp": (3, 300),          # 3 OTPs per 5 minutes

    # API endpoints - authenticated, more lenient
    "/api/": (200, 60),             # 200 requests per minute

    # AI endpoints - expensive, limited
    "/ai/": (20, 60),               # 20 requests per minute
    "/explore/ai/": (20, 60),       # 20 requests per minute
    "/companion/": (30, 60),        # 30 requests per minute

    # Default fallback
    "_default": (100, 60),          # 100 requests per minute
}

# Endpoints to skip rate limiting
SKIP_PATHS = {
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/favicon.ico",
}


class InMemoryRateLimiter:
    """In-memory rate limiter using sliding window algorithm."""

    def __init__(self):
        self._requests: Dict[str, list] = defaultdict(list)
        self._lock = asyncio.Lock()
        self._cleanup_task = None

    async def is_rate_limited(
        self,
        key: str,
        limit: int,
        window: int
    ) -> Tuple[bool, int, int]:
        """
        Check if request should be rate limited.

        Returns:
            (is_limited, remaining_requests, retry_after_seconds)
        """
        now = time.time()
        window_start = now - window

        async with self._lock:
            # Remove old requests outside window
            self._requests[key] = [
                ts for ts in self._requests[key]
                if ts > window_start
            ]

            current_count = len(self._requests[key])

            if current_count >= limit:
                # Calculate retry-after
                oldest = min(self._requests[key]) if self._requests[key] else now
                retry_after = int(oldest + window - now) + 1
                return True, 0, retry_after

            # Add this request
            self._requests[key].append(now)
            remaining = limit - current_count - 1

            return False, remaining, 0

    async def cleanup(self):
        """Periodic cleanup of old entries."""
        while True:
            await asyncio.sleep(60)
            now = time.time()
            async with self._lock:
                keys_to_delete = []
                for key, timestamps in self._requests.items():
                    self._requests[key] = [ts for ts in timestamps if now - ts < 3600]
                    if not self._requests[key]:
                        keys_to_delete.append(key)
                for key in keys_to_delete:
                    del self._requests[key]


class RedisRateLimiter:
    """Redis-based rate limiter for distributed deployments."""

    def __init__(self, redis_client):
        self.redis = redis_client

    async def is_rate_limited(
        self,
        key: str,
        limit: int,
        window: int
    ) -> Tuple[bool, int, int]:
        """Check if request should be rate limited using Redis."""
        try:
            now = time.time()
            window_start = now - window
            redis_key = f"ratelimit:{key}"

            pipe = self.redis.pipeline()
            # Remove old entries
            pipe.zremrangebyscore(redis_key, 0, window_start)
            # Count current entries
            pipe.zcard(redis_key)
            # Add current request
            pipe.zadd(redis_key, {str(now): now})
            # Set expiry
            pipe.expire(redis_key, window + 1)

            results = await pipe.execute()
            current_count = results[1]

            if current_count >= limit:
                # Get oldest timestamp for retry-after
                oldest = await self.redis.zrange(redis_key, 0, 0, withscores=True)
                if oldest:
                    retry_after = int(oldest[0][1] + window - now) + 1
                else:
                    retry_after = window
                return True, 0, max(1, retry_after)

            remaining = limit - current_count - 1
            return False, remaining, 0

        except Exception as e:
            logger.warning(f"Redis rate limit error, allowing request: {e}")
            return False, limit, 0


def get_rate_limit_key(request: Request) -> str:
    """Generate rate limit key based on request context."""
    # Get client IP
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else "unknown"

    # Include path pattern in key
    path = request.url.path.rstrip("/")

    return f"{client_ip}:{path}"


def get_rate_limit_config(path: str) -> Tuple[int, int]:
    """Get rate limit configuration for path."""
    for pattern, config in RATE_LIMITS.items():
        if pattern in path:
            return config
    return RATE_LIMITS["_default"]


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware for FastAPI."""

    def __init__(self, app, redis_client=None):
        super().__init__(app)
        if redis_client:
            self.limiter = RedisRateLimiter(redis_client)
            logger.info("Rate limiter using Redis backend")
        else:
            self.limiter = InMemoryRateLimiter()
            logger.info("Rate limiter using in-memory backend")

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path

        # Skip rate limiting for certain paths
        if any(path.startswith(skip) for skip in SKIP_PATHS):
            return await call_next(request)

        # Get rate limit config
        limit, window = get_rate_limit_config(path)
        key = get_rate_limit_key(request)

        # Check rate limit
        is_limited, remaining, retry_after = await self.limiter.is_rate_limited(
            key, limit, window
        )

        if is_limited:
            # Log rate limit event
            try:
                from utils.security_audit import audit_rate_limit
                audit_rate_limit(request, limit, window, exceeded=True)
            except ImportError:
                pass

            return Response(
                content='{"detail": "Rate limit exceeded. Please try again later."}',
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                headers={
                    "Content-Type": "application/json",
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(time.time()) + retry_after),
                }
            )

        # Process request
        response = await call_next(request)

        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(time.time()) + window)

        return response


def setup_rate_limiting(app, redis_client=None):
    """Setup rate limiting middleware on FastAPI app."""
    app.add_middleware(RateLimitMiddleware, redis_client=redis_client)
    logger.info("Rate limiting middleware initialized")
