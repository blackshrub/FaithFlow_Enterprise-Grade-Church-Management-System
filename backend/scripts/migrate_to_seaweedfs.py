"""
Migration script: Migrate all media to SeaweedFS storage.

This script migrates:
- Member profile photos (photo_base64 → SeaweedFS photo_url)
- Member QR codes (personal_qr_code → SeaweedFS personal_qr_url)
- Group cover images (cover_image base64 → SeaweedFS cover_image)
- Community cover images (cover_image base64 → SeaweedFS cover_image)
- Article featured images (filesystem → SeaweedFS featured_image)
- Devotion cover images (cover_image_base64 → SeaweedFS cover_image)

Usage:
    python -m scripts.migrate_to_seaweedfs --dry-run
    python -m scripts.migrate_to_seaweedfs --execute
    python -m scripts.migrate_to_seaweedfs --execute --only members
    python -m scripts.migrate_to_seaweedfs --execute --only groups
    python -m scripts.migrate_to_seaweedfs --execute --only communities
    python -m scripts.migrate_to_seaweedfs --execute --only articles
    python -m scripts.migrate_to_seaweedfs --execute --only devotions
"""

import asyncio
import base64
import logging
import sys
from pathlib import Path
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.seaweedfs_service import (
    SeaweedFSService,
    SeaweedFSError,
    StorageCategory,
    get_seaweedfs_service
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Database connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'church_management')

# Local file storage path (for article images)
UPLOAD_DIR = Path(os.environ.get('UPLOAD_DIR', '/tmp/faithflow-uploads'))


class MigrationStats:
    """Track migration statistics."""

    def __init__(self):
        self.member_photos = 0
        self.member_qrcodes = 0
        self.group_covers = 0
        self.community_covers = 0
        self.article_images = 0
        self.devotion_covers = 0
        self.errors = []
        self.skipped = 0


def decode_base64_image(base64_string: str) -> tuple[bytes, str]:
    """
    Decode base64 image string.

    Args:
        base64_string: Base64 encoded image (with or without data URI prefix)

    Returns:
        Tuple of (image bytes, mime_type)
    """
    mime_type = "image/jpeg"

    # Extract mime type from data URI if present
    if base64_string.startswith('data:'):
        match = re.match(r'data:([^;]+);base64,', base64_string)
        if match:
            mime_type = match.group(1)
        base64_string = base64_string.split(',', 1)[1]

    return base64.b64decode(base64_string), mime_type


async def migrate_member_photos(db, seaweedfs: SeaweedFSService, dry_run: bool = True) -> int:
    """Migrate member profile photos from base64 to SeaweedFS."""
    logger.info("Migrating member profile photos to SeaweedFS...")

    count = 0
    cursor = db.members.find({
        "photo_base64": {"$exists": True, "$ne": None},
        "photo_url": {"$exists": False}  # Only migrate if not already migrated
    })

    async for member in cursor:
        try:
            church_id = member["church_id"]
            member_id = member["id"]
            base64_data = member["photo_base64"]

            if not base64_data or len(base64_data) < 100:
                continue

            # Decode base64
            image_bytes, mime_type = decode_base64_image(base64_data)

            if not dry_run:
                # Upload to SeaweedFS
                result = await seaweedfs.upload_member_photo(
                    content=image_bytes,
                    file_name=f"{member_id}_photo.jpg",
                    mime_type=mime_type,
                    church_id=church_id,
                    member_id=member_id
                )

                # Update member record
                await db.members.update_one(
                    {"id": member_id},
                    {
                        "$set": {
                            "photo_url": result["url"],
                            "photo_thumbnail": result.get("thumbnail_url"),
                            "photo_fid": result.get("fid"),
                            "photo_path": result.get("path"),
                            "photo_migrated_at": datetime.utcnow().isoformat()
                        }
                        # Keep photo_base64 for rollback safety
                    }
                )

            count += 1
            logger.info(f"  [{count}] Migrated photo for member {member_id} (church: {church_id})")

        except Exception as e:
            logger.error(f"  Error migrating member {member.get('id')}: {e}")

    logger.info(f"Migrated {count} member photos")
    return count


