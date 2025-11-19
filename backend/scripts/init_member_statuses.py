#!/usr/bin/env python3
"""
Initialize default member statuses for all churches
Creates 6 default statuses: Full Member, New Visitor, Participant, Old Visitor, Archived, NextGen
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


DEFAULT_STATUSES = [
    {
        "name": "Full Member",
        "description": "Active member with full membership",
        "color": "#10B981",  # Green
        "display_order": 1,
        "is_system": False,
        "is_default": True,  # Default for new members
        "is_active": True
    },
    {
        "name": "New Visitor",
        "description": "First-time or recent visitor",
        "color": "#3B82F6",  # Blue
        "display_order": 2,
        "is_system": False,
        "is_default": False,
        "is_active": True
    },
    {
        "name": "Participant",
        "description": "Regular attendee, not yet full member",
        "color": "#8B5CF6",  # Purple
        "display_order": 3,
        "is_system": False,
        "is_default": False,
        "is_active": True
    },
    {
        "name": "Old Visitor",
        "description": "Visitor who hasn't attended recently",
        "color": "#F59E0B",  # Amber
        "display_order": 4,
        "is_system": False,
        "is_default": False,
        "is_active": True
    },
    {
        "name": "Archived",
        "description": "Inactive or moved member",
        "color": "#6B7280",  # Gray
        "display_order": 5,
        "is_system": False,
        "is_default": False,
        "is_active": True
    },
    {
        "name": "NextGen",
        "description": "Youth or children (under 15 years old)",
        "color": "#EC4899",  # Pink
        "display_order": 6,
        "is_system": True,  # Cannot be deleted or renamed
        "is_default": False,
        "is_active": True
    }
]


async def init_statuses():
    print("Initializing member statuses...")
    
    # Get all churches
    churches = await db.churches.find({}).to_list(1000)
    
    for church in churches:
        church_id = church.get('id')
        
        for status_template in DEFAULT_STATUSES:
            # Check if status already exists
            existing = await db.member_statuses.find_one({
                "church_id": church_id,
                "name": status_template["name"]
            })
            
            if existing:
                print(f"  {church.get('name')}: {status_template['name']} already exists")
                continue
            
            # Create status
            status_doc = {
                "id": str(uuid.uuid4()),
                "church_id": church_id,
                **status_template,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.member_statuses.insert_one(status_doc)
            print(f"  ✓ {church.get('name')}: {status_template['name']} created")
    
    print(f"\n✓ Initialized statuses for {len(churches)} churches")
    client.close()


if __name__ == "__main__":
    asyncio.run(init_statuses())
