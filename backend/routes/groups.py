from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from datetime import datetime
from pathlib import Path
import uuid
import aiofiles

from models.group import GroupBase, GroupUpdate, Group
from models.member import Member
from utils.dependencies import get_db, get_current_user
from utils.dependencies import get_session_church_id
from services import audit_service
from utils.error_response import error_response
from utils.validation import sanitize_regex_pattern

router = APIRouter(prefix="/groups", tags=["Groups"])


@router.get("/")
async def list_groups(
    category: Optional[str] = None,
    search: Optional[str] = None,
    is_open_for_join: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """List groups for current church (staff)."""
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
                            "from": "group_memberships",
                            "let": {"group_id": "$id", "church_id": "$church_id"},
                            "pipeline": [
                                {
                                    "$match": {
                                        "$expr": {
                                            "$and": [
                                                {"$eq": ["$group_id", "$$group_id"]},
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

    result = await db.groups.aggregate(pipeline).to_list(length=1)
    total = result[0]["metadata"][0]["total"] if result[0]["metadata"] else 0
    groups = result[0]["data"] if result else []

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
async def get_group(
    group_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get single group details (staff)."""
    church_id = get_session_church_id(current_user)

    group = await db.groups.find_one({"id": group_id, "church_id": church_id}, {"_id": 0})
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Group not found"},
        )

    # Add member count
    member_count = await db.group_memberships.count_documents({
        "church_id": church_id,
        "group_id": group_id,
        "status": "active"
    })
    group["members_count"] = member_count

    return group


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_group(
    group_data: GroupBase,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Create new group (staff)."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")

    group_dict = group_data.model_dump()

    # If leader_member_id provided, resolve leader name & contact from members collection
    leader_member_id = group_dict.get("leader_member_id")
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
        group_dict["leader_name"] = member.get("full_name")
        group_dict["leader_contact"] = member.get("phone_whatsapp")

    group_dict["id"] = str(uuid.uuid4())
    group_dict["church_id"] = church_id
    group_dict["created_at"] = datetime.utcnow()
    group_dict["updated_at"] = datetime.utcnow()

    await db.groups.insert_one(group_dict)

    await audit_service.log_action(
        db=db,
        church_id=church_id,
        user_id=user_id,
        action_type="create",
        module="group",
        description=f"Created group: {group_dict['name']}",
        after_data={"id": group_dict["id"], "name": group_dict["name"]},
    )

    group_dict.pop("_id", None)
    return group_dict


@router.put("/{group_id}")
async def update_group(
    group_id: str,
    group_data: GroupUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Update existing group (staff)."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")

    existing = await db.groups.find_one({"id": group_id, "church_id": church_id})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Group not found"},
        )

    update_dict = group_data.model_dump(exclude_unset=True)
    if not update_dict:
        return existing

    # If leader_member_id is being updated, resolve name & contact from members
    if "leader_member_id" in update_dict:
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
        else:
            # Clearing leader; also clear cached name/contact
            update_dict["leader_name"] = None
            update_dict["leader_contact"] = None

    update_dict["updated_at"] = datetime.utcnow()

    await db.groups.update_one({"id": group_id}, {"$set": update_dict})

    updated = await db.groups.find_one({"id": group_id}, {"_id": 0})

    await audit_service.log_action(
        db=db,
        church_id=church_id,
        user_id=user_id,
        action_type="update",
        module="group",
        description=f"Updated group: {existing['name']}",
        before_data={k: existing.get(k) for k in update_dict.keys()},
        after_data={k: updated.get(k) for k in update_dict.keys()},
    )

    return updated


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(
    group_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Delete group (staff)."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")

    existing = await db.groups.find_one({"id": group_id, "church_id": church_id})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Group not found"},
        )

    # Optionally: prevent delete if active members exist
    active_members = await db.group_memberships.count_documents(
        {"church_id": church_id, "group_id": group_id, "status": "active"}
    )
    if active_members > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "GROUP_HAS_ACTIVE_MEMBERS",
                "message": f"Cannot delete group with {active_members} active member(s). Please remove all members first."
            }
        )

    await db.groups.delete_one({"id": group_id})

    await audit_service.log_action(
        db=db,
        church_id=church_id,
        user_id=user_id,
        action_type="delete",
        module="group",
        description=f"Deleted group: {existing['name']}",
        before_data={"id": existing.get("id"), "name": existing.get("name")},
    )

    return None


@router.post("/{group_id}/upload-cover", status_code=status.HTTP_201_CREATED)
async def upload_group_cover(
    group_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Upload cover image for group (staff)."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")

    group = await db.groups.find_one({"id": group_id, "church_id": church_id})
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Group not found"},
        )

    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        error_response(
            error_code="INVALID_FILE_TYPE",
            message=f"File type {file.content_type} not allowed. Use jpg, png, or webp",
        )

    content = await file.read()
    if len(content) > 3 * 1024 * 1024:
        error_response(
            error_code="FILE_SIZE_EXCEEDED",
            message="Image must be less than 3MB",
        )

    # Convert to base64 instead of saving to file system
    import base64
    base64_data = base64.b64encode(content).decode('utf-8')
    
    # Determine MIME type
    mime_types = {
        'image/jpeg': 'image/jpeg',
        'image/jpg': 'image/jpeg',
        'image/png': 'image/png',
        'image/webp': 'image/webp'
    }
    mime_type = mime_types.get(file.content_type, 'image/jpeg')
    cover_image_base64 = f"data:{mime_type};base64,{base64_data}"

    await db.groups.update_one(
        {"id": group_id},
        {"$set": {"cover_image": cover_image_base64, "updated_at": datetime.utcnow()}},
    )

    await audit_service.log_action(
        db=db,
        church_id=church_id,
        user_id=user_id,
        action_type="update",
        module="group",
        description=f"Uploaded cover image for group: {group['name']}",
    )

    return {"cover_image": cover_image_base64}
