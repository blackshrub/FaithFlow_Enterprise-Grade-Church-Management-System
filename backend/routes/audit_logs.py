from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from datetime import date

from utils.dependencies import get_db, require_admin
from utils.tenant_utils import get_current_church_id
from services import pagination_service

router = APIRouter(prefix="/accounting/audit-logs", tags=["Audit Logs"])


@router.get("/")
async def list_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    module: Optional[str] = None,
    action_type: Optional[str] = None,
    user_id: Optional[str] = None,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List audit logs (Admin only) with mandatory pagination."""
    church_id = get_current_church_id(current_user)
    
    # Validate pagination
    limit, offset = pagination_service.validate_pagination_params(limit, offset)
    
    query = {"church_id": church_id}
    
    if start_date or end_date:
        query["timestamp"] = {}
        if start_date:
            from datetime import datetime
            query["timestamp"]["$gte"] = datetime.combine(start_date, datetime.min.time())
        if end_date:
            from datetime import datetime
            query["timestamp"]["$lte"] = datetime.combine(end_date, datetime.max.time())
    
    if module:
        query["module"] = module
    
    if action_type:
        query["action_type"] = action_type
    
    if user_id:
        query["user_id"] = user_id
    
    # Get total count
    total = await db.audit_logs.count_documents(query)
    
    # Get paginated data
    cursor = db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).skip(offset).limit(limit)
    logs = await cursor.to_list(length=limit)
    
    return pagination_service.build_pagination_response(logs, total, limit, offset)


@router.get("/{log_id}")
async def get_audit_log(
    log_id: str,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get single audit log with full before/after data."""
    church_id = get_current_church_id(current_user)
    
    log = await db.audit_logs.find_one(
        {"id": log_id, "church_id": church_id},
        {"_id": 0}
    )
    
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Audit log not found"}
        )
    
    return log