async def migrate_member_qrcodes(db, seaweedfs: SeaweedFSService, dry_run: bool = True) -> int:
    """Migrate member QR codes from base64 to SeaweedFS."""
    logger.info("Migrating member QR codes to SeaweedFS...")

    count = 0
    cursor = db.members.find({
        "personal_qr_code": {"$exists": True, "$ne": None},
        "personal_qr_url": {"$exists": False}  # Only migrate if not already migrated
    })

    async for member in cursor:
        try:
            church_id = member["church_id"]
            member_id = member["id"]
            base64_data = member["personal_qr_code"]

            if not base64_data or len(base64_data) < 100:
                continue

            # Decode base64
            qr_bytes, mime_type = decode_base64_image(base64_data)

            if not dry_run:
                # Upload to SeaweedFS
                result = await seaweedfs.upload_by_category(
                    content=qr_bytes,
                    file_name=f"{member_id}_qr.png",
                    mime_type="image/png",
                    church_id=church_id,
                    category=StorageCategory.MEMBER_QRCODE,
                    entity_id=member_id
                )

                # Update member record
                await db.members.update_one(
                    {"id": member_id},
                    {
                        "$set": {
                            "personal_qr_url": result["url"],
                            "personal_qr_fid": result.get("fid"),
                            "personal_qr_path": result.get("path"),
                            "qr_migrated_at": datetime.utcnow().isoformat()
                        }
                    }
                )

            count += 1
            logger.info(f"  [{count}] Migrated QR code for member {member_id}")

        except Exception as e:
            logger.error(f"  Error migrating QR for member {member.get('id')}: {e}")

    logger.info(f"Migrated {count} QR codes")
    return count


async def migrate_group_covers(db, seaweedfs: SeaweedFSService, dry_run: bool = True) -> int:
    """Migrate group cover images from base64 to SeaweedFS."""
    logger.info("Migrating group cover images to SeaweedFS...")

    count = 0
    skipped = 0
    cursor = db.groups.find({
        "cover_image": {"$exists": True, "$ne": None}
    })

    async for group in cursor:
        try:
            cover_image = group.get("cover_image", "")

            # Skip if already a SeaweedFS or HTTP URL
            if cover_image.startswith("http") or "/faithflow/" in cover_image:
                skipped += 1
                continue

            # Skip if already migrated (has cover_image_fid)
            if group.get("cover_image_fid"):
                skipped += 1
                continue

            church_id = group["church_id"]
            group_id = group["id"]

            # Check if it's base64 data
            if not cover_image.startswith("data:") and len(cover_image) < 1000:
                skipped += 1
                continue

            # Decode base64
            image_bytes, mime_type = decode_base64_image(cover_image)

            if not dry_run:
                # Upload to SeaweedFS
                result = await seaweedfs.upload_group_cover(
                    content=image_bytes,
                    file_name=f"{group_id}_cover.jpg",
                    mime_type=mime_type,
                    church_id=church_id,
                    group_id=group_id
                )

                # Update group record
                await db.groups.update_one(
                    {"id": group_id},
                    {
                        "$set": {
                            "cover_image": result["url"],
                            "cover_image_thumbnail": result.get("thumbnail_url"),
                            "cover_image_fid": result.get("fid"),
                            "cover_image_path": result.get("path"),
                            "cover_migrated_at": datetime.utcnow().isoformat()
                        }
                    }
                )

            count += 1
            logger.info(f"  [{count}] Migrated cover for group {group_id}")

        except Exception as e:
            logger.error(f"  Error migrating cover for group {group.get('id')}: {e}")

    logger.info(f"Migrated {count} group covers (skipped {skipped} already migrated)")
    return count


