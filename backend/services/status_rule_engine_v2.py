"""
Member Status Rule Engine Service (Refactored for Two-Phase Evaluation)
Handles evaluation of status rules, condition parsing, and status changes
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone, timedelta
from dateutil.relativedelta import relativedelta
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


class RuleEngineService:
    """
    Service for evaluating member status rules with two-phase logic
    """
    
    @staticmethod
    def translate_rule_to_human(rule: Dict[str, Any], statuses: Dict[str, str]) -> str:
        """
        Convert rule conditions to human-readable text
        
        Args:
            rule: Rule document with conditions
            statuses: Dict mapping status IDs to names
        
        Returns:
            Human-readable rule description
        """
        conditions = rule.get('conditions', [])
        if not conditions:
            return "No conditions defined"
        
        # Parse conditions (all ANDed together)
        condition_texts = []
        for condition in conditions:
            cond_type = condition.get('type')
            
            if cond_type == 'age':
                condition_texts.append(RuleEngineService._parse_age_condition(condition))
            elif cond_type == 'attendance':
                condition_texts.append(RuleEngineService._parse_attendance_condition(condition))
        
        condition_text = ' AND '.join(condition_texts)
        
        # Build full rule text
        rule_type = rule.get('rule_type')
        target_status = statuses.get(rule.get('action_status_id'), 'Unknown Status')
        
        if rule_type == 'global':
            return f"For all members: If {condition_text}, then change status to '{target_status}'"
        else:
            current_status = statuses.get(rule.get('current_status_id'), 'Unknown Status')
            return f"For members with status '{current_status}': If {condition_text}, then change status to '{target_status}'"
    
    @staticmethod
    def _parse_age_condition(condition: Dict) -> str:
        """Parse age condition to human text"""
        operator = condition.get('operator')
        value = condition.get('value')
        
        op_map = {
            '<': 'younger than',
            '<=': 'at most',
            '>': 'older than',
            '>=': 'at least',
            '==': 'exactly',
            '!=': 'not'
        }
        
        op_text = op_map.get(operator, operator)
        return f"age is {op_text} {value} years old"
    
    @staticmethod
    def _parse_attendance_condition(condition: Dict) -> str:
        """Parse attendance condition to human text"""
        window_days = condition.get('window_days', 0)
        operator = condition.get('operator')
        value = condition.get('value', 0)
        
        op_map = {
            '<': 'fewer than',
            '<=': 'at most',
            '>': 'more than',
            '>=': 'at least',
            '==': 'exactly',
            '!=': 'not'
        }
        
        op_text = op_map.get(operator, operator)
        time_text = f"in the last {window_days} days" if window_days > 0 else "ever"
        
        return f"attended Sunday Service {op_text} {value} times {time_text}"
    
    @staticmethod
    async def evaluate_conditions_for_member(
        member: Dict,
        conditions: List[Dict],
        db: AsyncIOMotorDatabase
    ) -> bool:
        """
        Evaluate all conditions for a member (all must be true - AND logic)
        
        Args:
            member: Member document
            conditions: List of condition objects
            db: Database connection
        
        Returns:
            True if all conditions match, False otherwise
        """
        if not conditions:
            return True
        
        for condition in conditions:
            cond_type = condition.get('type')
            
            if cond_type == 'age':
                if not RuleEngineService._evaluate_age_condition(member, condition):
                    return False
            elif cond_type == 'attendance':
                if not await RuleEngineService._evaluate_attendance_condition(member, condition, db):
                    return False
        
        return True
    
    @staticmethod
    def _evaluate_age_condition(member: Dict, condition: Dict) -> bool:
        """
        Evaluate age condition
        """
        dob = member.get('date_of_birth')
        if not dob:
            return False
        
        # Parse date_of_birth (could be string or date object)
        if isinstance(dob, str):
            try:
                dob = datetime.fromisoformat(dob.replace('Z', '+00:00')).date()
            except (ValueError, AttributeError):
                return False
        
        # Calculate age
        today = datetime.now(timezone.utc).date()
        age = relativedelta(today, dob).years
        
        operator = condition.get('operator')
        value = condition.get('value')
        
        if operator == '<':
            return age < value
        elif operator == '<=':
            return age <= value
        elif operator == '>':
            return age > value
        elif operator == '>=':
            return age >= value
        elif operator == '==':
            return age == value
        elif operator == '!=':
            return age != value
        
        return False
    
    @staticmethod
    async def _evaluate_attendance_condition(
        member: Dict,
        condition: Dict,
        db: AsyncIOMotorDatabase
    ) -> bool:
        """
        Evaluate attendance condition (Sunday Service only)
        """
        member_id = member.get('id')
        church_id = member.get('church_id')
        event_type = condition.get('event_type', 'sunday_service')
        window_days = condition.get('window_days', 0)
        operator = condition.get('operator')
        value = condition.get('value', 0)
        
        # Get Sunday Service category ID
        sunday_service_category = await db.event_categories.find_one({
            'church_id': church_id,
            'name': 'Sunday Service'
        })
        
        if not sunday_service_category:
            logger.warning(f"Sunday Service category not found for church {church_id}")
            return False
        
        category_id = sunday_service_category.get('id')
        
        # Calculate date range
        now = datetime.now(timezone.utc)
        if window_days > 0:
            start_date = now - timedelta(days=window_days)
        else:
            start_date = datetime(2000, 1, 1, tzinfo=timezone.utc)  # All time
        
        # Query events with Sunday Service category
        query = {
            'church_id': church_id,
            'event_category_id': category_id
        }
        
        events = await db.events.find(query, {"_id": 0, "id": 1, "attendance_list": 1}).to_list(1000)
        
        # Count attendance
        attendance_count = 0
        for event in events:
            for attendance in event.get('attendance_list', []):
                if attendance.get('member_id') == member_id:
                    # Check date
                    check_in_time_str = attendance.get('check_in_time')
                    if check_in_time_str:
                        try:
                            check_in_time = datetime.fromisoformat(check_in_time_str.replace('Z', '+00:00'))
                            if check_in_time >= start_date:
                                attendance_count += 1
                        except (ValueError, AttributeError):
                            pass
        
        # Evaluate operator
        if operator == '<':
            return attendance_count < value
        elif operator == '<=':
            return attendance_count <= value
        elif operator == '>':
            return attendance_count > value
        elif operator == '>=':
            return attendance_count >= value
        elif operator == '==':
            return attendance_count == value
        elif operator == '!=':
            return attendance_count != value
        
        return False
    
    @staticmethod
    async def evaluate_member_with_two_phase(
        member: Dict,
        db: AsyncIOMotorDatabase
    ) -> Tuple[Optional[str], Optional[str], List[str], List[str]]:
        """
        Two-phase rule evaluation as per spec
        
        Returns:
            Tuple of (phase1_status_id, phase2_status_id, phase1_rule_ids, phase2_rule_ids)
        """
        church_id = member.get('church_id')
        current_status_id = member.get('current_status_id')
        
        # Skip if automation disabled for this member
        if not member.get('participate_in_automation', True):
            return None, None, [], []
        
        # PHASE 1: Evaluate Global Rules
        global_rules = await db.member_status_rules.find({
            'church_id': church_id,
            'rule_type': 'global',
            'enabled': True
        }).to_list(1000)
        
        phase1_matches = []
        for rule in global_rules:
            conditions = rule.get('conditions', [])
            if await RuleEngineService.evaluate_conditions_for_member(member, conditions, db):
                phase1_matches.append(rule)
        
        phase1_status_id = None
        phase1_rule_ids = []
        
        if len(phase1_matches) == 1:
            phase1_status_id = phase1_matches[0].get('action_status_id')
            phase1_rule_ids = [phase1_matches[0].get('id')]
        elif len(phase1_matches) > 1:
            # Multiple global rules matched
            phase1_rule_ids = [r.get('id') for r in phase1_matches]
        
        # PHASE 2: Evaluate Status-Based Rules (only for current status)
        phase2_matches = []
        if current_status_id:
            status_rules = await db.member_status_rules.find({
                'church_id': church_id,
                'rule_type': 'status_based',
                'current_status_id': current_status_id,
                'enabled': True
            }).to_list(1000)
            
            for rule in status_rules:
                conditions = rule.get('conditions', [])
                if await RuleEngineService.evaluate_conditions_for_member(member, conditions, db):
                    phase2_matches.append(rule)
        
        phase2_status_id = None
        phase2_rule_ids = []
        
        if len(phase2_matches) == 1:
            phase2_status_id = phase2_matches[0].get('action_status_id')
            phase2_rule_ids = [phase2_matches[0].get('id')]
        elif len(phase2_matches) > 1:
            # Multiple status-based rules matched
            phase2_rule_ids = [r.get('id') for r in phase2_matches]
        
        return phase1_status_id, phase2_status_id, phase1_rule_ids, phase2_rule_ids
