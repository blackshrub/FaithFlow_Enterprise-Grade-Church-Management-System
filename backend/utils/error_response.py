from fastapi import HTTPException, status
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


def error_response(
    error_code: str,
    message: str,
    details: Optional[Dict[str, Any]] = None,
    status_code: int = status.HTTP_400_BAD_REQUEST
):
    """
    Create standardized error response for accounting module.
    
    Args:
        error_code: Machine-readable error code (for i18n lookup)
        message: Human-readable error message (English, will be translated by frontend)
        details: Optional additional details about the error
        status_code: HTTP status code
    
    Returns:
        HTTPException with structured error response
    """
    error_detail = {
        "error_code": error_code,
        "message": message
    }
    
    if details:
        error_detail["details"] = details
    
    logger.warning(f"Error response: {error_code} - {message}")
    
    raise HTTPException(
        status_code=status_code,
        detail=error_detail
    )


def validation_error(
    field: str,
    message: str,
    error_code: str = "VALIDATION_ERROR"
):
    """
    Create validation error response for a specific field.
    """
    return error_response(
        error_code=error_code,
        message=message,
        details={"field": field},
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY
    )


def not_found_error(resource: str, identifier: str = None):
    """Standardized 404 error response."""
    message = f"{resource} not found"
    if identifier:
        message += f": {identifier}"

    return error_response(
        error_code="NOT_FOUND",
        message=message,
        details={"resource": resource, "identifier": identifier} if identifier else {"resource": resource},
        status_code=status.HTTP_404_NOT_FOUND
    )


def forbidden_error(message: str = "Access forbidden"):
    """Standardized 403 error response."""
    return error_response(
        error_code="FORBIDDEN",
        message=message,
        status_code=status.HTTP_403_FORBIDDEN
    )


def conflict_error(resource: str, message: str = None):
    """Standardized 409 conflict error response."""
    return error_response(
        error_code="CONFLICT",
        message=message or f"{resource} already exists",
        details={"resource": resource},
        status_code=status.HTTP_409_CONFLICT
    )


def unauthorized_error(message: str = "Unauthorized"):
    """Standardized 401 error response."""
    return error_response(
        error_code="UNAUTHORIZED",
        message=message,
        status_code=status.HTTP_401_UNAUTHORIZED
    )


def bad_request_error(message: str, details: Optional[Dict[str, Any]] = None):
    """Standardized 400 bad request error response."""
    return error_response(
        error_code="BAD_REQUEST",
        message=message,
        details=details,
        status_code=status.HTTP_400_BAD_REQUEST
    )
