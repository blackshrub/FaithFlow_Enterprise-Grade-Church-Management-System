from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from datetime import datetime
import uuid

from utils.dependencies import get_db, get_current_user, get_current_member
from utils.tenant_utils import get_current_church_id
from services import audit_service
from services.whatsapp_service import send_whatsapp_message

router = APIRouter(tags=["Group Leave Requests"])


@router.post("/public/groups/{group_id}/leave-request", status_code=status.HTTP_201_CREATED)
async def create_leave_request_public(
    group_id: str,
    reason: Optional[str] = None,
    current_member: dict = Depends(get_current_member),  # mobile auth (member)
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Create leave request from mobile app (member).

    Exposed under /api/public/groups/{group_id}/leave-request.
    """
    church_id = current_member["church_id"]
    member_id = current_member.get("id")

    if not member_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "VALIDATION_ERROR", "message": "Member profile not linked"},
        )

    membership = await db.group_memberships.find_one(
        {
            "church_id": church_id,
            "group_id": group_id,
            "member_id": member_id,
            "status": "active",
        }
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Active membership not found"},
        )

    # Mark as pending_leave and store reason
    await db.group_memberships.update_one(
        {"id": membership["id"]},
        {
            "$set": {
                "status": "pending_leave",
                "leave_reason": reason,
            }
        },
    )

    return {
        "message": "Your leave request is submitted and waiting for staff confirmation.",
    }


@router.get("/v1/groups/leave-requests")
async def list_leave_requests(
    status_filter: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """List leave requests (memberships with status=pending_leave) for staff."""
    church_id = get_current_church_id(current_user)

    query = {"church_id": church_id, "status": "pending_leave"}

    cursor = db.group_memberships.find(query, {"_id": 0}).sort("joined_at", -1)
    memberships = await cursor.to_list(length=None)

    # Attach member & group basic info
    member_ids = {m["member_id"] for m in memberships}
    group_ids = {m["group_id"] for m in memberships}

    members_map = {}
    groups_map = {}

    if member_ids:
        members_cursor = db.members.find(
            {"id": {"$in": list(member_ids)}},
            {"_id": 0, "id": 1, "full_name": 1, "phone_whatsapp": 1, "photo_base64": 1},
        )
        async for m in members_cursor:
            members_map[m["id"]] = m

    if group_ids:
        groups_cursor = db.groups.find(
            {"id": {"$in": list(group_ids)}},
            {"_id": 0, "id": 1, "name": 1, "category": 1},
        )
        async for g in groups_cursor:
            groups_map[g["id"]] = g

    for membership in memberships:
        membership["member"] = members_map.get(membership["member_id"])
        membership["group"] = groups_map.get(membership["group_id"])

    return memberships


@router.post("/v1/groups/leave-requests/{membership_id}/approve")
async def approve_leave_request(
    membership_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Approve leave request (staff). Marks membership as removed."""
    church_id = get_current_church_id(current_user)
    user_id = current_user.get("id")

    membership = await db.group_memberships.find_one(
        {"id": membership_id, "church_id": church_id}
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Membership not found"},
        )

    if membership.get("status") != "pending_leave":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "INVALID_STATUS_TRANSITION", "message": "Only pending leave can be approved"},
        )

    await db.group_memberships.update_one(
        {"id": membership_id},
        {"$set": {"status": "removed", "left_at": datetime.utcnow()}},
    )

    await audit_service.log_action(
        db=db,
        church_id=church_id,
        user_id=user_id,
        action_type="update",
        module="group_membership",
        description=f"Approved leave request for membership {membership_id}",
    )

    # Send WhatsApp notification to member if enabled in church settings
    church_settings = await db.church_settings.find_one({"church_id": church_id})
    whatsapp_enabled = (
        church_settings
        and church_settings.get("enable_whatsapp_notifications")
        and church_settings.get("whatsapp_send_group_notifications", True)
    )

    if whatsapp_enabled:
        member = await db.members.find_one({"id": membership["member_id"], "church_id": church_id})
        group = await db.groups.find_one({"id": membership["group_id"], "church_id": church_id})

        if member and member.get("phone_whatsapp") and group:
            try:
                church_settings = church_settings or {}
                language = church_settings.get("default_language", "en")
                from services.whatsapp_service import format_group_notification_message

                message = format_group_notification_message(
                    event="leave_approved",
                    group_name=group.get("name", ""),
                    language=language,
                )
                await send_whatsapp_message(
                    phone_number=member["phone_whatsapp"],
                    message=message,
                )
            except Exception:
                # Do not block approval flow if WhatsApp fails
                pass

    updated = await db.group_memberships.find_one({"id": membership_id}, {"_id": 0})
    return updated