async def migrate_community_covers(db, seaweedfs: SeaweedFSService, dry_run: bool = True) -> int:
    """Migrate community cover images from base64 to SeaweedFS."""
    logger.info("Migrating community cover images to SeaweedFS...")

    count = 0
    skipped = 0
    cursor = db.communities.find({
        "cover_image": {"$exists": True, "$ne": None}
    })

    async for community in cursor:
        try:
            cover_image = community.get("cover_image", "")

            # Skip if already a SeaweedFS or HTTP URL
            if cover_image.startswith("http") or "/faithflow/" in cover_image:
                skipped += 1
                continue

            # Skip if already migrated (has cover_image_fid)
            if community.get("cover_image_fid"):
                skipped += 1
                continue

            church_id = community["church_id"]
            community_id = community["id"]

            # Check if it's base64 data
            if not cover_image.startswith("data:") and len(cover_image) < 1000:
                skipped += 1
                continue

            # Decode base64
            image_bytes, mime_type = decode_base64_image(cover_image)

            if not dry_run:
                # Upload to SeaweedFS
                result = await seaweedfs.upload_community_cover(
                    content=image_bytes,
                    file_name=f"{community_id}_cover.jpg",
                    mime_type=mime_type,
                    church_id=church_id,
                    community_id=community_id
                )

                # Update community record
                await db.communities.update_one(
                    {"id": community_id},
                    {
                        "$set": {
                            "cover_image": result["url"],
                            "cover_image_thumbnail": result.get("thumbnail_url"),
                            "cover_image_fid": result.get("fid"),
                            "cover_image_path": result.get("path"),
                            "cover_migrated_at": datetime.utcnow().isoformat()
                        }
                    }
                )

            count += 1
            logger.info(f"  [{count}] Migrated cover for community {community_id}")

        except Exception as e:
            logger.error(f"  Error migrating cover for community {community.get('id')}: {e}")

    logger.info(f"Migrated {count} community covers (skipped {skipped} already migrated)")
    return count


async def migrate_article_images(db, seaweedfs: SeaweedFSService, dry_run: bool = True) -> int:
    """Migrate article featured images from filesystem/base64 to SeaweedFS."""
    logger.info("Migrating article featured images to SeaweedFS...")

    count = 0
    skipped = 0
    cursor = db.articles.find({
        "featured_image": {"$exists": True, "$ne": None}
    })

    async for article in cursor:
        try:
            featured_image = article.get("featured_image", "")

            # Skip if already a SeaweedFS or HTTP URL
            if featured_image.startswith("http") or "/faithflow/" in featured_image:
                skipped += 1
                continue

            # Skip if already migrated (has featured_image_fid)
            if article.get("featured_image_fid"):
                skipped += 1
                continue

            church_id = article["church_id"]
            article_id = article["id"]

            image_bytes = None
            mime_type = "image/jpeg"

            # Check if it's a local file path
            if featured_image.startswith("/api/files/") or featured_image.startswith("/uploads/"):
                # Extract path and try to read from filesystem
                # Expected format: /api/files/{church_id}/articles/images/{filename}
                # Or: /uploads/{church_id}/...
                local_path = None

                if featured_image.startswith("/api/files/"):
                    # Try to construct local path
                    path_parts = featured_image.replace("/api/files/", "").split("/")
                    if len(path_parts) >= 4:
                        local_path = UPLOAD_DIR / path_parts[0] / path_parts[1] / path_parts[2] / path_parts[3]

                if local_path and local_path.exists():
                    with open(local_path, 'rb') as f:
                        image_bytes = f.read()

                    # Detect mime type from extension
                    ext = local_path.suffix.lower()
                    mime_map = {'.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp'}
                    mime_type = mime_map.get(ext, 'image/jpeg')
                else:
                    logger.warning(f"  Local file not found for article {article_id}: {featured_image}")
                    skipped += 1
                    continue

            # Check if it's base64 data
            elif featured_image.startswith("data:") or len(featured_image) > 1000:
                image_bytes, mime_type = decode_base64_image(featured_image)

            else:
                skipped += 1
                continue

            if not image_bytes:
                skipped += 1
                continue

            if not dry_run:
                # Upload to SeaweedFS
                result = await seaweedfs.upload_article_image(
                    content=image_bytes,
                    file_name=f"{article_id}_featured.jpg",
                    mime_type=mime_type,
                    church_id=church_id,
                    article_id=article_id
                )

                # Update article record
                await db.articles.update_one(
                    {"id": article_id},
                    {
                        "$set": {
                            "featured_image": result["url"],
                            "featured_image_thumbnail": result.get("thumbnail_url"),
                            "featured_image_fid": result.get("fid"),
                            "featured_image_path": result.get("path"),
                            "image_migrated_at": datetime.utcnow().isoformat()
                        }
                    }
                )

            count += 1
            logger.info(f"  [{count}] Migrated image for article {article_id}")

        except Exception as e:
            logger.error(f"  Error migrating image for article {article.get('id')}: {e}")

    logger.info(f"Migrated {count} article images (skipped {skipped} already migrated)")
    return count


