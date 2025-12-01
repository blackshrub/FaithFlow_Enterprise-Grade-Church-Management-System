"""
Crash Log Routes

API endpoints for mobile crash reporting and admin monitoring.

Public Endpoints (no auth):
- POST /api/crash-logs - Report a crash from mobile app

Admin Endpoints (auth required):
- GET /api/crash-logs - List all crash logs with filtering
- GET /api/crash-logs/stats - Get crash statistics
- GET /api/crash-logs/{id} - Get single crash log
- PATCH /api/crash-logs/{id} - Update crash log status
- DELETE /api/crash-logs/{id} - Delete crash log
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
from datetime import datetime, timedelta
import uuid

from models.crash_log import (
    CrashLog,
    CrashLogCreate,
    CrashLogUpdate,
    CrashLogStats,
)
from utils.dependencies import get_db, get_current_user, require_admin

router = APIRouter(prefix="/api/crash-logs", tags=["Crash Logs"])


# =============================================================================
# PUBLIC ENDPOINT - Mobile App Crash Reporting
# =============================================================================

@router.post("", status_code=status.HTTP_201_CREATED)
async def report_crash(
    crash_data: CrashLogCreate,
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Report a crash from the mobile app.

    This endpoint is public (no auth required) to ensure crashes can be
    reported even when the auth system itself is broken.
    """
    # Generate crash log entry
    crash_log = CrashLog(
        id=f"crash_{uuid.uuid4()}",
        **crash_data.model_dump(),
        timestamp=datetime.utcnow(),
        reported_at=datetime.utcnow(),
        ip_address=request.client.host if request.client else None,
        status="new",
    )

    # Store in database
    await db.crash_logs.insert_one(crash_log.model_dump())

    return {"id": crash_log.id, "status": "reported"}


# =============================================================================
# ADMIN ENDPOINTS - Crash Monitoring
# =============================================================================

