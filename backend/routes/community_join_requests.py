"""
Community Join Requests Routes (formerly Group Join Requests)

Public endpoints for members to request joining communities.
Staff endpoints for approving/rejecting requests.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from datetime import datetime
import uuid

from models.community_join_request import (
    CommunityJoinRequestCreate,
    CommunityJoinRequestUpdate,
    CommunityJoinRequest,
)
from utils.dependencies import get_db, get_current_user, get_current_member
from services.whatsapp_service import send_whatsapp_message
from utils.dependencies import get_session_church_id
from services import audit_service

router = APIRouter(tags=["Community Join Requests"])


@router.post("/public/communities/{community_id}/join-request", status_code=status.HTTP_201_CREATED)
async def create_join_request_public(
    community_id: str,
    body: CommunityJoinRequestCreate,
    current_member: dict = Depends(get_current_member),  # mobile auth (member)
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Create join request from mobile app (member).

    This endpoint is exposed under /api/public/communities/{community_id}/join-request
    and requires a valid member JWT.
    """
    church_id = current_member["church_id"]
    member_id = current_member.get("id")

    if not member_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "VALIDATION_ERROR", "message": "Member profile not linked"},
        )

    community = await db.communities.find_one({"id": community_id, "church_id": church_id})
    if not community:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Community not found"},
        )

    # Check if community open for join
    if not community.get("is_open_for_join", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "COMMUNITY_CLOSED", "message": "Community is not open for join"},
        )

    # Check existing pending/active membership
    existing_membership = await db.community_memberships.find_one(
        {"church_id": church_id, "community_id": community_id, "member_id": member_id, "status": "active"}
    )
    if existing_membership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "ALREADY_MEMBER", "message": "You are already a member of this community"},
        )

    existing_request = await db.community_join_requests.find_one(
        {
            "church_id": church_id,
            "community_id": community_id,
            "member_id": member_id,
            "status": "pending",
        }
    )
    if existing_request:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "REQUEST_ALREADY_PENDING", "message": "Join request already pending"},
        )

    now = datetime.utcnow()
    request_doc = {
        "id": str(uuid.uuid4()),
        "church_id": church_id,
        "community_id": community_id,
        "member_id": member_id,
        "message": body.message,
        "status": "pending",
        "submitted_at": now,
        "processed_at": None,
        "processed_by": None,
    }

    await db.community_join_requests.insert_one(request_doc)

    request_doc.pop("_id", None)
    return {
        "request": request_doc,
        "message": "Your request has been submitted and is waiting for approval from church staff.",
    }


