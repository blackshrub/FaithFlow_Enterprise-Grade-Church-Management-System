from fastapi import APIRouter, Depends, HTTPException, status, Body
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from datetime import datetime
import logging

from models.rule_evaluation_conflict import RuleEvaluationConflict
from utils.dependencies import get_db, require_admin, get_current_user
from services.status_automation_service import StatusAutomationService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/status-conflicts", tags=["Status Conflicts"])


@router.get("/", response_model=List[RuleEvaluationConflict])
async def list_conflicts(
    pending_only: bool = True,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all rule evaluation conflicts for current church"""
    
    query = {}
    if current_user.get('role') != 'super_admin':
        query['church_id'] = current_user.get('session_church_id')
    
    if pending_only:
        query['status'] = 'pending'
    
    conflicts = await db.rule_evaluation_conflicts.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    # Convert ISO strings to datetime
    for conflict in conflicts:
        if isinstance(conflict.get('created_at'), str):
            conflict['created_at'] = datetime.fromisoformat(conflict['created_at'])
        if isinstance(conflict.get('updated_at'), str):
            conflict['updated_at'] = datetime.fromisoformat(conflict['updated_at'])
        if conflict.get('resolved_at') and isinstance(conflict['resolved_at'], str):
            conflict['resolved_at'] = datetime.fromisoformat(conflict['resolved_at'])
    
    return conflicts


@router.get("/{conflict_id}", response_model=RuleEvaluationConflict)
async def get_conflict(
    conflict_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get conflict by ID"""
    
    conflict = await db.rule_evaluation_conflicts.find_one({"id": conflict_id}, {"_id": 0})
    if not conflict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conflict not found"
        )
    
    # Check access
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != conflict.get('church_id'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Convert ISO strings
    if isinstance(conflict.get('created_at'), str):
        conflict['created_at'] = datetime.fromisoformat(conflict['created_at'])
    if isinstance(conflict.get('updated_at'), str):
        conflict['updated_at'] = datetime.fromisoformat(conflict['updated_at'])
    if conflict.get('resolved_at') and isinstance(conflict['resolved_at'], str):
        conflict['resolved_at'] = datetime.fromisoformat(conflict['resolved_at'])
    
    return conflict


@router.post("/{conflict_id}/resolve")
async def resolve_conflict(
    conflict_id: str,
    selected_status_id: str = Body(..., embed=True),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Resolve a conflict by selecting one of the possible statuses"""
    
    conflict = await db.rule_evaluation_conflicts.find_one({"id": conflict_id})
    if not conflict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conflict not found"
        )
    
    # Check access
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != conflict.get('church_id'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Check if already resolved
    if conflict.get('status') == 'resolved':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conflict already resolved"
        )
    
    # Validate selected status is one of the possible statuses
    possible_status_ids = [s.get('id') for s in conflict.get('possible_statuses', [])]
    if selected_status_id not in possible_status_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected status is not one of the possible options"
        )
    
    # Change member status
    success = await StatusAutomationService.change_member_status(
        member_id=conflict.get('member_id'),
        new_status_id=selected_status_id,
        change_type='conflict_resolved',
        db=db,
        user_id=current_user.get('id'),
        user_name=current_user.get('full_name'),
        notes=f"Resolved from conflict by {current_user.get('full_name')}"
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update member status"
        )
    
    # Mark conflict as resolved
    await db.rule_evaluation_conflicts.update_one(
        {"id": conflict_id},
        {
            "$set": {
                "status": "resolved",
                "resolved_by_user_id": current_user.get('id'),
                "resolved_by_user_name": current_user.get('full_name'),
                "resolved_status_id": selected_status_id,
                "resolved_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
        }
    )
    
    logger.info(f"Conflict {conflict_id} resolved by {current_user.get('full_name')}: {conflict.get('member_name')} -> status {selected_status_id}")
    
    return {
        "message": "Conflict resolved successfully",
        "conflict_id": conflict_id,
        "member_id": conflict.get('member_id'),
        "selected_status_id": selected_status_id
    }


@router.delete("/{conflict_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conflict(
    conflict_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Delete a conflict (admin only, usually for cleanup)"""
    
    conflict = await db.rule_evaluation_conflicts.find_one({"id": conflict_id})
    if not conflict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conflict not found"
        )
    
    # Check access
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != conflict.get('church_id'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    await db.rule_evaluation_conflicts.delete_one({"id": conflict_id})
    return None
