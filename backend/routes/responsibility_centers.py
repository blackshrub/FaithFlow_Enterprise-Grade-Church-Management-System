from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from datetime import datetime

from models.responsibility_center import ResponsibilityCenterCreate, ResponsibilityCenterUpdate
from utils.dependencies import get_db, get_current_user
from utils.tenant_utils import get_current_church_id
from utils import error_codes
from utils.error_response import error_response
from services import audit_service
import uuid

router = APIRouter(prefix="/accounting/responsibility-centers", tags=["Responsibility Centers"])


@router.get("/")
async def list_responsibility_centers(
    type: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List all responsibility centers."""
    church_id = get_current_church_id(current_user)
    
    query = {"church_id": church_id}
    if type:
        query["type"] = type
    if is_active is not None:
        query["is_active"] = is_active
    
    cursor = db.responsibility_centers.find(query, {"_id": 0}).sort("code", 1)
    centers = await cursor.to_list(length=None)
    
    return centers


@router.get("/{center_id}")
async def get_responsibility_center(
    center_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get single responsibility center."""
    church_id = get_current_church_id(current_user)
    
    center = await db.responsibility_centers.find_one(
        {"id": center_id, "church_id": church_id},
        {"_id": 0}
    )
    
    if not center:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Responsibility center not found"}
        )
    
    return center


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_responsibility_center(
    center_data: ResponsibilityCenterCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create new responsibility center."""
    church_id = get_current_church_id(current_user)
    user_id = current_user.get("id")
    
    center_dict = center_data.model_dump()
    center_dict["church_id"] = church_id
    
    # Check code uniqueness
    existing = await db.responsibility_centers.find_one({
        "church_id": church_id,
        "code": center_dict["code"]
    })
    
    if existing:
        error_response(
            error_code="CODE_EXISTS",
            message=f"Responsibility center code {center_dict['code']} already exists"
        )
    
    # Calculate level
    if center_dict.get("parent_id"):
        parent = await db.responsibility_centers.find_one({"id": center_dict["parent_id"]})
        if parent:
            center_dict["level"] = parent.get("level", 0) + 1
    
    center_dict["id"] = str(uuid.uuid4())
    center_dict["created_at"] = datetime.utcnow()
    center_dict["updated_at"] = datetime.utcnow()
    
    await db.responsibility_centers.insert_one(center_dict)
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="create", module="responsibility_center",
        description=f"Created {center_dict['name']}",
        after_data={"id": center_dict["id"], "name": center_dict["name"]}
    )
    
    center_dict.pop("_id", None)
    return center_dict


@router.put("/{center_id}")
async def update_responsibility_center(
    center_id: str,
    center_data: ResponsibilityCenterUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update responsibility center."""
    church_id = get_current_church_id(current_user)
    user_id = current_user.get("id")
    
    existing = await db.responsibility_centers.find_one(
        {"id": center_id, "church_id": church_id}
    )
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Responsibility center not found"}
        )
    
    update_dict = center_data.model_dump(exclude_unset=True)
    if not update_dict:
        return existing
    
    update_dict["updated_at"] = datetime.utcnow()
    
    await db.responsibility_centers.update_one(
        {"id": center_id},
        {"$set": update_dict}
    )
    
    updated = await db.responsibility_centers.find_one({"id": center_id}, {"_id": 0})
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="update", module="responsibility_center",
        description=f"Updated {existing['name']}",
        before_data={k: existing.get(k) for k in update_dict.keys()},
        after_data={k: updated.get(k) for k in update_dict.keys()}
    )
    
    return updated


@router.delete("/{center_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_responsibility_center(
    center_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete responsibility center."""
    church_id = get_current_church_id(current_user)
    user_id = current_user.get("id")
    
    existing = await db.responsibility_centers.find_one(
        {"id": center_id, "church_id": church_id}
    )
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Responsibility center not found"}
        )
    
    await db.responsibility_centers.delete_one({"id": center_id})
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="delete", module="responsibility_center",
        description=f"Deleted {existing['name']}",
        before_data={"id": existing.get("id"), "name": existing.get("name")}
    )
    
    return None
