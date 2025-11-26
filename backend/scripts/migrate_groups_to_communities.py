#!/usr/bin/env python3
"""
Database Migration Script: Groups -> Communities

This script migrates the existing 'groups' collection to 'communities'
and 'group_memberships' to 'community_memberships' while preserving
backward compatibility.

Run this script once when deploying the community feature update.

Usage:
    python migrate_groups_to_communities.py [--dry-run] [--skip-backup]

Options:
    --dry-run       Preview changes without actually making them
    --skip-backup   Skip creating backup collections (not recommended for production)
"""

import asyncio
import os
import sys
from datetime import datetime
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'church_management')


async def backup_collection(db, source_name: str, backup_name: str, dry_run: bool = False):
    """Create a backup of a collection before migration."""
    if dry_run:
        count = await db[source_name].count_documents({})
        print(f"  [DRY-RUN] Would backup {count} documents from '{source_name}' to '{backup_name}'")
        return True

    # Check if source exists
    if source_name not in await db.list_collection_names():
        print(f"  [SKIP] Collection '{source_name}' does not exist, nothing to backup")
        return True

    # Check if backup already exists
    if backup_name in await db.list_collection_names():
        print(f"  [SKIP] Backup '{backup_name}' already exists, skipping backup")
        return True

    # Create backup using aggregation pipeline
    try:
        pipeline = [{"$out": backup_name}]
        await db[source_name].aggregate(pipeline).to_list(length=None)
        count = await db[backup_name].count_documents({})
        print(f"  [OK] Backed up {count} documents from '{source_name}' to '{backup_name}'")
        return True
    except Exception as e:
        print(f"  [ERROR] Failed to backup '{source_name}': {e}")
        return False


async def migrate_groups_to_communities(db, dry_run: bool = False):
    """
    Migrate 'groups' collection to 'communities'.

    Changes:
    - Collection rename: groups -> communities
    - Add 'settings' field with default values
    - Convert 'leader_member_id' to 'leader_member_ids' array
    """
    print("\n=== Migrating groups -> communities ===")

    source = "groups"
    target = "communities"

    if source not in await db.list_collection_names():
        print(f"  [SKIP] Collection '{source}' does not exist")
        return True

    # Get all groups
    groups = await db[source].find({}).to_list(length=None)
    print(f"  Found {len(groups)} groups to migrate")

    # Default settings for communities
    default_settings = {
        "allow_member_create_subgroups": True,
        "subgroup_requires_approval": False,
        "allow_announcement_replies": True,
        "who_can_announce": "leaders_only",
        "who_can_send_messages": "all_members",
        "allow_media_sharing": True,
        "allow_polls": True,
        "allow_events": True,
        "show_member_list": True,
        "show_online_status": True,
        "show_read_receipts": True
    }

    migrated_count = 0
    for group in groups:
        # Prepare community document
        community = {**group}

        # Convert leader_member_id to leader_member_ids array
        if group.get("leader_member_id") and not group.get("leader_member_ids"):
            community["leader_member_ids"] = [group["leader_member_id"]]
        elif not group.get("leader_member_ids"):
            community["leader_member_ids"] = []

        # Add settings if not present
        if not community.get("settings"):
            community["settings"] = default_settings

        # Add migration metadata
        community["_migrated_from"] = "groups"
        community["_migrated_at"] = datetime.utcnow()

        if dry_run:
            print(f"  [DRY-RUN] Would migrate group '{group.get('name', group.get('id'))}'")
        else:
            # Check if already exists in target
            existing = await db[target].find_one({"id": community["id"]})
            if existing:
                # Update existing
                await db[target].update_one(
                    {"id": community["id"]},
                    {"$set": community}
                )
            else:
                # Insert new
                await db[target].insert_one(community)
            migrated_count += 1

    if not dry_run:
        print(f"  [OK] Migrated {migrated_count} groups to communities")

    return True


