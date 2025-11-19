#!/usr/bin/env python3
"""
Seed recommended member status automation rules for all churches
Creates 8 default rules based on best practices
"""

import asyncio
import os
import sys
import uuid
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT_DIR))
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


async def get_status_id(church_id, status_name):
    """Get status ID by name"""
    status = await db.member_statuses.find_one({
        "church_id": church_id,
        "name": status_name
    })
    return status.get('id') if status else None


async def seed_rules():
    print("Seeding recommended status automation rules...\n")
    
    # Get all churches
    churches = await db.churches.find({}).to_list(1000)
    
    for church in churches:
        church_id = church.get('id')
        church_name = church.get('name')
        
        print(f"Processing {church_name}...")
        
        # Get status IDs
        full_member_id = await get_status_id(church_id, 'Full Member')
        new_visitor_id = await get_status_id(church_id, 'New Visitor')
        participant_id = await get_status_id(church_id, 'Participant')
        old_visitor_id = await get_status_id(church_id, 'Old Visitor')
        archived_id = await get_status_id(church_id, 'Archived')
        nextgen_id = await get_status_id(church_id, 'NextGen')
        
        if not all([full_member_id, new_visitor_id, participant_id, old_visitor_id, archived_id, nextgen_id]):
            print(f"  SKIP: Missing default statuses for {church_name}")
            continue
        
        # Define recommended rules
        recommended_rules = [
            # Rule 1: Global - Children to NextGen
            {
                "name": "Auto NextGen (Under 15)",
                "description": "Automatically assign NextGen status to children under 15 years old",
                "rule_type": "global",
                "current_status_id": None,
                "conditions": [
                    {"type": "age", "operator": "<", "value": 15}
                ],
                "action_status_id": nextgen_id,
                "enabled": True,
                "priority": 100
            },
            
            # Rule 2: NextGen graduates to Participant
            {
                "name": "NextGen to Participant (15+)",
                "description": "Move NextGen members to Participant when they turn 15",
                "rule_type": "status_based",
                "current_status_id": nextgen_id,
                "conditions": [
                    {"type": "age", "operator": ">=", "value": 15}
                ],
                "action_status_id": participant_id,
                "enabled": True,
                "priority": 90
            },
            
            # Rule 3: Full Member becomes Archived (no attendance 180 days)
            {
                "name": "Full Member Inactive → Archived",
                "description": "Archive full members with no attendance in 180 days",
                "rule_type": "status_based",
                "current_status_id": full_member_id,
                "conditions": [
                    {"type": "attendance", "event_type": "sunday_service", "window_days": 180, "operator": "==", "value": 0}
                ],
                "action_status_id": archived_id,
                "enabled": False,  # Disabled by default
                "priority": 50
            },
            
            # Rule 4: New Visitor becomes Archived (no attendance 60 days)
            {
                "name": "New Visitor Inactive → Archived",
                "description": "Archive new visitors who haven't attended in 60 days",
                "rule_type": "status_based",
                "current_status_id": new_visitor_id,
                "conditions": [
                    {"type": "attendance", "event_type": "sunday_service", "window_days": 60, "operator": "==", "value": 0}
                ],
                "action_status_id": archived_id,
                "enabled": False,
                "priority": 50
            },
            
            # Rule 5: New Visitor becomes Participant (4+ attendances in 60 days)
            {
                "name": "New Visitor → Participant",
                "description": "Promote new visitors who attend 4+ times in 60 days",
                "rule_type": "status_based",
                "current_status_id": new_visitor_id,
                "conditions": [
                    {"type": "attendance", "event_type": "sunday_service", "window_days": 60, "operator": ">=", "value": 4}
                ],
                "action_status_id": participant_id,
                "enabled": True,
                "priority": 60
            },
            
            # Rule 6: Archived becomes Old Visitor (any recent attendance)
            {
                "name": "Archived → Old Visitor (Returning)",
                "description": "Move archived members back to Old Visitor if they attend",
                "rule_type": "status_based",
                "current_status_id": archived_id,
                "conditions": [
                    {"type": "attendance", "event_type": "sunday_service", "window_days": 30, "operator": ">=", "value": 1}
                ],
                "action_status_id": old_visitor_id,
                "enabled": True,
                "priority": 70
            },
            
            # Rule 7: Old Visitor becomes Archived (no attendance 60 days)
            {
                "name": "Old Visitor Inactive → Archived",
                "description": "Archive old visitors with no attendance in 60 days",
                "rule_type": "status_based",
                "current_status_id": old_visitor_id,
                "conditions": [
                    {"type": "attendance", "event_type": "sunday_service", "window_days": 60, "operator": "==", "value": 0}
                ],
                "action_status_id": archived_id,
                "enabled": False,
                "priority": 50
            },
            
            # Rule 8: Old Visitor becomes Participant (4+ attendances)
            {
                "name": "Old Visitor → Participant",
                "description": "Promote old visitors who attend 4+ times in 60 days",
                "rule_type": "status_based",
                "current_status_id": old_visitor_id,
                "conditions": [
                    {"type": "attendance", "event_type": "sunday_service", "window_days": 60, "operator": ">=", "value": 4}
                ],
                "action_status_id": participant_id,
                "enabled": True,
                "priority": 60
            },
            
            # Rule 9: Participant becomes Archived (no attendance 180 days)
            {
                "name": "Participant Inactive → Archived",
                "description": "Archive participants with no attendance in 180 days",
                "rule_type": "status_based",
                "current_status_id": participant_id,
                "conditions": [
                    {"type": "attendance", "event_type": "sunday_service", "window_days": 180, "operator": "==", "value": 0}
                ],
                "action_status_id": archived_id,
                "enabled": False,
                "priority": 50
            },
        ]
        
        # Insert rules (skip if already exists)
        created_count = 0
        for rule_template in recommended_rules:
            existing = await db.member_status_rules.find_one({
                "church_id": church_id,
                "name": rule_template["name"]
            })
            
            if existing:
                continue
            
            rule_doc = {
                "id": str(uuid.uuid4()),
                "church_id": church_id,
                **rule_template,
                "human_readable": "",  # Will be generated
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.member_status_rules.insert_one(rule_doc)
            created_count += 1
        
        print(f"  ✓ Created {created_count} recommended rules\n")
    
    print(f"\n✓ Seeding complete for {len(churches)} church(es)")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed_rules())
