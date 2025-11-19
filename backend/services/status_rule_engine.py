"""
Member Status Rule Engine Service
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
    Service for evaluating member status rules
    """
    
    @staticmethod
    def translate_rule_to_human(rule: Dict[str, Any], statuses: Dict[str, str], event_categories: Dict[str, str]) -> str:
        """
        Convert rule conditions to human-readable text
        
        Args:
            rule: Rule document with conditions
            statuses: Dict mapping status IDs to names
            event_categories: Dict mapping category IDs to names
        
        Returns:
            Human-readable rule description
        """
        conditions = rule.get('conditions', [])
        if not conditions:
            return "No conditions defined"
        
        # Parse conditions recursively
        condition_text = RuleEngineService._parse_conditions_group(conditions, statuses, event_categories)
        
        # Build full rule text
        rule_type = rule.get('rule_type')
        target_status = statuses.get(rule.get('action_status_id'), 'Unknown Status')
        
        if rule_type == 'global':
            return f"For all members: If {condition_text}, then change status to '{target_status}'"
        else:
            current_status = statuses.get(rule.get('current_status_id'), 'Unknown Status')
            return f"For members with status '{current_status}': If {condition_text}, then change status to '{target_status}'"
    
    @staticmethod
    def _parse_conditions_group(conditions: List[Dict], statuses: Dict, event_categories: Dict, depth: int = 0) -> str:
        """
        Recursively parse condition groups with AND/OR logic
        """
        if not conditions:
            return "(empty)"
        
        parts = []
        for i, condition in enumerate(conditions):
            cond_type = condition.get('type')
            
            if cond_type == 'group':
                # Nested group
                logic = condition.get('logic', 'AND')
                nested = condition.get('conditions', [])
                nested_text = RuleEngineService._parse_conditions_group(nested, statuses, event_categories, depth + 1)
                parts.append(f"({nested_text})")
                
                # Add logic operator if not last item
                if i < len(conditions) - 1:
                    next_logic = conditions[i + 1].get('logic', 'AND') if i + 1 < len(conditions) else condition.get('logic', 'AND')
                    parts.append(f" {next_logic.upper()} ")
            
            elif cond_type == 'age':
                age_text = RuleEngineService._parse_age_condition(condition)
                parts.append(age_text)
                
                # Add logic operator
                if i < len(conditions) - 1:
                    logic = condition.get('logic', 'AND')
                    parts.append(f" {logic.upper()} ")
            
            elif cond_type == 'attendance':
                attendance_text = RuleEngineService._parse_attendance_condition(condition, event_categories)
                parts.append(attendance_text)
                
                # Add logic operator
                if i < len(conditions) - 1:
                    logic = condition.get('logic', 'AND')
                    parts.append(f" {logic.upper()} ")
        
        return ''.join(parts)
    
    @staticmethod
    def _parse_age_condition(condition: Dict) -> str:
        """Parse age condition to human text"""
        operator = condition.get('operator')
        value = condition.get('value')
        value2 = condition.get('value2')
        
        op_map = {
            '<': 'younger than',
            '<=': 'at most',
            '>': 'older than',
            '>=': 'at least',
            '==': 'exactly',
            'between': 'between'
        }
        
        op_text = op_map.get(operator, operator)
        
        if operator == 'between' and value2:
            return f"age is {op_text} {value} and {value2} years old"
        else:
            return f"age is {op_text} {value} years old"
    
    @staticmethod
    def _parse_attendance_condition(condition: Dict, event_categories: Dict) -> str:
        """Parse attendance condition to human text"""
        category_id = condition.get('event_category_id')
        category_name = event_categories.get(category_id, 'Unknown Event')
        window_days = condition.get('window_days', 0)
        operator = condition.get('operator')
        count = condition.get('count', 0)
        
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
        
        return f"attended '{category_name}' {op_text} {count} times {time_text}"
    
    @staticmethod
    async def evaluate_conditions_for_member(
        member: Dict,
        conditions: List[Dict],
        db: AsyncIOMotorDatabase
    ) -> bool:
        """
        Evaluate all conditions for a member
        
        Args:
            member: Member document
            conditions: List of condition objects
            db: Database connection
        
        Returns:
            True if all conditions match, False otherwise
        """
        return await RuleEngineService._evaluate_conditions_group(member, conditions, db)
    
    @staticmethod
    async def _evaluate_conditions_group(
        member: Dict,
        conditions: List[Dict],
        db: AsyncIOMotorDatabase,
        parent_logic: str = 'AND'
    ) -> bool:
        """
        Recursively evaluate condition groups with AND/OR logic
        """
        if not conditions:
            return True
        
        results = []
        current_logic = parent_logic
        
        for condition in conditions:
            cond_type = condition.get('type')
            logic = condition.get('logic', 'AND')
            
            if cond_type == 'group':
                # Nested group
                nested = condition.get('conditions', [])
                nested_result = await RuleEngineService._evaluate_conditions_group(member, nested, db, logic)
                results.append(nested_result)
                current_logic = logic
            
            elif cond_type == 'age':
                age_result = RuleEngineService._evaluate_age_condition(member, condition)
                results.append(age_result)
                current_logic = logic
            
            elif cond_type == 'attendance':
                attendance_result = await RuleEngineService._evaluate_attendance_condition(member, condition, db)
                results.append(attendance_result)
                current_logic = logic
        
        # Combine results with logic operator
        if current_logic == 'AND':
            return all(results)
        else:  # OR
            return any(results)
    
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
            except:
                return False
        
        # Calculate age
        today = datetime.now(timezone.utc).date()
        age = relativedelta(today, dob).years
        
        operator = condition.get('operator')
        value = condition.get('value')
        value2 = condition.get('value2')
        
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
        elif operator == 'between' and value2:
            return value <= age <= value2
        
        return False
    
    @staticmethod
    async def _evaluate_attendance_condition(
        member: Dict,
        condition: Dict,
        db: AsyncIOMotorDatabase
    ) -> bool:
        """
        Evaluate attendance condition
        """
        member_id = member.get('id')
        church_id = member.get('church_id')
        category_id = condition.get('event_category_id')
        window_days = condition.get('window_days', 0)
        operator = condition.get('operator')
        count = condition.get('count', 0)
        
        # Calculate date range
        now = datetime.now(timezone.utc)
        if window_days > 0:
            start_date = now - timedelta(days=window_days)
        else:
            start_date = datetime(2000, 1, 1, tzinfo=timezone.utc)  # Beginning of time
        
        # Query events with this category
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
                        except:
                            pass
        
        # Evaluate operator
        if operator == '<':
            return attendance_count < count
        elif operator == '<=':
            return attendance_count <= count
        elif operator == '>':
            return attendance_count > count
        elif operator == '>=':
            return attendance_count >= count
        elif operator == '==':
            return attendance_count == count
        elif operator == '!=':
            return attendance_count != count
        
        return False
    
    @staticmethod
    async def evaluate_all_rules_for_member(
        member: Dict,
        db: AsyncIOMotorDatabase
    ) -> Tuple[List[Dict], List[str]]:
        """
        Evaluate all enabled rules for a member
        
        Args:
            member: Member document
            db: Database connection
        
        Returns:
            Tuple of (matched_rules, target_status_ids)
        """
        church_id = member.get('church_id')
        current_status = member.get('member_status')
        
        # Get all enabled rules for this church
        rules = await db.member_status_rules.find({
            'church_id': church_id,
            'enabled': True
        }).sort('priority', -1).to_list(1000)  # Higher priority first
        
        matched_rules = []
        target_status_ids = []
        
        for rule in rules:
            rule_type = rule.get('rule_type')
            
            # Check rule type applicability
            if rule_type == 'status_based':
                # Only evaluate if current status matches
                current_status_id = await RuleEngineService._get_status_id_by_name(current_status, church_id, db)
                if current_status_id != rule.get('current_status_id'):
                    continue
            
            # Evaluate conditions
            conditions = rule.get('conditions', [])
            if await RuleEngineService.evaluate_conditions_for_member(member, conditions, db):
                matched_rules.append(rule)
                target_status_ids.append(rule.get('action_status_id'))
        
        return matched_rules, target_status_ids
    
    @staticmethod
    async def _get_status_id_by_name(status_name: Optional[str], church_id: str, db: AsyncIOMotorDatabase) -> Optional[str]:
        """Get status ID by name"""
        if not status_name:
            return None
        
        status = await db.member_statuses.find_one({
            'church_id': church_id,
            'name': status_name
        })
        
        return status.get('id') if status else None
