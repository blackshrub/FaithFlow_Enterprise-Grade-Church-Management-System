from fastapi import APIRouter, Depends, HTTPException, status, Body, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging

from models.member_status import MemberStatus, MemberStatusCreate, MemberStatusUpdate
from models.member_status_rule import MemberStatusRule, MemberStatusRuleCreate, MemberStatusRuleUpdate
from models.rule_evaluation_conflict import RuleEvaluationConflict
from models.member_status_history import MemberStatusHistory
from utils.dependencies import get_db, require_admin, get_current_user
from services.status_rule_engine_v2 import RuleEngineService
from services.status_automation_service_v2 import StatusAutomationService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v1/member-status", tags=["Member Status Automation"])


# ============= STATUSES ENDPOINTS =============

@router.get("/statuses", response_model=List[MemberStatus])
async def list_statuses(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all member statuses for current church"""
    query = {}
    if current_user.get('role') != 'super_admin':
        query['church_id'] = current_user.get('session_church_id')
    
    statuses = await db.member_statuses.find(query, {"_id": 0}).sort("display_order", 1).to_list(100)
    
    for s in statuses:
        if isinstance(s.get('created_at'), str):
            s['created_at'] = datetime.fromisoformat(s['created_at'])
        if isinstance(s.get('updated_at'), str):
            s['updated_at'] = datetime.fromisoformat(s['updated_at'])
    
    return statuses


@router.post("/statuses", response_model=MemberStatus, status_code=status.HTTP_201_CREATED)
async def create_status(
    status_data: MemberStatusCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Create a new member status"""
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != status_data.church_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Check uniqueness
    existing = await db.member_statuses.find_one({
        "church_id": status_data.church_id,
        "name": status_data.name
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Member status with this name already exists"
        )
    
    member_status = MemberStatus(**status_data.model_dump(mode='json'))
    status_doc = member_status.model_dump(mode='json')
    # mode='json' already converts datetime to ISO strings

    # Enforce single default
    if status_doc.get('is_default'):
        await db.member_statuses.update_many(
            {"church_id": status_data.church_id},
            {"$set": {"is_default": False}}
        )
    
    await db.member_statuses.insert_one(status_doc)
    return member_status


@router.put("/statuses/{status_id}", response_model=MemberStatus)
async def update_status(
    status_id: str,
    status_data: MemberStatusUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Update member status"""
    status_obj = await db.member_statuses.find_one({"id": status_id})
    if not status_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Status not found")
    
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != status_obj.get('church_id'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Prevent editing name of system status
    if status_obj.get('is_system') and status_data.name and status_data.name != status_obj.get('name'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change name of system status"
        )
    
    update_data = status_data.model_dump(mode='json', exclude_unset=True)
    if update_data:
        update_data['updated_at'] = datetime.now().isoformat()
        
        if update_data.get('is_default'):
            await db.member_statuses.update_many(
                {"church_id": status_obj.get('church_id')},
                {"$set": {"is_default": False}}
            )
        
        await db.member_statuses.update_one(
            {"id": status_id},
            {"$set": update_data}
        )
    
    updated = await db.member_statuses.find_one({"id": status_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    
    return updated


@router.delete("/statuses/{status_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_status(
    status_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Delete member status"""
    status_obj = await db.member_statuses.find_one({"id": status_id})
    if not status_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Status not found")
    
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != status_obj.get('church_id'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    if status_obj.get('is_system'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete system status"
        )
    
    # Check usage in rules
    rules_count = await db.member_status_rules.count_documents({
        "church_id": status_obj.get('church_id'),
        "action_status_id": status_id
    })
    
    if rules_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete: {rules_count} rule(s) reference this status"
        )
    
    await db.member_statuses.delete_one({"id": status_id})
    return None


# ============= RULES ENDPOINTS =============

@router.get("/rules", response_model=List[MemberStatusRule])
async def list_rules(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all status rules for current church"""
    query = {}
    if current_user.get('role') != 'super_admin':
        query['church_id'] = current_user.get('session_church_id')
    
    rules = await db.member_status_rules.find(query, {"_id": 0}).sort("priority", -1).to_list(1000)
    
    for rule in rules:
        if isinstance(rule.get('created_at'), str):
            rule['created_at'] = datetime.fromisoformat(rule['created_at'])
        if isinstance(rule.get('updated_at'), str):
            rule['updated_at'] = datetime.fromisoformat(rule['updated_at'])
    
    return rules


@router.post("/rules", response_model=MemberStatusRule, status_code=status.HTTP_201_CREATED)
async def create_rule(
    rule_data: MemberStatusRuleCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Create a new status rule"""
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != rule_data.church_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Validate
    if rule_data.rule_type == 'status_based' and not rule_data.current_status_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="current_status_id required for status_based rules"
        )
    
    if not rule_data.conditions or len(rule_data.conditions) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one condition is required"
        )
    
    # Validate target != current for status-based
    if rule_data.rule_type == 'status_based' and rule_data.action_status_id == rule_data.current_status_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target status must be different from current status"
        )
    
    rule = MemberStatusRule(**rule_data.model_dump(mode='json'))
    
    # Generate human-readable
    statuses_map = {}
    all_statuses = await db.member_statuses.find({"church_id": rule_data.church_id}, {"_id": 0}).to_list(100)
    for s in all_statuses:
        statuses_map[s.get('id')] = s.get('name')
    
    rule_dict = rule.model_dump(mode='json')
    human_readable = RuleEngineService.translate_rule_to_human(rule_dict, statuses_map)
    rule_dict['human_readable'] = human_readable
    # mode='json' already converts datetime to ISO strings

    await db.member_status_rules.insert_one(rule_dict)
    logger.info(f"Status rule created: {rule.name}")
    return rule


@router.put("/rules/{rule_id}", response_model=MemberStatusRule)
async def update_rule(
    rule_id: str,
    rule_data: MemberStatusRuleUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Update status rule"""
    rule = await db.member_status_rules.find_one({"id": rule_id})
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
    
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != rule.get('church_id'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    update_data = rule_data.model_dump(mode='json', exclude_unset=True)
    
    if update_data:
        update_data['updated_at'] = datetime.now().isoformat()
        
        # Regenerate human-readable if conditions changed
        if 'conditions' in update_data or 'action_status_id' in update_data or 'current_status_id' in update_data:
            merged_rule = {**rule, **update_data}
            statuses_map = {}
            all_statuses = await db.member_statuses.find({"church_id": rule.get('church_id')}, {"_id": 0}).to_list(100)
            for s in all_statuses:
                statuses_map[s.get('id')] = s.get('name')
            
            human_readable = RuleEngineService.translate_rule_to_human(merged_rule, statuses_map)
            update_data['human_readable'] = human_readable
        
        await db.member_status_rules.update_one({"id": rule_id}, {"$set": update_data})
    
    updated = await db.member_status_rules.find_one({"id": rule_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    
    return updated


@router.delete("/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rule(
    rule_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Delete status rule"""
    rule = await db.member_status_rules.find_one({"id": rule_id})
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
    
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != rule.get('church_id'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    await db.member_status_rules.delete_one({"id": rule_id})
    return None


@router.post("/simulate")
async def simulate_rule(
    rule_data: dict = Body(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Simulate a rule against all members before creating it"""
    
    church_id = current_user.get('session_church_id')
    
    # Validate rule data
    if 'conditions' not in rule_data or 'action_status_id' not in rule_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="conditions and action_status_id are required"
        )
    
    if not rule_data.get('conditions') or len(rule_data['conditions']) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one condition is required"
        )
    
    # Get all active members
    members = await db.members.find({
        "church_id": church_id,
        "is_active": True
    }).to_list(10000)
    
    matched_members = []
    
    for member in members:
        # Check rule type applicability
        rule_type = rule_data.get('rule_type', 'global')
        if rule_type == 'status_based':
            current_status_id = member.get('current_status_id')
            required_status_id = rule_data.get('current_status_id')
            
            if current_status_id != required_status_id:
                continue
        
        # Skip if automation disabled for this member
        if not member.get('participate_in_automation', True):
            continue
        
        # Evaluate conditions
        conditions = rule_data.get('conditions', [])
        if await RuleEngineService.evaluate_conditions_for_member(member, conditions, db):
            # Calculate age if DOB exists
            age = None
            if member.get('date_of_birth'):
                from dateutil.relativedelta import relativedelta
                dob = member.get('date_of_birth')
                if isinstance(dob, str):
                    try:
                        dob = datetime.fromisoformat(dob.replace('Z', '+00:00')).date()
                        today = datetime.now(timezone.utc).date()
                        age = relativedelta(today, dob).years
                    except:
                        pass
            
            # Get current status name
            current_status_name = member.get('member_status')
            if member.get('current_status_id'):
                status_doc = await db.member_statuses.find_one({"id": member.get('current_status_id')})
                if status_doc:
                    current_status_name = status_doc.get('name')
            
            matched_members.append({
                "id": member.get('id'),
                "full_name": member.get('full_name'),
                "current_status": current_status_name,
                "current_status_id": member.get('current_status_id'),
                "age": age,
            })
    
    # Get target status name
    target_status = await db.member_statuses.find_one({"id": rule_data.get('action_status_id')})
    
    return {
        "total_members": len(members),
        "matched_count": len(matched_members),
        "matched_members": matched_members[:100],  # Limit to first 100 for performance
        "target_status_name": target_status.get('name') if target_status else 'Unknown',
        "message": f"{len(matched_members)} member(s) will be affected by this rule"
    }


# ============= CONFLICTS ENDPOINTS =============

@router.get("/conflicts", response_model=List[RuleEvaluationConflict])
async def list_conflicts(
    status: Optional[str] = Query("open", regex="^(open|resolved)$"),
    member_id: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List conflicts"""
    query = {}
    if current_user.get('role') != 'super_admin':
        query['church_id'] = current_user.get('session_church_id')
    
    if status:
        query['status'] = status
    if member_id:
        query['member_id'] = member_id
    
    conflicts = await db.rule_evaluation_conflicts.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for conflict in conflicts:
        if isinstance(conflict.get('created_at'), str):
            conflict['created_at'] = datetime.fromisoformat(conflict['created_at'])
        if isinstance(conflict.get('updated_at'), str):
            conflict['updated_at'] = datetime.fromisoformat(conflict['updated_at'])
        if conflict.get('resolved_at') and isinstance(conflict['resolved_at'], str):
            conflict['resolved_at'] = datetime.fromisoformat(conflict['resolved_at'])
    
    return conflicts


@router.post("/conflicts/{conflict_id}/resolve")
async def resolve_conflict(
    conflict_id: str,
    resolution_status_id: Optional[str] = Body(None),
    resolution_comment: Optional[str] = Body(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Resolve a conflict"""
    conflict = await db.rule_evaluation_conflicts.find_one({"id": conflict_id})
    if not conflict:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conflict not found")
    
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != conflict.get('church_id'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    if conflict.get('status') == 'resolved':
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already resolved")
    
    # If status selected, apply it
    if resolution_status_id:
        # Validate it's one of proposed
        if resolution_status_id not in conflict.get('proposed_status_ids', []):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected status not in proposed list"
            )
        
        await StatusAutomationService.change_member_status(
            member_id=conflict.get('member_id'),
            new_status_id=resolution_status_id,
            reason='conflict_resolution',
            db=db,
            user_id=current_user.get('id'),
            notes=resolution_comment or f"Resolved by {current_user.get('full_name')}"
        )
    
    # Mark resolved
    await db.rule_evaluation_conflicts.update_one(
        {"id": conflict_id},
        {
            "$set": {
                "status": "resolved",
                "resolved_by": current_user.get('id'),
                "resolved_at": datetime.now().isoformat(),
                "resolution_status_id": resolution_status_id,
                "resolution_comment": resolution_comment,
                "updated_at": datetime.now().isoformat()
            }
        }
    )
    
    return {"message": "Conflict resolved", "conflict_id": conflict_id}


# ============= HISTORY ENDPOINTS =============

@router.get("/members/{member_id}/history", response_model=List[MemberStatusHistory])
async def get_member_history(
    member_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get status change history for a member"""
    member = await db.members.find_one({"id": member_id})
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != member.get('church_id'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    history = await db.member_status_history.find(
        {"member_id": member_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    for entry in history:
        if isinstance(entry.get('created_at'), str):
            entry['created_at'] = datetime.fromisoformat(entry['created_at'])
    
    return history


# ============= CONTROL ENDPOINTS =============

@router.get("/settings")
async def get_automation_settings(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get automation settings for current church"""
    church_id = current_user.get('session_church_id')
    
    settings = await db.church_settings.find_one({"church_id": church_id}, {"_id": 0})
    
    return {
        "automation_enabled": settings.get('status_automation_enabled', False) if settings else False,
        "last_run_at": settings.get('last_status_automation_run') if settings else None,
        "schedule": settings.get('status_automation_schedule', '00:00') if settings else '00:00'
    }


@router.put("/settings")
async def update_automation_settings(
    automation_enabled: bool = Body(...),
    schedule: Optional[str] = Body('00:00'),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Update automation settings"""
    church_id = current_user.get('session_church_id')
    
    await db.church_settings.update_one(
        {"church_id": church_id},
        {
            "$set": {
                "status_automation_enabled": automation_enabled,
                "status_automation_schedule": schedule,
                "updated_at": datetime.now().isoformat()
            }
        }
    )
    
    return {"message": "Settings updated", "automation_enabled": automation_enabled}


@router.post("/run-once")
async def run_automation_once(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Manually trigger automation for current church"""
    church_id = current_user.get('session_church_id')
    
    logger.info(f"Manual automation triggered by {current_user.get('full_name')} for church {church_id}")
    
    stats = await StatusAutomationService.run_automation_for_church(church_id, db)
    
    return {
        "message": "Automation complete",
        "statistics": stats
    }
