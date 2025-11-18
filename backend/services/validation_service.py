from decimal import Decimal
from typing import Optional


def validate_fiscal_year(year: int) -> tuple[bool, Optional[str]]:
    """
    Validate fiscal year range.
    
    Args:
        year: Fiscal year
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    if year < 1900 or year > 2100:
        return False, "Fiscal year must be between 1900 and 2100"
    return True, None


def validate_numeric_precision(
    value: Decimal,
    max_digits: int = 18,
    decimal_places: int = 2
) -> tuple[bool, Optional[str]]:
    """
    Validate numeric precision.
    
    Args:
        value: Decimal value
        max_digits: Maximum total digits
        decimal_places: Maximum decimal places
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    # Convert to string and check
    value_str = str(value)
    parts = value_str.split('.')
    
    if len(parts[0]) > (max_digits - decimal_places):
        return False, f"Value exceeds maximum precision"
    
    if len(parts) > 1 and len(parts[1]) > decimal_places:
        return False, f"Too many decimal places (max {decimal_places})"
    
    return True, None


def validate_date_range(start_date, end_date) -> tuple[bool, Optional[str]]:
    """
    Validate date range.
    
    Args:
        start_date: Start date
        end_date: End date
    
    Returns:
        Tuple of (is_valid, error_message)
    """
    if start_date > end_date:
        return False, "Start date must be before or equal to end date"
    
    from datetime import date
    if start_date > date.today() or end_date > date.today():
        return False, "Date range cannot be in the future"
    
    return True, None
