from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from datetime import datetime
import uuid

from models.group_membership import GroupMembership, GroupMembershipCreate, GroupMembershipUpdate
from utils.dependencies import get_db, get_current_user
from utils.tenant_utils import get_session_church_id
from services import audit_service

router = APIRouter(prefix="/groups", tags=["Group Memberships"])


@router.get("/{group_id}/members")
async def list_group_members(
    group_id: str,
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """List members of a group (staff)."""
    church_id = get_session_church_id(current_user)

    query = {"church_id": church_id, "group_id": group_id}
    
    # Default to active members only unless status filter specified
    if status_filter:
        query["status"] = status_filter
    else:
        query["status"] = "active"  # Default: show only active members

    cursor = db.group_memberships.find(query, {"_id": 0})
    memberships = await cursor.to_list(length=None)

    # Optionally join member basic info for convenience
    member_ids = [m["member_id"] for m in memberships]
    members_map = {}
    if member_ids:
        members_cursor = db.members.find(
            {"id": {"$in": member_ids}},
            {"_id": 0, "id": 1, "full_name": 1, "phone_whatsapp": 1, "photo_base64": 1},
        )
        async for m in members_cursor:
            members_map[m["id"]] = m

    for membership in memberships:
        membership["member"] = members_map.get(membership["member_id"])

    return memberships


@router.post("/{group_id}/members/add", status_code=status.HTTP_201_CREATED)
async def add_group_member(
    group_id: str,
    member_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Add member to group manually (staff)."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")

    # Ensure group exists
    group = await db.groups.find_one({"id": group_id, "church_id": church_id})
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Group not found"},
        )

    # Ensure member exists
    member = await db.members.find_one({"id": member_id, "church_id": church_id})
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Member not found"},
        )

    # Check existing active membership
    existing = await db.group_memberships.find_one(
        {"church_id": church_id, "group_id": group_id, "member_id": member_id, "status": "active"}
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "ALREADY_MEMBER", "message": "Member is already in this group"},
        )

    now = datetime.utcnow()
    membership = {
        "id": str(uuid.uuid4()),
        "church_id": church_id,
        "group_id": group_id,
        "member_id": member_id,
        "status": "active",
        "joined_at": now,
        "left_at": None,
    }
    await db.group_memberships.insert_one(membership)

    await audit_service.log_action(
        db=db,
        church_id=church_id,
        user_id=user_id,
        action_type="create",
        module="group_membership",
        description=f"Added member {member.get('full_name')} to group {group.get('name')}",
        after_data={"group_id": group_id, "member_id": member_id},
    )

    membership.pop("_id", None)
    return membership


@router.post("/{group_id}/members/remove")
async def remove_group_member(
    group_id: str,
    member_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Remove member from group (staff)."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")

    membership = await db.group_memberships.find_one(
        {"church_id": church_id, "group_id": group_id, "member_id": member_id, "status": "active"}
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Active membership not found"},
        )

    await db.group_memberships.update_one(
        {"id": membership["id"]},
        {"$set": {"status": "removed", "left_at": datetime.utcnow()}},
    )

    await audit_service.log_action(
        db=db,
        church_id=church_id,
        user_id=user_id,
        action_type="update",
        module="group_membership",
        description=f"Removed member {membership['member_id']} from group {group_id}",
    )

    updated = await db.group_memberships.find_one({"id": membership["id"]}, {"_id": 0})
    return updated
