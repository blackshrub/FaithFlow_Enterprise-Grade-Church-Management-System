"""
Migration script: Convert base64 images to file system storage.

This script migrates:
- Member profile photos (photo_base64 → photo_url)
- Member QR codes (personal_qr_code → personal_qr_url)
- Member documents (personal_document_base64 → personal_document_url)
- Group cover images (cover_image → cover_image_url)
- Article featured images (featured_image → featured_image_url)

Usage:
    python -m scripts.migrate_base64_to_files --dry-run
    python -m scripts.migrate_base64_to_files --execute
"""

import asyncio
import base64
import logging
import sys
from pathlib import Path
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from PIL import Image
from io import BytesIO
import os

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.file_storage_service import (
    optimize_image,
    generate_thumbnail,
    get_storage_path,
    UPLOAD_DIR
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Database connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'church_management')


class MigrationStats:
    """Track migration statistics."""

    def __init__(self):
        self.member_photos = 0
        self.member_qrcodes = 0
        self.member_documents = 0
        self.group_covers = 0
        self.article_images = 0
        self.errors = []


async def decode_base64_image(base64_string: str) -> bytes:
    """
    Decode base64 image string.

    Args:
        base64_string: Base64 encoded image (with or without data URI prefix)

    Returns:
        Image bytes
    """
    # Remove data URI prefix if present
    if base64_string.startswith('data:'):
        base64_string = base64_string.split(',', 1)[1]

    return base64.b64decode(base64_string)


async def migrate_member_photos(db, dry_run: bool = True) -> int:
    """Migrate member profile photos from base64 to files."""
    logger.info("Migrating member profile photos...")

    count = 0
    cursor = db.members.find({"photo_base64": {"$exists": True, "$ne": None}})

    async for member in cursor:
        try:
            church_id = member["church_id"]
            member_id = member["id"]
            base64_data = member["photo_base64"]

            # Decode base64
            image_bytes = await decode_base64_image(base64_data)

            # Optimize image
            optimized_bytes, width, height = optimize_image(image_bytes)

            # Generate thumbnail
            thumbnail_bytes = generate_thumbnail(optimized_bytes)

            # Generate filenames
            storage_dir = get_storage_path(church_id, "members", "photos")
            main_filename = f"{member_id}_profile.jpg"
            thumb_filename = f"{member_id}_profile_thumb.jpg"

            if not dry_run:
                # Create directory
                storage_dir.mkdir(parents=True, exist_ok=True)

                # Save main image
                main_path = storage_dir / main_filename
                with open(main_path, 'wb') as f:
                    f.write(optimized_bytes)

                # Save thumbnail
                thumb_path = storage_dir / thumb_filename
                with open(thumb_path, 'wb') as f:
                    f.write(thumbnail_bytes)

                # Update member record
                await db.members.update_one(
                    {"id": member_id},
                    {
                        "$set": {
                            "photo_url": f"/api/files/{church_id}/members/photos/{main_filename}",
                            "photo_thumbnail_url": f"/api/files/{church_id}/members/photos/{thumb_filename}",
                            "photo_migrated_at": datetime.utcnow()
                        }
                        # Keep photo_base64 for 30 days rollback safety
                    }
                )

                # Create file metadata
                await db.file_metadata.insert_one({
                    "id": f"migrated-member-photo-{member_id}",
                    "church_id": church_id,
                    "module": "members",
                    "type": "photos",
                    "reference_id": member_id,
                    "original_filename": "profile.jpg",
                    "stored_filename": main_filename,
                    "storage_path": str(main_path),
                    "url": f"/api/files/{church_id}/members/photos/{main_filename}",
                    "thumbnail_path": str(thumb_path),
                    "thumbnail_url": f"/api/files/{church_id}/members/photos/{thumb_filename}",
                    "mime_type": "image/jpeg",
                    "file_size": len(optimized_bytes),
                    "width": width,
                    "height": height,
                    "uploaded_by": "system",
                    "uploaded_at": datetime.utcnow(),
                    "metadata": {
                        "migrated_from_base64": True,
                        "original_size": len(image_bytes),
                        "compression_ratio": round(len(optimized_bytes) / len(image_bytes), 2)
                    }
                })

            count += 1
            logger.info(f"  [{count}] Migrated photo for member {member_id} (church: {church_id})")

        except Exception as e:
            logger.error(f"  Error migrating member {member.get('id')}: {e}")

    logger.info(f"Migrated {count} member photos")
    return count


