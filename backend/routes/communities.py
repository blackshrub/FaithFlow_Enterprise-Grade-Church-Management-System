"""
Communities Routes (formerly Groups)

Admin/Staff CRUD operations for communities.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from datetime import datetime
import uuid
import base64

from models.community import CommunityBase, CommunityUpdate, Community
from utils.dependencies import get_db, get_current_user
from utils.dependencies import get_session_church_id
from services import audit_service
from utils.error_response import error_response
from utils.validation import sanitize_regex_pattern

router = APIRouter(prefix="/communities", tags=["Communities"])


@router.get("/")
async def list_communities(
    category: Optional[str] = None,
    search: Optional[str] = None,
    is_open_for_join: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """List communities for current church (staff)."""
    church_id = get_session_church_id(current_user)

    query = {"church_id": church_id}

    if category:
        query["category"] = category

    if is_open_for_join is not None:
        query["is_open_for_join"] = is_open_for_join

    if search:
        # Sanitize search pattern to prevent ReDoS attacks
        safe_pattern = sanitize_regex_pattern(search)
        query["$or"] = [
            {"name": {"$regex": safe_pattern, "$options": "i"}},
            {"description": {"$regex": safe_pattern, "$options": "i"}},
            {"leader_name": {"$regex": safe_pattern, "$options": "i"}},
        ]

    # Use aggregation to get member counts in single query (eliminates N+1 problem)
    pipeline = [
        {"$match": query},
        {"$sort": {"name": 1}},
        {
            "$facet": {
                "metadata": [{"$count": "total"}],
                "data": [
                    {"$skip": offset},
                    {"$limit": limit},
                    {
                        "$lookup": {
                            "from": "community_memberships",
                            "let": {"community_id": "$id", "church_id": "$church_id"},
                            "pipeline": [
                                {
                                    "$match": {
                                        "$expr": {
                                            "$and": [
                                                {"$eq": ["$community_id", "$$community_id"]},
                                                {"$eq": ["$church_id", "$$church_id"]},
                                                {"$eq": ["$status", "active"]}
                                            ]
                                        }
                                    }
                                },
                                {"$count": "count"}
                            ],
                            "as": "membership_count"
                        }
                    },
                    {
                        "$addFields": {
                            "members_count": {
                                "$ifNull": [
                                    {"$arrayElemAt": ["$membership_count.count", 0]},
                                    0
                                ]
                            }
                        }
                    },
                    {"$project": {"_id": 0, "membership_count": 0}}
                ]
            }
        }
    ]

    result = await db.communities.aggregate(pipeline).to_list(length=1)
    total = result[0]["metadata"][0]["total"] if result[0]["metadata"] else 0
    communities = result[0]["data"] if result else []

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
async def get_community(
    community_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get single community details (staff)."""
    church_id = get_session_church_id(current_user)

    community = await db.communities.find_one(
        {"id": community_id, "church_id": church_id}, {"_id": 0}
    )
    if not community:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Community not found"},
        )

    # Add member count
    member_count = await db.community_memberships.count_documents({
        "church_id": church_id,
        "community_id": community_id,
        "status": "active"
    })
    community["members_count"] = member_count

    return community


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_community(
    community_data: CommunityBase,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Create new community (staff)."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")

    community_dict = community_data.model_dump()

    # Handle leader resolution
    leader_member_id = community_dict.get("leader_member_id")
    leader_member_ids = community_dict.get("leader_member_ids", [])

    # If single leader_member_id provided, add to leader_member_ids
    if leader_member_id and leader_member_id not in leader_member_ids:
        leader_member_ids.append(leader_member_id)
        community_dict["leader_member_ids"] = leader_member_ids

    # Resolve primary leader name & contact from first leader
    if leader_member_ids:
        primary_leader_id = leader_member_ids[0]
        member = await db.members.find_one(
            {"id": primary_leader_id, "church_id": church_id},
            {"_id": 0, "full_name": 1, "phone_whatsapp": 1},
        )
        if member:
            community_dict["leader_name"] = member.get("full_name")
            community_dict["leader_contact"] = member.get("phone_whatsapp")
            community_dict["leader_member_id"] = primary_leader_id

    # Ensure settings is a dict
    if "settings" in community_dict and hasattr(community_dict["settings"], "model_dump"):
        community_dict["settings"] = community_dict["settings"].model_dump()

    community_dict["id"] = str(uuid.uuid4())
    community_dict["church_id"] = church_id
    community_dict["member_count"] = 0
    community_dict["created_at"] = datetime.utcnow()
    community_dict["updated_at"] = datetime.utcnow()

    await db.communities.insert_one(community_dict)

    await audit_service.log_action(
        db=db,
        church_id=church_id,
        user_id=user_id,
        action_type="create",
        module="community",
        description=f"Created community: {community_dict['name']}",
        after_data={"id": community_dict["id"], "name": community_dict["name"]},
    )

    community_dict.pop("_id", None)
    return community_dict


