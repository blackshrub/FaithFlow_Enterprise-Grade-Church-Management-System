from fastapi import APIRouter, Depends, HTTPException, status, Body
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Dict, Any
from datetime import datetime
import logging

from models.member_status_rule import MemberStatusRule, MemberStatusRuleCreate, MemberStatusRuleUpdate
from utils.dependencies import get_db, require_admin, get_current_user
from services.status_rule_engine import RuleEngineService
from services.status_automation_service import StatusAutomationService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/status-rules", tags=["Status Rules"])


@router.post("/", response_model=MemberStatusRule, status_code=status.HTTP_201_CREATED)
async def create_status_rule(
    rule_data: MemberStatusRuleCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Create a new member status rule"""
    
    # Verify access
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != rule_data.church_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Validate rule type and current_status_id
    if rule_data.rule_type == 'status_based' and not rule_data.current_status_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="current_status_id is required for status_based rules"
        )
    
    # Validate status IDs exist
    if rule_data.current_status_id:
        current_status = await db.member_statuses.find_one({"id": rule_data.current_status_id})
        if not current_status:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current status not found"
            )
    
    action_status = await db.member_statuses.find_one({"id": rule_data.action_status_id})
    if not action_status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Action status not found"
        )
    
    # Create rule object
    rule = MemberStatusRule(**rule_data.model_dump())
    
    # Generate human-readable text
    statuses_map = {}
    event_categories_map = {}
    
    # Get all statuses for this church
    all_statuses = await db.member_statuses.find({"church_id": rule_data.church_id}, {"_id": 0}).to_list(100)
    for s in all_statuses:
        statuses_map[s.get('id')] = s.get('name')
    
    # Get all event categories for this church
    all_categories = await db.event_categories.find({"church_id": rule_data.church_id}, {"_id": 0}).to_list(100)
    for c in all_categories:
        event_categories_map[c.get('id')] = c.get('name')
    
    rule_dict = rule.model_dump()
    human_readable = RuleEngineService.translate_rule_to_human(rule_dict, statuses_map, event_categories_map)
    rule_dict['human_readable'] = human_readable
    
    # Convert datetime to ISO
    rule_dict['created_at'] = rule_dict['created_at'].isoformat()
    rule_dict['updated_at'] = rule_dict['updated_at'].isoformat()
    
    await db.member_status_rules.insert_one(rule_dict)
    
    logger.info(f"Status rule created: {rule.name} (ID: {rule.id})")
    return rule


@router.get("/", response_model=List[MemberStatusRule])
async def list_status_rules(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all status rules for current church"""
    
    query = {}
    if current_user.get('role') != 'super_admin':
        query['church_id'] = current_user.get('session_church_id')
    
    rules = await db.member_status_rules.find(query, {"_id": 0}).sort("priority", -1).to_list(1000)
    
    # Convert ISO strings to datetime
    for rule in rules:
        if isinstance(rule.get('created_at'), str):
            rule['created_at'] = datetime.fromisoformat(rule['created_at'])
        if isinstance(rule.get('updated_at'), str):
            rule['updated_at'] = datetime.fromisoformat(rule['updated_at'])
    
    return rules


@router.get("/{rule_id}", response_model=MemberStatusRule)
async def get_status_rule(
    rule_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get status rule by ID"""
    
    rule = await db.member_status_rules.find_one({"id": rule_id}, {"_id": 0})
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rule not found"
        )
    
    # Check access
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != rule.get('church_id'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Convert ISO strings
    if isinstance(rule.get('created_at'), str):
        rule['created_at'] = datetime.fromisoformat(rule['created_at'])
    if isinstance(rule.get('updated_at'), str):
        rule['updated_at'] = datetime.fromisoformat(rule['updated_at'])
    
    return rule


@router.patch("/{rule_id}", response_model=MemberStatusRule)
async def update_status_rule(
    rule_id: str,
    rule_data: MemberStatusRuleUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Update status rule"""
    
    rule = await db.member_status_rules.find_one({"id": rule_id})
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rule not found"
        )
    
    # Check access
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != rule.get('church_id'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Update only provided fields
    update_data = rule_data.model_dump(exclude_unset=True)
    
    if update_data:
        update_data['updated_at'] = datetime.now().isoformat()
        
        # Regenerate human-readable if conditions changed
        if 'conditions' in update_data or 'action_status_id' in update_data or 'current_status_id' in update_data:
            # Merge with existing rule
            merged_rule = {**rule, **update_data}
            
            # Get statuses and categories
            statuses_map = {}
            event_categories_map = {}
            
            all_statuses = await db.member_statuses.find({"church_id": rule.get('church_id')}, {"_id": 0}).to_list(100)
            for s in all_statuses:
                statuses_map[s.get('id')] = s.get('name')
            
            all_categories = await db.event_categories.find({"church_id": rule.get('church_id')}, {"_id": 0}).to_list(100)
            for c in all_categories:
                event_categories_map[c.get('id')] = c.get('name')
            
            human_readable = RuleEngineService.translate_rule_to_human(merged_rule, statuses_map, event_categories_map)
            update_data['human_readable'] = human_readable
        
        await db.member_status_rules.update_one(
            {"id": rule_id},
            {"$set": update_data}
        )
    
    # Get updated rule
    updated_rule = await db.member_status_rules.find_one({"id": rule_id}, {"_id": 0})
    
    # Convert ISO strings
    if isinstance(updated_rule.get('created_at'), str):
        updated_rule['created_at'] = datetime.fromisoformat(updated_rule['created_at'])
    if isinstance(updated_rule.get('updated_at'), str):
        updated_rule['updated_at'] = datetime.fromisoformat(updated_rule['updated_at'])
    
    return updated_rule


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_status_rule(
    rule_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Delete status rule"""
    
    rule = await db.member_status_rules.find_one({"id": rule_id})
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rule not found"
        )
    
    # Check access
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != rule.get('church_id'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    await db.member_status_rules.delete_one({"id": rule_id})
    return None


@router.post("/{rule_id}/test")
async def test_status_rule(
    rule_id: str,
    member_id: str = Body(..., embed=True),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Test if a rule matches a specific member"""
    
    rule = await db.member_status_rules.find_one({"id": rule_id})
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rule not found"
        )
    
    # Check access
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != rule.get('church_id'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Get member
    member = await db.members.find_one({"id": member_id})
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )
    
    # Evaluate conditions
    conditions = rule.get('conditions', [])
    matches = await RuleEngineService.evaluate_conditions_for_member(member, conditions, db)
    
    return {
        "rule_id": rule_id,
        "rule_name": rule.get('name'),
        "member_id": member_id,
        "member_name": member.get('full_name'),
        "current_status": member.get('member_status'),
        "matches": matches,
        "would_change_to": rule.get('action_status_id') if matches else None,
        "human_readable": rule.get('human_readable')
    }


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
            current_status = member.get('member_status')
            current_status_id = rule_data.get('current_status_id')
            
            if current_status_id:
                # Get status name from ID
                status_doc = await db.member_statuses.find_one({"id": current_status_id})
                if status_doc and status_doc.get('name') != current_status:
                    continue
        
        # Evaluate conditions
        conditions = rule_data.get('conditions', [])
        if await RuleEngineService.evaluate_conditions_for_member(member, conditions, db):
            matched_members.append({
                "id": member.get('id'),
                "full_name": member.get('full_name'),
                "current_status": member.get('member_status'),
                "age": calculate_age(member.get('date_of_birth')) if member.get('date_of_birth') else None,
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


def calculate_age(date_of_birth):
    """Helper to calculate age from date of birth"""
    from datetime import datetime
    from dateutil.relativedelta import relativedelta
    
    if isinstance(date_of_birth, str):
        try:
            dob = datetime.fromisoformat(date_of_birth.replace('Z', '+00:00')).date()
        except:
            return None
    else:
        dob = date_of_birth
    
    today = datetime.now().date()
    return relativedelta(today, dob).years


@router.post("/evaluate-all")
async def evaluate_all_rules(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Manually trigger rule evaluation for all members in current church"""
    
    church_id = current_user.get('session_church_id')
    
    logger.info(f"Manual rule evaluation triggered by {current_user.get('full_name')} for church {church_id}")
    
    # Run automation
    stats = await StatusAutomationService.run_automation_for_church(church_id, db)
    
    return {
        "message": "Rule evaluation complete",
        "statistics": stats
    }