async def migrate_group_memberships_to_community_memberships(db, dry_run: bool = False):
    """
    Migrate 'group_memberships' collection to 'community_memberships'.

    Changes:
    - Collection rename: group_memberships -> community_memberships
    - Rename field 'group_id' -> 'community_id'
    - Add 'role' field (default: 'member')
    - Add notification preferences
    """
    print("\n=== Migrating group_memberships -> community_memberships ===")

    source = "group_memberships"
    target = "community_memberships"

    if source not in await db.list_collection_names():
        print(f"  [SKIP] Collection '{source}' does not exist")
        return True

    # Get all memberships
    memberships = await db[source].find({}).to_list(length=None)
    print(f"  Found {len(memberships)} memberships to migrate")

    migrated_count = 0
    for membership in memberships:
        # Prepare community membership document
        community_membership = {**membership}

        # Rename group_id to community_id
        if membership.get("group_id"):
            community_membership["community_id"] = membership["group_id"]
            # Keep group_id for backward compatibility during migration
            # del community_membership["group_id"]

        # Add role if not present
        if not community_membership.get("role"):
            community_membership["role"] = "member"

        # Add notification preferences if not present
        if community_membership.get("notifications_enabled") is None:
            community_membership["notifications_enabled"] = True
        if not community_membership.get("muted_until"):
            community_membership["muted_until"] = None

        # Add migration metadata
        community_membership["_migrated_from"] = "group_memberships"
        community_membership["_migrated_at"] = datetime.utcnow()

        if dry_run:
            print(f"  [DRY-RUN] Would migrate membership '{membership.get('id')}'")
        else:
            # Check if already exists in target
            existing = await db[target].find_one({"id": community_membership["id"]})
            if existing:
                # Update existing
                await db[target].update_one(
                    {"id": community_membership["id"]},
                    {"$set": community_membership}
                )
            else:
                # Insert new
                await db[target].insert_one(community_membership)
            migrated_count += 1

    if not dry_run:
        print(f"  [OK] Migrated {migrated_count} memberships")

    return True


async def migrate_join_requests(db, dry_run: bool = False):
    """
    Migrate 'group_join_requests' to 'community_join_requests'.

    Changes:
    - Rename 'group_id' field to 'community_id'
    """
    print("\n=== Migrating group_join_requests -> community_join_requests ===")

    source = "group_join_requests"
    target = "community_join_requests"

    if source not in await db.list_collection_names():
        print(f"  [SKIP] Collection '{source}' does not exist")
        return True

    requests = await db[source].find({}).to_list(length=None)
    print(f"  Found {len(requests)} join requests to migrate")

    migrated_count = 0
    for request in requests:
        community_request = {**request}

        if request.get("group_id"):
            community_request["community_id"] = request["group_id"]

        community_request["_migrated_from"] = "group_join_requests"
        community_request["_migrated_at"] = datetime.utcnow()

        if dry_run:
            print(f"  [DRY-RUN] Would migrate join request '{request.get('id')}'")
        else:
            existing = await db[target].find_one({"id": community_request["id"]})
            if existing:
                await db[target].update_one(
                    {"id": community_request["id"]},
                    {"$set": community_request}
                )
            else:
                await db[target].insert_one(community_request)
            migrated_count += 1

    if not dry_run:
        print(f"  [OK] Migrated {migrated_count} join requests")

    return True


