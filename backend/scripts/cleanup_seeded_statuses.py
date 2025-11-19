#!/usr/bin/env python3
"""
Cleanup: Remove system-seeded member statuses
Keeps only manually created statuses by admin
"""

import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT_DIR))
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Default status names that were auto-seeded
SYSTEM_SEEDED_STATUSES = [
    'Full Member',
    'New Visitor', 
    'Participant',
    'Old Visitor',
    'Archived',
    'NextGen'
]

async def cleanup():
    print("Cleaning up system-seeded member statuses...\n")
    
    # Get all churches
    churches = await db.churches.find({}).to_list(1000)
    
    total_deleted = 0
    
    for church in churches:
        church_id = church.get('id')
        church_name = church.get('name')
        
        print(f"Processing {church_name}...")
        
        for status_name in SYSTEM_SEEDED_STATUSES:
            # Find status by name
            status = await db.member_statuses.find_one({
                "church_id": church_id,
                "name": status_name
            })
            
            if not status:
                continue
            
            # Check if it's referenced in rules
            rules_count = await db.member_status_rules.count_documents({
                "$or": [
                    {"action_status_id": status.get('id')},
                    {"current_status_id": status.get('id')}
                ]
            })
            
            if rules_count > 0:
                print(f"  SKIP {status_name}: Used in {rules_count} rule(s)")
                continue
            
            # Check if members are using this status
            members_count = await db.members.count_documents({
                "current_status_id": status.get('id')
            })
            
            if members_count > 0:
                print(f"  SKIP {status_name}: {members_count} member(s) have this status")
                continue
            
            # Safe to delete
            await db.member_statuses.delete_one({"id": status.get('id')})
            print(f"  ✓ Deleted {status_name}")
            total_deleted += 1
    
    print(f"\n✓ Cleanup complete: Deleted {total_deleted} system-seeded status(es)")
    print(f"\nNote: Statuses in use by rules or members were kept for safety.")
    print(f"You can manually delete them from Settings → Statuses after reassigning members/rules.\n")
    client.close()


if __name__ == "__main__":
    asyncio.run(cleanup())
