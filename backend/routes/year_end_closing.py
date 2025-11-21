from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from utils.dependencies import get_db, require_admin, get_current_user
from utils.tenant_utils import get_session_church_id
from services import year_end_closing_service, audit_service

router = APIRouter(prefix="/accounting/year-end", tags=["Year-End Closing"])


@router.post("/close/{year}")
async def close_year(
    year: int,
    retained_earnings_account_id: str,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Run year-end closing process."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")
    
    success, error_code, closing = await year_end_closing_service.execute_year_end_closing(
        db, church_id, year, user_id, retained_earnings_account_id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": error_code, "message": "Year-end closing failed"}
        )
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="create", module="year_end_closing",
        description=f"Completed year-end closing for {year}",
        after_data={"fiscal_year": year, "status": "success"}
    )
    
    return closing


@router.get("/status/{year}")
async def get_closing_status(
    year: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get year-end closing status."""
    church_id = get_session_church_id(current_user)
    
    closing = await db.year_end_closings.find_one(
        {"church_id": church_id, "fiscal_year": year},
        {"_id": 0}
    )
    
    if not closing:
        return {"status": "not_closed", "fiscal_year": year}
    
    return closing
