"""Input validation and sanitization utilities."""
import re
from datetime import datetime
from typing import Optional
from fastapi import HTTPException, status


def sanitize_regex_pattern(pattern: str, max_length: int = 100) -> str:
    """Sanitize user-provided regex patterns to prevent ReDoS attacks.

    Args:
        pattern: User-provided search pattern
        max_length: Maximum allowed pattern length

    Returns:
        str: Sanitized pattern safe for regex use

    Raises:
        HTTPException: If pattern is too long or contains dangerous patterns
    """
    if not pattern:
        return ""

    # Limit pattern length to prevent ReDoS
    if len(pattern) > max_length:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "INVALID_SEARCH", "message": f"Search pattern too long (max {max_length} characters)"}
        )

    # Escape special regex characters for simple text search
    # This prevents ReDoS attacks like (a+)+$ or (a|a)*b
    escaped_pattern = re.escape(pattern)

    return escaped_pattern


def validate_pagination(skip: int, limit: int, max_limit: int = 200) -> tuple[int, int]:
    """Validate and sanitize pagination parameters.

    Args:
        skip: Number of records to skip
        limit: Number of records to return
        max_limit: Maximum allowed limit

    Returns:
        tuple: Validated (skip, limit)

    Raises:
        HTTPException: If parameters are invalid
    """
    if skip < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "INVALID_PAGINATION", "message": "Skip must be non-negative"}
        )

    if limit < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "INVALID_PAGINATION", "message": "Limit must be at least 1"}
        )

    if limit > max_limit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "INVALID_PAGINATION", "message": f"Limit cannot exceed {max_limit}"}
        )

    return skip, limit


def validate_date_range(start_date: Optional[str], end_date: Optional[str]) -> tuple[Optional[datetime], Optional[datetime]]:
    """Validate and parse date range parameters.

    Args:
        start_date: ISO format start date string
        end_date: ISO format end date string

    Returns:
        tuple: Parsed (start_datetime, end_datetime)

    Raises:
        HTTPException: If dates are invalid or end_date < start_date
    """
    start_dt = None
    end_dt = None

    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error_code": "INVALID_DATE", "message": "Invalid start_date format (use ISO 8601)"}
            )

    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date)
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error_code": "INVALID_DATE", "message": "Invalid end_date format (use ISO 8601)"}
            )

    # Validate that end_date is after start_date
    if start_dt and end_dt and end_dt < start_dt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "INVALID_DATE_RANGE", "message": "end_date must be after start_date"}
        )

    return start_dt, end_dt


def sanitize_mongo_query(query_dict: dict) -> dict:
    """Sanitize MongoDB query to prevent NoSQL injection.

    Args:
        query_dict: User-provided query parameters

    Returns:
        dict: Sanitized query dict

    Raises:
        HTTPException: If dangerous operators detected
    """
    # List of dangerous MongoDB operators that should not be in user queries
    dangerous_operators = ["$where", "$expr", "$function", "$accumulator"]

    def check_dict(d: dict, path: str = ""):
        for key, value in d.items():
            current_path = f"{path}.{key}" if path else key

            # Check for dangerous operators
            if key in dangerous_operators:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"error_code": "FORBIDDEN_OPERATOR", "message": f"Operator {key} not allowed"}
                )

            # Recursively check nested dicts
            if isinstance(value, dict):
                check_dict(value, current_path)
            elif isinstance(value, list):
                for item in value:
                    if isinstance(item, dict):
                        check_dict(item, current_path)

    check_dict(query_dict)
    return query_dict


def validate_email(email: str) -> str:
    """Validate and normalize email address.

    Args:
        email: Email address string

    Returns:
        str: Normalized email (lowercase, stripped)

    Raises:
        HTTPException: If email format is invalid
    """
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "INVALID_EMAIL", "message": "Email is required"}
        )

    # Simple email validation regex
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

    email = email.strip().lower()

    if not re.match(email_pattern, email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "INVALID_EMAIL", "message": "Invalid email format"}
        )

    return email


def validate_phone(phone: str) -> str:
    """Validate phone number format.

    Args:
        phone: Phone number string

    Returns:
        str: Validated phone number

    Raises:
        HTTPException: If phone format is invalid
    """
    if not phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "INVALID_PHONE", "message": "Phone number is required"}
        )

    # Remove all non-digit characters
    cleaned = ''.join(c for c in phone if c.isdigit() or c == '+')

    # Must have at least 10 digits
    digits = ''.join(c for c in cleaned if c.isdigit())
    if len(digits) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "INVALID_PHONE", "message": "Phone number must have at least 10 digits"}
        )

    return cleaned
