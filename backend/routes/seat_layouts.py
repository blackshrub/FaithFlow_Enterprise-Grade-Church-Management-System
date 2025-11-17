from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from datetime import datetime
import string

from models.seat_layout import SeatLayout, SeatLayoutCreate, SeatLayoutUpdate
from utils.dependencies import get_db, require_admin, get_current_user

router = APIRouter(prefix="/seat-layouts", tags=["Seat Layouts"])


@router.post("/", response_model=SeatLayout, status_code=status.HTTP_201_CREATED)
async def create_seat_layout(
    layout_data: SeatLayoutCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Create a new seat layout"""
    
    if current_user.get('role') != 'super_admin' and current_user.get('church_id') != layout_data.church_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Generate default seat map (all available)
    if not layout_data.seat_map:
        seat_map = {}
        for row_idx in range(layout_data.rows):
            row_letter = string.ascii_uppercase[row_idx]
            for col in range(1, layout_data.columns + 1):
                seat_id = f"{row_letter}{col}"
                seat_map[seat_id] = "available"
        layout_data.seat_map = seat_map
    
    layout = SeatLayout(**layout_data.model_dump())
    layout_doc = layout.model_dump()
    layout_doc['created_at'] = layout_doc['created_at'].isoformat()
    layout_doc['updated_at'] = layout_doc['updated_at'].isoformat()
    
    await db.seat_layouts.insert_one(layout_doc)
    return layout


@router.get("/", response_model=List[SeatLayout])
async def list_seat_layouts(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """List all seat layouts for current church"""
    
    query = {}
    if current_user.get('role') != 'super_admin':
        query['church_id'] = current_user.get('church_id')
    
    layouts = await db.seat_layouts.find(query, {"_id": 0}).to_list(100)
    
    for layout in layouts:
        if isinstance(layout.get('created_at'), str):
            layout['created_at'] = datetime.fromisoformat(layout['created_at'])
        if isinstance(layout.get('updated_at'), str):
            layout['updated_at'] = datetime.fromisoformat(layout['updated_at'])
    
    return layouts


@router.get("/{layout_id}", response_model=SeatLayout)
async def get_seat_layout(
    layout_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Get seat layout by ID"""
    
    layout = await db.seat_layouts.find_one({"id": layout_id}, {"_id": 0})
    if not layout:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seat layout not found")
    
    if current_user.get('role') != 'super_admin' and current_user.get('church_id') != layout.get('church_id'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    if isinstance(layout.get('created_at'), str):
        layout['created_at'] = datetime.fromisoformat(layout['created_at'])
    if isinstance(layout.get('updated_at'), str):
        layout['updated_at'] = datetime.fromisoformat(layout['updated_at'])
    
    return layout


@router.patch("/{layout_id}", response_model=SeatLayout)
async def update_seat_layout(
    layout_id: str,
    layout_data: SeatLayoutUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Update seat layout"""
    
    layout = await db.seat_layouts.find_one({"id": layout_id})
    if not layout:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seat layout not found")
    
    if current_user.get('role') != 'super_admin' and current_user.get('church_id') != layout.get('church_id'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    update_data = layout_data.model_dump(exclude_unset=True)
    if update_data:
        update_data['updated_at'] = datetime.now().isoformat()
        await db.seat_layouts.update_one({"id": layout_id}, {"$set": update_data})
    
    updated_layout = await db.seat_layouts.find_one({"id": layout_id}, {"_id": 0})
    if isinstance(updated_layout.get('created_at'), str):
        updated_layout['created_at'] = datetime.fromisoformat(updated_layout['created_at'])
    if isinstance(updated_layout.get('updated_at'), str):
        updated_layout['updated_at'] = datetime.fromisoformat(updated_layout['updated_at'])
    
    return updated_layout


@router.delete("/{layout_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_seat_layout(
    layout_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Delete seat layout"""
    
    layout = await db.seat_layouts.find_one({"id": layout_id})
    if not layout:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seat layout not found")
    
    if current_user.get('role') != 'super_admin' and current_user.get('church_id') != layout.get('church_id'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    await db.seat_layouts.delete_one({"id": layout_id})
    return None
