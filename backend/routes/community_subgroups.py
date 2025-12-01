"""
Community Sub-groups API Routes

Endpoints for managing sub-groups within communities.

Admin Routes (v1):
- GET    /v1/communities/{id}/subgroups - List sub-groups
- POST   /v1/communities/{id}/subgroups - Create sub-group
- GET    /v1/subgroups/{id} - Get sub-group details
- PATCH  /v1/subgroups/{id} - Update sub-group
- DELETE /v1/subgroups/{id} - Delete sub-group

Mobile Routes:
- GET    /mobile/communities/{id}/subgroups - List sub-groups
- POST   /mobile/communities/{id}/subgroups - Create sub-group
- GET    /mobile/subgroups/{id} - Get sub-group details
- PATCH  /mobile/subgroups/{id} - Update sub-group (admins only)
- DELETE /mobile/subgroups/{id} - Delete sub-group (admins only)
- POST   /mobile/subgroups/{id}/join - Join sub-group
- POST   /mobile/subgroups/{id}/leave - Leave sub-group
- GET    /mobile/subgroups/{id}/members - List sub-group members
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
from datetime import datetime
import uuid
import logging

from models.community_subgroup import (
    CommunitySubgroup,
    CommunitySubgroupCreate,
    CommunitySubgroupUpdate,
    SubgroupMembership,
    SubgroupWithStatus
)
from utils.dependencies import get_db, get_current_user, get_current_member
from utils.tenant_utils import get_session_church_id_from_user

logger = logging.getLogger(__name__)

# Admin router (v1 prefix added in server.py)
router = APIRouter(prefix="/communities", tags=["Community Sub-groups"])

# Mobile router
mobile_router = APIRouter(prefix="/mobile", tags=["Mobile Community Sub-groups"])


# ============================================================================
# Helper Functions
# ============================================================================

async def get_community_or_404(
    db: AsyncIOMotorDatabase,
    community_id: str,
    church_id: str
) -> dict:
    """Get community or raise 404."""
    community = await db.communities.find_one({
        "id": community_id,
        "church_id": church_id
    })
    if not community:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community not found"
        )
    return community


async def get_subgroup_or_404(
    db: AsyncIOMotorDatabase,
    subgroup_id: str,
    church_id: str
) -> dict:
    """Get sub-group or raise 404."""
    subgroup = await db.community_subgroups.find_one({
        "id": subgroup_id,
        "church_id": church_id
    })
    if not subgroup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sub-group not found"
        )
    return subgroup


async def check_community_membership(
    db: AsyncIOMotorDatabase,
    community_id: str,
    member_id: str,
    church_id: str
) -> dict:
    """Check if member is part of community."""
    membership = await db.community_memberships.find_one({
        "community_id": community_id,
        "member_id": member_id,
        "church_id": church_id,
        "status": "active"
    })
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of the community first"
        )
    return membership


async def check_subgroup_admin(
    db: AsyncIOMotorDatabase,
    subgroup: dict,
    member_id: str,
    community_membership: dict
) -> bool:
    """Check if member is a sub-group admin or community leader."""
    # Community admins/leaders can manage all sub-groups
    if community_membership.get("role") in ["admin", "leader"]:
        return True

    # Sub-group admins
    if member_id in subgroup.get("admin_member_ids", []):
        return True

    # Creator of sub-group
    if subgroup.get("created_by_member_id") == member_id:
        return True

    return False


async def get_member_info(
    db: AsyncIOMotorDatabase,
    member_id: str,
    church_id: str
) -> dict:
    """Get member basic info."""
    member = await db.members.find_one(
        {"id": member_id, "church_id": church_id},
        {"_id": 0, "id": 1, "full_name": 1, "photo_base64": 1, "photo_url": 1, "photo_thumbnail_url": 1}
    )
    if not member:
        return {"id": member_id, "name": "Unknown", "avatar_fid": None}
    # Prefer SeaweedFS URL over legacy base64
    avatar = member.get("photo_url") or member.get("photo_base64")
    return {
        "id": member["id"],
        "name": member.get("full_name", "Unknown"),
        "avatar_fid": avatar,
        "avatar_url": member.get("photo_url"),
        "avatar_thumbnail": member.get("photo_thumbnail_url")
    }


async def enrich_subgroup_with_status(
    db: AsyncIOMotorDatabase,
    subgroup: dict,
    member_id: str,
    church_id: str
) -> dict:
    """Add membership status and unread count to sub-group."""
    # Check if member is in this sub-group
    sg_membership = await db.subgroup_memberships.find_one({
        "subgroup_id": subgroup["id"],
        "member_id": member_id,
        "church_id": church_id
    })

    subgroup["is_member"] = sg_membership is not None
    subgroup["my_role"] = sg_membership.get("role") if sg_membership else None

    # Get unread count (messages after last read)
    # For now, simplified to 0 - can be enhanced with read tracking
    subgroup["unread_count"] = 0

    # Get last message preview
    last_msg = await db.community_messages.find_one(
        {
            "church_id": church_id,
            "community_id": subgroup["community_id"],
            "subgroup_id": subgroup["id"],
            "is_deleted": {"$ne": True}
        },
        {"_id": 0, "id": 1, "sender_name": 1, "text": 1, "message_type": 1, "created_at": 1},
        sort=[("created_at", -1)]
    )

    if last_msg:
        subgroup["last_message"] = {
            "id": last_msg["id"],
            "sender_name": last_msg.get("sender_name", "Unknown"),
            "text_preview": (last_msg.get("text") or f"[{last_msg.get('message_type', 'message')}]")[:50],
            "message_type": last_msg.get("message_type", "text"),
            "created_at": last_msg.get("created_at").isoformat() if last_msg.get("created_at") else None
        }
    else:
        subgroup["last_message"] = None

    return subgroup


# ============================================================================
# Mobile Routes - List Sub-groups
# ============================================================================

@mobile_router.get("/communities/{community_id}/subgroups")
async def mobile_list_subgroups(
    community_id: str,
    include_inactive: bool = Query(False, description="Include inactive sub-groups"),
    current_member: dict = Depends(get_current_member),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    List all sub-groups in a community.
    Member must be part of the community.
    """
    member_id = current_member.get("id")
    church_id = current_member.get("church_id")

    # Verify community membership
    await check_community_membership(db, community_id, member_id, church_id)

    # Build query
    query = {
        "church_id": church_id,
        "community_id": community_id
    }
    if not include_inactive:
        query["is_active"] = True

    # Fetch sub-groups
    cursor = db.community_subgroups.find(query, {"_id": 0}).sort("created_at", -1)
    subgroups = await cursor.to_list(length=100)

    # Enrich with membership status
    enriched = []
    for sg in subgroups:
        enriched.append(await enrich_subgroup_with_status(db, sg, member_id, church_id))

    return {
        "subgroups": enriched,
        "total": len(enriched)
    }


