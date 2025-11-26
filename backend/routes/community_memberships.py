"""
Community Memberships Routes (formerly Group Memberships)

Staff operations for managing community members.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from datetime import datetime
import uuid

from models.community_membership import CommunityMembership, CommunityMembershipCreate, CommunityMembershipUpdate
from utils.dependencies import get_db, get_current_user
from utils.dependencies import get_session_church_id
from services import audit_service

router = APIRouter(prefix="/communities", tags=["Community Memberships"])


@router.get("/{community_id}/members")
async def list_community_members(
    community_id: str,
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """List members of a community (staff)."""
    church_id = get_session_church_id(current_user)

    query = {"church_id": church_id, "community_id": community_id}

    # Default to active members only unless status filter specified
    if status_filter:
        query["status"] = status_filter
    else:
        query["status"] = "active"  # Default: show only active members

    cursor = db.community_memberships.find(query, {"_id": 0})
    memberships = await cursor.to_list(length=None)

    # Join member basic info for convenience
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


@router.post("/{community_id}/members/add", status_code=status.HTTP_201_CREATED)
async def add_community_member(
    community_id: str,
    member_id: str,
    role: str = Query("member", description="Role: member, admin, or leader"),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Add member to community manually (staff)."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")

    # Validate role
    if role not in ["member", "admin", "leader"]:
        role = "member"

    # Ensure community exists
    community = await db.communities.find_one({"id": community_id, "church_id": church_id})
    if not community:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Community not found"},
        )

    # Ensure member exists
    member = await db.members.find_one({"id": member_id, "church_id": church_id})
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Member not found"},
        )

    # Check existing active membership
    existing = await db.community_memberships.find_one(
        {"church_id": church_id, "community_id": community_id, "member_id": member_id, "status": "active"}
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "ALREADY_MEMBER", "message": "Member is already in this community"},
        )

    now = datetime.utcnow()
    membership = {
        "id": str(uuid.uuid4()),
        "church_id": church_id,
        "community_id": community_id,
        "member_id": member_id,
        "role": role,
        "status": "active",
        "notifications_enabled": True,
        "muted_until": None,
        "joined_at": now,
        "left_at": None,
    }
    await db.community_memberships.insert_one(membership)

    # Update member count
    await db.communities.update_one(
        {"id": community_id},
        {"$inc": {"member_count": 1}}
    )

    await audit_service.log_action(
        db=db,
        church_id=church_id,
        user_id=user_id,
        action_type="create",
        module="community_membership",
        description=f"Added member {member.get('full_name')} to community {community.get('name')} as {role}",
        after_data={"community_id": community_id, "member_id": member_id, "role": role},
    )

    membership.pop("_id", None)
    return membership


@router.post("/{community_id}/members/remove")
async def remove_community_member(
    community_id: str,
    member_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Remove member from community (staff)."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")

    membership = await db.community_memberships.find_one(
        {"church_id": church_id, "community_id": community_id, "member_id": member_id, "status": "active"}
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Active membership not found"},
        )

    await db.community_memberships.update_one(
        {"id": membership["id"]},
        {"$set": {"status": "removed", "left_at": datetime.utcnow()}},
    )

    # Update member count
    await db.communities.update_one(
        {"id": community_id},
        {"$inc": {"member_count": -1}}
    )

    await audit_service.log_action(
        db=db,
        church_id=church_id,
        user_id=user_id,
        action_type="update",
        module="community_membership",
        description=f"Removed member {membership['member_id']} from community {community_id}",
    )

    updated = await db.community_memberships.find_one({"id": membership["id"]}, {"_id": 0})
    return updated


@router.put("/{community_id}/members/{member_id}/role")
async def update_member_role(
    community_id: str,
    member_id: str,
    role: str = Query(..., description="New role: member, admin, or leader"),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Update member role in community (staff)."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")

    # Validate role
    if role not in ["member", "admin", "leader"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "INVALID_ROLE", "message": "Role must be: member, admin, or leader"},
        )

    membership = await db.community_memberships.find_one(
        {"church_id": church_id, "community_id": community_id, "member_id": member_id, "status": "active"}
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Active membership not found"},
        )

    old_role = membership.get("role", "member")

    await db.community_memberships.update_one(
        {"id": membership["id"]},
        {"$set": {"role": role}},
    )

    # If promoting to leader, also add to leader_member_ids in community
    if role == "leader":
        await db.communities.update_one(
            {"id": community_id},
            {"$addToSet": {"leader_member_ids": member_id}}
        )
    elif old_role == "leader" and role != "leader":
        # Remove from leader_member_ids if demoting from leader
        await db.communities.update_one(
            {"id": community_id},
            {"$pull": {"leader_member_ids": member_id}}
        )

    await audit_service.log_action(
        db=db,
        church_id=church_id,
        user_id=user_id,
        action_type="update",
        module="community_membership",
        description=f"Changed member {member_id} role from {old_role} to {role} in community {community_id}",
        before_data={"role": old_role},
        after_data={"role": role},
    )

    updated = await db.community_memberships.find_one({"id": membership["id"]}, {"_id": 0})
    return updated
