from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional

from utils.dependencies import get_db, get_current_user, require_admin
from utils.dependencies import get_session_church_id
from services import fiscal_period_service, audit_service

router = APIRouter(prefix="/accounting/fiscal-periods", tags=["Fiscal Periods"])


@router.get("/list")
async def list_fiscal_periods(
    year: Optional[int] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List all fiscal periods."""
    church_id = get_session_church_id(current_user)
    
    query = {"church_id": church_id}
    if year:
        query["year"] = year
    if status:
        query["status"] = status
    
    cursor = db.fiscal_periods.find(query, {"_id": 0}).sort([("year", -1), ("month", -1)])
    periods = await cursor.to_list(length=None)
    
    return periods


@router.get("/current")
async def get_current_period(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get current period status."""
    from datetime import date
    church_id = get_session_church_id(current_user)
    
    today = date.today()
    period = await fiscal_period_service.get_or_create_period(
        db, church_id, today.month, today.year
    )
    
    period.pop("_id", None)
    return period


@router.post("/close")
async def close_period(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=1900, le=2100),
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Close a fiscal period."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")
    
    success, error_code, updated_period = await fiscal_period_service.close_period(
        db, church_id, month, year, user_id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": error_code, "message": "Cannot close period"}
        )
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="update", module="fiscal_period",
        description=f"Closed period {year}-{month:02d}",
        after_data={"status": "closed"}
    )
    
    updated_period.pop("_id", None)
    return updated_period


@router.post("/lock")
async def lock_period(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=1900, le=2100),
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Lock a fiscal period."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")
    
    success, error_code, updated_period = await fiscal_period_service.lock_period(
        db, church_id, month, year, user_id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": error_code, "message": "Cannot lock period"}
        )
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="update", module="fiscal_period",
        description=f"Locked period {year}-{month:02d}",
        after_data={"status": "locked"}
    )
    
    updated_period.pop("_id", None)
    return updated_period


@router.post("/unlock")
async def unlock_period(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=1900, le=2100),
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Unlock a fiscal period (Admin only)."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")
    
    success, error_code, updated_period = await fiscal_period_service.unlock_period(
        db, church_id, month, year, user_id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": error_code, "message": "Cannot unlock period"}
        )
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="update", module="fiscal_period",
        description=f"Unlocked period {year}-{month:02d}",
        after_data={"status": "open"}
    )
    
    updated_period.pop("_id", None)
    return updated_period
