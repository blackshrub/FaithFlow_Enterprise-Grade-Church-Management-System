from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase, AsyncIOMotorClient
import os
import hashlib
import json
import logging

from .security import decode_access_token, create_access_token
from utils.tenant_utils import get_session_church_id_from_user

logger = logging.getLogger(__name__)

# Security scheme
security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)

# MongoDB connection will be lazy-loaded
_db_instance = None

# JWT cache TTL (5 minutes - balance between performance and security)
JWT_CACHE_TTL = 300


async def _get_redis():
    """Get Redis connection for JWT caching."""
    try:
        from config.redis import get_redis
        return await get_redis()
    except Exception:
        return None


def _token_hash(token: str) -> str:
    """Generate hash of token for cache key (avoid storing raw tokens)."""
    return hashlib.sha256(token.encode()).hexdigest()[:32]


async def _get_cached_user(token_hash: str):
    """Get cached user data from Redis."""
    redis = await _get_redis()
    if redis:
        try:
            data = await redis.get(f"faithflow:jwt:{token_hash}")
            if data:
                return json.loads(data)
        except Exception as e:
            logger.debug(f"JWT cache get error: {e}")
    return None


async def _cache_user(token_hash: str, user_data: dict):
    """Cache user data in Redis."""
    redis = await _get_redis()
    if redis:
        try:
            # Don't cache sensitive fields
            cache_data = {k: v for k, v in user_data.items() if k not in ["db_user"]}
            await redis.set(
                f"faithflow:jwt:{token_hash}",
                json.dumps(cache_data, default=str),
                ex=JWT_CACHE_TTL
            )
        except Exception as e:
            logger.debug(f"JWT cache set error: {e}")


async def get_db() -> AsyncIOMotorDatabase:
    """Get database instance (lazy-loaded)"""
    global _db_instance
    if _db_instance is None:
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        client = AsyncIOMotorClient(mongo_url)
        _db_instance = client[os.environ.get('DB_NAME', 'church_management')]

    return _db_instance


async def get_current_member(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    database: AsyncIOMotorDatabase = Depends(get_db)
) -> dict:
    """Get current authenticated mobile member from JWT token.

    This expects a member JWT where `sub` is the member id and `church_id` is present.
    """
    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    member_id: str = payload.get("sub")
    church_id: str = payload.get("church_id")
    if not member_id or not church_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid member authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    member = await database.members.find_one(
        {"id": member_id, "church_id": church_id},
        {"_id": 0},
    )
    if member is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Member not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Attach church_id so downstream logic can reuse it
    member["church_id"] = church_id
    return member


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    database: AsyncIOMotorDatabase = Depends(get_db)
) -> dict:
    """Get current authenticated user from JWT token (supports both users and API keys).

    Uses Redis caching to avoid database lookups on every request.
    Cache TTL: 5 minutes (balance between performance and security).
    """
    token = credentials.credentials

    # Check cache first
    token_h = _token_hash(token)
    cached_user = await _get_cached_user(token_h)
    if cached_user:
        return cached_user

    # Cache miss - decode and validate token
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str = payload.get("sub")
    token_type: str = payload.get("type")  # 'user' or 'api_key'

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Handle API key authentication
    if token_type == "api_key":
        # Get API key from database
        api_key = await database.api_keys.find_one({"id": user_id}, {"_id": 0})
        if api_key is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="API key not found",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not api_key.get("is_active", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="API key is inactive"
            )

        # Return API key as user object - merge with payload
        result = {
            **payload,           # Keep JWT fields (exp, iat, etc.)
            "id": api_key.get("id"),
            "email": api_key.get("api_username"),
            "full_name": f"API: {api_key.get('name')}",
            "role": "admin",  # API keys have admin access
            "church_id": api_key.get("church_id"),
            "session_church_id": api_key.get("church_id"),  # API keys use their assigned church
            "type": "api_key",
            "is_active": True,
            "db_user": api_key
        }

        # Cache the result
        await _cache_user(token_h, result)
        return result

    # Handle regular user authentication
    user = await database.users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    # CRITICAL: Merge JWT payload with DB user
    # JWT payload contains session_church_id which MUST be preserved!
    merged_user = {
        **user,              # DB user fields
        **payload,           # JWT payload OVERRIDES (includes session_church_id!)
        "db_user": user,     # Keep original DB user for reference
    }

    # Cache the result
    await _cache_user(token_h, merged_user)

    return merged_user


async def require_admin(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Require admin or super_admin role"""
    if current_user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


async def require_super_admin(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Require super_admin role"""
    if current_user.get("role") != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    return current_user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional),
    database: AsyncIOMotorDatabase = Depends(get_db)
) -> Optional[dict]:
    """Get current user if token provided, None otherwise (for public endpoints)."""
    if not credentials:
        return None

    try:
        token = credentials.credentials
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        token_type = payload.get("type", "user")

        if token_type == "api_key":
            api_key = await database.api_keys.find_one({"id": user_id}, {"_id": 0})
            return api_key if api_key and api_key.get("is_active") else None
        else:
            user = await database.users.find_one({"id": user_id}, {"_id": 0})
            return user if user and user.get("is_active") else None
    except:
        return None


def get_session_church_id(current_user: dict = Depends(get_current_user)) -> str:
    """Get session-scoped church_id from JWT token.

    Wrapper around get_session_church_id_from_user that works with FastAPI Depends.
    """
    return get_session_church_id_from_user(current_user)
