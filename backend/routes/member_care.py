"""
Member Care Routes - Admin API

Provides CRUD operations for managing member care requests:
- Accept Jesus / Recommitment
- Baptism
- Child Dedication
- Holy Matrimony

All routes require admin authentication and are scoped by church_id.
"""

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from utils.dependencies import get_current_user, get_db, get_session_church_id
from services import audit_service
from services.member_care_service import MemberCareService

from models.member_care_request import (
    MemberCareRequestUpdate,
    MemberCareRequestListResponse,
    MemberCareRequestResponse,
    UnreadCountsResponse,
    RequestType,
    RequestStatus,
)


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/member-care",
    tags=["Member Care"],
    responses={404: {"description": "Not found"}},
)


# =============================================================================
# DASHBOARD & COUNTS
# =============================================================================

@router.get("/unread-counts", response_model=UnreadCountsResponse)
async def get_unread_counts(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Get unread (status=new) counts per request type.

    Returns counts for each request type to display badges in navigation.
    """
    church_id = get_session_church_id(current_user)
    service = MemberCareService(db)
    return await service.get_unread_counts(church_id)


@router.get("/dashboard")
async def get_dashboard_stats(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Get dashboard statistics for member care requests.

    Returns:
    - Counts by status (new, contacted, scheduled, completed)
    - Counts by type
    - Recent requests
    - Trend data
    """
    church_id = get_session_church_id(current_user)
    service = MemberCareService(db)

    # Get unread counts
    unread_counts = await service.get_unread_counts(church_id)

    # Get counts by status
    status_pipeline = [
        {"$match": {"church_id": church_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_results = await db.member_care_requests.aggregate(status_pipeline).to_list(10)
    status_counts = {r["_id"]: r["count"] for r in status_results}

    # Get recent requests (last 10)
    recent = await service.list_requests(church_id, limit=10, offset=0)

    # Get total count
    total_count = await db.member_care_requests.count_documents({"church_id": church_id})

    # Get counts by type
    type_pipeline = [
        {"$match": {"church_id": church_id}},
        {"$group": {"_id": "$request_type", "count": {"$sum": 1}}}
    ]
    type_results = await db.member_care_requests.aggregate(type_pipeline).to_list(10)
    type_counts = {r["_id"]: r["count"] for r in type_results}

    return {
        "unread_counts": unread_counts,
        # Frontend expects 'by_status' not 'status_counts'
        "by_status": {
            "new": status_counts.get("new", 0),
            "contacted": status_counts.get("contacted", 0),
            "scheduled": status_counts.get("scheduled", 0),
            "completed": status_counts.get("completed", 0),
            "cancelled": status_counts.get("cancelled", 0),
        },
        # Frontend expects 'by_type' for type cards
        "by_type": {
            "accept_jesus": type_counts.get("accept_jesus", 0),
            "baptism": type_counts.get("baptism", 0),
            "child_dedication": type_counts.get("child_dedication", 0),
            "holy_matrimony": type_counts.get("holy_matrimony", 0),
        },
        "total_requests": total_count,
        "recent_requests": recent["data"][:10],
    }


# =============================================================================
# LIST & GET
# =============================================================================

@router.get("/", response_model=MemberCareRequestListResponse)
async def list_requests(
    request_type: Optional[str] = Query(None, description="Filter by request type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    assigned_to: Optional[str] = Query(None, description="Filter by assigned staff"),
    search: Optional[str] = Query(None, description="Search by name or phone"),
    start_date: Optional[datetime] = Query(None, description="Filter by start date"),
    end_date: Optional[datetime] = Query(None, description="Filter by end date"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    List member care requests with filters and pagination.

    Supports filtering by:
    - request_type: accept_jesus, baptism, child_dedication, holy_matrimony
    - status: new, contacted, scheduled, completed, cancelled
    - assigned_to: staff user ID
    - search: name or phone partial match
    - date range: start_date and end_date
    """
    church_id = get_session_church_id(current_user)
    service = MemberCareService(db)

    return await service.list_requests(
        church_id=church_id,
        request_type=request_type,
        status=status,
        assigned_to=assigned_to,
        search=search,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset,
    )


@router.get("/{request_id}")
async def get_request(
    request_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Get a single member care request by ID.

    Returns enriched data including:
    - Member information
    - Assigned staff information
    - Type-specific data
    """
    church_id = get_session_church_id(current_user)
    service = MemberCareService(db)

    request = await service.get_request(church_id, request_id)

    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found"
        )

    return request


# =============================================================================
# UPDATE
# =============================================================================

@router.patch("/{request_id}")
async def update_request(
    request_id: str,
    data: MemberCareRequestUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Update a member care request.

    Supports updating:
    - status (triggers timestamp recording)
    - assigned_to_user_id
    - internal_notes
    - notes
    - scheduled_date (type-specific)
    - location (type-specific)
    """
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id") or current_user.get("sub")
    service = MemberCareService(db)

    # Get existing request for audit log
    existing = await service.get_request(church_id, request_id, enrich=False)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found"
        )

    # Perform update
    updated = await service.update_request(
        church_id=church_id,
        request_id=request_id,
        data=data,
        updated_by=user_id,
    )

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update request"
        )

    # Audit log
    await audit_service.log_action(
        db=db,
        church_id=church_id,
        user_id=user_id,
        action_type="update",
        module="member_care",
        description=f"Updated {existing['request_type']} request from {existing['full_name']}",
        before_data={"status": existing.get("status")},
        after_data={"status": updated.get("status")},
    )

    return updated


@router.post("/{request_id}/assign")
async def assign_staff(
    request_id: str,
    staff_id: str = Query(..., description="Staff user ID to assign"),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Assign a staff member to handle the request.
    """
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id") or current_user.get("sub")
    service = MemberCareService(db)

    # Verify staff exists
    staff = await db.users.find_one({"id": staff_id, "church_id": church_id})
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found"
        )

    update_data = MemberCareRequestUpdate(assigned_to_user_id=staff_id)
    updated = await service.update_request(church_id, request_id, update_data, user_id)

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found"
        )

    # Audit log
    await audit_service.log_action(
        db=db,
        church_id=church_id,
        user_id=user_id,
        action_type="assign",
        module="member_care",
        description=f"Assigned {staff.get('full_name', staff_id)} to handle request {request_id}",
    )

    return {"success": True, "message": "Staff assigned successfully", "data": updated}


@router.post("/{request_id}/mark-contacted")
async def mark_contacted(
    request_id: str,
    notes: Optional[str] = Query(None, description="Contact notes"),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Mark a request as contacted.
    """
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id") or current_user.get("sub")
    service = MemberCareService(db)

    update_data = MemberCareRequestUpdate(
        status=RequestStatus.CONTACTED.value,
        internal_notes=notes if notes else None,
    )

    updated = await service.update_request(church_id, request_id, update_data, user_id)

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found"
        )

    return {"success": True, "message": "Request marked as contacted", "data": updated}


@router.post("/{request_id}/mark-scheduled")
async def mark_scheduled(
    request_id: str,
    scheduled_date: datetime = Query(..., description="Scheduled date"),
    location: Optional[str] = Query(None, description="Location"),
    notes: Optional[str] = Query(None, description="Scheduling notes"),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Mark a request as scheduled with date and location.
    """
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id") or current_user.get("sub")
    service = MemberCareService(db)

    update_data = MemberCareRequestUpdate(
        status=RequestStatus.SCHEDULED.value,
        scheduled_date=scheduled_date.date(),
        location=location,
        internal_notes=notes if notes else None,
    )

    updated = await service.update_request(church_id, request_id, update_data, user_id)

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found"
        )

    return {"success": True, "message": "Request scheduled successfully", "data": updated}


@router.post("/{request_id}/mark-completed")
async def mark_completed(
    request_id: str,
    notes: Optional[str] = Query(None, description="Completion notes"),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Mark a request as completed.
    """
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id") or current_user.get("sub")
    service = MemberCareService(db)

    update_data = MemberCareRequestUpdate(
        status=RequestStatus.COMPLETED.value,
        internal_notes=notes if notes else None,
    )

    updated = await service.update_request(church_id, request_id, update_data, user_id)

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found"
        )

    # Audit log
    await audit_service.log_action(
        db=db,
        church_id=church_id,
        user_id=user_id,
        action_type="complete",
        module="member_care",
        description=f"Completed member care request {request_id}",
    )

    return {"success": True, "message": "Request marked as completed", "data": updated}


# =============================================================================
# DELETE
# =============================================================================

@router.delete("/{request_id}")
async def delete_request(
    request_id: str,
    hard_delete: bool = Query(False, description="Permanently delete instead of soft delete"),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Delete a member care request.

    By default performs soft delete (marks as cancelled).
    Use hard_delete=true to permanently remove.
    """
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id") or current_user.get("sub")
    service = MemberCareService(db)

    # Get existing for audit
    existing = await service.get_request(church_id, request_id, enrich=False)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found"
        )

    success = await service.delete_request(
        church_id=church_id,
        request_id=request_id,
        soft_delete=not hard_delete,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to delete request"
        )

    # Audit log
    await audit_service.log_action(
        db=db,
        church_id=church_id,
        user_id=user_id,
        action_type="delete",
        module="member_care",
        description=f"Deleted {existing['request_type']} request from {existing['full_name']}",
        before_data={"id": request_id, "request_type": existing.get("request_type")},
    )

    return {
        "success": True,
        "message": "Request deleted successfully" if hard_delete else "Request cancelled successfully",
    }


# =============================================================================
# GUIDED PRAYER SETTINGS
# =============================================================================

@router.get("/settings/guided-prayer")
async def get_guided_prayer_settings(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Get guided prayer settings for Accept Jesus flow.
    """
    church_id = get_session_church_id(current_user)
    service = MemberCareService(db)

    prayer_en = await service.get_guided_prayer(church_id, "en")
    prayer_id = await service.get_guided_prayer(church_id, "id")

    return {
        "guided_prayer_en": prayer_en,
        "guided_prayer_id": prayer_id,
    }


@router.put("/settings/guided-prayer")
async def update_guided_prayer_settings(
    guided_prayer_en: str = Query(..., description="English guided prayer"),
    guided_prayer_id: str = Query(..., description="Indonesian guided prayer"),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Update guided prayer settings for Accept Jesus flow.
    """
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id") or current_user.get("sub")

    # Update church settings
    await db.church_settings.update_one(
        {"church_id": church_id},
        {
            "$set": {
                "member_care_settings.guided_prayer_en": guided_prayer_en,
                "member_care_settings.guided_prayer_id": guided_prayer_id,
                "updated_at": datetime.now(),
            }
        },
        upsert=True,
    )

    # Audit log
    await audit_service.log_action(
        db=db,
        church_id=church_id,
        user_id=user_id,
        action_type="update",
        module="member_care_settings",
        description="Updated guided prayer settings",
    )

    return {
        "success": True,
        "message": "Guided prayer settings updated",
        "data": {
            "guided_prayer_en": guided_prayer_en,
            "guided_prayer_id": guided_prayer_id,
        }
    }
