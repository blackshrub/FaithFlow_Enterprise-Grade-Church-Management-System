"""
Member Status Automation Service
Handles automatic status updates, conflict detection, and history logging
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid

from services.status_rule_engine import RuleEngineService

logger = logging.getLogger(__name__)


class StatusAutomationService:
    """
    Service for automated member status updates
    """
    
    @staticmethod
    async def change_member_status(
        member_id: str,
        new_status_id: str,
        change_type: str,
        db: AsyncIOMotorDatabase,
        user_id: Optional[str] = None,
        user_name: Optional[str] = None,
        rule_id: Optional[str] = None,
        rule_name: Optional[str] = None,
        notes: Optional[str] = None
    ) -> bool:
        """
        Change member status and log history
        
        Args:
            member_id: Member ID
            new_status_id: Target status ID
            change_type: 'manual', 'automation', or 'conflict_resolved'
            db: Database connection
            user_id: User who made the change (for manual)
            user_name: User name
            rule_id: Rule that triggered change (for automation)
            rule_name: Rule name
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
            
            previous_status = member.get('member_status')
            new_status_name = new_status.get('name')
            
            # Update member status
            await db.members.update_one(
                {"id": member_id},
                {
                    "$set": {
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
                "previous_status": previous_status,
                "new_status": new_status_name,
                "change_type": change_type,
                "changed_by_user_id": user_id,
                "changed_by_user_name": user_name,
                "rule_id": rule_id,
                "rule_name": rule_name,
                "notes": notes,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.member_status_history.insert_one(history_entry)
            
            logger.info(f"Status changed for member {member.get('full_name')}: {previous_status} → {new_status_name} (type: {change_type})")
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
        Evaluate rules for a member and update status (or create conflict)
        
        Args:
            member: Member document
            db: Database connection
        
        Returns:
            'updated', 'conflict', 'no_match', or None for errors
        """
        try:
            member_id = member.get('id')
            church_id = member.get('church_id')
            
            # Evaluate all rules
            matched_rules, target_status_ids = await RuleEngineService.evaluate_all_rules_for_member(member, db)
            
            if not matched_rules:
                return 'no_match'
            
            # Check for conflicts
            unique_statuses = list(set(target_status_ids))
            
            if len(unique_statuses) > 1:
                # Conflict detected
                await StatusAutomationService._create_conflict(
                    member=member,
                    matched_rules=matched_rules,
                    target_status_ids=unique_statuses,
                    db=db
                )
                logger.warning(f"Conflict detected for member {member.get('full_name')}: {len(matched_rules)} rules matched")
                return 'conflict'
            
            # Single match - apply status change
            target_status_id = unique_statuses[0]
            rule = matched_rules[0]
            
            success = await StatusAutomationService.change_member_status(
                member_id=member_id,
                new_status_id=target_status_id,
                change_type='automation',
                db=db,
                rule_id=rule.get('id'),
                rule_name=rule.get('name'),
                notes=f"Automatically updated by rule: {rule.get('name')}"
            )
            
            return 'updated' if success else None
            
        except Exception as e:
            logger.error(f"Error evaluating member: {str(e)}")
            return None
    
    @staticmethod
    async def _create_conflict(
        member: Dict,
        matched_rules: List[Dict],
        target_status_ids: List[str],
        db: AsyncIOMotorDatabase
    ):
        """
        Create a conflict entry for manual resolution
        """
        church_id = member.get('church_id')
        
        # Get status details
        possible_statuses = []
        for status_id in target_status_ids:
            status = await db.member_statuses.find_one({"id": status_id})
            if status:
                possible_statuses.append({
                    "id": status.get('id'),
                    "name": status.get('name'),
                    "color": status.get('color')
                })
        
        # Build matched rules summary
        rules_summary = []
        for rule in matched_rules:
            rules_summary.append({
                "id": rule.get('id'),
                "name": rule.get('name'),
                "human_readable": rule.get('human_readable', ''),
                "target_status_id": rule.get('action_status_id'),
                "priority": rule.get('priority')
            })
        
        # Check if conflict already exists for this member (pending)
        existing = await db.rule_evaluation_conflicts.find_one({
            "member_id": member.get('id'),
            "status": "pending"
        })
        
        if existing:
            # Update existing conflict
            await db.rule_evaluation_conflicts.update_one(
                {"id": existing.get('id')},
                {
                    "$set": {
                        "matched_rules": rules_summary,
                        "possible_statuses": possible_statuses,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
        else:
            # Create new conflict
            conflict_entry = {
                "id": str(uuid.uuid4()),
                "church_id": church_id,
                "member_id": member.get('id'),
                "member_name": member.get('full_name'),
                "current_status": member.get('member_status'),
                "matched_rules": rules_summary,
                "possible_statuses": possible_statuses,
                "status": "pending",
                "resolved_by_user_id": None,
                "resolved_by_user_name": None,
                "resolved_status_id": None,
                "resolved_at": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.rule_evaluation_conflicts.insert_one(conflict_entry)
    
    @staticmethod
    async def run_automation_for_church(
        church_id: str,
        db: AsyncIOMotorDatabase
    ) -> Dict[str, int]:
        """
        Run status automation for all members in a church
        
        Args:
            church_id: Church ID
            db: Database connection
        
        Returns:
            Dictionary with statistics: {updated, conflicts, no_match, errors}
        """
        logger.info(f"Starting status automation for church {church_id}")
        
        stats = {
            "updated": 0,
            "conflicts": 0,
            "no_match": 0,
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
    
    @staticmethod
    async def run_automation_for_all_churches(db: AsyncIOMotorDatabase) -> Dict[str, Any]:
        """
        Run status automation for all churches with automation enabled
        
        Returns:
            Dictionary with overall statistics
        """
        logger.info("Starting global status automation")
        
        # Get all churches with automation enabled
        settings = await db.church_settings.find({
            "status_automation_enabled": True
        }).to_list(1000)
        
        total_stats = {
            "churches_processed": 0,
            "total_updated": 0,
            "total_conflicts": 0,
            "total_no_match": 0,
            "total_errors": 0
        }
        
        for setting in settings:
            church_id = setting.get('church_id')
            stats = await StatusAutomationService.run_automation_for_church(church_id, db)
            
            total_stats["churches_processed"] += 1
            total_stats["total_updated"] += stats.get("updated", 0)
            total_stats["total_conflicts"] += stats.get("conflicts", 0)
            total_stats["total_no_match"] += stats.get("no_match", 0)
            total_stats["total_errors"] += stats.get("errors", 0)
        
        logger.info(f"Global automation complete: {total_stats}")
        return total_stats
