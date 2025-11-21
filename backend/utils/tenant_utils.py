from fastapi import Request, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

# Import get_current_user (avoiding circular import)
def get_current_user():
    from utils.dependencies import get_current_user as _get_current_user
    return _get_current_user



def get_current_church_id(current_user: dict) -> str:
    """Get church_id from current user (for backward compatibility).
    
    Deprecated: Use get_session_church_id instead for session-scoped access.
    """
    return current_user.get("church_id") or current_user.get("session_church_id")


def get_session_church_id(current_user: dict = Depends(get_current_user)) -> str:
    """Get session-scoped church_id from JWT token.
    
    This is the church the user is currently operating in:
    - For super_admin: The church they selected at login
    - For regular users: Their assigned church_id
    
    Use this instead of get_current_church_id for all tenant filtering.
    """
    session_church_id = current_user.get("session_church_id")
    
    if not session_church_id:
        # Fallback for backward compatibility
        session_church_id = current_user.get("church_id")
    
    if not session_church_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No active church context. Please logout and login again to refresh your session."
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
