#!/usr/bin/env python3
"""
Cleanup: Delete all seeded rules and system-created statuses
Lets admins create everything manually
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

SYSTEM_SEEDED_STATUSES = [
    'Full Member',
    'New Visitor', 
    'Participant',
    'Old Visitor',
    'Archived',
    'NextGen'
]

async def cleanup_all():
    print("Cleaning up all seeded data...\n")
    
    # Step 1: Delete all recommended rules
    print("Step 1: Deleting recommended rules...")
    result = await db.member_status_rules.delete_many({})
    print(f"  ✓ Deleted {result.deleted_count} rule(s)\n")
    
    # Step 2: Delete system-seeded statuses
    print("Step 2: Deleting system-seeded statuses...")
    
    for status_name in SYSTEM_SEEDED_STATUSES:
        result = await db.member_statuses.delete_many({"name": status_name})
        if result.deleted_count > 0:
            print(f"  ✓ Deleted '{status_name}' ({result.deleted_count} instance(s))")
    
    print(f"\n✓ Cleanup complete!")
    print(f"\nAll system-seeded data removed.")
    print(f"Admins can now create statuses manually from Settings → Statuses.\n")
    client.close()


if __name__ == "__main__":
    asyncio.run(cleanup_all())
