"""
Database Index Management for FaithFlow

Creates and manages MongoDB indexes for optimal query performance.
Run this script on deployment or when adding new collections.
"""

import asyncio
import logging
from motor.motor_asyncio import AsyncIOMotorClient
import os

logger = logging.getLogger(__name__)


async def create_broadcast_indexes(db):
    """Create indexes for broadcast_campaigns collection."""
    collection = db.broadcast_campaigns

    indexes = [
        # Primary lookup by church and status
        {
            "keys": [("church_id", 1), ("status", 1)],
            "name": "church_status_idx"
        },
        # List campaigns by church, sorted by created_at
        {
            "keys": [("church_id", 1), ("created_at", -1)],
            "name": "church_created_idx"
        },
        # Scheduler query: find scheduled campaigns ready to send
        {
            "keys": [("status", 1), ("scheduled_at", 1)],
            "name": "status_scheduled_idx"
        },
        # Campaign by ID (unique)
        {
            "keys": [("id", 1)],
            "name": "id_unique_idx",
            "unique": True
        },
    ]

    for idx in indexes:
        try:
            await collection.create_index(
                idx["keys"],
                name=idx["name"],
                unique=idx.get("unique", False),
                background=True
            )
            logger.info(f"Created index {idx['name']} on broadcast_campaigns")
        except Exception as e:
            logger.warning(f"Index {idx['name']} may already exist: {e}")


async def create_push_notification_indexes(db):
    """Create indexes for push_notifications collection."""
    collection = db.push_notifications

    indexes = [
        # Member notification history
        {
            "keys": [("member_id", 1), ("church_id", 1), ("sent_at", -1)],
            "name": "member_church_sent_idx"
        },
        # Unread count query
        {
            "keys": [("member_id", 1), ("church_id", 1), ("is_read", 1)],
            "name": "member_church_read_idx"
        },
        # Campaign analytics
        {
            "keys": [("campaign_id", 1), ("delivery_status", 1)],
            "name": "campaign_delivery_idx"
        },
        # Notification by ID
        {
            "keys": [("id", 1)],
            "name": "id_idx",
            "unique": True
        },
        # Open rate tracking
        {
            "keys": [("campaign_id", 1), ("is_opened", 1)],
            "name": "campaign_opened_idx"
        },
    ]

    for idx in indexes:
        try:
            await collection.create_index(
                idx["keys"],
                name=idx["name"],
                unique=idx.get("unique", False),
                background=True
            )
            logger.info(f"Created index {idx['name']} on push_notifications")
        except Exception as e:
            logger.warning(f"Index {idx['name']} may already exist: {e}")


async def create_device_token_indexes(db):
    """Create indexes for device_tokens collection."""
    collection = db.device_tokens

    indexes = [
        # Lookup by FCM token
        {
            "keys": [("fcm_token", 1), ("church_id", 1)],
            "name": "fcm_token_church_idx"
        },
        # Active tokens for a member
        {
            "keys": [("member_id", 1), ("church_id", 1), ("is_active", 1)],
            "name": "member_church_active_idx"
        },
        # Token by ID
        {
            "keys": [("id", 1)],
            "name": "id_idx",
            "unique": True
        },
    ]

    for idx in indexes:
        try:
            await collection.create_index(
                idx["keys"],
                name=idx["name"],
                unique=idx.get("unique", False),
                background=True
            )
            logger.info(f"Created index {idx['name']} on device_tokens")
        except Exception as e:
            logger.warning(f"Index {idx['name']} may already exist: {e}")


async def create_notification_template_indexes(db):
    """Create indexes for notification_templates collection."""
    collection = db.notification_templates

    indexes = [
        # Templates by church
        {
            "keys": [("church_id", 1), ("is_active", 1)],
            "name": "church_active_idx"
        },
        # Template by ID
        {
            "keys": [("id", 1)],
            "name": "id_idx",
            "unique": True
        },
        # Search by name
        {
            "keys": [("church_id", 1), ("name", 1)],
            "name": "church_name_idx"
        },
    ]

    for idx in indexes:
        try:
            await collection.create_index(
                idx["keys"],
                name=idx["name"],
                unique=idx.get("unique", False),
                background=True
            )
            logger.info(f"Created index {idx['name']} on notification_templates")
        except Exception as e:
            logger.warning(f"Index {idx['name']} may already exist: {e}")


async def create_all_indexes(db):
    """Create all indexes for notification-related collections."""
    logger.info("Creating database indexes...")

    await create_broadcast_indexes(db)
    await create_push_notification_indexes(db)
    await create_device_token_indexes(db)
    await create_notification_template_indexes(db)

    logger.info("All indexes created successfully")


async def main():
    """Main entry point for running index creation."""
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.getenv("DB_NAME", "church_management")

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    await create_all_indexes(db)

    client.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
