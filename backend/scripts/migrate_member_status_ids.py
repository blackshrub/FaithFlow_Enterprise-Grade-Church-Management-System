#!/usr/bin/env python3
"""
Migrate member_status (string) to current_status_id (UUID)
Populates current_status_id based on member_status name
"""

import asyncio
import os
import sys
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


async def migrate_member_statuses():
    print("Migrating member statuses...")
    
    # Get all members
    members = await db.members.find({}).to_list(100000)
    print(f"Found {len(members)} members")
    
    updated_count = 0
    skipped_count = 0
    
    for member in members:
        member_status_name = member.get('member_status')
        current_status_id = member.get('current_status_id')
        
        # Skip if already has current_status_id
        if current_status_id:
            skipped_count += 1
            continue
        
        # Skip if no member_status name
        if not member_status_name:
            # Set participate_in_automation to True if not set
            if 'participate_in_automation' not in member:
                await db.members.update_one(
                    {"id": member.get('id')},
                    {"$set": {"participate_in_automation": True}}
                )
            skipped_count += 1
            continue
        
        # Find status by name and church_id
        status = await db.member_statuses.find_one({
            "church_id": member.get('church_id'),
            "name": member_status_name
        })
        
        if status:
            # Update member with status_id
            await db.members.update_one(
                {"id": member.get('id')},
                {
                    "$set": {
                        "current_status_id": status.get('id'),
                        "participate_in_automation": member.get('participate_in_automation', True)
                    }
                }
            )
            updated_count += 1
            if updated_count % 100 == 0:
                print(f"  Migrated {updated_count} members...")
        else:
            # Status not found - just set participate_in_automation
            await db.members.update_one(
                {"id": member.get('id')},
                {
                    "$set": {
                        "participate_in_automation": member.get('participate_in_automation', True)
                    }
                }
            )
            skipped_count += 1
    
    print(f"\n✓ Migration complete:")
    print(f"  - Updated: {updated_count}")
    print(f"  - Skipped: {skipped_count}")
    client.close()


if __name__ == "__main__":
    asyncio.run(migrate_member_statuses())
