from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from typing import Optional, List, Dict, Any
import logging

logger = logging.getLogger(__name__)


async def get_or_create_period(
    db: AsyncIOMotorDatabase,
    church_id: str,
    month: int,
    year: int
) -> Dict[str, Any]:
    """
    Get fiscal period, create if not exists.
    
    Args:
        db: Database instance
        church_id: Church ID
        month: Month (1-12)
        year: Year
    
    Returns:
        Fiscal period document
    """
    period = await db.fiscal_periods.find_one({
        "church_id": church_id,
        "month": month,
        "year": year
    })
    
    if not period:
        import uuid
        period = {
            "id": str(uuid.uuid4()),
            "church_id": church_id,
            "month": month,
            "year": year,
            "status": "open",
            "closed_by": None,
            "closed_at": None,
            "locked_by": None,
            "locked_at": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await db.fiscal_periods.insert_one(period)
        logger.info(f"Created fiscal period {year}-{month:02d} for church {church_id}")
    
    return period


async def can_perform_operation(
    db: AsyncIOMotorDatabase,
    church_id: str,
    month: int,
    year: int,
    operation_type: str
) -> tuple[bool, Optional[str]]:
    """
    Check if an operation can be performed in a period.
    
    Args:
        db: Database instance
        church_id: Church ID
        month: Month
        year: Year
        operation_type: 'create', 'edit', 'approve'
    
    Returns:
        Tuple of (can_perform, error_code)
    """
    period = await get_or_create_period(db, church_id, month, year)
    status = period.get("status", "open")
    
    if status == "locked":
        return False, "PERIOD_LOCKED"
    
    if status == "closed" and operation_type == "approve":
        return False, "PERIOD_CLOSED"
    
    return True, None


async def close_period(
    db: AsyncIOMotorDatabase,
    church_id: str,
    month: int,
    year: int,
    user_id: str
) -> tuple[bool, Optional[str], Optional[Dict]]:
    """
    Close a fiscal period.
    
    Args:
        db: Database instance
        church_id: Church ID
        month: Month
        year: Year
        user_id: User ID performing the action
    
    Returns:
        Tuple of (success, error_code, updated_period)
    """
    period = await get_or_create_period(db, church_id, month, year)
    
    if period.get("status") != "open":
        return False, "INVALID_PERIOD_OPERATION", None
    
    # Check for draft journals in this period
    from datetime import date
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)
    
    # Convert to ISO string format for MongoDB comparison (dates stored as strings)
    start_date_str = start_date.date().isoformat()
    end_date_str = end_date.date().isoformat()
    
    draft_count = await db.journals.count_documents({
        "church_id": church_id,
        "status": "draft",
        "date": {"$gte": start_date_str, "$lt": end_date_str}
    })
    
    if draft_count > 0:
        return False, "INVALID_PERIOD_OPERATION", None
    
    # Update period
    result = await db.fiscal_periods.update_one(
        {"id": period["id"]},
        {
            "$set": {
                "status": "closed",
                "closed_by": user_id,
                "closed_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    if result.modified_count > 0:
        updated_period = await db.fiscal_periods.find_one({"id": period["id"]})
        logger.info(f"Closed fiscal period {year}-{month:02d} for church {church_id}")
        return True, None, updated_period
    
    return False, "INVALID_PERIOD_OPERATION", None


async def lock_period(
    db: AsyncIOMotorDatabase,
    church_id: str,
    month: int,
    year: int,
    user_id: str
) -> tuple[bool, Optional[str], Optional[Dict]]:
    """
    Lock a fiscal period (must be closed first).
    
    Args:
        db: Database instance
        church_id: Church ID
        month: Month
        year: Year
        user_id: User ID performing the action
    
    Returns:
        Tuple of (success, error_code, updated_period)
    """
    period = await get_or_create_period(db, church_id, month, year)
    
    if period.get("status") != "closed":
        return False, "INVALID_PERIOD_OPERATION", None
    
    # Check sequential locking (previous month must be locked)
    if month > 1:
        prev_period = await db.fiscal_periods.find_one({
            "church_id": church_id,
            "month": month - 1,
            "year": year
        })
        if not prev_period or prev_period.get("status") != "locked":
            return False, "INVALID_PERIOD_OPERATION", None
    elif month == 1 and year > 1900:
        # Check December of previous year
        prev_period = await db.fiscal_periods.find_one({
            "church_id": church_id,
            "month": 12,
            "year": year - 1
        })
        if prev_period and prev_period.get("status") != "locked":
            return False, "INVALID_PERIOD_OPERATION", None
    
    # Update period
    result = await db.fiscal_periods.update_one(
        {"id": period["id"]},
        {
            "$set": {
                "status": "locked",
                "locked_by": user_id,
                "locked_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    if result.modified_count > 0:
        updated_period = await db.fiscal_periods.find_one({"id": period["id"]})
        logger.info(f"Locked fiscal period {year}-{month:02d} for church {church_id}")
        return True, None, updated_period
    
    return False, "INVALID_PERIOD_OPERATION", None


async def unlock_period(
    db: AsyncIOMotorDatabase,
    church_id: str,
    month: int,
    year: int,
    user_id: str
) -> tuple[bool, Optional[str], Optional[Dict]]:
    """
    Unlock a fiscal period (Admin only).
    
    Args:
        db: Database instance
        church_id: Church ID
        month: Month
        year: Year
        user_id: User ID performing the action
    
    Returns:
        Tuple of (success, error_code, updated_period)
    """
    period = await get_or_create_period(db, church_id, month, year)
    
    if period.get("status") != "locked":
        return False, "INVALID_PERIOD_OPERATION", None
    
    # Update period
    result = await db.fiscal_periods.update_one(
        {"id": period["id"]},
        {
            "$set": {
                "status": "open",
                "locked_by": None,
                "locked_at": None,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    if result.modified_count > 0:
        updated_period = await db.fiscal_periods.find_one({"id": period["id"]})
        logger.info(f"Unlocked fiscal period {year}-{month:02d} for church {church_id}")
        return True, None, updated_period
    
    return False, "INVALID_PERIOD_OPERATION", None


async def get_all_periods_status(
    db: AsyncIOMotorDatabase,
    church_id: str,
    year: int
) -> List[Dict[str, Any]]:
    """
    Get status of all 12 months for a year.
    
    Args:
        db: Database instance
        church_id: Church ID
        year: Year
    
    Returns:
        List of period status for each month
    """
    periods = []
    
    for month in range(1, 13):
        period = await get_or_create_period(db, church_id, month, year)
        periods.append({
            "month": month,
            "year": year,
            "status": period.get("status", "open"),
            "closed_at": period.get("closed_at"),
            "locked_at": period.get("locked_at")
        })
    
    return periods