@router.put("/{community_id}")
async def update_community(
    community_id: str,
    community_data: CommunityUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Update existing community (staff)."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")

    existing = await db.communities.find_one({"id": community_id, "church_id": church_id})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Community not found"},
        )

    update_dict = community_data.model_dump(exclude_unset=True)
    if not update_dict:
        return existing

    # Handle leader_member_ids update
    if "leader_member_ids" in update_dict:
        leader_member_ids = update_dict.get("leader_member_ids", [])
        if leader_member_ids:
            # Update primary leader info
            primary_leader_id = leader_member_ids[0]
            member = await db.members.find_one(
                {"id": primary_leader_id, "church_id": church_id},
                {"_id": 0, "full_name": 1, "phone_whatsapp": 1},
            )
            if member:
                update_dict["leader_name"] = member.get("full_name")
                update_dict["leader_contact"] = member.get("phone_whatsapp")
                update_dict["leader_member_id"] = primary_leader_id
        else:
            update_dict["leader_name"] = None
            update_dict["leader_contact"] = None
            update_dict["leader_member_id"] = None

    # Handle legacy leader_member_id update
    elif "leader_member_id" in update_dict:
        leader_member_id = update_dict.get("leader_member_id")
        if leader_member_id:
            member = await db.members.find_one(
                {"id": leader_member_id, "church_id": church_id},
                {"_id": 0, "full_name": 1, "phone_whatsapp": 1},
            )
            if not member:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "error_code": "LEADER_MEMBER_NOT_FOUND",
                        "message": "Selected leader member not found for this church",
                    },
                )
            update_dict["leader_name"] = member.get("full_name")
            update_dict["leader_contact"] = member.get("phone_whatsapp")
            # Also add to leader_member_ids
            existing_leaders = existing.get("leader_member_ids", [])
            if leader_member_id not in existing_leaders:
                update_dict["leader_member_ids"] = [leader_member_id] + existing_leaders
        else:
            update_dict["leader_name"] = None
            update_dict["leader_contact"] = None

    # Handle settings update
    if "settings" in update_dict and hasattr(update_dict["settings"], "model_dump"):
        update_dict["settings"] = update_dict["settings"].model_dump()

    update_dict["updated_at"] = datetime.utcnow()

    await db.communities.update_one({"id": community_id}, {"$set": update_dict})

    updated = await db.communities.find_one({"id": community_id}, {"_id": 0})

    await audit_service.log_action(
        db=db,
        church_id=church_id,
        user_id=user_id,
        action_type="update",
        module="community",
        description=f"Updated community: {existing['name']}",
        before_data={k: existing.get(k) for k in update_dict.keys()},
        after_data={k: updated.get(k) for k in update_dict.keys()},
    )

    return updated


@router.delete("/{community_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_community(
    community_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Delete community (staff)."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")

    existing = await db.communities.find_one({"id": community_id, "church_id": church_id})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Community not found"},
        )

    # Prevent delete if active members exist
    active_members = await db.community_memberships.count_documents(
        {"church_id": church_id, "community_id": community_id, "status": "active"}
    )
    if active_members > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "COMMUNITY_HAS_ACTIVE_MEMBERS",
                "message": f"Cannot delete community with {active_members} active member(s). Please remove all members first."
            }
        )

    await db.communities.delete_one({"id": community_id})

    await audit_service.log_action(
        db=db,
        church_id=church_id,
        user_id=user_id,
        action_type="delete",
        module="community",
        description=f"Deleted community: {existing['name']}",
        before_data={"id": existing.get("id"), "name": existing.get("name")},
    )

    return None


@router.post("/{community_id}/upload-cover", status_code=status.HTTP_201_CREATED)
async def upload_community_cover(
    community_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Upload cover image for community (staff)."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")

    community = await db.communities.find_one({"id": community_id, "church_id": church_id})
    if not community:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Community not found"},
        )

    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "INVALID_FILE_TYPE",
                "message": f"File type {file.content_type} not allowed. Use jpg, png, or webp",
            }
        )

    content = await file.read()
    if len(content) > 3 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "FILE_SIZE_EXCEEDED",
                "message": "Image must be less than 3MB",
            }
        )

    # Convert to base64 (will migrate to SeaweedFS in Phase 2)
    base64_data = base64.b64encode(content).decode('utf-8')

    mime_types = {
        'image/jpeg': 'image/jpeg',
        'image/jpg': 'image/jpeg',
        'image/png': 'image/png',
        'image/webp': 'image/webp'
    }
    mime_type = mime_types.get(file.content_type, 'image/jpeg')
    cover_image_base64 = f"data:{mime_type};base64,{base64_data}"

    await db.communities.update_one(
        {"id": community_id},
        {"$set": {"cover_image": cover_image_base64, "updated_at": datetime.utcnow()}},
    )

    await audit_service.log_action(
        db=db,
        church_id=church_id,
        user_id=user_id,
        action_type="update",
        module="community",
        description=f"Uploaded cover image for community: {community['name']}",
    )

    return {"cover_image": cover_image_base64}