async def migrate_devotion_covers(db, seaweedfs: SeaweedFSService, dry_run: bool = True) -> int:
    """Migrate devotion cover images from base64 to SeaweedFS."""
    logger.info("Migrating devotion cover images to SeaweedFS...")

    count = 0
    skipped = 0
    cursor = db.devotions.find({
        "$or": [
            {"cover_image_base64": {"$exists": True, "$ne": None}},
            {"cover_image": {"$exists": True, "$ne": None}}
        ]
    })

    async for devotion in cursor:
        try:
            # Check various fields for cover image
            cover_image = devotion.get("cover_image_base64") or devotion.get("cover_image", "")

            # Skip if already a SeaweedFS or HTTP URL
            if cover_image.startswith("http") or "/faithflow/" in cover_image:
                skipped += 1
                continue

            # Skip if already migrated (has cover_image_fid)
            if devotion.get("cover_image_fid"):
                skipped += 1
                continue

            church_id = devotion.get("church_id", "global")  # Devotions might be global
            devotion_id = devotion["id"]

            # Check if it's base64 data
            if not cover_image.startswith("data:") and len(cover_image) < 1000:
                skipped += 1
                continue

            # Decode base64
            image_bytes, mime_type = decode_base64_image(cover_image)

            if not dry_run:
                # Upload to SeaweedFS
                result = await seaweedfs.upload_devotion_cover(
                    content=image_bytes,
                    file_name=f"{devotion_id}_cover.jpg",
                    mime_type=mime_type,
                    church_id=church_id,
                    devotion_id=devotion_id
                )

                # Update devotion record
                await db.devotions.update_one(
                    {"id": devotion_id},
                    {
                        "$set": {
                            "cover_image": result["url"],
                            "cover_image_thumbnail": result.get("thumbnail_url"),
                            "cover_image_fid": result.get("fid"),
                            "cover_image_path": result.get("path"),
                            "cover_migrated_at": datetime.utcnow().isoformat()
                        },
                        "$unset": {
                            "cover_image_base64": ""  # Remove old field
                        }
                    }
                )

            count += 1
            logger.info(f"  [{count}] Migrated cover for devotion {devotion_id}")

        except Exception as e:
            logger.error(f"  Error migrating cover for devotion {devotion.get('id')}: {e}")

    logger.info(f"Migrated {count} devotion covers (skipped {skipped} already migrated)")
    return count