async def create_indexes(db, dry_run: bool = False):
    """Create indexes for the new community collections."""
    print("\n=== Creating indexes ===")

    indexes = [
        ("communities", "id", True),
        ("communities", "church_id", False),
        ("communities", "category", False),
        ("communities", "is_open_for_join", False),
        ("community_memberships", "id", True),
        ("community_memberships", "church_id", False),
        ("community_memberships", "community_id", False),
        ("community_memberships", "member_id", False),
        ("community_memberships", "status", False),
        ("community_join_requests", "id", True),
        ("community_join_requests", "church_id", False),
        ("community_join_requests", "community_id", False),
        ("community_join_requests", "status", False),
    ]

    # Compound indexes
    compound_indexes = [
        ("community_memberships", [("church_id", 1), ("community_id", 1), ("member_id", 1)], True),
        ("community_memberships", [("church_id", 1), ("status", 1)], False),
    ]

    for collection, field, unique in indexes:
        if dry_run:
            unique_str = "unique " if unique else ""
            print(f"  [DRY-RUN] Would create {unique_str}index on {collection}.{field}")
        else:
            try:
                if unique:
                    await db[collection].create_index(field, unique=True, sparse=True)
                else:
                    await db[collection].create_index(field)
                print(f"  [OK] Created index on {collection}.{field}")
            except Exception as e:
                print(f"  [WARN] Index on {collection}.{field} may already exist: {e}")

    for collection, fields, unique in compound_indexes:
        if dry_run:
            field_names = [f[0] for f in fields]
            print(f"  [DRY-RUN] Would create compound index on {collection}.{field_names}")
        else:
            try:
                await db[collection].create_index(fields, unique=unique)
                print(f"  [OK] Created compound index on {collection}")
            except Exception as e:
                print(f"  [WARN] Compound index may already exist: {e}")

    return True


async def update_church_settings_schema(db, dry_run: bool = False):
    """
    Update church_settings to add community_categories alongside group_categories.
    """
    print("\n=== Updating church settings schema ===")

    settings_cursor = db.church_settings.find({})
    settings_list = await settings_cursor.to_list(length=None)
    print(f"  Found {len(settings_list)} church settings to update")

    updated_count = 0
    for settings in settings_list:
        # Copy group_categories to community_categories if not exists
        if settings.get("group_categories") and not settings.get("community_categories"):
            if dry_run:
                print(f"  [DRY-RUN] Would copy group_categories to community_categories for church {settings.get('church_id')}")
            else:
                await db.church_settings.update_one(
                    {"id": settings["id"]},
                    {"$set": {"community_categories": settings["group_categories"]}}
                )
                updated_count += 1

    if not dry_run:
        print(f"  [OK] Updated {updated_count} church settings")

    return True


async def main():
    """Main migration function."""
    # Parse arguments
    dry_run = "--dry-run" in sys.argv
    skip_backup = "--skip-backup" in sys.argv

    print("=" * 60)
    print("FaithFlow: Groups to Communities Migration")
    print("=" * 60)
    print(f"Database: {DB_NAME}")
    print(f"Mode: {'DRY RUN' if dry_run else 'LIVE'}")
    print(f"Backup: {'SKIP' if skip_backup else 'ENABLED'}")
    print("=" * 60)

    if dry_run:
        print("\n[DRY RUN] No changes will be made to the database\n")

    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    try:
        # Step 1: Create backups
        if not skip_backup:
            print("\n=== Creating backups ===")
            await backup_collection(db, "groups", "groups_backup", dry_run)
            await backup_collection(db, "group_memberships", "group_memberships_backup", dry_run)
            await backup_collection(db, "group_join_requests", "group_join_requests_backup", dry_run)

        # Step 2: Migrate data
        await migrate_groups_to_communities(db, dry_run)
        await migrate_group_memberships_to_community_memberships(db, dry_run)
        await migrate_join_requests(db, dry_run)

        # Step 3: Update church settings
        await update_church_settings_schema(db, dry_run)

        # Step 4: Create indexes
        await create_indexes(db, dry_run)

        print("\n" + "=" * 60)
        if dry_run:
            print("DRY RUN COMPLETE - No changes were made")
            print("Run without --dry-run to apply changes")
        else:
            print("MIGRATION COMPLETE")
            print("\nNote: Old collections (groups, group_memberships, group_join_requests)")
            print("have been preserved. You can delete them after verifying the migration.")
            print("\nTo delete old collections (after verification):")
            print("  db.groups.drop()")
            print("  db.group_memberships.drop()")
            print("  db.group_join_requests.drop()")
        print("=" * 60)

    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        sys.exit(1)
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
