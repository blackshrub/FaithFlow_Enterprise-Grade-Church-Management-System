"""
Communities Public API Routes (formerly Groups Public)

Public endpoints for mobile app to browse and view communities.
No authentication required (uses church_id query parameter).
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional

from utils.dependencies import get_db
from utils.validation import sanitize_regex_pattern

router = APIRouter(prefix="/public/communities", tags=["Public Communities API"])


@router.get("/")
async def list_public_communities(
    church_id: str = Query(..., description="Church ID"),
    category: Optional[str] = None,
    search: Optional[str] = None,
    is_open_for_join: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """List communities visible to mobile app (public)."""
    query = {"church_id": church_id}

    if category:
        query["category"] = category

    if is_open_for_join is not None:
        query["is_open_for_join"] = is_open_for_join

    if search:
        safe_pattern = sanitize_regex_pattern(search)
        query["$or"] = [
            {"name": {"$regex": safe_pattern, "$options": "i"}},
            {"description": {"$regex": safe_pattern, "$options": "i"}},
            {"leader_name": {"$regex": safe_pattern, "$options": "i"}},
        ]

    total = await db.communities.count_documents(query)
    projection = {
        "_id": 0,
        "id": 1,
        "name": 1,
        "description": 1,
        "category": 1,
        "cover_image": 1,
        "meeting_schedule": 1,
        "location": 1,
        "leader_name": 1,
        "leader_contact": 1,
        "leader_member_ids": 1,
        "is_open_for_join": 1,
        "settings": 1,
        "member_count": 1,
    }
    cursor = (
        db.communities.find(query, projection)
        .sort("name", 1)
        .skip(offset)
        .limit(limit)
    )
    communities = await cursor.to_list(length=limit)

    # Compute member counts if not cached
    community_ids = [c["id"] for c in communities]
    if community_ids:
        pipeline = [
            {"$match": {"community_id": {"$in": community_ids}, "status": "active"}},
            {"$group": {"_id": "$community_id", "count": {"$sum": 1}}},
        ]
        counts = await db.community_memberships.aggregate(pipeline).to_list(length=500)
        counts_map = {c["_id"]: c["count"] for c in counts}
        for c in communities:
            c["members_count"] = counts_map.get(c["id"], c.get("member_count", 0))

    return {
        "data": communities,
        "pagination": {
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_more": (offset + limit) < total,
        },
    }


@router.get("/{community_id}")
async def get_public_community(
    community_id: str,
    church_id: str = Query(..., description="Church ID"),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get single community details (public)."""
    community = await db.communities.find_one(
        {"id": community_id, "church_id": church_id},
        {"_id": 0},
    )
    if not community:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Community not found"},
        )

    # Attach current active members count
    active_count = await db.community_memberships.count_documents(
        {"community_id": community_id, "church_id": church_id, "status": "active"}
    )
    community["members_count"] = active_count

    return community


@router.get("/{community_id}/members")
async def get_public_community_members(
    community_id: str,
    church_id: str = Query(..., description="Church ID"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get community members (public - for showing member list in app).

    Returns limited member info (name, photo) based on community settings.
    """
    community = await db.communities.find_one(
        {"id": community_id, "church_id": church_id},
        {"_id": 0, "settings": 1},
    )
    if not community:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Community not found"},
        )

    # Check if member list is visible
    settings = community.get("settings", {})
    if not settings.get("show_member_list", True):
        return {
            "data": [],
            "hidden": True,
            "message": "Member list is hidden for this community",
        }

    # Get active memberships
    cursor = db.community_memberships.find(
        {"community_id": community_id, "church_id": church_id, "status": "active"},
        {"_id": 0, "member_id": 1, "role": 1, "joined_at": 1}
    ).skip(offset).limit(limit)

    memberships = await cursor.to_list(length=limit)
    total = await db.community_memberships.count_documents(
        {"community_id": community_id, "church_id": church_id, "status": "active"}
    )

    # Get member details (multi-tenant: filter by church_id)
    member_ids = [m["member_id"] for m in memberships]
    members_map = {}
    if member_ids:
        members_cursor = db.members.find(
            {"id": {"$in": member_ids}, "church_id": church_id},
            {"_id": 0, "id": 1, "full_name": 1, "photo_base64": 1},
        )
        async for m in members_cursor:
            members_map[m["id"]] = m

    result = []
    for membership in memberships:
        member = members_map.get(membership["member_id"], {})
        result.append({
            "member_id": membership["member_id"],
            "role": membership.get("role", "member"),
            "joined_at": membership.get("joined_at"),
            "full_name": member.get("full_name"),
            "photo_base64": member.get("photo_base64"),
        })

    return {
        "data": result,
        "pagination": {
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_more": (offset + limit) < total,
        },
    }
