from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from datetime import datetime

from models.church import Church, ChurchCreate, ChurchUpdate
from utils.dependencies import get_db, get_current_user, require_super_admin

router = APIRouter(prefix="/churches", tags=["Churches"])


@router.get("/public/list")
async def list_public_churches(
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List all active churches (public endpoint for login page)"""
    churches = await db.churches.find(
        {"is_active": True},
        {"_id": 0, "id": 1, "name": 1}
    ).to_list(100)
    return churches


@router.post("/", response_model=Church, status_code=status.HTTP_201_CREATED)
async def create_church(
    church_data: ChurchCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_super_admin)
):
    """Create a new church (super admin only)"""
    church = Church(**church_data.model_dump())
    church_doc = church.model_dump()
    church_doc['created_at'] = church_doc['created_at'].isoformat()
    church_doc['updated_at'] = church_doc['updated_at'].isoformat()
    
    if church_doc.get('established_date'):
        church_doc['established_date'] = church_doc['established_date'].isoformat()
    
    await db.churches.insert_one(church_doc)
    return church


@router.get("/", response_model=List[Church])
async def list_churches(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all churches. Super admin sees all, others see only their church."""
    
    if current_user.get('role') == 'super_admin':
        churches = await db.churches.find({}, {"_id": 0}).to_list(1000)
    else:
        churches = await db.churches.find(
            {"id": current_user.get('session_church_id') or current_user.get('church_id')},
            {"_id": 0}
        ).to_list(1)
    
    # Convert ISO strings to datetime
    for church in churches:
        if isinstance(church.get('created_at'), str):
            church['created_at'] = datetime.fromisoformat(church['created_at'])
        if isinstance(church.get('updated_at'), str):
            church['updated_at'] = datetime.fromisoformat(church['updated_at'])
        if church.get('established_date') and isinstance(church['established_date'], str):
            church['established_date'] = datetime.fromisoformat(church['established_date'])
    
    return churches


@router.get("/{church_id}", response_model=Church)
async def get_church(
    church_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get church by ID"""
    
    # Non-super admins can only access their own church
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') or current_user.get('church_id') != church_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    church = await db.churches.find_one({"id": church_id}, {"_id": 0})
    if not church:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Church not found"
        )
    
    # Convert ISO strings to datetime
    if isinstance(church.get('created_at'), str):
        church['created_at'] = datetime.fromisoformat(church['created_at'])
    if isinstance(church.get('updated_at'), str):
        church['updated_at'] = datetime.fromisoformat(church['updated_at'])
    if church.get('established_date') and isinstance(church['established_date'], str):
        church['established_date'] = datetime.fromisoformat(church['established_date'])
    
    return church


@router.patch("/{church_id}", response_model=Church)
async def update_church(
    church_id: str,
    church_data: ChurchUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_super_admin)
):
    """Update church (super admin only)"""
    church = await db.churches.find_one({"id": church_id})
    if not church:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Church not found"
        )
    
    # Update only provided fields
    update_data = church_data.model_dump(exclude_unset=True)
    if update_data:
        update_data['updated_at'] = datetime.now().isoformat()
        
        if update_data.get('established_date'):
            update_data['established_date'] = update_data['established_date'].isoformat()
        
        await db.churches.update_one(
            {"id": church_id},
            {"$set": update_data}
        )
    
    # Get updated church
    updated_church = await db.churches.find_one({"id": church_id}, {"_id": 0})
    
    # Convert ISO strings to datetime
    if isinstance(updated_church.get('created_at'), str):
        updated_church['created_at'] = datetime.fromisoformat(updated_church['created_at'])
    if isinstance(updated_church.get('updated_at'), str):
        updated_church['updated_at'] = datetime.fromisoformat(updated_church['updated_at'])
    if updated_church.get('established_date') and isinstance(updated_church['established_date'], str):
        updated_church['established_date'] = datetime.fromisoformat(updated_church['established_date'])
    
    return updated_church


@router.delete("/{church_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_church(
    church_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_super_admin)
):
    """Delete church (super admin only)"""
    result = await db.churches.delete_one({"id": church_id})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Church not found"
        )
    return None
