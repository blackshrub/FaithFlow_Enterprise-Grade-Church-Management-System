from fastapi import Request, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


def get_current_church_id(current_user: dict) -> str:
    """
    Extract church_id from current authenticated user.
    
    Args:
        current_user: User dict from JWT token
    
    Returns:
        church_id string
    
    Raises:
        HTTPException: If church_id not found
    """
    church_id = current_user.get('church_id')
    
    if not church_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "CHURCH_ACCESS_DENIED",
                "message": "Church ID not found in user token"
            }
        )
    
    return church_id


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
