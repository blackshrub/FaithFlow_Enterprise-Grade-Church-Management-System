from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from typing import Optional, Dict, Any, List
import uuid
import logging

logger = logging.getLogger(__name__)


async def log_action(
    db: AsyncIOMotorDatabase,
    church_id: str,
    user_id: str,
    action_type: str,
    module: str,
    description: str,
    before_data: Optional[Dict[str, Any]] = None,
    after_data: Optional[Dict[str, Any]] = None
) -> str:
    """
    Log an action to the audit trail.
    
    Args:
        db: Database instance
        church_id: Church ID
        user_id: User ID who performed the action
        action_type: 'create', 'update', 'delete', 'approve'
        module: Module name (e.g., 'coa', 'journal', 'budget')
        description: Action description
        before_data: Data before action (for update/delete)
        after_data: Data after action (for create/update)
    
    Returns:
        Audit log ID
    """
    audit_log = {
        "id": str(uuid.uuid4()),
        "church_id": church_id,
        "user_id": user_id,
        "action_type": action_type,
        "module": module,
        "description": description,
        "before_data": before_data,
        "after_data": after_data,
        "timestamp": datetime.utcnow()
    }
    
    await db.audit_logs.insert_one(audit_log)
    logger.info(f"Audit log created: {module}.{action_type} by {user_id}")
    
    return audit_log["id"]


async def get_entity_history(
    db: AsyncIOMotorDatabase,
    church_id: str,
    module: str,
    reference_id: str
) -> List[Dict[str, Any]]:
    """
    Get audit history for a specific entity.
    
    Args:
        db: Database instance
        church_id: Church ID
        module: Module name
        reference_id: Entity ID (extracted from before_data or after_data)
    
    Returns:
        List of audit log entries
    """
    # Query audit logs where the entity ID appears in before_data or after_data
    cursor = db.audit_logs.find({
        "church_id": church_id,
        "module": module,
        "$or": [
            {"before_data.id": reference_id},
            {"after_data.id": reference_id}
        ]
    }).sort("timestamp", -1)
    
    return await cursor.to_list(length=None)