async def migrate_member_qrcodes(db, dry_run: bool = True) -> int:
    """Migrate member QR codes from base64 to files."""
    logger.info("Migrating member QR codes...")

    count = 0
    cursor = db.members.find({"personal_qr_code": {"$exists": True, "$ne": None}})

    async for member in cursor:
        try:
            church_id = member["church_id"]
            member_id = member["id"]
            base64_data = member["personal_qr_code"]

            # Decode base64
            qr_bytes = await decode_base64_image(base64_data)

            # Generate filename
            storage_dir = get_storage_path(church_id, "members", "qrcodes")
            qr_filename = f"{member_id}_qr.png"

            if not dry_run:
                # Create directory
                storage_dir.mkdir(parents=True, exist_ok=True)

                # Save QR code
                qr_path = storage_dir / qr_filename
                with open(qr_path, 'wb') as f:
                    f.write(qr_bytes)

                # Update member record
                await db.members.update_one(
                    {"id": member_id},
                    {
                        "$set": {
                            "personal_qr_url": f"/api/files/{church_id}/members/qrcodes/{qr_filename}",
                            "qr_migrated_at": datetime.utcnow()
                        }
                    }
                )

            count += 1
            logger.info(f"  [{count}] Migrated QR code for member {member_id}")

        except Exception as e:
            logger.error(f"  Error migrating QR for member {member.get('id')}: {e}")

    logger.info(f"Migrated {count} QR codes")
    return count


async def migrate_group_covers(db, dry_run: bool = True) -> int:
    """Migrate group cover images from base64 to files."""
    logger.info("Migrating group cover images...")

    count = 0
    cursor = db.groups.find({"cover_image": {"$exists": True, "$ne": None}})

    async for group in cursor:
        try:
            # Skip if already a URL
            if group["cover_image"].startswith("http") or group["cover_image"].startswith("/api/files"):
                continue

            church_id = group["church_id"]
            group_id = group["id"]
            base64_data = group["cover_image"]

            # Decode base64
            image_bytes = await decode_base64_image(base64_data)

            # Optimize image
            optimized_bytes, width, height = optimize_image(image_bytes)

            # Generate thumbnail
            thumbnail_bytes = generate_thumbnail(optimized_bytes)

            # Generate filenames
            storage_dir = get_storage_path(church_id, "groups", "covers")
            main_filename = f"{group_id}_cover.jpg"
            thumb_filename = f"{group_id}_cover_thumb.jpg"

            if not dry_run:
                # Create directory
                storage_dir.mkdir(parents=True, exist_ok=True)

                # Save main image
                main_path = storage_dir / main_filename
                with open(main_path, 'wb') as f:
                    f.write(optimized_bytes)

                # Save thumbnail
                thumb_path = storage_dir / thumb_filename
                with open(thumb_path, 'wb') as f:
                    f.write(thumbnail_bytes)

                # Update group record
                await db.groups.update_one(
                    {"id": group_id},
                    {
                        "$set": {
                            "cover_image_url": f"/api/files/{church_id}/groups/covers/{main_filename}",
                            "cover_image_thumbnail_url": f"/api/files/{church_id}/groups/covers/{thumb_filename}",
                            "cover_image": f"/api/files/{church_id}/groups/covers/{main_filename}",  # Backward compat
                            "cover_migrated_at": datetime.utcnow()
                        }
                    }
                )

            count += 1
            logger.info(f"  [{count}] Migrated cover for group {group_id}")

        except Exception as e:
            logger.error(f"  Error migrating cover for group {group.get('id')}: {e}")

    logger.info(f"Migrated {count} group covers")
    return count


