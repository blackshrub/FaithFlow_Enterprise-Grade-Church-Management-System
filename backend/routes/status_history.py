from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from datetime import datetime

from models.member_status_history import MemberStatusHistory
from utils.dependencies import get_db, get_current_user

router = APIRouter(prefix="/api/members", tags=["Member Status History"])


@router.get("/{member_id}/status-history", response_model=List[MemberStatusHistory])
async def get_member_status_history(
    member_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get status change history for a member"""
    
    # Get member to verify access
    member = await db.members.find_one({"id": member_id})
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )
    
    # Check access
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != member.get('church_id'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Get history
    history = await db.member_status_history.find(
        {"member_id": member_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    # Convert ISO strings to datetime
    for entry in history:
        if isinstance(entry.get('created_at'), str):
            entry['created_at'] = datetime.fromisoformat(entry['created_at'])
    
    return history
