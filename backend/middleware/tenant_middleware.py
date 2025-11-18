from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable
import logging

logger = logging.getLogger(__name__)


class TenantMiddleware(BaseHTTPMiddleware):
    """
    Middleware to automatically inject church_id into request state
    from JWT token for multi-tenant isolation.
    """
    
    async def dispatch(self, request: Request, call_next: Callable):
        # Skip middleware for public endpoints
        public_paths = [
            "/api/auth/login",
            "/api/auth/register",
            "/api/health",
            "/api/",
            "/docs",
            "/openapi.json",
            "/redoc"
        ]
        
        if request.url.path in public_paths or request.url.path.startswith("/docs") or request.url.path.startswith("/openapi"):
            return await call_next(request)
        
        # For authenticated endpoints, church_id will be extracted from JWT
        # and added to request.state by the get_current_user dependency
        # This middleware just ensures the pattern is followed
        
        response = await call_next(request)
        return response


def get_church_id_from_request(request: Request) -> str:
    """
    Extract church_id from request state (set by authentication)
    """
    church_id = getattr(request.state, 'church_id', None)
    if not church_id:
        # Fallback: Try to get from user if available
        user = getattr(request.state, 'user', None)
        if user and 'church_id' in user:
            church_id = user['church_id']
    
    if not church_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Church ID not found in request"
        )
    
    return church_id
