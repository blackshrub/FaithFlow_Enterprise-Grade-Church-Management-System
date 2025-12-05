"""
One-time migration script to generate face descriptors for existing members.

This script:
1. Fetches all members with photos but no face descriptors
2. Downloads each photo
3. Generates face descriptor using the Human library (via API call to frontend service)
4. Updates the member record

Usage:
    python scripts/generate_face_descriptors.py

Note: This is a backend script that prepares data. The actual face descriptor
generation happens on the frontend (browser) because @vladmandic/human runs in browser.

Alternative approach: Use this script to create a list of members needing descriptors,
then process them through the admin dashboard or a dedicated migration page.
"""

import asyncio
import os
import sys
from datetime import datetime, timezone

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "church_management")


async def get_members_needing_descriptors():
    """Get all members with photos but no face descriptors."""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # Find members with photo_url or photo_base64 but empty/missing face_descriptors
    query = {
        "$and": [
            {
                "$or": [
                    {"photo_url": {"$exists": True, "$ne": None, "$ne": ""}},
                    {"photo_base64": {"$exists": True, "$ne": None, "$ne": ""}}
                ]
            },
            {
                "$or": [
                    {"face_descriptors": {"$exists": False}},
                    {"face_descriptors": []},
                    {"face_descriptors": None}
                ]
            },
            {"is_deleted": {"$ne": True}}
        ]
    }

    members = await db.members.find(
        query,
        {"_id": 1, "id": 1, "full_name": 1, "photo_url": 1, "photo_base64": 1, "church_id": 1}
    ).to_list(length=None)

    client.close()
    return members


async def get_stats():
    """Get statistics about face descriptors."""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    total_members = await db.members.count_documents({"is_deleted": {"$ne": True}})

    with_photo = await db.members.count_documents({
        "is_deleted": {"$ne": True},
        "$or": [
            {"photo_url": {"$exists": True, "$ne": None, "$ne": ""}},
            {"photo_base64": {"$exists": True, "$ne": None, "$ne": ""}}
        ]
    })

    with_descriptors = await db.members.count_documents({
        "is_deleted": {"$ne": True},
        "face_descriptors": {"$exists": True, "$ne": [], "$ne": None}
    })

    client.close()

    return {
        "total_members": total_members,
        "with_photo": with_photo,
        "with_descriptors": with_descriptors,
        "needing_descriptors": with_photo - with_descriptors
    }


async def export_members_for_migration(output_file: str = "members_needing_descriptors.json"):
    """Export list of members needing descriptors to JSON file."""
    import json

    members = await get_members_needing_descriptors()

    # Convert ObjectId to string
    for m in members:
        m["_id"] = str(m["_id"])

    with open(output_file, "w") as f:
        json.dump(members, f, indent=2)

    print(f"Exported {len(members)} members to {output_file}")
    return members


async def main():
    print("=" * 60)
    print("Face Descriptor Migration Tool")
    print("=" * 60)

    stats = await get_stats()

    print(f"\nDatabase Statistics:")
    print(f"  Total active members:     {stats['total_members']}")
    print(f"  Members with photos:      {stats['with_photo']}")
    print(f"  Members with descriptors: {stats['with_descriptors']}")
    print(f"  Needing descriptors:      {stats['needing_descriptors']}")

    if stats['needing_descriptors'] > 0:
        print(f"\n⚠️  {stats['needing_descriptors']} members have photos but no face descriptors.")
        print("\nOptions to generate descriptors:")
        print("  1. Use the admin dashboard migration page (recommended)")
        print("  2. Wait for members to check in via QR/search (progressive)")
        print("  3. Re-upload photos in member edit form")

        # Export for migration
        await export_members_for_migration()
    else:
        print("\n✅ All members with photos have face descriptors!")


if __name__ == "__main__":
    asyncio.run(main())