@router.get("", response_model=dict)
async def list_crash_logs(
    status: Optional[str] = Query(None, description="Filter by status"),
    platform: Optional[str] = Query(None, description="Filter by platform"),
    app_version: Optional[str] = Query(None, description="Filter by app version"),
    screen_name: Optional[str] = Query(None, description="Filter by screen"),
    error_type: Optional[str] = Query(None, description="Filter by error type"),
    church_id: Optional[str] = Query(None, description="Filter by church"),
    member_id: Optional[str] = Query(None, description="Filter by member"),
    days: int = Query(7, description="Number of days to look back"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=200, description="Items per page"),
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    List crash logs with filtering and pagination.
    Admin only.
    """
    # Build query filter
    query = {}

    # Time filter
    since = datetime.utcnow() - timedelta(days=days)
    query["timestamp"] = {"$gte": since}

    # Status filter
    if status:
        query["status"] = status

    # Platform filter
    if platform:
        query["device_info.platform"] = platform

    # App version filter
    if app_version:
        query["device_info.app_version"] = app_version

    # Screen filter
    if screen_name:
        query["screen_name"] = screen_name

    # Error type filter
    if error_type:
        query["error_type"] = {"$regex": error_type, "$options": "i"}

    # Church filter
    if church_id:
        query["user_context.church_id"] = church_id

    # Member filter
    if member_id:
        query["user_context.member_id"] = member_id

    # Count total
    total = await db.crash_logs.count_documents(query)

    # Fetch with pagination
    skip = (page - 1) * limit
    cursor = db.crash_logs.find(query, {"_id": 0})
    cursor = cursor.sort("timestamp", -1).skip(skip).limit(limit)

    items = await cursor.to_list(length=limit)

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
    }


@router.get("/stats", response_model=CrashLogStats)
async def get_crash_stats(
    days: int = Query(30, description="Number of days for stats"),
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Get aggregated crash statistics.
    Admin only.
    """
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    period_start = today_start - timedelta(days=days)

    # Total crashes in period
    total_crashes = await db.crash_logs.count_documents({
        "timestamp": {"$gte": period_start}
    })

    # Crashes today
    crashes_today = await db.crash_logs.count_documents({
        "timestamp": {"$gte": today_start}
    })

    # Crashes this week
    crashes_this_week = await db.crash_logs.count_documents({
        "timestamp": {"$gte": week_start}
    })

    # Unique affected users
    affected_users_pipeline = [
        {"$match": {"timestamp": {"$gte": period_start}, "user_context.member_id": {"$ne": None}}},
        {"$group": {"_id": "$user_context.member_id"}},
        {"$count": "count"}
    ]
    affected_result = await db.crash_logs.aggregate(affected_users_pipeline).to_list(1)
    affected_users = affected_result[0]["count"] if affected_result else 0

    # Top errors
    top_errors_pipeline = [
        {"$match": {"timestamp": {"$gte": period_start}}},
        {"$group": {
            "_id": {"error_type": "$error_type", "error_message": "$error_message"},
            "count": {"$sum": 1},
            "last_seen": {"$max": "$timestamp"},
            "screen_name": {"$first": "$screen_name"}
        }},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    top_errors_result = await db.crash_logs.aggregate(top_errors_pipeline).to_list(10)
    top_errors = [
        {
            "error_type": item["_id"]["error_type"],
            "error_message": item["_id"]["error_message"][:100] + "..." if len(item["_id"]["error_message"]) > 100 else item["_id"]["error_message"],
            "count": item["count"],
            "last_seen": item["last_seen"].isoformat(),
            "screen_name": item.get("screen_name")
        }
        for item in top_errors_result
    ]

    # Crashes by platform
    platform_pipeline = [
        {"$match": {"timestamp": {"$gte": period_start}}},
        {"$group": {"_id": "$device_info.platform", "count": {"$sum": 1}}},
    ]
    platform_result = await db.crash_logs.aggregate(platform_pipeline).to_list(10)
    crashes_by_platform = {item["_id"]: item["count"] for item in platform_result if item["_id"]}

    # Crashes by version
    version_pipeline = [
        {"$match": {"timestamp": {"$gte": period_start}}},
        {"$group": {"_id": "$device_info.app_version", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    version_result = await db.crash_logs.aggregate(version_pipeline).to_list(10)
    crashes_by_version = {item["_id"]: item["count"] for item in version_result if item["_id"]}

    # Crashes by screen
    screen_pipeline = [
        {"$match": {"timestamp": {"$gte": period_start}, "screen_name": {"$ne": None}}},
        {"$group": {"_id": "$screen_name", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    screen_result = await db.crash_logs.aggregate(screen_pipeline).to_list(10)
    crashes_by_screen = {item["_id"]: item["count"] for item in screen_result if item["_id"]}

    # Resolution rate
    resolved_count = await db.crash_logs.count_documents({
        "timestamp": {"$gte": period_start},
        "status": "resolved"
    })
    resolution_rate = (resolved_count / total_crashes * 100) if total_crashes > 0 else 0

    return CrashLogStats(
        total_crashes=total_crashes,
        crashes_today=crashes_today,
        crashes_this_week=crashes_this_week,
        affected_users=affected_users,
        top_errors=top_errors,
        crashes_by_platform=crashes_by_platform,
        crashes_by_version=crashes_by_version,
        crashes_by_screen=crashes_by_screen,
        resolution_rate=round(resolution_rate, 1),
    )


@router.get("/{crash_id}", response_model=CrashLog)
async def get_crash_log(
    crash_id: str,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Get a single crash log by ID.
    Admin only.
    """
    crash_log = await db.crash_logs.find_one({"id": crash_id}, {"_id": 0})

    if not crash_log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Crash log not found"
        )

    return crash_log


@router.patch("/{crash_id}", response_model=CrashLog)
async def update_crash_log(
    crash_id: str,
    update_data: CrashLogUpdate,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Update crash log status and notes.
    Admin only.
    """
    crash_log = await db.crash_logs.find_one({"id": crash_id})

    if not crash_log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Crash log not found"
        )

    update_fields = update_data.model_dump(exclude_unset=True)

    # Track resolution
    if update_data.status == "resolved":
        update_fields["resolved_at"] = datetime.utcnow()
        update_fields["resolved_by"] = current_user.get("id") or current_user.get("email")

    await db.crash_logs.update_one(
        {"id": crash_id},
        {"$set": update_fields}
    )

    updated = await db.crash_logs.find_one({"id": crash_id}, {"_id": 0})
    return updated


@router.delete("/{crash_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_crash_log(
    crash_id: str,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Delete a crash log.
    Admin only.
    """
    result = await db.crash_logs.delete_one({"id": crash_id})

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Crash log not found"
        )

    return None


@router.delete("", status_code=status.HTTP_200_OK)
async def bulk_delete_crash_logs(
    status_filter: Optional[str] = Query(None, description="Delete by status"),
    days_old: int = Query(30, description="Delete logs older than X days"),
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Bulk delete old or resolved crash logs.
    Admin only.
    """
    query = {}

    # Age filter
    cutoff = datetime.utcnow() - timedelta(days=days_old)
    query["timestamp"] = {"$lt": cutoff}

    # Status filter
    if status_filter:
        query["status"] = status_filter

    result = await db.crash_logs.delete_many(query)

    return {"deleted_count": result.deleted_count}
