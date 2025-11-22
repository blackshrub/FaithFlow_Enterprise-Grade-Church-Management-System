"""Database migration script for production deployments.

This script safely applies database changes without recreating existing data.
Safe to run multiple times (idempotent).

Usage:
    python scripts/migrate.py              # Apply all migrations
    python scripts/migrate.py --indexes    # Only create/update indexes
    python scripts/migrate.py --check      # Check migration status
"""
import asyncio
import sys
import os
from pathlib import Path
from datetime import datetime
import argparse

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv(Path(__file__).parent.parent / '.env')


async def create_indexes(db):
    """Create or update database indexes (safe to run multiple times)."""
    print("\n📊 Creating/updating database indexes...")

    # User indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("church_id")
    print("✓ User indexes")

    # Church indexes
    await db.churches.create_index("id", unique=True)
    print("✓ Church indexes")

    # Member indexes - optimized for filtering and queries
    await db.members.create_index("church_id")
    await db.members.create_index("email")
    await db.members.create_index("phone_whatsapp")
    await db.members.create_index([("church_id", 1), ("is_deleted", 1), ("is_active", 1)])
    await db.members.create_index([("church_id", 1), ("member_status", 1)])
    await db.members.create_index([("church_id", 1), ("demographic_category", 1)])
    print("✓ Member indexes")

    # Group indexes
    await db.groups.create_index("church_id")
    await db.group_memberships.create_index([("church_id", 1), ("group_id", 1), ("status", 1)])
    print("✓ Group indexes")

    # Event indexes
    await db.events.create_index("church_id")
    await db.events.create_index([("church_id", 1), ("event_type", 1)])
    print("✓ Event indexes")

    # Article indexes
    await db.articles.create_index([("church_id", 1), ("status", 1)])
    await db.articles.create_index([("church_id", 1), ("schedule_status", 1)])
    await db.articles.create_index([("church_id", 1), ("created_at", -1)])
    print("✓ Article indexes")

    # Prayer request indexes
    await db.prayer_requests.create_index("church_id")
    await db.prayer_requests.create_index([("church_id", 1), ("status", 1), ("created_at", -1)])
    print("✓ Prayer request indexes")

    # Donation indexes
    await db.donations.create_index("church_id")
    await db.donations.create_index("member_id")
    print("✓ Donation indexes")

    # Content indexes
    await db.content.create_index("church_id")
    print("✓ Content indexes")

    # Spiritual journey indexes
    await db.spiritual_journeys.create_index("church_id")
    await db.spiritual_journeys.create_index("member_id")
    print("✓ Spiritual journey indexes")

    # Settings indexes
    await db.member_statuses.create_index([("church_id", 1), ("name", 1)], unique=True)
    await db.member_statuses.create_index([("church_id", 1), ("order", 1)])
    await db.demographic_presets.create_index([("church_id", 1), ("name", 1)], unique=True)
    await db.demographic_presets.create_index([("church_id", 1), ("order", 1)])
    print("✓ Settings indexes")

    print("\n✅ All indexes created/updated successfully")


async def check_migration_status(db):
    """Check current database state."""
    print("\n🔍 Checking database status...\n")

    # Check collections
    collections = await db.list_collection_names()
    print(f"📦 Collections: {len(collections)}")
    for coll in sorted(collections):
        count = await db[coll].count_documents({})
        print(f"   - {coll}: {count} documents")

    # Check indexes
    print(f"\n📊 Indexes:")
    for coll_name in ['members', 'articles', 'groups', 'events']:
        if coll_name in collections:
            indexes = await db[coll_name].index_information()
            print(f"   - {coll_name}: {len(indexes)} indexes")

    # Check if super admin exists
    admin_count = await db.users.count_documents({"role": "super_admin"})
    print(f"\n👤 Super admins: {admin_count}")

    # Check churches
    church_count = await db.churches.count_documents({})
    print(f"⛪ Churches: {church_count}")


async def apply_migrations(db, indexes_only=False):
    """Apply all necessary migrations."""
    print("="*60)
    print("🚀 FaithFlow Database Migration")
    print("="*60)

    # Always safe to create/update indexes
    await create_indexes(db)

    if not indexes_only:
        print("\n✅ Migration complete!")
    else:
        print("\n✅ Index migration complete!")

    print("\n" + "="*60)


async def main():
    parser = argparse.ArgumentParser(description='FaithFlow Database Migration')
    parser.add_argument('--indexes', action='store_true', help='Only create/update indexes')
    parser.add_argument('--check', action='store_true', help='Check migration status')
    args = parser.parse_args()

    # Connect to MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'church_management')

    print(f"\n🔌 Connecting to: {mongo_url}")
    print(f"📂 Database: {db_name}\n")

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    try:
        # Test connection
        await db.command('ping')
        print("✓ Database connection successful\n")

        if args.check:
            await check_migration_status(db)
        else:
            await apply_migrations(db, indexes_only=args.indexes)

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        sys.exit(1)
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
