"""Migration: Set super_admin church_id to None, ensure regular users have church_id.

This migration enforces Approach B architecture:
- Super admin: church_id = None (selects church at login)
- Regular users: church_id = required (assigned to one church)
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env', override=False)


async def migrate_user_church_ids():
    """Fix user church_id fields according to role."""
    
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'faithflow_production')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("🔄 Multi-Tenant User Migration")
    print("=" * 60)
    
    # Get default church for orphaned users
    default_church = await db.churches.find_one({})
    if not default_church:
        print("❌ No church found in database!")
        print("   Please create a church first.")
        client.close()
        return
    
    default_church_id = default_church['id']
    print(f"🏛️  Default church: {default_church['name']} ({default_church_id})\n")
    
    # 1. Fix super_admin users - ensure church_id = None
    result_super = await db.users.update_many(
        {"role": "super_admin"},
        {"$set": {"church_id": None}}
    )
    print(f"✅ Super admins: Set church_id = None ({result_super.modified_count} updated)")
    
    # 2. Fix regular users - ensure they have a church_id
    result_admin = await db.users.update_many(
        {
            "role": {"$in": ["admin", "staff"]},
            "$or": [
                {"church_id": None},
                {"church_id": {"$exists": False}}
            ]
        },
        {"$set": {"church_id": default_church_id}}
    )
    print(f"✅ Admin/Staff: Assigned to default church ({result_admin.modified_count} updated)")
    
    # 3. Verify results
    super_count = await db.users.count_documents({"role": "super_admin", "church_id": None})
    admin_with_church = await db.users.count_documents({
        "role": {"$in": ["admin", "staff"]},
        "church_id": {"$ne": None}
    })
    admin_without_church = await db.users.count_documents({
        "role": {"$in": ["admin", "staff"]},
        "church_id": None
    })
    
    print("\n" + "=" * 60)
    print("  MIGRATION RESULTS")
    print("=" * 60)
    print(f"  Super admins with church_id=None: {super_count} ✅")
    print(f"  Admin/Staff with church_id: {admin_with_church} ✅")
    print(f"  Admin/Staff WITHOUT church_id: {admin_without_church} {'❌ FIX NEEDED!' if admin_without_church > 0 else '✅'}")
    print("=" * 60)
    
    client.close()
    print("\n🎉 Migration complete!\n")


if __name__ == "__main__":
    print("")
    asyncio.run(migrate_user_church_ids())