async def run_migration(dry_run: bool = True, only: str = None):
    """Run the complete migration."""
    logger.info("=" * 60)
    logger.info(f"Starting media → SeaweedFS migration")
    logger.info(f"Mode: {'DRY RUN (no changes)' if dry_run else 'EXECUTE (will modify data)'}")
    if only:
        logger.info(f"Only migrating: {only}")
    logger.info("=" * 60)

    # Connect to database
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # Get SeaweedFS service
    seaweedfs = get_seaweedfs_service()

    stats = MigrationStats()

    try:
        # Check SeaweedFS connection
        logger.info("Checking SeaweedFS connection...")
        try:
            health = await seaweedfs.health_check()
            # SeaweedFS returns IsLeader and Leader fields when healthy
            if not health.get("IsLeader") and not health.get("Leader"):
                logger.error("SeaweedFS is not healthy. Aborting migration.")
                logger.error(f"Health check result: {health}")
                return
            logger.info(f"SeaweedFS is healthy: {health}")
        except Exception as e:
            logger.error(f"Failed to connect to SeaweedFS: {e}")
            logger.error("Make sure SeaweedFS is running and accessible.")
            return

        # Run migrations based on --only flag
        if only is None or only == "members":
            stats.member_photos = await migrate_member_photos(db, seaweedfs, dry_run)
            stats.member_qrcodes = await migrate_member_qrcodes(db, seaweedfs, dry_run)

        if only is None or only == "groups":
            stats.group_covers = await migrate_group_covers(db, seaweedfs, dry_run)

        if only is None or only == "communities":
            stats.community_covers = await migrate_community_covers(db, seaweedfs, dry_run)

        if only is None or only == "articles":
            stats.article_images = await migrate_article_images(db, seaweedfs, dry_run)

        if only is None or only == "devotions":
            stats.devotion_covers = await migrate_devotion_covers(db, seaweedfs, dry_run)

        # Summary
        logger.info("=" * 60)
        logger.info("Migration Summary:")
        logger.info(f"  Member photos:     {stats.member_photos}")
        logger.info(f"  Member QR codes:   {stats.member_qrcodes}")
        logger.info(f"  Group covers:      {stats.group_covers}")
        logger.info(f"  Community covers:  {stats.community_covers}")
        logger.info(f"  Article images:    {stats.article_images}")
        logger.info(f"  Devotion covers:   {stats.devotion_covers}")
        total = (stats.member_photos + stats.member_qrcodes + stats.group_covers +
                 stats.community_covers + stats.article_images + stats.devotion_covers)
        logger.info(f"  Total files:       {total}")
        logger.info("=" * 60)

        if dry_run:
            logger.info("DRY RUN completed successfully")
            logger.info("  Run with --execute to perform actual migration")
        else:
            logger.info("Migration completed successfully")
            logger.info("  Original data kept for rollback safety")

    finally:
        client.close()


async def cleanup_base64_fields(only: str = None):
    """
    Remove base64 fields after successful migration (run after verification).

    WARNING: This is destructive and cannot be undone!
    """
    logger.info("=" * 60)
    logger.info("CLEANUP: Removing base64 fields after successful migration")
    logger.info("WARNING: This is DESTRUCTIVE and cannot be undone!")
    logger.info("=" * 60)

    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    try:
        if only is None or only == "members":
            # Clean member photos
            result = await db.members.update_many(
                {"photo_url": {"$exists": True}, "photo_base64": {"$exists": True}},
                {"$unset": {"photo_base64": ""}}
            )
            logger.info(f"Cleaned {result.modified_count} member photo_base64 fields")

            # Clean member QR codes
            result = await db.members.update_many(
                {"personal_qr_url": {"$exists": True}, "personal_qr_code": {"$exists": True}},
                {"$unset": {"personal_qr_code": ""}}
            )
            logger.info(f"Cleaned {result.modified_count} member personal_qr_code fields")

        if only is None or only == "devotions":
            # Clean devotion covers
            result = await db.devotions.update_many(
                {"cover_image_fid": {"$exists": True}, "cover_image_base64": {"$exists": True}},
                {"$unset": {"cover_image_base64": ""}}
            )
            logger.info(f"Cleaned {result.modified_count} devotion cover_image_base64 fields")

        logger.info("Cleanup completed")

    finally:
        client.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Migrate media to SeaweedFS storage")
    parser.add_argument("--dry-run", action="store_true", help="Run without making changes")
    parser.add_argument("--execute", action="store_true", help="Execute migration (modifies data)")
    parser.add_argument("--only", choices=["members", "groups", "communities", "articles", "devotions"],
                        help="Only migrate specific collection")
    parser.add_argument("--cleanup", action="store_true",
                        help="Remove old base64 fields (run AFTER verifying migration)")

    args = parser.parse_args()

    if args.cleanup:
        logger.warning("You are about to PERMANENTLY DELETE base64 fields!")
        response = input("Type 'DELETE' to confirm: ")
        if response == "DELETE":
            asyncio.run(cleanup_base64_fields(args.only))
        else:
            logger.info("Cleanup cancelled")
        sys.exit(0)

    if not args.dry_run and not args.execute:
        logger.error("Must specify either --dry-run or --execute")
        sys.exit(1)

    if args.execute and args.dry_run:
        logger.error("Cannot specify both --dry-run and --execute")
        sys.exit(1)

    asyncio.run(run_migration(dry_run=args.dry_run, only=args.only))
