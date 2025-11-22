"""Rate limiting utilities for API endpoints."""
from collections import defaultdict
from datetime import datetime, timedelta
from fastapi import HTTPException, status, Request
from typing import Dict, Tuple
import asyncio


class RateLimiter:
    """Simple in-memory rate limiter for API endpoints.

    For production, consider using Redis-backed rate limiting (slowapi + redis).
    """

    def __init__(self):
        # Store: {key: [(timestamp, count), ...]}
        self._requests: Dict[str, list] = defaultdict(list)
        self._lock = asyncio.Lock()

    async def check_rate_limit(
        self,
        key: str,
        max_requests: int = 10,
        window_seconds: int = 60
    ) -> Tuple[bool, int, int]:
        """Check if request is within rate limit.

        Args:
            key: Unique identifier (IP, user_id, etc.)
            max_requests: Maximum requests allowed in window
            window_seconds: Time window in seconds

        Returns:
            tuple: (is_allowed, remaining_requests, reset_time_seconds)

        Raises:
            HTTPException: If rate limit exceeded
        """
        async with self._lock:
            now = datetime.now()
            cutoff = now - timedelta(seconds=window_seconds)

            # Clean old entries
            self._requests[key] = [
                req for req in self._requests[key]
                if req > cutoff
            ]

            # Count current requests
            current_count = len(self._requests[key])

            if current_count >= max_requests:
                # Rate limit exceeded
                oldest_request = min(self._requests[key]) if self._requests[key] else now
                reset_time = int((oldest_request + timedelta(seconds=window_seconds) - now).total_seconds())

                return False, 0, reset_time

            # Add new request
            self._requests[key].append(now)

            remaining = max_requests - (current_count + 1)
            return True, remaining, window_seconds

    async def cleanup_old_entries(self, max_age_hours: int = 1):
        """Clean up entries older than max_age_hours.

        Should be called periodically to prevent memory bloat.
        """
        async with self._lock:
            cutoff = datetime.now() - timedelta(hours=max_age_hours)
            keys_to_remove = []

            for key, requests in self._requests.items():
                # Filter out old requests
                self._requests[key] = [req for req in requests if req > cutoff]
                # Mark empty keys for removal
                if not self._requests[key]:
                    keys_to_remove.append(key)

            # Remove empty keys
            for key in keys_to_remove:
                del self._requests[key]


# Global rate limiter instance
rate_limiter = RateLimiter()


async def rate_limit_check(
    request: Request,
    max_requests: int = 10,
    window_seconds: int = 60,
    key_func = None
):
    """Rate limiting dependency for FastAPI endpoints.

    Usage:
        @router.post("/endpoint")
        async def endpoint(
            request: Request,
            _: None = Depends(lambda r: rate_limit_check(r, max_requests=5, window_seconds=60))
        ):
            ...

    Args:
        request: FastAPI request object
        max_requests: Max requests per window
        window_seconds: Time window in seconds
        key_func: Function to extract key from request (defaults to client IP)
    """
    # Get unique key (default to IP address)
    if key_func is None:
        key = request.client.host if request.client else "unknown"
    else:
        key = key_func(request)

    is_allowed, remaining, reset_time = await rate_limiter.check_rate_limit(
        key=key,
        max_requests=max_requests,
        window_seconds=window_seconds
    )

    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error_code": "RATE_LIMIT_EXCEEDED",
                "message": f"Rate limit exceeded. Try again in {reset_time} seconds.",
                "retry_after": reset_time
            },
            headers={"Retry-After": str(reset_time)}
        )

    # Add rate limit headers to response
    return {
        "X-RateLimit-Limit": str(max_requests),
        "X-RateLimit-Remaining": str(remaining),
        "X-RateLimit-Reset": str(reset_time)
    }


def create_rate_limit_dependency(max_requests: int = 10, window_seconds: int = 60):
    """Create a rate limit dependency with specific limits.

    Usage:
        rate_limit_5_per_minute = create_rate_limit_dependency(max_requests=5, window_seconds=60)

        @router.post("/login", dependencies=[Depends(rate_limit_5_per_minute)])
        async def login(...):
            ...
    """
    async def dependency(request: Request):
        return await rate_limit_check(request, max_requests, window_seconds)

    return dependency


# Common rate limit presets
strict_rate_limit = create_rate_limit_dependency(max_requests=5, window_seconds=60)  # 5 req/min
moderate_rate_limit = create_rate_limit_dependency(max_requests=20, window_seconds=60)  # 20 req/min
relaxed_rate_limit = create_rate_limit_dependency(max_requests=60, window_seconds=60)  # 60 req/min