@router.get("/v1/communities/join-requests")
async def list_join_requests(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """List join requests for current church (staff)."""
    church_id = get_session_church_id(current_user)

    query = {"church_id": church_id}
    if status_filter:
        query["status"] = status_filter

    cursor = db.community_join_requests.find(query, {"_id": 0}).sort("submitted_at", -1)
    requests = await cursor.to_list(length=None)

    # Attach member & community basic info
    member_ids = {r["member_id"] for r in requests}
    community_ids = {r["community_id"] for r in requests}

    members_map = {}
    communities_map = {}

    if member_ids:
        members_cursor = db.members.find(
            {"id": {"$in": list(member_ids)}},
            {"_id": 0, "id": 1, "full_name": 1, "phone_whatsapp": 1, "photo_base64": 1},
        )
        async for m in members_cursor:
            members_map[m["id"]] = m

    if community_ids:
        communities_cursor = db.communities.find(
            {"id": {"$in": list(community_ids)}},
            {"_id": 0, "id": 1, "name": 1, "category": 1},
        )
        async for c in communities_cursor:
            communities_map[c["id"]] = c

    for r in requests:
        r["member"] = members_map.get(r["member_id"])
        r["community"] = communities_map.get(r["community_id"])
        # Keep "group" for backward compatibility with frontend
        r["group"] = r["community"]

    return requests


@router.post("/v1/communities/join-requests/{request_id}/approve")
async def approve_join_request(
    request_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Approve join request (staff). Creates membership."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")

    request_doc = await db.community_join_requests.find_one(
        {"id": request_id, "church_id": church_id}
    )
    if not request_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Join request not found"},
        )

    if request_doc.get("status") != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "INVALID_STATUS_TRANSITION", "message": "Only pending requests can be approved"},
        )

    # Create membership (idempotent: check if already active)
    existing_membership = await db.community_memberships.find_one(
        {
            "church_id": church_id,
            "community_id": request_doc["community_id"],
            "member_id": request_doc["member_id"],
            "status": "active",
        }
    )
    if not existing_membership:
        membership = {
            "id": str(uuid.uuid4()),
            "church_id": church_id,
            "community_id": request_doc["community_id"],
            "member_id": request_doc["member_id"],
            "role": "member",
            "status": "active",
            "notifications_enabled": True,
            "muted_until": None,
            "joined_at": datetime.utcnow(),
            "left_at": None,
        }
        await db.community_memberships.insert_one(membership)

        # Update member count
        await db.communities.update_one(
            {"id": request_doc["community_id"]},
            {"$inc": {"member_count": 1}}
        )

    await db.community_join_requests.update_one(
        {"id": request_id},
        {
            "$set": {
                "status": "approved",
                "processed_at": datetime.utcnow(),
                "processed_by": user_id,
            }
        },
    )

    await audit_service.log_action(
        db=db,
        church_id=church_id,
        user_id=user_id,
        action_type="update",
        module="community_join_request",
        description=f"Approved community join request {request_id}",
    )

    # Send WhatsApp notification to member if enabled in church settings
    church_settings = await db.church_settings.find_one({"church_id": church_id})
    whatsapp_enabled = (
        church_settings
        and church_settings.get("enable_whatsapp_notifications")
        and church_settings.get("whatsapp_send_group_notifications", True)
    )

    if whatsapp_enabled:
        member = await db.members.find_one({"id": request_doc["member_id"], "church_id": church_id})
        community = await db.communities.find_one({"id": request_doc["community_id"], "church_id": church_id})

        if member and member.get("phone_whatsapp") and community:
            try:
                church_settings = church_settings or {}
                member_lang = member.get("preferred_language")
                church_lang = church_settings.get("default_language", "en")
                language = member_lang or church_lang or "en"
                from services.whatsapp_service import format_group_notification_message

                message = format_group_notification_message(
                    event="join_approved",
                    group_name=community.get("name", ""),
                    language=language,
                )
                await send_whatsapp_message(
                    phone_number=member["phone_whatsapp"],
                    message=message,
                )
            except Exception:
                # Do not block approval flow if WhatsApp fails
                pass

    updated = await db.community_join_requests.find_one({"id": request_id}, {"_id": 0})
    return updated


@router.post("/v1/communities/join-requests/{request_id}/reject")
async def reject_join_request(
    request_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Reject join request (staff)."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")

    request_doc = await db.community_join_requests.find_one(
        {"id": request_id, "church_id": church_id}
    )
    if not request_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Join request not found"},
        )

    if request_doc.get("status") != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "INVALID_STATUS_TRANSITION", "message": "Only pending requests can be rejected"},
        )

    await db.community_join_requests.update_one(
        {"id": request_id},
        {
            "$set": {
                "status": "rejected",
                "processed_at": datetime.utcnow(),
                "processed_by": user_id,
            }
        },
    )

    await audit_service.log_action(
        db=db,
        church_id=church_id,
        user_id=user_id,
        action_type="update",
        module="community_join_request",
        description=f"Rejected community join request {request_id}",
    )

    # Send WhatsApp notification to member if enabled in church settings
    church_settings = await db.church_settings.find_one({"church_id": church_id})
    whatsapp_enabled = (
        church_settings
        and church_settings.get("enable_whatsapp_notifications")
        and church_settings.get("whatsapp_send_group_notifications", True)
    )

    if whatsapp_enabled:
        member = await db.members.find_one({"id": request_doc["member_id"], "church_id": church_id})
        community = await db.communities.find_one({"id": request_doc["community_id"], "church_id": church_id})

        if member and member.get("phone_whatsapp") and community:
            try:
                church_settings = church_settings or {}
                member_lang = member.get("preferred_language")
                church_lang = church_settings.get("default_language", "en")
                language = member_lang or church_lang or "en"
                from services.whatsapp_service import format_group_notification_message

                message = format_group_notification_message(
                    event="join_rejected",
                    group_name=community.get("name", ""),
                    language=language,
                )
                await send_whatsapp_message(
                    phone_number=member["phone_whatsapp"],
                    message=message,
                )
            except Exception:
                # Do not block rejection flow if WhatsApp fails
                pass

    updated = await db.community_join_requests.find_one({"id": request_id}, {"_id": 0})
    return updated
