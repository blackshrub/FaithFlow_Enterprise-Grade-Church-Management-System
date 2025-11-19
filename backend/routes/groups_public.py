from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from datetime import datetime

from utils.dependencies import get_db

router = APIRouter(prefix="/public/groups", tags=["Public Groups API"])


@router.get("/")
async def list_public_groups(
    church_id: str = Query(..., description="Church ID"),
    category: Optional[str] = None,
    search: Optional[str] = None,
    is_open_for_join: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """List groups visible to mobile app (public)."""
    query = {"church_id": church_id}

    if category:
        query["category"] = category

    if is_open_for_join is not None:
        query["is_open_for_join"] = is_open_for_join

    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"leader_name": {"$regex": search, "$options": "i"}},
        ]

    total = await db.groups.count_documents(query)
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
        "is_open_for_join": 1,
    }
    cursor = (
        db.groups.find(query, projection)
        .sort("name", 1)
        .skip(offset)
        .limit(limit)
    )
    groups = await cursor.to_list(length=limit)

    # Optionally, compute member counts per group
    group_ids = [g["id"] for g in groups]
    if group_ids:
        pipeline = [
            {"$match": {"group_id": {"$in": group_ids}, "status": "active"}},
            {"$group": {"_id": "$group_id", "count": {"$sum": 1}}},
        ]
        counts = await db.group_memberships.aggregate(pipeline).to_list(length=None)
        counts_map = {c["_id"]: c["count"] for c in counts}
        for g in groups:
            g["members_count"] = counts_map.get(g["id"], 0)

    return {
        "data": groups,
        "pagination": {
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_more": (offset + limit) < total,
        },
    }


@router.get("/{group_id}")
async def get_public_group(
    group_id: str,
    church_id: str = Query(..., description="Church ID"),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get single group details (public)."""
    group = await db.groups.find_one(
        {"id": group_id, "church_id": church_id},
        {"_id": 0},
    )
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Group not found"},
        )

    # Attach current active members count
    active_count = await db.group_memberships.count_documents(
        {"group_id": group_id, "church_id": church_id, "status": "active"}
    )
    group["members_count"] = active_count

    return group
