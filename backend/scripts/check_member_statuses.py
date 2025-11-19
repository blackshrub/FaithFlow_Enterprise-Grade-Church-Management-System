#!/usr/bin/env python3
import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from collections import Counter

ROOT_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT_DIR))
load_dotenv(ROOT_DIR / '.env')

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

async def check():
    members = await db.members.find({}, {"_id": 0, "member_status": 1, "current_status_id": 1}).to_list(10000)
    
    status_counts = Counter([m.get('member_status') for m in members])
    with_id = sum(1 for m in members if m.get('current_status_id'))
    without_id = sum(1 for m in members if not m.get('current_status_id'))
    
    print(f"\nMember Status Distribution:")
    print(f"Total members: {len(members)}")
    print(f"  With current_status_id: {with_id}")
    print(f"  Without current_status_id: {without_id}\n")
    
    print("Status counts (by member_status name):")
    for status, count in status_counts.most_common():
        print(f"  {status or 'None'}: {count}")
    
    client.close()

asyncio.run(check())