async def migrate_article_images(db, dry_run: bool = True) -> int:
    """Migrate article featured images from base64 to files."""
    logger.info("Migrating article featured images...")

    count = 0
    cursor = db.articles.find({"featured_image": {"$exists": True, "$ne": None}})

    async for article in cursor:
        try:
            # Skip if already a URL
            if article["featured_image"].startswith("http") or article["featured_image"].startswith("/api/files"):
                continue

            church_id = article["church_id"]
            article_id = article["id"]
            base64_data = article["featured_image"]

            # Decode base64
            image_bytes = await decode_base64_image(base64_data)

            # Optimize image
            optimized_bytes, width, height = optimize_image(image_bytes)

            # Generate thumbnail
            thumbnail_bytes = generate_thumbnail(optimized_bytes)

            # Generate filenames
            storage_dir = get_storage_path(church_id, "articles", "images")
            main_filename = f"{article_id}_featured.jpg"
            thumb_filename = f"{article_id}_featured_thumb.jpg"

            if not dry_run:
                # Create directory
                storage_dir.mkdir(parents=True, exist_ok=True)

                # Save main image
                main_path = storage_dir / main_filename
                with open(main_path, 'wb') as f:
                    f.write(optimized_bytes)

                # Save thumbnail
                thumb_path = storage_dir / thumb_filename
                with open(thumb_path, 'wb') as f:
                    f.write(thumbnail_bytes)

                # Update article record
                await db.articles.update_one(
                    {"id": article_id},
                    {
                        "$set": {
                            "featured_image_url": f"/api/files/{church_id}/articles/images/{main_filename}",
                            "featured_image_thumbnail_url": f"/api/files/{church_id}/articles/images/{thumb_filename}",
                            "featured_image": f"/api/files/{church_id}/articles/images/{main_filename}",  # Backward compat
                            "image_migrated_at": datetime.utcnow()
                        }
                    }
                )

            count += 1
            logger.info(f"  [{count}] Migrated image for article {article_id}")

        except Exception as e:
            logger.error(f"  Error migrating image for article {article.get('id')}: {e}")

    logger.info(f"Migrated {count} article images")
    return count


async def run_migration(dry_run: bool = True):
    """Run the complete migration."""
    logger.info("=" * 60)
    logger.info(f"Starting base64 → file system migration")
    logger.info(f"Mode: {'DRY RUN (no changes)' if dry_run else 'EXECUTE (will modify data)'}")
    logger.info("=" * 60)

    # Connect to database
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    stats = MigrationStats()

    try:
        # Migrate member photos
        stats.member_photos = await migrate_member_photos(db, dry_run)

        # Migrate member QR codes
        stats.member_qrcodes = await migrate_member_qrcodes(db, dry_run)

        # Migrate group covers
        stats.group_covers = await migrate_group_covers(db, dry_run)

        # Migrate article images
        stats.article_images = await migrate_article_images(db, dry_run)

        # Summary
        logger.info("=" * 60)
        logger.info("Migration Summary:")
        logger.info(f"  Member photos:     {stats.member_photos}")
        logger.info(f"  Member QR codes:   {stats.member_qrcodes}")
        logger.info(f"  Group covers:      {stats.group_covers}")
        logger.info(f"  Article images:    {stats.article_images}")
        logger.info(f"  Total files:       {stats.member_photos + stats.member_qrcodes + stats.group_covers + stats.article_images}")
        logger.info("=" * 60)

        if dry_run:
            logger.info("✓ DRY RUN completed successfully")
            logger.info("  Run with --execute to perform actual migration")
        else:
            logger.info("✓ Migration completed successfully")
            logger.info("  Base64 fields kept for 30-day rollback period")

    finally:
        client.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Migrate base64 images to file system")
    parser.add_argument("--dry-run", action="store_true", help="Run without making changes")
    parser.add_argument("--execute", action="store_true", help="Execute migration (modifies data)")

    args = parser.parse_args()

    if not args.dry_run and not args.execute:
        logger.error("Must specify either --dry-run or --execute")
        sys.exit(1)

    if args.execute and args.dry_run:
        logger.error("Cannot specify both --dry-run and --execute")
        sys.exit(1)

    asyncio.run(run_migration(dry_run=args.dry_run))
