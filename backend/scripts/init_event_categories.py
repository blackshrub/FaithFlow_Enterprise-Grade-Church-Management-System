#!/usr/bin/env python3
"""
Initialize default event categories for all churches
Creates 'Sunday Service' as system category
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


async def init_categories():
    print("Initializing event categories...")
    
    # Get all churches
    churches = await db.churches.find({}).to_list(1000)
    
    for church in churches:
        church_id = church.get('id')
        
        # Check if Sunday Service already exists
        existing = await db.event_categories.find_one({
            "church_id": church_id,
            "name": "Sunday Service"
        })
        
        if existing:
            print(f"  {church.get('name')}: Sunday Service already exists")
            continue
        
        # Create Sunday Service category
        category_doc = {
            "id": str(uuid.uuid4()),
            "church_id": church_id,
            "name": "Sunday Service",
            "description": "Regular Sunday worship service",
            "color": "#3C5AFF",
            "icon": "Calendar",
            "order": 0,
            "is_active": True,
            "is_system": True,  # Cannot be deleted
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.event_categories.insert_one(category_doc)
        print(f"  ✓ {church.get('name')}: Sunday Service created")
    
    print(f"\n✓ Initialized categories for {len(churches)} churches")
    client.close()


if __name__ == "__main__":
    asyncio.run(init_categories())
