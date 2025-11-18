from typing import Optional, Dict, Any
from fastapi import HTTPException, status


def validate_pagination_params(
    limit: Optional[int] = None,
    offset: Optional[int] = None,
    max_limit: int = 200
) -> tuple[int, int]:
    """
    Validate and normalize pagination parameters.
    
    Args:
        limit: Items per page
        offset: Number of items to skip
        max_limit: Maximum allowed limit
    
    Returns:
        Tuple of (validated_limit, validated_offset)
    
    Raises:
        HTTPException: If pagination params are required but missing
    """
    if limit is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "PAGINATION_REQUIRED",
                "message": "Pagination parameters (limit and offset) are required"
            }
        )
    
    if offset is None:
        offset = 0
    
    # Validate limit
    if limit > max_limit:
        limit = max_limit
    
    if limit < 1:
        limit = 1
    
    # Validate offset
    if offset < 0:
        offset = 0
    
    return limit, offset


def build_pagination_response(
    data: list,
    total: int,
    limit: int,
    offset: int
) -> Dict[str, Any]:
    """
    Build standardized paginated response.
    
    Args:
        data: List of items for current page
        total: Total number of items
        limit: Items per page
        offset: Number of items skipped
    
    Returns:
        Paginated response dict
    """
    has_more = (offset + limit) < total
    
    return {
        "data": data,
        "pagination": {
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_more": has_more,
            "current_page": (offset // limit) + 1 if limit > 0 else 1,
            "total_pages": (total + limit - 1) // limit if limit > 0 else 1
        }
    }
