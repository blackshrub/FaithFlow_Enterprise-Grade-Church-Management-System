"""
Member Status Automation Service (Refactored)
Handles automatic status updates with two-phase evaluation, conflict detection, and history logging
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid

from services.status_rule_engine_v2 import RuleEngineService

logger = logging.getLogger(__name__)


class StatusAutomationService:
    """
    Service for automated member status updates
    """
    
    @staticmethod
    async def change_member_status(
        member_id: str,
        new_status_id: str,
        reason: str,
        db: AsyncIOMotorDatabase,
        user_id: Optional[str] = None,
        rule_id: Optional[str] = None,
        notes: Optional[str] = None
    ) -> bool:
        """
        Change member status and log history
        
        Args:
            member_id: Member ID
            new_status_id: Target status ID
            reason: 'manual', 'automation', or 'conflict_resolution'
            db: Database connection
            user_id: User who made the change (for manual)
            rule_id: Rule that triggered change (for automation)
            notes: Additional notes
        
        Returns:
            True if successful, False otherwise
        """
        try:
            # Get member
            member = await db.members.find_one({"id": member_id})
            if not member:
                logger.error(f"Member {member_id} not found")
                return False
            
            # Get new status
            new_status = await db.member_statuses.find_one({"id": new_status_id})
            if not new_status:
                logger.error(f"Status {new_status_id} not found")
                return False
            
            old_status_id = member.get('current_status_id')
            new_status_name = new_status.get('name')
            
            # Update member status (both ID and name for compatibility)
            await db.members.update_one(
                {"id": member_id},
                {
                    "$set": {
                        "current_status_id": new_status_id,
                        "member_status": new_status_name,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            # Log history
            history_entry = {
                "id": str(uuid.uuid4()),
                "church_id": member.get('church_id'),
                "member_id": member_id,
                "member_name": member.get('full_name'),
                "old_status_id": old_status_id,
                "new_status_id": new_status_id,
                "reason": reason,
                "rule_id": rule_id,
                "changed_by": user_id,
                "notes": notes,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.member_status_history.insert_one(history_entry)
            
            logger.info(f"Status changed for member {member.get('full_name')}: {old_status_id} → {new_status_id} (reason: {reason})")
            return True
            
        except Exception as e:
            logger.error(f"Error changing member status: {str(e)}")
            return False
    
    @staticmethod
    async def evaluate_and_update_member(
        member: Dict,
        db: AsyncIOMotorDatabase
    ) -> Optional[str]:
        """
        Evaluate rules for a member using two-phase logic and update status or create conflict
        
        Returns:
            'updated', 'conflict', 'no_match', 'skipped', or None for errors
        """
        try:
            member_id = member.get('id')
            
            # Step 0: Check participation flag
            if not member.get('participate_in_automation', True):
                return 'skipped'
            
            # Two-phase evaluation
            phase1_status, phase2_status, phase1_rules, phase2_rules = \
                await RuleEngineService.evaluate_member_with_two_phase(member, db)
            
            # Step 3: Combine results
            proposed_status_id = None
            matching_rule_ids = []
            
            # Case 1: Multiple matches in phase 1
            if len(phase1_rules) > 1:
                await StatusAutomationService._create_conflict(
                    member=member,
                    proposed_status_ids=list(set([r for r in [phase1_status] if r])),
                    rule_ids=phase1_rules,
                    db=db
                )
                return 'conflict'
            
            # Case 2: Multiple matches in phase 2
            if len(phase2_rules) > 1:
                await StatusAutomationService._create_conflict(
                    member=member,
                    proposed_status_ids=list(set([r for r in [phase2_status] if r])),
                    rule_ids=phase2_rules,
                    db=db
                )
                return 'conflict'
            
            # Case 3: Both phases produced different results
            if phase1_status and phase2_status and phase1_status != phase2_status:
                await StatusAutomationService._create_conflict(
                    member=member,
                    proposed_status_ids=[phase1_status, phase2_status],
                    rule_ids=phase1_rules + phase2_rules,
                    db=db
                )
                return 'conflict'
            
            # Case 4: Single match from either phase
            if phase1_status:
                proposed_status_id = phase1_status
                matching_rule_ids = phase1_rules
            elif phase2_status:
                proposed_status_id = phase2_status
                matching_rule_ids = phase2_rules
            
            if not proposed_status_id:
                return 'no_match'
            
            # Apply status change
            success = await StatusAutomationService.change_member_status(
                member_id=member_id,
                new_status_id=proposed_status_id,
                reason='automation',
                db=db,
                rule_id=matching_rule_ids[0] if matching_rule_ids else None,
                notes=f"Automatically updated by rule evaluation"
            )
            
            return 'updated' if success else None
            
        except Exception as e:
            logger.error(f"Error evaluating member: {str(e)}")
            return None
    
    @staticmethod
    async def _create_conflict(
        member: Dict,
        proposed_status_ids: List[str],
        rule_ids: List[str],
        db: AsyncIOMotorDatabase
    ):
        """
        Create a conflict entry for manual resolution
        """
        church_id = member.get('church_id')
        member_id = member.get('id')
        
        # Check if conflict already exists for this member (open)
        existing = await db.rule_evaluation_conflicts.find_one({
            "member_id": member_id,
            "status": "open"
        })
        
        if existing:
            # Update existing conflict
            await db.rule_evaluation_conflicts.update_one(
                {"id": existing.get('id')},
                {
                    "$set": {
                        "proposed_status_ids": proposed_status_ids,
                        "rule_ids": rule_ids,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
        else:
            # Create new conflict
            conflict_entry = {
                "id": str(uuid.uuid4()),
                "church_id": church_id,
                "member_id": member_id,
                "member_name": member.get('full_name'),
                "current_status_id": member.get('current_status_id'),
                "proposed_status_ids": proposed_status_ids,
                "rule_ids": rule_ids,
                "status": "open",
                "resolved_by": None,
                "resolved_at": None,
                "resolution_status_id": None,
                "resolution_comment": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.rule_evaluation_conflicts.insert_one(conflict_entry)
            logger.warning(f"Conflict created for member {member.get('full_name')}: {len(rule_ids)} rules matched")
    
    @staticmethod
    async def run_automation_for_church(
        church_id: str,
        db: AsyncIOMotorDatabase
    ) -> Dict[str, int]:
        """
        Run status automation for all members in a church
        
        Returns:
            Dictionary with statistics: {updated, conflicts, no_match, skipped, errors}
        """
        logger.info(f"Starting status automation for church {church_id}")
        
        stats = {
            "updated": 0,
            "conflicts": 0,
            "no_match": 0,
            "skipped": 0,
            "errors": 0
        }
        
        # Get all active members
        members = await db.members.find({
            "church_id": church_id,
            "is_active": True
        }).to_list(10000)
        
        logger.info(f"Evaluating {len(members)} members")
        
        for member in members:
            result = await StatusAutomationService.evaluate_and_update_member(member, db)
            
            if result == 'updated':
                stats["updated"] += 1
            elif result == 'conflict':
                stats["conflicts"] += 1
            elif result == 'no_match':
                stats["no_match"] += 1
            elif result == 'skipped':
                stats["skipped"] += 1
            else:
                stats["errors"] += 1
        
        # Update last run timestamp
        await db.church_settings.update_one(
            {"church_id": church_id},
            {
                "$set": {
                    "last_status_automation_run": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        logger.info(f"Automation complete for church {church_id}: {stats}")
        return stats
