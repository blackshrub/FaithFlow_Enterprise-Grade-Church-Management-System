#!/usr/bin/env python3
import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT_DIR))
load_dotenv(ROOT_DIR / '.env')

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

async def check():
    statuses = await db.member_statuses.find({}, {"_id": 0, "name": 1, "is_system": 1, "created_at": 1}).to_list(100)
    print(f"\nRemaining statuses: {len(statuses)}\n")
    for s in statuses:
        system = "[SYSTEM]" if s.get('is_system') else "[USER]"
        print(f"  {system} {s.get('name')} - {s.get('created_at')}")
    
    # Check members
    members_with_status = await db.members.count_documents({"current_status_id": {"$ne": None}})
    total_members = await db.members.count_documents({})
    print(f"\nMembers with status_id: {members_with_status}/{total_members}")
    client.close()

asyncio.run(check())
