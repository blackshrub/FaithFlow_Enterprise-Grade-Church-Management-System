from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from datetime import datetime
import uuid

from models.prayer_request import PrayerRequestBase, PrayerRequestUpdate
from utils.dependencies import get_db, get_current_user
from utils.tenant_utils import get_current_church_id
from services import audit_service

router = APIRouter(prefix="/prayer-requests", tags=["Prayer Requests"])


@router.get("/")
async def list_prayer_requests(
    search: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    assigned_to: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List prayer requests with filters."""
    church_id = get_current_church_id(current_user)
    
    query = {"church_id": church_id}
    
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"requester_name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    if status:
        query["status"] = status
    
    if category:
        query["category"] = category
    
    if assigned_to:
        query["assigned_to_user_id"] = assigned_to
    
    if start_date or end_date:
        query["created_at"] = {}
        if start_date:
            query["created_at"]["$gte"] = datetime.fromisoformat(start_date)
        if end_date:
            query["created_at"]["$lte"] = datetime.fromisoformat(end_date)
    
    total = await db.prayer_requests.count_documents(query)
    cursor = db.prayer_requests.find(query, {"_id": 0}).sort("created_at", -1).skip(offset).limit(limit)
    requests = await cursor.to_list(length=limit)
    
    return {
        "data": requests,
        "pagination": {
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_more": (offset + limit) < total
        }
    }


@router.get("/{request_id}")
async def get_prayer_request(
    request_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get single prayer request."""
    church_id = get_current_church_id(current_user)
    
    prayer_request = await db.prayer_requests.find_one(
        {"id": request_id, "church_id": church_id},
        {"_id": 0}
    )
    
    if not prayer_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Prayer request not found"}
        )
    
    # Get member info if linked
    if prayer_request.get("member_id"):
        member = await db.members.find_one(
            {"id": prayer_request["member_id"]},
            {"_id": 0, "full_name": 1, "email": 1, "whatsapp": 1}
        )
        prayer_request["member"] = member
    
    return prayer_request


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_prayer_request(
    prayer_data: PrayerRequestBase,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create new prayer request."""
    church_id = get_current_church_id(current_user)
    user_id = current_user.get("id")
    
    prayer_dict = prayer_data.model_dump()
    prayer_dict["church_id"] = church_id
    prayer_dict["created_by"] = user_id
    prayer_dict["id"] = str(uuid.uuid4())
    prayer_dict["prayed_at"] = None
    prayer_dict["updated_by"] = None
    prayer_dict["created_at"] = datetime.utcnow()
    prayer_dict["updated_at"] = datetime.utcnow()
    
    await db.prayer_requests.insert_one(prayer_dict)
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="create", module="prayer_request",
        description=f"Created prayer request: {prayer_dict['title']}",
        after_data={"id": prayer_dict["id"], "title": prayer_dict["title"]}
    )
    
    prayer_dict.pop("_id", None)
    return prayer_dict


@router.put("/{request_id}")
async def update_prayer_request(
    request_id: str,
    prayer_data: PrayerRequestUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update prayer request."""
    church_id = get_current_church_id(current_user)
    user_id = current_user.get("id")
    
    # Debug logging
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Prayer request update payload: {prayer_data.model_dump(exclude_unset=True)}")
    
    existing = await db.prayer_requests.find_one(
        {"id": request_id, "church_id": church_id}
    )
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Prayer request not found"}
        )
    
    update_dict = prayer_data.model_dump(exclude_unset=True)
    if not update_dict:
        return existing
    
    # If status changed to "prayed", set prayed_at timestamp
    if update_dict.get("status") == "prayed" and existing.get("status") != "prayed":
        update_dict["prayed_at"] = datetime.utcnow()
    
    # If status changed back to "new", clear prayed_at
    if update_dict.get("status") == "new" and existing.get("status") == "prayed":
        update_dict["prayed_at"] = None
    
    update_dict["updated_by"] = user_id
    update_dict["updated_at"] = datetime.utcnow()
    
    await db.prayer_requests.update_one(
        {"id": request_id},
        {"$set": update_dict}
    )
    
    updated = await db.prayer_requests.find_one({"id": request_id}, {"_id": 0})
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="update", module="prayer_request",
        description=f"Updated prayer request: {existing['title']}",
        before_data={k: existing.get(k) for k in update_dict.keys()},
        after_data={k: updated.get(k) for k in update_dict.keys()}
    )
    
    return updated


@router.delete("/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_prayer_request(
    request_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete prayer request."""
    church_id = get_current_church_id(current_user)
    user_id = current_user.get("id")
    
    prayer_request = await db.prayer_requests.find_one(
        {"id": request_id, "church_id": church_id}
    )
    
    if not prayer_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Prayer request not found"}
        )
    
    await db.prayer_requests.delete_one({"id": request_id})
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="delete", module="prayer_request",
        description=f"Deleted prayer request: {prayer_request['title']}"
    )
    
    return None