# ============================================================================
# Mobile Routes - Create Sub-group
# ============================================================================

@mobile_router.post("/communities/{community_id}/subgroups", status_code=status.HTTP_201_CREATED)
async def mobile_create_subgroup(
    community_id: str,
    data: CommunitySubgroupCreate,
    current_member: dict = Depends(get_current_member),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Create a new sub-group in a community.
    Requires community membership.
    May require leader approval based on community settings.
    """
    member_id = current_member.get("id")
    church_id = current_member.get("church_id")

    # Verify community and membership
    community = await get_community_or_404(db, community_id, church_id)
    membership = await check_community_membership(db, community_id, member_id, church_id)

    # Check if sub-groups are allowed
    settings = community.get("settings", {})
    allow_create = settings.get("allow_member_create_subgroups", True)

    # Non-leaders can only create if allowed
    is_leader = membership.get("role") in ["admin", "leader"]
    if not is_leader and not allow_create:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only leaders can create sub-groups in this community"
        )

    # Check for duplicate name
    existing = await db.community_subgroups.find_one({
        "church_id": church_id,
        "community_id": community_id,
        "name": {"$regex": f"^{data.name}$", "$options": "i"}
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A sub-group with this name already exists"
        )

    # Create sub-group
    now = datetime.utcnow()
    subgroup = CommunitySubgroup(
        id=str(uuid.uuid4()),
        church_id=church_id,
        community_id=community_id,
        name=data.name,
        description=data.description,
        cover_image_fid=data.cover_image_fid,
        created_by_member_id=member_id,
        admin_member_ids=[member_id],  # Creator is automatically admin
        member_count=1,
        is_active=True,
        created_at=now,
        updated_at=now
    )

    await db.community_subgroups.insert_one(subgroup.model_dump())

    # Auto-join creator to sub-group
    sg_membership = SubgroupMembership(
        id=str(uuid.uuid4()),
        church_id=church_id,
        community_id=community_id,
        subgroup_id=subgroup.id,
        member_id=member_id,
        role="admin",
        joined_at=now
    )
    await db.subgroup_memberships.insert_one(sg_membership.model_dump())

    logger.info(f"Sub-group created: {subgroup.id} in community {community_id} by member {member_id}")

    return {
        "subgroup": subgroup.model_dump(),
        "message": "Sub-group created successfully"
    }


# ============================================================================
# Mobile Routes - Get Sub-group Details
# ============================================================================

@mobile_router.get("/subgroups/{subgroup_id}")
async def mobile_get_subgroup(
    subgroup_id: str,
    current_member: dict = Depends(get_current_member),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get sub-group details."""
    member_id = current_member.get("id")
    church_id = current_member.get("church_id")

    # Get sub-group
    subgroup = await get_subgroup_or_404(db, subgroup_id, church_id)

    # Verify community membership
    await check_community_membership(db, subgroup["community_id"], member_id, church_id)

    # Enrich with status
    enriched = await enrich_subgroup_with_status(db, subgroup, member_id, church_id)

    return enriched


# ============================================================================
# Mobile Routes - Update Sub-group
# ============================================================================

@mobile_router.patch("/subgroups/{subgroup_id}")
async def mobile_update_subgroup(
    subgroup_id: str,
    data: CommunitySubgroupUpdate,
    current_member: dict = Depends(get_current_member),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Update sub-group details.
    Only sub-group admins or community leaders can update.
    """
    member_id = current_member.get("id")
    church_id = current_member.get("church_id")

    # Get sub-group
    subgroup = await get_subgroup_or_404(db, subgroup_id, church_id)

    # Verify community membership
    membership = await check_community_membership(db, subgroup["community_id"], member_id, church_id)

    # Check admin permission
    if not await check_subgroup_admin(db, subgroup, member_id, membership):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only sub-group admins can update this sub-group"
        )

    # Build update
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_data["updated_at"] = datetime.utcnow()

    # Check for duplicate name if name is being updated
    if "name" in update_data:
        existing = await db.community_subgroups.find_one({
            "church_id": church_id,
            "community_id": subgroup["community_id"],
            "name": {"$regex": f"^{update_data['name']}$", "$options": "i"},
            "id": {"$ne": subgroup_id}
        })
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A sub-group with this name already exists"
            )

    await db.community_subgroups.update_one(
        {"id": subgroup_id, "church_id": church_id},
        {"$set": update_data}
    )

    # Get updated sub-group
    updated = await db.community_subgroups.find_one({"id": subgroup_id}, {"_id": 0})

    return {
        "subgroup": updated,
        "message": "Sub-group updated successfully"
    }


# ============================================================================
# Mobile Routes - Delete Sub-group
# ============================================================================

@mobile_router.delete("/subgroups/{subgroup_id}")
async def mobile_delete_subgroup(
    subgroup_id: str,
    current_member: dict = Depends(get_current_member),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Delete (deactivate) a sub-group.
    Only sub-group creator or community leaders can delete.
    """
    member_id = current_member.get("id")
    church_id = current_member.get("church_id")

    # Get sub-group
    subgroup = await get_subgroup_or_404(db, subgroup_id, church_id)

    # Verify community membership
    membership = await check_community_membership(db, subgroup["community_id"], member_id, church_id)

    # Only creator or community leaders can delete
    is_leader = membership.get("role") in ["admin", "leader"]
    is_creator = subgroup.get("created_by_member_id") == member_id

    if not is_leader and not is_creator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the creator or community leaders can delete this sub-group"
        )

    # Soft delete - set inactive
    await db.community_subgroups.update_one(
        {"id": subgroup_id, "church_id": church_id},
        {
            "$set": {
                "is_active": False,
                "updated_at": datetime.utcnow()
            }
        }
    )

    logger.info(f"Sub-group deleted: {subgroup_id} by member {member_id}")

    return {"success": True, "message": "Sub-group deleted successfully"}


# ============================================================================
# Mobile Routes - Join Sub-group
# ============================================================================

@mobile_router.post("/subgroups/{subgroup_id}/join")
async def mobile_join_subgroup(
    subgroup_id: str,
    current_member: dict = Depends(get_current_member),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Join a sub-group.
    Must be a member of the parent community.
    """
    member_id = current_member.get("id")
    church_id = current_member.get("church_id")

    # Get sub-group
    subgroup = await get_subgroup_or_404(db, subgroup_id, church_id)

    # Check if active
    if not subgroup.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This sub-group is no longer active"
        )

    # Verify community membership
    await check_community_membership(db, subgroup["community_id"], member_id, church_id)

    # Check if already a member
    existing = await db.subgroup_memberships.find_one({
        "subgroup_id": subgroup_id,
        "member_id": member_id,
        "church_id": church_id
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already a member of this sub-group"
        )

    # Create membership
    now = datetime.utcnow()
    sg_membership = SubgroupMembership(
        id=str(uuid.uuid4()),
        church_id=church_id,
        community_id=subgroup["community_id"],
        subgroup_id=subgroup_id,
        member_id=member_id,
        role="member",
        joined_at=now
    )
    await db.subgroup_memberships.insert_one(sg_membership.model_dump())

    # Increment member count
    await db.community_subgroups.update_one(
        {"id": subgroup_id},
        {
            "$inc": {"member_count": 1},
            "$set": {"updated_at": now}
        }
    )

    logger.info(f"Member {member_id} joined sub-group {subgroup_id}")

    return {"success": True, "message": "Joined sub-group successfully"}


# ============================================================================
# Mobile Routes - Leave Sub-group
# ============================================================================

@mobile_router.post("/subgroups/{subgroup_id}/leave")
async def mobile_leave_subgroup(
    subgroup_id: str,
    current_member: dict = Depends(get_current_member),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Leave a sub-group.
    Creator cannot leave (must delete instead or transfer ownership).
    """
    member_id = current_member.get("id")
    church_id = current_member.get("church_id")

    # Get sub-group
    subgroup = await get_subgroup_or_404(db, subgroup_id, church_id)

    # Check if creator
    if subgroup.get("created_by_member_id") == member_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Creator cannot leave the sub-group. Delete it instead or transfer ownership."
        )

    # Check membership
    existing = await db.subgroup_memberships.find_one({
        "subgroup_id": subgroup_id,
        "member_id": member_id,
        "church_id": church_id
    })
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are not a member of this sub-group"
        )

    # Remove membership
    await db.subgroup_memberships.delete_one({"id": existing["id"]})

    # Remove from admin list if admin
    if member_id in subgroup.get("admin_member_ids", []):
        await db.community_subgroups.update_one(
            {"id": subgroup_id},
            {"$pull": {"admin_member_ids": member_id}}
        )

    # Decrement member count
    now = datetime.utcnow()
    await db.community_subgroups.update_one(
        {"id": subgroup_id},
        {
            "$inc": {"member_count": -1},
            "$set": {"updated_at": now}
        }
    )

    logger.info(f"Member {member_id} left sub-group {subgroup_id}")

    return {"success": True, "message": "Left sub-group successfully"}


