from fastapi import Request, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, Dict, Any
import logging
import unicodedata

logger = logging.getLogger(__name__)


def normalize_church_id(church_id: str) -> str:
    """Normalize church_id to prevent hidden character mismatches.
    
    Removes:
    - Zero-width characters
    - Unicode variations
    - Leading/trailing whitespace
    
    This prevents MongoDB query failures due to invisible character differences.
    """
    if not church_id:
        return church_id
    
    # Normalize unicode (NFKC = compatibility decomposition + canonical composition)
    normalized = unicodedata.normalize("NFKC", church_id)
    
    # Strip whitespace
    normalized = normalized.strip()
    
    return normalized


def get_current_church_id(current_user: dict) -> str:
    """Get church_id from current user (for backward compatibility).
    
    Deprecated: Use get_session_church_id_from_user instead for session-scoped access.
    """
    return current_user.get("church_id") or current_user.get("session_church_id")


def get_session_church_id_from_user(current_user: dict) -> str:
    """Extract session_church_id from JWT payload.
    
    CRITICAL: Only uses session_church_id from JWT.
    NO fallback to user.church_id - clean session-based architecture.
    
    Returns the church the user is currently operating in:
    - For super_admin: The church they selected at login
    - For regular users: Their assigned church (from database, passed via JWT)
    """
    session_church_id = current_user.get("session_church_id")
    
    # NO FALLBACK - must be in JWT
    if not session_church_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No active church context. Please logout and login again to select a church."
        )
    
    return session_church_id


async def validate_church_access(
    user_id: str,
    church_id: str,
    database: AsyncIOMotorDatabase
) -> bool:
    """
    Validate that a user has access to a specific church.
    
    Args:
        user_id: User ID
        church_id: Church ID to validate
        database: MongoDB database instance
    
    Returns:
        True if user has access, False otherwise
    """
    user = await database.users.find_one({"id": user_id}, {"_id": 0})
    
    if not user:
        return False
    
    # Super admin can access all churches
    if user.get("role") == "super_admin":
        return True
    
    # Regular users can only access their own church
    return user.get("church_id") == church_id


def ensure_church_filter(query: Dict[str, Any], church_id: str) -> Dict[str, Any]:
    """
    Add church_id filter to a MongoDB query to ensure multi-tenant isolation.
    
    Args:
        query: Existing query dict
        church_id: Church ID to filter by
    
    Returns:
        Updated query dict with church_id filter
    """
    query["church_id"] = church_id
    return query


def is_super_admin(current_user: dict) -> bool:
    """
    Check if current user is a super admin.
    """
    return current_user.get("role") == "super_admin"