# ============================================================================
# Mobile Routes - List Sub-group Members
# ============================================================================

@mobile_router.get("/subgroups/{subgroup_id}/members")
async def mobile_list_subgroup_members(
    subgroup_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_member: dict = Depends(get_current_member),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List members of a sub-group."""
    member_id = current_member.get("id")
    church_id = current_member.get("church_id")

    # Get sub-group
    subgroup = await get_subgroup_or_404(db, subgroup_id, church_id)

    # Verify community membership
    await check_community_membership(db, subgroup["community_id"], member_id, church_id)

    # Fetch memberships
    cursor = db.subgroup_memberships.find(
        {"subgroup_id": subgroup_id, "church_id": church_id},
        {"_id": 0}
    ).sort("joined_at", -1).skip(offset).limit(limit)

    memberships = await cursor.to_list(length=limit)

    # Enrich with member info
    member_ids = [m["member_id"] for m in memberships]
    members_map = {}
    if member_ids:
        members_cursor = db.members.find(
            {"id": {"$in": member_ids}, "church_id": church_id},
            {"_id": 0, "id": 1, "full_name": 1, "photo_base64": 1, "photo_url": 1, "photo_thumbnail_url": 1}
        )
        async for m in members_cursor:
            members_map[m["id"]] = m

    result = []
    for membership in memberships:
        member_info = members_map.get(membership["member_id"], {})
        result.append({
            "id": membership["id"],
            "member_id": membership["member_id"],
            "member_name": member_info.get("full_name", "Unknown"),
            "member_avatar": member_info.get("photo_url") or member_info.get("photo_base64"),
            "member_avatar_url": member_info.get("photo_url"),
            "member_avatar_thumbnail": member_info.get("photo_thumbnail_url"),
            "role": membership.get("role", "member"),
            "joined_at": membership.get("joined_at").isoformat() if membership.get("joined_at") else None
        })

    # Get total count
    total = await db.subgroup_memberships.count_documents({
        "subgroup_id": subgroup_id,
        "church_id": church_id
    })

    return {
        "members": result,
        "total": total,
        "limit": limit,
        "offset": offset
    }


# ============================================================================
# Admin Routes (v1) - List Sub-groups
# ============================================================================

@router.get("/{community_id}/subgroups")
async def admin_list_subgroups(
    community_id: str,
    include_inactive: bool = Query(False),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List all sub-groups in a community (admin)."""
    church_id = get_session_church_id_from_user(current_user)

    # Verify community exists
    await get_community_or_404(db, community_id, church_id)

    query = {
        "church_id": church_id,
        "community_id": community_id
    }
    if not include_inactive:
        query["is_active"] = True

    cursor = db.community_subgroups.find(query, {"_id": 0}).sort("created_at", -1)
    subgroups = await cursor.to_list(length=100)

    return {
        "subgroups": subgroups,
        "total": len(subgroups)
    }


# ============================================================================
# Admin Routes (v1) - Create Sub-group
# ============================================================================

@router.post("/{community_id}/subgroups", status_code=status.HTTP_201_CREATED)
async def admin_create_subgroup(
    community_id: str,
    data: CommunitySubgroupCreate,
    created_by_member_id: Optional[str] = Query(None, description="Member ID of creator"),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create a sub-group (admin)."""
    church_id = get_session_church_id_from_user(current_user)
    user_id = current_user.get("id")

    # Verify community exists
    await get_community_or_404(db, community_id, church_id)

    # Check for duplicate name
    existing = await db.community_subgroups.find_one({
        "church_id": church_id,
        "community_id": community_id,
        "name": {"$regex": f"^{data.name}$", "$options": "i"}
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A sub-group with this name already exists"
        )

    # Use provided member_id or admin's user_id
    creator_id = created_by_member_id or user_id

    now = datetime.utcnow()
    subgroup = CommunitySubgroup(
        id=str(uuid.uuid4()),
        church_id=church_id,
        community_id=community_id,
        name=data.name,
        description=data.description,
        cover_image_fid=data.cover_image_fid,
        created_by_member_id=creator_id,
        admin_member_ids=[creator_id] if created_by_member_id else [],
        member_count=1 if created_by_member_id else 0,
        is_active=True,
        created_at=now,
        updated_at=now
    )

    await db.community_subgroups.insert_one(subgroup.model_dump())

    # Auto-add creator as member if specified
    if created_by_member_id:
        sg_membership = SubgroupMembership(
            id=str(uuid.uuid4()),
            church_id=church_id,
            community_id=community_id,
            subgroup_id=subgroup.id,
            member_id=created_by_member_id,
            role="admin",
            joined_at=now
        )
        await db.subgroup_memberships.insert_one(sg_membership.model_dump())

    return subgroup.model_dump()


# ============================================================================
# Admin Routes (v1) - Get/Update/Delete Sub-group
# ============================================================================

@router.get("/{community_id}/subgroups/{subgroup_id}")
async def admin_get_subgroup(
    community_id: str,
    subgroup_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get sub-group details (admin)."""
    church_id = get_session_church_id_from_user(current_user)

    subgroup = await db.community_subgroups.find_one({
        "id": subgroup_id,
        "community_id": community_id,
        "church_id": church_id
    }, {"_id": 0})

    if not subgroup:
        raise HTTPException(status_code=404, detail="Sub-group not found")

    return subgroup


@router.patch("/{community_id}/subgroups/{subgroup_id}")
async def admin_update_subgroup(
    community_id: str,
    subgroup_id: str,
    data: CommunitySubgroupUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update sub-group (admin)."""
    church_id = get_session_church_id_from_user(current_user)

    # Verify exists
    subgroup = await db.community_subgroups.find_one({
        "id": subgroup_id,
        "community_id": community_id,
        "church_id": church_id
    })
    if not subgroup:
        raise HTTPException(status_code=404, detail="Sub-group not found")

    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_data["updated_at"] = datetime.utcnow()

    await db.community_subgroups.update_one(
        {"id": subgroup_id, "church_id": church_id},
        {"$set": update_data}
    )

    updated = await db.community_subgroups.find_one({"id": subgroup_id}, {"_id": 0})
    return updated


@router.delete("/{community_id}/subgroups/{subgroup_id}")
async def admin_delete_subgroup(
    community_id: str,
    subgroup_id: str,
    hard_delete: bool = Query(False, description="Permanently delete"),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete sub-group (admin)."""
    church_id = get_session_church_id_from_user(current_user)

    subgroup = await db.community_subgroups.find_one({
        "id": subgroup_id,
        "community_id": community_id,
        "church_id": church_id
    })
    if not subgroup:
        raise HTTPException(status_code=404, detail="Sub-group not found")

    if hard_delete:
        # Permanently delete
        await db.community_subgroups.delete_one({"id": subgroup_id})
        await db.subgroup_memberships.delete_many({"subgroup_id": subgroup_id})
        await db.community_messages.delete_many({
            "subgroup_id": subgroup_id,
            "church_id": church_id
        })
    else:
        # Soft delete
        await db.community_subgroups.update_one(
            {"id": subgroup_id},
            {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
        )

    return {"success": True, "hard_delete": hard_delete}
